import express from 'express';
import { protect } from '../middleware/auth.js';
import { getPosts, createPost, deletePost, reactToPost, addComment } from '../controllers/postController.js';
const router = express.Router();
router.route('/').get(protect, getPosts).post(protect, createPost);
router.route('/:id').delete(protect, deletePost);
router.route('/:id/react').post(protect, reactToPost);
router.route('/:id/comment').post(protect, addComment);
export default router;
