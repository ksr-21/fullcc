import express from 'express';
import { login, register, refreshToken, verifyInvite } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/verify-invite', verifyInvite);
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', authenticate, refreshToken);

export default router;
