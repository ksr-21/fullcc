import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createConversation, getConversations, addMessage } from '../controllers/conversationController.js';

const router = express.Router();

router.get('/', authenticate, getConversations);
router.post('/', authenticate, createConversation);
router.post('/:id/messages', authenticate, addMessage);

export default router;
