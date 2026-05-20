import ChatHistory from '../models/ChatHistory.js';
import User from '../models/User.js';
import { generateRAGResponse, generateStreamingRAGResponse } from '../services/ragService.js';

// ── Streaming Chat ─────────────────────────────────────────────────────────────
/**
 * POST /api/chat/stream
 */
export const streamQueryDocuments = async (req, res) => {
  try {
    const { question, documentIds, chatId } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    // Fetch user settings for RAG configuration
    const user = await User.findById(req.user._id).select('settings');
    const userSettings = user?.settings || {};

    // Fetch conversation history if chatId provided
    let conversationHistory = [];
    if (chatId) {
      const chat = await ChatHistory.findById(chatId);
      if (chat?.messages) {
        conversationHistory = chat.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const stream = generateStreamingRAGResponse(
      question,
      req.user._id,
      documentIds || null,
      conversationHistory,
      userSettings
    );

    let fullAnswer = '';
    let sources = [];
    let retrievalStats = null;

    for await (const chunk of stream) {
      if (chunk.type === 'sources') {
        sources = chunk.content;
        res.write(`data: ${JSON.stringify({ type: 'sources', content: sources })}\n\n`);
      } else if (chunk.type === 'retrieval_stats') {
        retrievalStats = chunk.content;
        res.write(`data: ${JSON.stringify({ type: 'retrieval_stats', content: retrievalStats })}\n\n`);
      } else if (chunk.type === 'answer') {
        fullAnswer += chunk.content;
        res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk.content })}\n\n`);
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`);
      }
    }

    // Save to chat history
    if (chatId && fullAnswer) {
      await ChatHistory.findByIdAndUpdate(chatId, {
        $push: {
          messages: [
            { role: 'user', content: question },
            { role: 'assistant', content: fullAnswer, sources, retrievalStats }
          ]
        },
        updatedAt: new Date()
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Streaming query error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
    res.end();
  }
};

// ── Non-streaming Chat ─────────────────────────────────────────────────────────
/**
 * POST /api/chat/query
 */
export const queryDocuments = async (req, res) => {
  try {
    const { question, documentIds, chatId } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    const user = await User.findById(req.user._id).select('settings');
    const userSettings = user?.settings || {};

    const response = await generateRAGResponse(
      question,
      req.user._id,
      documentIds || null,
      userSettings
    );

    if (chatId && response.answer) {
      await ChatHistory.findByIdAndUpdate(chatId, {
        $push: {
          messages: [
            { role: 'user', content: question },
            { role: 'assistant', content: response.answer, sources: response.sources }
          ]
        }
      });
    }

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ success: false, message: 'Failed to process query', error: error.message });
  }
};

// ── Chat CRUD ──────────────────────────────────────────────────────────────────

export const createChat = async (req, res) => {
  try {
    const { title, documentIds } = req.body;
    const chat = await ChatHistory.create({
      userId: req.user._id,
      title: title || 'New Chat',
      documentIds: documentIds || [],
      messages: []
    });
    res.status(201).json({ success: true, data: { chat } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create chat', error: error.message });
  }
};

export const getChats = async (req, res) => {
  try {
    const chats = await ChatHistory.find({ userId: req.user._id })
      .select('title createdAt updatedAt documentIds')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: { chats } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch chats', error: error.message });
  }
};

export const getChat = async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('documentIds', 'originalName');

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    res.json({ success: true, data: { chat } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch chat', error: error.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const chat = await ChatHistory.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    res.json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete chat', error: error.message });
  }
};

export const updateChat = async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await ChatHistory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title },
      { new: true }
    );
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    res.json({ success: true, data: { chat } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update chat', error: error.message });
  }
};

/**
 * GET /api/chat/stats — aggregate retrieval stats from chat history
 */
export const getChatStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [messageStats, chatCount] = await Promise.all([
      ChatHistory.aggregate([
        { $match: { userId } },
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'assistant' } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            avgSources: { $avg: { $size: { $ifNull: ['$messages.sources', []] } } },
            hydeUsedCount: {
              $sum: {
                $cond: ['$messages.retrievalStats.hydeUsed', 1, 0]
              }
            }
          }
        }
      ]),
      ChatHistory.countDocuments({ userId })
    ]);

    res.json({
      success: true,
      data: {
        totalChats: chatCount,
        messageStats: messageStats[0] || { totalMessages: 0, avgSources: 0, hydeUsedCount: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch chat stats', error: error.message });
  }
};

export default {
  streamQueryDocuments,
  queryDocuments,
  createChat,
  getChats,
  getChat,
  deleteChat,
  updateChat,
  getChatStats
};
