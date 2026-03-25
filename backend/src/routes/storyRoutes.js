import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createStory, getStories, viewStory, likeStory } from '../controllers/storyController.js';

const router = express.Router();

router.get('/', authenticate, getStories);
router.post('/', authenticate, createStory);
router.get('/:id/view', authenticate, viewStory);
router.post('/:id/like', authenticate, likeStory);

export default router;
