import express from 'express';
import {
  queryDocuments,
  streamQueryDocuments,
  createChat,
  getChats,
  getChat,
  deleteChat,
  updateChat,
  getChatStats
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Query endpoints
router.post('/query', queryDocuments);
router.post('/stream', streamQueryDocuments);

// Analytics
router.get('/stats', getChatStats);

// Chat CRUD
router.post('/', createChat);
router.get('/', getChats);
router.get('/:id', getChat);
router.patch('/:id', updateChat);
router.delete('/:id', deleteChat);

export default router;
