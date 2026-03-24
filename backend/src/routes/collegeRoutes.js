import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getCollegeById, createCollege, updateCollege, getAllColleges } from '../controllers/collegeController.js';
const router = express.Router();
router.get('/', protect, authorize('Super Admin'), getAllColleges);
router.get('/:id', protect, getCollegeById);
router.post('/', protect, authorize('Super Admin'), createCollege);
router.put('/:id', protect, authorize('Super Admin', 'Director'), updateCollege);
export default router;
