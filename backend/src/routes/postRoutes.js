import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createPost, getFeed, getPostById, updatePost, deletePost, addComment, toggleReaction } from '../controllers/postController.js';

const router = express.Router();

router.get('/', authenticate, getFeed);
router.post('/', authenticate, createPost);
router.get('/:id', authenticate, getPostById);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/comments', authenticate, addComment);
router.post('/:id/reactions', authenticate, toggleReaction);

export default router;
