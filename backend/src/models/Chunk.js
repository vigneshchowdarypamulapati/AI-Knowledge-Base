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
  startChar: {
    type: Number,
    required: true
  },
  endChar: {
    type: Number,
    required: true
  },
  metadata: {
    wordCount: Number,
    charCount: Number
  }
}, {
  timestamps: true
});

// Compound index for efficient retrieval
chunkSchema.index({ userId: 1, documentId: 1 });

const Chunk = mongoose.model('Chunk', chunkSchema);

export default Chunk;
