import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createInvite, createInvitesBatch, getInvites, updateInvite } from '../controllers/inviteController.js';

const router = express.Router();

router.get('/', authenticate, getInvites);
router.post('/', authenticate, createInvite);
router.post('/batch', authenticate, createInvitesBatch);
router.put('/:id', authenticate, updateInvite);

export default router;
