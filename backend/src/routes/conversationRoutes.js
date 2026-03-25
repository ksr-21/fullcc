import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
  addMessage,
} from '../controllers/conversationController.js';

const router = express.Router();

router.get('/', authenticate, getConversations);
router.post('/', authenticate, createConversation);
router.get('/:id', authenticate, getConversationById);
router.put('/:id', authenticate, updateConversation);
router.delete('/:id', authenticate, deleteConversation);
router.post('/:id/messages', authenticate, addMessage);

export default router;
