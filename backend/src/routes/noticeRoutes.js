import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createNotice, getNotices, getNoticeById } from '../controllers/noticeController.js';

const router = express.Router();

router.get('/', authenticate, getNotices);
router.post('/', authenticate, createNotice);
router.get('/:id', authenticate, getNoticeById);

export default router;
