import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMe, getUserById, updateUser, getAllUsers, deleteUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateUser);
router.get('/', authenticate, getAllUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

export default router;
