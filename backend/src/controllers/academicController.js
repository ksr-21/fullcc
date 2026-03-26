import Course from '../models/Course.js';
import { transformUpdate } from '../utils/queryHelper.js';

const getCourses = async (req, res) => {
    const courses = await Course.find({ collegeId: req.user.collegeId });
    res.json(courses);
};

const createCourse = async (req, res) => {
    const course = await Course.create({ ...req.body, facultyId: req.user._id, collegeId: req.user.collegeId, facultyIds: [req.user._id] });
    res.status(201).json(course);
};

const updateCourse = async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (course) {
        const mongoUpdate = transformUpdate(req.body);
        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
        res.json(updatedCourse);
    } else { res.status(404); throw new Error('Course not found'); }
};

const addCourseNote = async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (course) { course.notes.push({ ...req.body, id: Math.random().toString(36).substring(7), uploadedAt: Date.now() }); await course.save(); res.json(course); }
    else { res.status(404); throw new Error('Course not found'); }
};

const takeAttendance = async (req, res) => {
    try {
        const { date, label, records } = req.body;
        const course = await Course.findById(req.params.id);
        if (course) {
            // Check permissions: faculty must be assigned to this course or be HOD/Director of dept
            const isAssigned = course.facultyIds?.some(id => id.toString() === req.user.userId) ||
                              course.facultyId?.toString() === req.user.userId;
            const isDeptAdmin = (req.user.role === 'HOD/Dean' || req.user.role === 'Director') &&
                               req.user.collegeId?.toString() === course.collegeId?.toString();

            if (!isAssigned && !isDeptAdmin) {
                return res.status(403).json({ message: 'Not authorized to mark attendance for this course' });
            }

            // Use normalized date for comparison
            const targetDate = new Date(date);
            const idx = course.attendanceRecords.findIndex(r =>
                new Date(r.date).getTime() === targetDate.getTime()
            );

            if (idx !== -1) {
                course.attendanceRecords[idx] = { date: targetDate, label, records };
            } else {
                course.attendanceRecords.push({ date: targetDate, label, records });
            }

            course.markModified('attendanceRecords');
            await course.save();
            res.json(course);
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        console.error('takeAttendance error', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

const deleteCourse = async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (course) {
        await course.deleteOne();
        res.json({ message: 'Course removed' });
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
};

export { getCourses, createCourse, updateCourse, addCourseNote, takeAttendance, deleteCourse };
