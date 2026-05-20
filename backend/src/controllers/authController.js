import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ email, password, name });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: user.toJSON(), token }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: user.toJSON(), token }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

/**
 * Reset password (Mock email flow for portfolio)
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success anyway for security (don't leak email existence)
      return res.json({ success: true, message: 'If an account exists, the password has been reset.' });
    }

    user.password = newPassword;
    await user.save(); // This triggers the pre-save hook to hash the password

    res.json({
      success: true,
      message: 'Password has been successfully reset. You can now login.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Password reset failed', error: error.message });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, message: 'Profile updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed', error: error.message });
  }
};

/**
 * Update RAG settings
 * PUT /api/auth/settings
 */
export const updateSettings = async (req, res) => {
  try {
    const { topK, similarityThreshold, useHyDE, streamingEnabled, chunkStrategy, model } = req.body;

    const allowedSettings = {};
    if (topK !== undefined) allowedSettings['settings.topK'] = topK;
    if (similarityThreshold !== undefined) allowedSettings['settings.similarityThreshold'] = similarityThreshold;
    if (useHyDE !== undefined) allowedSettings['settings.useHyDE'] = useHyDE;
    if (streamingEnabled !== undefined) allowedSettings['settings.streamingEnabled'] = streamingEnabled;
    if (chunkStrategy !== undefined) allowedSettings['settings.chunkStrategy'] = chunkStrategy;
    if (model !== undefined) allowedSettings['settings.model'] = model;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: allowedSettings },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, message: 'Settings updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Settings update failed', error: error.message });
  }
};

export default { register, login, resetPassword, getMe, updateProfile, updateSettings };
