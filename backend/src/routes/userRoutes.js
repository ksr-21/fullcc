import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMe, getUserById, updateUser, getAllUsers } from '../controllers/userController.js';

const router = express.Router();

router.get('/me', authenticate, getMe);
router.get('/', authenticate, getAllUsers);
router.get('/:id', authenticate, getUserById);
router.put('/me', authenticate, updateUser);

export default router;
