import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extract text from various document formats
 * Supports: PDF, TXT, DOCX
 */
export const extractText = async (filePath, mimeType) => {
  const extension = path.extname(filePath).toLowerCase();
  
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await extractFromPDF(filePath);
      
      case 'text/plain':
        return await extractFromTXT(filePath);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractFromDOCX(filePath);
      
      default:
        // Try to detect by extension
        if (extension === '.pdf') return await extractFromPDF(filePath);
        if (extension === '.txt') return await extractFromTXT(filePath);
        if (extension === '.docx') return await extractFromDOCX(filePath);
        
        throw new Error(`Unsupported file type: ${mimeType || extension}`);
    }
  } catch (error) {
    throw new Error(`Text extraction failed: ${error.message}`);
  }
};

/**
 * Extract text from PDF files
 */
const extractFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    
    // Check file size - skip very large PDFs that might crash
    if (dataBuffer.length > 20 * 1024 * 1024) { // 20MB limit
      throw new Error('PDF file is too large for processing');
    }
    
    const data = await pdfParse(dataBuffer, {
      max: 0, // No page limit
      version: 'v2.0.550' // Use more stable parser version
    });
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }
    
    return {
      text: data.text,
      metadata: {
        pageCount: data.numpages || 1,
        wordCount: data.text.split(/\s+/).filter(Boolean).length
      }
    };
  } catch (error) {
    console.error('PDF extraction error:', error.message);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Extract text from TXT files
 */
const extractFromTXT = async (filePath) => {
  const text = await fs.readFile(filePath, 'utf-8');
  
  return {
    text,
    metadata: {
      pageCount: 1,
      wordCount: text.split(/\s+/).filter(Boolean).length
    }
  };
};

/**
 * Extract text from DOCX files
 */
const extractFromDOCX = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer: dataBuffer });
  const text = result.value;
  
  return {
    text,
    metadata: {
      pageCount: 1, // DOCX doesn't have page count in raw extraction
      wordCount: text.split(/\s+/).filter(Boolean).length
    }
  };
};

export default { extractText };
