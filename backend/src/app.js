import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import initializeGemini from './config/gemini.js';
import initializeGroq from './config/groq.js';

import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Global: 200 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Chat / query: 60 requests / 15 min (LLM calls are expensive)
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Chat rate limit exceeded. Please wait before sending more messages.' }
});

// Upload: 20 uploads / hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Upload limit reached. Max 20 documents per hour.' }
});

app.use(globalLimiter);
app.use('/api/chat/stream', chatLimiter);
app.use('/api/chat/query', chatLimiter);
app.use('/api/documents/upload', uploadLimiter);

// ── Request Logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: {
      vectorSearch: process.env.MONGODB_ATLAS_VECTOR_SEARCH === 'true' ? 'atlas' : 'fallback',
      hyde: 'enabled',
      chunking: 'token-aware-variable'
    }
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    initializeGemini();
    initializeGroq();

    app.listen(PORT, () => {
      console.log(`
🚀 DocMind API Server v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server:         http://localhost:${PORT}
📍 Health:         http://localhost:${PORT}/api/health
🔍 Vector Search:  ${process.env.MONGODB_ATLAS_VECTOR_SEARCH === 'true' ? '✅ MongoDB Atlas' : '⚠️  Fallback (set MONGODB_ATLAS_VECTOR_SEARCH=true)'}
💡 HyDE:           Enabled
📦 Chunking:       Token-aware variable (350–450 tokens)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
