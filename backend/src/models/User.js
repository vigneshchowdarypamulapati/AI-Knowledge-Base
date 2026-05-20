import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  // ── RAG Settings (user-configurable) ────────────────────────────────────────
  settings: {
    topK: {
      type: Number,
      default: 5,
      min: 1,
      max: 20
    },
    similarityThreshold: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    },
    useHyDE: {
      type: Boolean,
      default: true     // Hypothetical Document Embeddings — better retrieval
    },
    streamingEnabled: {
      type: Boolean,
      default: true
    },
    chunkStrategy: {
      type: String,
      enum: ['variable', 'fixed'],
      default: 'variable'
    },
    model: {
      type: String,
      enum: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
      default: 'llama-3.3-70b-versatile'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

import bcrypt from 'bcryptjs';

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
