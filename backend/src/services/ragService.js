import { getGroqClient } from '../config/groq.js';
import { findSimilarChunks, findSimilarChunksByVector } from './vectorService.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 *
 * Features:
 *   • HyDE  — Hypothetical Document Embeddings for improved retrieval precision
 *   • Inline citation markers [1], [2] injected into answers
 *   • Correct multi-turn conversation history injection
 *   • User-configurable topK, model, and threshold
 *   • Retrieval metadata (tokens searched, chunks found) returned for analytics
 */

// ── System Prompts ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are DocMind, a precise document intelligence assistant. Your only knowledge source is the provided document context.

Rules:
1. Answer ONLY from the provided context. Do NOT use outside knowledge.
2. Cite your sources using inline markers like [1], [2] that match the numbered sources provided.
3. If a fact comes from Source 2, write it like: "The report states... [2]"
4. If the context doesn't contain the answer, say exactly: "I couldn't find relevant information in the provided documents."
5. Never mention "context" or "chunks" — speak naturally as if reading documents.
6. Format responses with markdown: headers, bullet points, bold for key terms.
7. Be concise but complete. Prioritise accuracy over verbosity.`;

const HYDE_PROMPT = `Generate a short, factual passage (2-4 sentences) that would directly answer the following question. Write as if it were an excerpt from a relevant document. Do not include caveats or say you're generating a hypothetical — just write the passage.

Question: `;

// ── HyDE: Hypothetical Document Embedding ────────────────────────────────────
/**
 * Generate a hypothetical answer to the query, then embed it.
 * HyDE embedding is closer in semantic space to real relevant chunks
 * than a bare question, improving retrieval precision significantly.
 */
const generateHyDEEmbedding = async (query, groq, model) => {
  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: HYDE_PROMPT + query }
      ],
      max_tokens: 200,
      temperature: 0.3
    });
    const hypothetical = completion.choices[0].message.content;
    console.log(`💡 [HyDE] Generated hypothetical: "${hypothetical.substring(0, 80)}..."`);
    return await generateEmbedding(hypothetical);
  } catch (err) {
    console.warn('⚠️  HyDE generation failed, falling back to direct query embedding:', err.message);
    return null; // caller will fall back to direct query embedding
  }
};

// ── Context Builder ───────────────────────────────────────────────────────────
const buildContext = (chunks) =>
  chunks
    .map((chunk, i) =>
      `[Source ${i + 1}] From "${chunk.documentName}":\n${chunk.text}`
    )
    .join('\n\n---\n\n');

// ── Source Formatter ──────────────────────────────────────────────────────────
const formatSources = (chunks) =>
  chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    chunkText: chunk.text.substring(0, 300) + (chunk.text.length > 300 ? '...' : ''),
    similarity: Math.round(chunk.similarity * 1000) / 1000,
    chunkIndex: chunk.chunkIndex,
    tokenCount: chunk.tokenCount
  }));

// ── Non-streaming RAG Response ────────────────────────────────────────────────
export const generateRAGResponse = async (
  query,
  userId,
  documentIds = null,
  userSettings = {}
) => {
  const {
    topK = 5,
    similarityThreshold = 0.3,
    useHyDE = true,
    model = 'llama-3.3-70b-versatile'
  } = userSettings;

  const groq = getGroqClient();

  // Step 1: Embed query (with optional HyDE)
  let retrievalEmbedding = null;
  if (useHyDE) {
    retrievalEmbedding = await generateHyDEEmbedding(query, groq, model);
  }

  // Step 2: Retrieve relevant chunks
  let relevantChunks = [];
  try {
    if (retrievalEmbedding) {
      relevantChunks = await findSimilarChunksByVector(
        retrievalEmbedding, userId, documentIds, topK, similarityThreshold
      );
      // If HyDE retrieval found nothing, retry with direct query
      if (relevantChunks.length === 0) {
        relevantChunks = await findSimilarChunks(
          query, userId, documentIds, topK, similarityThreshold
        );
      }
    } else {
      relevantChunks = await findSimilarChunks(
        query, userId, documentIds, topK, similarityThreshold
      );
    }
  } catch (error) {
    console.error('❌ Retrieval error:', error);
    return {
      answer: `Retrieval error: ${error.message}`,
      sources: [],
      hasContext: false,
      retrievalStats: { chunksFound: 0, hydeUsed: false }
    };
  }

  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in the provided documents. Try uploading more documents or rephrasing your question.",
      sources: [],
      hasContext: false,
      retrievalStats: { chunksFound: 0, hydeUsed: !!retrievalEmbedding }
    };
  }

  // Step 3: Build prompt with numbered context sources
  const context = buildContext(relevantChunks);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Document Sources:\n\n${context}\n\n---\n\nQuestion: ${query}\n\nProvide a well-cited answer using [1], [2] etc. to reference the sources above:`
    }
  ];

  // Step 4: Generate answer
  let answer = '';
  try {
    const completion = await groq.chat.completions.create({
      messages,
      model,
      temperature: 0.1,
      max_tokens: 1024
    });
    answer = completion.choices[0].message.content;
  } catch (error) {
    console.error('❌ Groq generation error:', error);
    answer = `Generation error: ${error.message}`;
  }

  return {
    answer,
    sources: formatSources(relevantChunks),
    hasContext: true,
    retrievalStats: {
      chunksFound: relevantChunks.length,
      hydeUsed: !!retrievalEmbedding,
      topK,
      model
    }
  };
};

