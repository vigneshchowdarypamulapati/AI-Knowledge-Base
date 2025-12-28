import ChatHistory from '../models/ChatHistory.js';
import { generateRAGResponse, generateStreamingRAGResponse } from '../services/ragService.js';

/**
 * Query documents using RAG
 * POST /api/query
 */
/**
 * Stream query documents using RAG
 * POST /api/chat/stream
 */
export const streamQueryDocuments = async (req, res) => {
  try {
    const { question, documentIds, chatId } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    // Fetch conversation history if chatId provided
    let conversationHistory = [];
    if (chatId) {
      const chat = await ChatHistory.findById(chatId);
      if (chat && chat.messages) {
        conversationHistory = chat.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
    }

    // Set headers for SSE/Streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = generateStreamingRAGResponse(
      question,
      req.user._id,
      documentIds || null,
      conversationHistory
    );

    let fullAnswer = '';
    let sources = [];

    for await (const chunk of stream) {
      if (chunk.type === 'sources') {
        sources = chunk.content;
        res.write(`data: ${JSON.stringify({ type: 'sources', content: sources })}\n\n`);
      } else if (chunk.type === 'answer') {
        fullAnswer += chunk.content;
        res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk.content })}\n\n`);
      }
    }

    // Save to chat history if chatId provided
    if (chatId) {
      await ChatHistory.findByIdAndUpdate(chatId, {
        $push: {
          messages: [
            { role: 'user', content: question },
            { role: 'assistant', content: fullAnswer, sources: sources }
          ]
        }
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Streaming Query error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
    res.end();
  }
};

export const queryDocuments = async (req, res) => {
  try {
    const { question, documentIds, chatId } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    // Generate RAG response
    const response = await generateRAGResponse(
      question,
      req.user._id,
      documentIds || null,
      5
    );

    // Save to chat history if chatId provided
    if (chatId) {
      await ChatHistory.findByIdAndUpdate(chatId, {
        $push: {
          messages: [
            { role: 'user', content: question },
            { role: 'assistant', content: response.answer, sources: response.sources }
          ]
        }
      });
    }

    res.json({
      success: true,
      data: {
        answer: response.answer,
        sources: response.sources,
        hasContext: response.hasContext
      }
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process query',
      error: error.message
    });
  }
};

/**
 * Create a new chat
 * POST /api/chat
 */
export const createChat = async (req, res) => {
  try {
    const { title, documentIds } = req.body;

    const chat = await ChatHistory.create({
      userId: req.user._id,
      title: title || 'New Chat',
      documentIds: documentIds || [],
      messages: []
    });

    res.status(201).json({
      success: true,
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create chat',
      error: error.message
    });
  }
};

/**
 * Get all chats for user
 * GET /api/chat
 */
export const getChats = async (req, res) => {
  try {
    const chats = await ChatHistory.find({ userId: req.user._id })
      .select('title createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: { chats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats',
      error: error.message
    });
  }
};

/**
 * Get single chat with messages
 * GET /api/chat/:id
 */
export const getChat = async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('documentIds', 'originalName');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat',
      error: error.message
    });
  }
};

/**
 * Delete a chat
 * DELETE /api/chat/:id
 */
export const deleteChat = async (req, res) => {
  try {
    const chat = await ChatHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      message: 'Chat deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat',
      error: error.message
    });
  }
};

/**
 * Update chat title
 * PATCH /api/chat/:id
 */
export const updateChat = async (req, res) => {
  try {
    const { title } = req.body;

    const chat = await ChatHistory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update chat',
      error: error.message
    });
  }
};

export default { 
  streamQueryDocuments,
  queryDocuments, 
  createChat, 
  getChats, 
  getChat, 
  deleteChat, 
  updateChat 
};
