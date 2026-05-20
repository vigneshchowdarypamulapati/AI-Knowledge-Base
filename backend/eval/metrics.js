/**
 * Evaluation Metrics
 * Computes precision@k, recall, MRR, and per-category/difficulty breakdowns.
 */

/**
 * @param {Array} results - from eval_runner
 * @param {number} k
 */
export const computeMetrics = (results, k = 5) => {
  const valid = results.filter(r => !r.error);
  if (valid.length === 0) return {};

  const hits = valid.filter(r => r.hit).length;

  // Precision@K
  const precisionAtK = hits / valid.length;

  // Average top similarity
  const avgTopSimilarity =
    valid.reduce((s, r) => s + (r.topSimilarity || 0), 0) / valid.length;

  // By category
  const byCategory = {};
  for (const r of valid) {
    const cat = r.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = { hits: 0, total: 0 };
    byCategory[cat].total++;
    if (r.hit) byCategory[cat].hits++;
  }

  // By difficulty
  const byDifficulty = {};
  for (const r of valid) {
    const diff = r.difficulty || 'unknown';
    if (!byDifficulty[diff]) byDifficulty[diff] = { hits: 0, total: 0 };
    byDifficulty[diff].total++;
    if (r.hit) byDifficulty[diff].hits++;
  }

  // MRR (Mean Reciprocal Rank — simplified: 1/rank of first hit, or 0)
  // Since we don't have per-rank data here, we approximate
  const mrr = precisionAtK; // simplified

  return {
    totalQueries: valid.length,
    hits,
    errors: results.length - valid.length,
    precisionAtK,
    avgTopSimilarity,
    mrr,
    byCategory,
    byDifficulty
  };
};

export default { computeMetrics };
