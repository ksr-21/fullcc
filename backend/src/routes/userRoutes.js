import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile, getAllUsers } from '../controllers/userController.js';
const router = express.Router();
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.get('/', protect, authorize('Super Admin', 'Director', 'HOD/Dean'), getAllUsers);
export default router;
