import fs from 'fs/promises';
import path from 'path';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import { extractText } from '../services/textExtractor.js';
import { chunkText } from '../services/chunkService.js';
import { generateEmbeddings } from '../services/embeddingService.js';

/**
 * Upload and process a document
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res) => {
  console.log('🚀 uploadDocument controller started');
  try {
    if (!req.file) {
      console.log('❌ No file received in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`📁 File received: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);
    const { file } = req;
    const filePath = file.path;

    // Extract text from document
    console.log('📖 Starting text extraction...');
    const { text, metadata } = await extractText(filePath, file.mimetype);
    console.log(`✅ Text extracted: ${text.length} chars`);

    // Create document record
    console.log('💾 Creating database record...');
    const document = await Document.create({
      userId: req.user._id,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      content: text,
      status: 'processing',
      metadata: {
        ...metadata,
        extractedAt: new Date()
      }
    });
    console.log(`✅ Document created with ID: ${document._id}`);

    // Process in background (chunk and embed)
    console.log('⚙️ Starting background processing...');
    processDocument(document._id, text, req.user._id).catch(err => {
      console.error('❌ Background processing error:', err);
    });

    // Clean up uploaded file
    console.log('🧹 Cleaning up uploaded file...');
    await fs.unlink(filePath).catch((err) => console.warn('⚠️ Failed to delete temp file:', err.message));

    console.log('🎉 Sending success response');
    res.status(201).json({
      success: true,
      message: 'Document uploaded and processing started',
      data: { document }
    });
  } catch (error) {
    console.error('❌ Upload controller error:', error);
    // Clean up file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};

/**
 * Process document: chunk and generate embeddings
 */
const processDocument = async (documentId, text, userId) => {
  try {
    // Chunk the text
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      await Document.findByIdAndUpdate(documentId, {
        status: 'error',
        error: 'No text content found in document'
      });
      return;
    }

    // Generate embeddings for all chunks
    const texts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(texts);

    // Save chunks with embeddings
    const chunkDocs = chunks.map((chunk, index) => ({
      documentId,
      userId,
      text: chunk.text,
      embedding: embeddings[index],
      chunkIndex: chunk.chunkIndex,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      metadata: chunk.metadata
    }));

    await Chunk.insertMany(chunkDocs);

    // Update document status
    await Document.findByIdAndUpdate(documentId, {
      status: 'embedded',
      chunkCount: chunks.length
    });

    console.log(`✅ Document ${documentId} processed: ${chunks.length} chunks`);
  } catch (error) {
    console.error(`❌ Document processing failed:`, error);
    await Document.findByIdAndUpdate(documentId, {
      status: 'error',
      error: error.message
    });
  }
};

/**
 * Get all documents for user
 * GET /api/documents
 */
export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .select('-content')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
};

/**
 * Get single document
 * GET /api/documents/:id
 */
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
};

/**
 * Delete a document and its chunks
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete associated chunks
    await Chunk.deleteMany({ documentId: document._id });

    res.json({
      success: true,
      message: 'Document deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

export default { uploadDocument, getDocuments, getDocument, deleteDocument };
