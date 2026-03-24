import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getRoadmaps, createRoadmap, getMentors, createMentor } from '../controllers/careerController.js';
const router = express.Router();
router.get('/roadmaps', protect, getRoadmaps);
router.post('/roadmaps', protect, authorize('Super Admin'), createRoadmap);
router.get('/mentors', protect, getMentors);
router.post('/mentors', protect, authorize('Super Admin'), createMentor);
export default router;
