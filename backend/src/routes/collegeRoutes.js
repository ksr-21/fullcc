import express from 'express';
import { authenticate } from '../middleware/auth.js';
import College from '../models/College.js';
import { transformUpdate } from '../utils/queryHelper.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const colleges = await College.find({});
    res.json(colleges);
  } catch (error) {
    console.error('getColleges error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const college = new College(req.body);
    await college.save();
    res.status(201).json(college);
  } catch (error) {
    console.error('createCollege error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });
    res.json(college);
  } catch (error) {
    console.error('getCollegeById error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const existingCollege = await College.findById(req.params.id);
    if (!existingCollege) return res.status(404).json({ message: 'College not found' });

    const mongoUpdate = transformUpdate({
      ...req.body,
      updatedAt: new Date(),
    });

    const college = await College.findByIdAndUpdate(req.params.id, mongoUpdate, {
      new: true,
      runValidators: true,
    });
    if (!college) return res.status(404).json({ message: 'College not found' });
    res.json(college);
  } catch (error) {
    console.error('updateCollege error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await College.findByIdAndDelete(req.params.id);
    res.json({ message: 'College deleted' });
  } catch (error) {
    console.error('deleteCollege error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
