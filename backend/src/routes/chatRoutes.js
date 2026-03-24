import express from 'express';
import { protect } from '../middleware/auth.js';
import { getConversations, createConversation, sendMessage } from '../controllers/chatController.js';
const router = express.Router();
router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, createConversation);
router.post('/messages', protect, sendMessage);
export default router;
