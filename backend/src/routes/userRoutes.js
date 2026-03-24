import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile, getUserById, updateUser, deleteUser, getAllUsers } from '../controllers/userController.js';
const router = express.Router();
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.get('/', protect, authorize('Super Admin', 'Director', 'HOD/Dean'), getAllUsers);
router.route('/:id')
    .get(protect, getUserById)
    .put(protect, updateUser)
    .delete(protect, authorize('Super Admin', 'Director', 'HOD/Dean'), deleteUser);
export default router;
