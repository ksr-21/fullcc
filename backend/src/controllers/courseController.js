import Course from '../models/Course.js';
import { transformUpdate } from '../utils/queryHelper.js';

export const createCourse = async (req, res) => {
  try {
    const body = { ...req.body, createdAt: new Date() };
    const course = new Course(body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('createCourse error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({});
    res.json(courses);
  } catch (error) {
    console.error('getCourses error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    console.error('getCourseById error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const mongoUpdate = transformUpdate(req.body);
    const course = await Course.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    console.error('updateCourse error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (error) {
    console.error('deleteCourse error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
