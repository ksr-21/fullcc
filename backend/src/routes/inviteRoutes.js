import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createInvite, getInvites, updateInvite } from '../controllers/inviteController.js';

const router = express.Router();

router.get('/', authenticate, getInvites);
router.post('/', authenticate, createInvite);
router.put('/:id', authenticate, updateInvite);

export default router;
