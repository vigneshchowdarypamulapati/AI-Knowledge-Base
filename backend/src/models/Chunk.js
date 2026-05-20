import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  // Token-level positional data (used by eval harness)
  startToken: {
    type: Number,
    default: 0
  },
  endToken: {
    type: Number,
    default: 0
  },
  metadata: {
    tokenCount: Number,   // ← NEW: accurate token count
    wordCount: Number,
    charCount: Number
  }
}, {
  timestamps: true
});

// Compound index for efficient per-user retrieval
chunkSchema.index({ userId: 1, documentId: 1 });

// ── MongoDB Atlas Vector Search Index (create this in Atlas UI) ──────────────
// Index name: "chunk_vector_index"
// Field: "embedding" | Type: vector | Dimensions: 768 | Similarity: cosine
// Pre-filter field: "userId" | Type: filter
// ─────────────────────────────────────────────────────────────────────────────

const Chunk = mongoose.model('Chunk', chunkSchema);

export default Chunk;
