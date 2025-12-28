import Chunk from '../models/Chunk.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * Vector similarity search using cosine similarity
 */

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Similarity score between -1 and 1
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimension');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
};

/**
 * Find similar chunks for a query
 * @param {string} query - User's question
 * @param {string} userId - User ID
 * @param {string[]} documentIds - Optional array of document IDs to search in
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} Array of similar chunks with scores
 */
export const findSimilarChunks = async (query, userId, documentIds = null, topK = 5) => {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Build query filter
  const filter = { userId };
  if (documentIds && documentIds.length > 0) {
    filter.documentId = { $in: documentIds };
  }
  
  // Fetch all relevant chunks
  const chunks = await Chunk.find(filter)
    .populate('documentId', 'originalName filename')
    .lean();
  
  if (chunks.length === 0) {
    return [];
  }
  
  // Calculate similarity scores
  const scoredChunks = chunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));
  
  // Sort by similarity and return top K
  scoredChunks.sort((a, b) => b.similarity - a.similarity);
  
  return scoredChunks.slice(0, topK).map(chunk => ({
    chunkId: chunk._id,
    documentId: chunk.documentId?._id,
    documentName: chunk.documentId?.originalName || 'Unknown',
    text: chunk.text,
    similarity: chunk.similarity,
    chunkIndex: chunk.chunkIndex
  }));
};

/**
 * Find similar chunks with a minimum similarity threshold
 */
export const findSimilarChunksWithThreshold = async (query, userId, threshold = 0.5, documentIds = null, maxResults = 10) => {
  const results = await findSimilarChunks(query, userId, documentIds, maxResults);
  return results.filter(chunk => chunk.similarity >= threshold);
};

export default { cosineSimilarity, findSimilarChunks, findSimilarChunksWithThreshold };
