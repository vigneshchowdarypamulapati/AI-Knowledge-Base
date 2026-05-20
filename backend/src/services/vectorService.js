import Chunk from '../models/Chunk.js';
import mongoose from 'mongoose';
import { generateEmbedding } from './embeddingService.js';

/**
 * Vector Similarity Search Service
 *
 * Strategy:
 *   1. PRIMARY  — MongoDB Atlas $vectorSearch aggregation (HNSW index, O(log n))
 *   2. FALLBACK — In-memory cosine similarity (for local dev without Atlas index)
 *
 * The Atlas path is used when MONGODB_ATLAS_VECTOR_SEARCH=true in .env.
 */

const USE_ATLAS = process.env.MONGODB_ATLAS_VECTOR_SEARCH === 'true';
const VECTOR_INDEX_NAME = process.env.ATLAS_VECTOR_INDEX_NAME || 'chunk_vector_index';

// ── Cosine similarity (fallback / eval harness) ───────────────────────────────
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
};

// ── Atlas $vectorSearch path ──────────────────────────────────────────────────
const findWithAtlas = async (queryEmbedding, userId, documentIds, topK) => {
  const preFilter = { userId: { $eq: userId } };
  if (documentIds && documentIds.length > 0) {
    preFilter.documentId = {
      $in: documentIds.map(id =>
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      )
    };
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: Math.min(topK * 20, 500),
        limit: topK,
        filter: preFilter
      }
    },
    {
      $lookup: {
        from: 'documents',
        localField: 'documentId',
        foreignField: '_id',
        as: 'document'
      }
    },
    { $unwind: '$document' },
    {
      $project: {
        text: 1,
        documentId: 1,
        chunkIndex: 1,
        tokenCount: '$metadata.tokenCount',
        score: { $meta: 'vectorSearchScore' },
        documentName: '$document.originalName'
      }
    }
  ];

  const results = await Chunk.aggregate(pipeline);
  return results.map(r => ({
    chunkId: r._id,
    documentId: r.documentId,
    documentName: r.documentName || 'Unknown',
    text: r.text,
    similarity: r.score,
    chunkIndex: r.chunkIndex,
    tokenCount: r.tokenCount
  }));
};

// ── In-memory fallback path ───────────────────────────────────────────────────
const findWithFallback = async (queryEmbedding, userId, documentIds, topK) => {
  const filter = { userId };
  if (documentIds && documentIds.length > 0) {
    filter.documentId = { $in: documentIds };
  }

  const chunks = await Chunk.find(filter)
    .populate('documentId', 'originalName filename')
    .lean();

  if (chunks.length === 0) return [];

  const scored = chunks
    .map(chunk => ({
      chunkId: chunk._id,
      documentId: chunk.documentId?._id,
      documentName: chunk.documentId?.originalName || 'Unknown',
      text: chunk.text,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.metadata?.tokenCount
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
};

// ── Public API ────────────────────────────────────────────────────────────────

export const findSimilarChunks = async (
  query,
  userId,
  documentIds = null,
  topK = 5,
  threshold = 0.0
) => {
  const queryEmbedding = await generateEmbedding(query);

  let results;
  if (USE_ATLAS) {
    console.log(`🔍 [Atlas Vector Search] topK=${topK}, index="${VECTOR_INDEX_NAME}"`);
    results = await findWithAtlas(queryEmbedding, userId, documentIds, topK);
  } else {
    console.log(`🔍 [Fallback cosine] topK=${topK} (set MONGODB_ATLAS_VECTOR_SEARCH=true for Atlas)`);
    results = await findWithFallback(queryEmbedding, userId, documentIds, topK);
  }

  return threshold > 0 ? results.filter(r => r.similarity >= threshold) : results;
};

export const findSimilarChunksByVector = async (
  embedding,
  userId,
  documentIds = null,
  topK = 5,
  threshold = 0.0
) => {
  let results;
  if (USE_ATLAS) {
    results = await findWithAtlas(embedding, userId, documentIds, topK);
  } else {
    results = await findWithFallback(embedding, userId, documentIds, topK);
  }
  return threshold > 0 ? results.filter(r => r.similarity >= threshold) : results;
};

export default { cosineSimilarity, findSimilarChunks, findSimilarChunksByVector };
