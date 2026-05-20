/**
 * Evaluation Runner
 *
 * Computes top-k precision for each query in queries.json.
 * A "hit" is defined as: at least one retrieved chunk whose text
 * contains any of the query's expectedKeywords (case-insensitive).
 *
 * Usage:
 *   node eval/eval_runner.js [--topK=5] [--strategy=variable|fixed]
 *
 * Prerequisites:
 *   1. MONGODB_URI and GEMINI_API_KEY must be set in ../.env
 *   2. At least one document must be uploaded and processed
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { generateEmbedding } from '../src/services/embeddingService.js';
import { findSimilarChunks } from '../src/services/vectorService.js';
import { computeMetrics } from './metrics.js';

// ── Config ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const a = args.find(a => a.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
};

const TOP_K       = parseInt(getArg('topK', '5'));
const STRATEGY    = getArg('strategy', 'variable');
const RESULTS_DIR = resolve(__dirname, 'results');

// ── Helpers ───────────────────────────────────────────────────────────────────
const isHit = (retrievedChunks, expectedKeywords) => {
  return retrievedChunks.some(chunk =>
    expectedKeywords.some(kw =>
      chunk.text.toLowerCase().includes(kw.toLowerCase())
    )
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       DocMind Retrieval Evaluation Harness    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Strategy : ${STRATEGY}`);
  console.log(`  TopK     : ${TOP_K}`);
  console.log('');

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Import User model to get a test user
  const { default: User } = await import('../src/models/User.js');
  const { default: Chunk } = await import('../src/models/Chunk.js');

  // Find first user with chunks
  const chunkWithUser = await Chunk.findOne().lean();
  if (!chunkWithUser) {
    console.error('❌ No chunks found. Upload and process at least one document first.');
    process.exit(1);
  }
  const userId = chunkWithUser.userId;
  const totalChunks = await Chunk.countDocuments({ userId });
  console.log(`📚 Evaluating against ${totalChunks} chunks for userId: ${userId}\n`);

  // Load queries
  const queries = JSON.parse(
    readFileSync(resolve(__dirname, 'queries.json'), 'utf-8')
  );
  console.log(`📋 Loaded ${queries.length} evaluation queries\n`);

  // Run evaluation
  const results = [];
  let hits = 0;
  let errors = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    process.stdout.write(`  [${String(i+1).padStart(2,'0')}/${queries.length}] ${q.id} — "${q.query.substring(0, 50)}" ... `);

    try {
      const retrieved = await findSimilarChunks(q.query, userId, null, TOP_K);
      const hit = retrieved.length > 0 && isHit(retrieved, q.expectedKeywords);

      if (hit) hits++;

      const topSimilarity = retrieved[0]?.similarity ?? 0;
      const avgSimilarity = retrieved.length > 0
        ? retrieved.reduce((s, c) => s + c.similarity, 0) / retrieved.length
        : 0;

      results.push({
        id: q.id,
        query: q.query,
        category: q.category,
        difficulty: q.difficulty,
        retrieved: retrieved.length,
        hit,
        topSimilarity: Math.round(topSimilarity * 1000) / 1000,
        avgSimilarity: Math.round(avgSimilarity * 1000) / 1000,
        topChunks: retrieved.slice(0, 2).map(c => ({
          doc: c.documentName,
          similarity: Math.round(c.similarity * 1000) / 1000,
          preview: c.text.substring(0, 100)
        }))
      });

      console.log(hit ? '✅ HIT' : '❌ MISS');
    } catch (err) {
      errors++;
      results.push({ id: q.id, query: q.query, error: err.message });
      console.log(`⚠️  ERROR: ${err.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  // Compute final metrics
  const metrics = computeMetrics(results, TOP_K);

  // Print summary
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║                EVALUATION RESULTS             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Total Queries  : ${queries.length}`);
  console.log(`  Hits           : ${hits} / ${queries.length - errors}`);
  console.log(`  Errors         : ${errors}`);
  console.log(`  Precision@${TOP_K}    : ${(metrics.precisionAtK * 100).toFixed(1)}%`);
  console.log(`  Avg Similarity : ${(metrics.avgTopSimilarity * 100).toFixed(1)}%`);
  console.log('');
  console.log('  By Category:');
  Object.entries(metrics.byCategory).forEach(([cat, data]) => {
    const pct = (data.hits / data.total * 100).toFixed(0);
    console.log(`    ${cat.padEnd(20)} ${pct.padStart(3)}%  (${data.hits}/${data.total})`);
  });
  console.log('');
  console.log('  By Difficulty:');
  Object.entries(metrics.byDifficulty).forEach(([diff, data]) => {
    const pct = (data.hits / data.total * 100).toFixed(0);
    console.log(`    ${diff.padEnd(10)} ${pct.padStart(3)}%  (${data.hits}/${data.total})`);
  });

  // Save results
  mkdirSync(RESULTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${STRATEGY}_topK${TOP_K}_${timestamp}.json`;
  const outputPath = resolve(RESULTS_DIR, filename);

  writeFileSync(outputPath, JSON.stringify({
    config: { strategy: STRATEGY, topK: TOP_K, timestamp: new Date().toISOString() },
    summary: metrics,
    results
  }, null, 2));

  console.log(`\n💾 Results saved to: eval/results/${filename}`);

  await mongoose.disconnect();
  console.log('\n✅ Evaluation complete!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
