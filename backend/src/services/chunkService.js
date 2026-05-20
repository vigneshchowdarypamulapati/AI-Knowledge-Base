/**
 * Token-Aware Chunking Service
 *
 * Strategy: Variable-size sliding windows of 350–450 tokens with 10–15% overlap.
 * This matches the evaluation finding that variable chunking with overlap
 * outperforms fixed chunking significantly (60% → 85% top-k precision).
 *
 * Uses gpt-tokenizer (cl100k_base) for accurate token counting — compatible
 * with most modern embedding models including Gemini text-embedding-004.
 */

import { encode, decode } from 'gpt-tokenizer';

// ── Default Strategy Parameters ──────────────────────────────────────────────
const DEFAULTS = {
  minTokens: 350,
  maxTokens: 450,
  overlapRatio: 0.12,     // 12% — center of the 10–15% target range
  minChunkChars: 50,       // discard tiny shard chunks
};

/**
 * Chunk text into variable-size token windows with overlap.
 *
 * @param {string} text - Full document text
 * @param {object} [opts] - Override defaults
 * @param {number} [opts.minTokens=350]
 * @param {number} [opts.maxTokens=450]
 * @param {number} [opts.overlapRatio=0.12]
 * @returns {Array<{text, tokenCount, chunkIndex, startToken, endToken, metadata}>}
 */
export const chunkText = (text, opts = {}) => {
  const { minTokens, maxTokens, overlapRatio, minChunkChars } = { ...DEFAULTS, ...opts };

  if (!text || text.trim().length === 0) return [];

  // Normalise whitespace
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Tokenise the entire document once
  const allTokens = encode(cleaned);
  if (allTokens.length === 0) return [];

  const chunks = [];
  let startIdx = 0;
  let chunkIndex = 0;

  while (startIdx < allTokens.length) {
    // Pick a random window size in [minTokens, maxTokens]
    const windowSize =
      minTokens + Math.floor(Math.random() * (maxTokens - minTokens + 1));

    const endIdx = Math.min(startIdx + windowSize, allTokens.length);
    const chunkTokens = allTokens.slice(startIdx, endIdx);

    // Decode tokens back to text
    const chunkText = decode(chunkTokens).trim();

    if (chunkText.length >= minChunkChars) {
      const wordCount = chunkText.split(/\s+/).filter(Boolean).length;
      chunks.push({
        text: chunkText,
        tokenCount: chunkTokens.length,
        chunkIndex,
        startToken: startIdx,
        endToken: endIdx - 1,
        metadata: {
          tokenCount: chunkTokens.length,
          wordCount,
          charCount: chunkText.length,
        },
      });
      chunkIndex++;
    }

    // Break if we've consumed all tokens
    if (endIdx >= allTokens.length) break;

    // Advance with overlap: step = windowSize * (1 - overlapRatio)
    const step = Math.max(1, Math.floor(windowSize * (1 - overlapRatio)));
    startIdx += step;
  }

  return chunks;
};

/**
 * Estimate how many chunks a text will produce (without actually tokenising).
 * Useful for progress bars during upload.
 */
export const estimateChunkCount = (text, opts = {}) => {
  const { minTokens, maxTokens, overlapRatio } = { ...DEFAULTS, ...opts };
  if (!text) return 0;

  // Rough estimate: 1 token ≈ 4 characters for English text
  const estimatedTokens = Math.ceil(text.length / 4);
  const avgWindow = (minTokens + maxTokens) / 2;
  const step = avgWindow * (1 - overlapRatio);
  return Math.max(1, Math.ceil(estimatedTokens / step));
};

/**
 * Get chunking strategy stats for a given text (used by eval harness).
 */
export const getChunkStats = (chunks) => {
  if (!chunks || chunks.length === 0) return null;
  const tokenCounts = chunks.map((c) => c.tokenCount);
  return {
    count: chunks.length,
    minTokens: Math.min(...tokenCounts),
    maxTokens: Math.max(...tokenCounts),
    avgTokens: Math.round(tokenCounts.reduce((a, b) => a + b, 0) / chunks.length),
  };
};

export default { chunkText, estimateChunkCount, getChunkStats };
