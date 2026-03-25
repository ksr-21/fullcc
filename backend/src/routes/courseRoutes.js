import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createCourse, getCourses, getCourseById, updateCourse, deleteCourse } from '../controllers/courseController.js';

const router = express.Router();

router.get('/', authenticate, getCourses);
router.post('/', authenticate, createCourse);
router.get('/:id', authenticate, getCourseById);
router.put('/:id', authenticate, updateCourse);
router.delete('/:id', authenticate, deleteCourse);

export default router;
