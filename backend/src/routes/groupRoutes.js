import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createGroup, getGroups, joinGroup, leaveGroup } from '../controllers/groupController.js';

const router = express.Router();

router.get('/', authenticate, getGroups);
router.post('/', authenticate, createGroup);
router.post('/:id/join', authenticate, joinGroup);
router.post('/:id/leave', authenticate, leaveGroup);

export default router;