// ── Streaming RAG Response ────────────────────────────────────────────────────
export async function* generateStreamingRAGResponse(
  query,
  userId,
  documentIds = null,
  conversationHistory = [],
  userSettings = {}
) {
  const {
    topK = 5,
    similarityThreshold = 0.3,
    useHyDE = true,
    model = 'llama-3.3-70b-versatile'
  } = userSettings;

  const groq = getGroqClient();

  // Step 1: HyDE embedding
  let retrievalEmbedding = null;
  if (useHyDE) {
    retrievalEmbedding = await generateHyDEEmbedding(query, groq, model);
  }

  // Step 2: Retrieve
  let relevantChunks = [];
  try {
    if (retrievalEmbedding) {
      relevantChunks = await findSimilarChunksByVector(
        retrievalEmbedding, userId, documentIds, topK, similarityThreshold
      );
      if (relevantChunks.length === 0) {
        relevantChunks = await findSimilarChunks(
          query, userId, documentIds, topK, similarityThreshold
        );
      }
    } else {
      relevantChunks = await findSimilarChunks(
        query, userId, documentIds, topK, similarityThreshold
      );
    }
  } catch (error) {
    yield { type: 'error', content: `Retrieval failed: ${error.message}` };
    return;
  }

  // Step 3: Yield retrieval stats + sources before streaming answer
  const retrievalStats = {
    chunksFound: relevantChunks.length,
    hydeUsed: !!retrievalEmbedding,
    topK,
    model
  };

  yield { type: 'retrieval_stats', content: retrievalStats };

  if (relevantChunks.length === 0) {
    yield {
      type: 'answer',
      content: "I couldn't find relevant information in the provided documents. Try uploading more documents or rephrasing your question."
    };
    return;
  }

  yield {
    type: 'sources',
    content: formatSources(relevantChunks)
  };

  // Step 4: Build messages with CORRECT multi-turn history injection
  //   History is injected BEFORE the current context turn so the model
  //   has full context at the current turn without contaminating history.
  const context = buildContext(relevantChunks);

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Inject recent history (compressed to last 6 turns = 3 exchanges)
  const recentHistory = conversationHistory.slice(-6);
  for (const msg of recentHistory) {
    // Only inject the content, not prior contexts (avoids token explosion)
    messages.push({ role: msg.role, content: msg.content });
  }

  // Current turn — context + question
  messages.push({
    role: 'user',
    content: `Document Sources:\n\n${context}\n\n---\n\nQuestion: ${query}\n\nProvide a well-cited answer using [1], [2] etc.:`
  });

  // Step 5: Stream answer
  try {
    const stream = await groq.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.1,
      max_tokens: 1024
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield { type: 'answer', content };
      }
    }
  } catch (error) {
    console.error('❌ Groq streaming error:', error);
    yield { type: 'error', content: `Streaming error: ${error.message}` };
  }
}

export default { generateRAGResponse, generateStreamingRAGResponse };
