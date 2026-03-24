import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getNotices, createNotice, deleteNotice, updateNotice } from '../controllers/noticeController.js';
const router = express.Router();
router.route('/').get(protect, getNotices).post(protect, authorize('Director', 'HOD/Dean', 'Super Admin'), createNotice);
router.route('/:id')
    .put(protect, authorize('Director', 'HOD/Dean', 'Super Admin'), updateNotice)
    .delete(protect, authorize('Director', 'HOD/Dean', 'Super Admin'), deleteNotice);
export default router;
