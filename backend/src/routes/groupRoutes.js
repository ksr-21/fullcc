import express from 'express';
import { protect } from '../middleware/auth.js';
import { getGroups, createGroup, joinGroup, followGroup, updateGroup, deleteGroup } from '../controllers/groupController.js';
const router = express.Router();
router.route('/').get(protect, getGroups).post(protect, createGroup);
router.route('/:id').put(protect, updateGroup).delete(protect, deleteGroup);
router.route('/:id/join').post(protect, joinGroup);
router.route('/:id/follow').post(protect, followGroup);
export default router;
