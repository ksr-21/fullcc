import express from 'express';
import { login, register, refreshToken } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', authenticate, refreshToken);

export default router;
