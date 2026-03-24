import express from 'express';
import { protect } from '../middleware/auth.js';
import { getStories, createStory, deleteStory, markStoryAsViewed } from '../controllers/storyController.js';
const router = express.Router();
router.route('/').get(protect, getStories).post(protect, createStory);
router.route('/:id').delete(protect, deleteStory);
router.route('/:id/view').post(protect, markStoryAsViewed);
export default router;
