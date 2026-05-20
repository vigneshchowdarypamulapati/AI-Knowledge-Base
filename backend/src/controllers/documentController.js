import fs from 'fs/promises';
import path from 'path';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import { extractText } from '../services/textExtractor.js';
import { chunkText, getChunkStats } from '../services/chunkService.js';
import { generateEmbeddings } from '../services/embeddingService.js';

/**
 * Upload and process a document
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { file } = req;
    const filePath = file.path;

    console.log(`📁 Processing: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);

    // Extract text
    const { text, metadata } = await extractText(filePath, file.mimetype);
    console.log(`✅ Extracted ${text.length} chars`);

    // Create document record
    const document = await Document.create({
      userId: req.user._id,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      content: text,
      status: 'processing',
      metadata: { ...metadata, extractedAt: new Date() }
    });

    // Fire-and-forget background processing
    processDocument(document._id, text, req.user._id).catch(err => {
      console.error('❌ Background processing error:', err);
    });

    // Clean up temp file
    await fs.unlink(filePath).catch(err =>
      console.warn('⚠️  Failed to delete temp file:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded. Processing started in background.',
      data: { document }
    });
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    console.error('❌ Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};

/**
 * Background processor: chunk → embed → store
 */
const processDocument = async (documentId, text, userId) => {
  try {
    // Remove any existing chunks (supports re-processing)
    await Chunk.deleteMany({ documentId });

    // Chunk with token-aware strategy
    const chunks = chunkText(text);
    const stats = getChunkStats(chunks);
    console.log(`📊 Chunk stats:`, stats);

    if (chunks.length === 0) {
      await Document.findByIdAndUpdate(documentId, {
        status: 'error',
        error: 'No text content found in document'
      });
      return;
    }

    // Generate embeddings in batches
    const texts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(texts);

    // Bulk insert chunks
    const chunkDocs = chunks.map((chunk, i) => ({
      documentId,
      userId,
      text: chunk.text,
      embedding: embeddings[i],
      chunkIndex: chunk.chunkIndex,
      startToken: chunk.startToken || 0,
      endToken: chunk.endToken || 0,
      metadata: chunk.metadata
    }));

    await Chunk.insertMany(chunkDocs);

    // Update document status with chunk stats
    await Document.findByIdAndUpdate(documentId, {
      status: 'embedded',
      chunkCount: chunks.length,
      'metadata.chunkStats': stats
    });

    console.log(`✅ Document ${documentId} processed: ${chunks.length} chunks`);
  } catch (error) {
    console.error('❌ Document processing failed:', error);
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
      .select('-content -metadata.chunkStats')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { documents } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents', error: error.message });
  }
};

/**
 * Get single document
 * GET /api/documents/:id
 */
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, data: { document } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch document', error: error.message });
  }
};

/**
 * Re-process a document (re-chunk + re-embed)
 * POST /api/documents/:id/reprocess
 */
export const reprocessDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!document.content) {
      return res.status(400).json({
        success: false,
        message: 'Document content not available for reprocessing. Please re-upload the file.'
      });
    }

    // Reset status to processing
    await Document.findByIdAndUpdate(document._id, { status: 'processing', error: null });

    // Re-process in background
    processDocument(document._id, document.content, req.user._id).catch(err => {
      console.error('❌ Reprocess error:', err);
    });

    res.json({ success: true, message: 'Document reprocessing started' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reprocess', error: error.message });
  }
};

/**
 * Delete a document and its chunks
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await Chunk.deleteMany({ documentId: document._id });

    res.json({ success: true, message: 'Document and all chunks deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message });
  }
};

/**
 * Get document stats for analytics
 * GET /api/documents/stats
 */
export const getDocumentStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [docStats, chunkStats] = await Promise.all([
      Document.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' },
            totalChunks: { $sum: '$chunkCount' }
          }
        }
      ]),
      Chunk.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalChunks: { $sum: 1 },
            avgTokens: { $avg: '$metadata.tokenCount' },
            minTokens: { $min: '$metadata.tokenCount' },
            maxTokens: { $max: '$metadata.tokenCount' }
          }
        }
      ])
    ]);

    // Total document count
    const totalDocs = await Document.countDocuments({ userId });

    const statusMap = docStats.reduce((acc, s) => {
      acc[s._id] = { count: s.count, size: s.totalSize, chunks: s.totalChunks };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalDocuments: totalDocs,
        byStatus: statusMap,
        chunks: chunkStats[0] || { totalChunks: 0, avgTokens: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
};

export default { uploadDocument, getDocuments, getDocument, reprocessDocument, deleteDocument, getDocumentStats };
