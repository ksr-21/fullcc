import express from 'express';
import { login, register, refreshToken, seedSuperAdmin } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', authenticate, refreshToken);
router.post('/seed-admin', seedSuperAdmin); // First-time Super Admin setup only

export default router;
