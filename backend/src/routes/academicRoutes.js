import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getCourses, createCourse, updateCourse, addCourseNote, takeAttendance, deleteCourse } from '../controllers/academicController.js';
const router = express.Router();
router.route('/courses').get(protect, getCourses).post(protect, authorize('Teacher', 'HOD/Dean', 'Director'), createCourse);
router.route('/courses/:id')
    .put(protect, authorize('Teacher', 'HOD/Dean', 'Director'), updateCourse)
    .delete(protect, authorize('Teacher', 'HOD/Dean', 'Director', 'Super Admin'), deleteCourse);
router.post('/courses/:id/notes', protect, authorize('Teacher', 'HOD/Dean', 'Director'), addCourseNote);
router.post('/courses/:id/attendance', protect, authorize('Teacher', 'HOD/Dean', 'Director'), takeAttendance);
export default router;
