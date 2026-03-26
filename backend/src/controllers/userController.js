import User from '../models/User.js';
import { transformUpdate } from '../utils/queryHelper.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('getMe error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('getUserById error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Normalize Student specific fields if present
    if (updateData.yearOfStudy || updateData.year) {
      const yr = updateData.yearOfStudy || updateData.year;
      updateData.yearOfStudy = Number(yr);
    }

    const updates = transformUpdate(updateData);
    if (updates.$set) updates.$set.updatedAt = new Date();
    else updates.$set = { updatedAt: new Date() };

    const userId = req.params.id || req.user.userId;

    // Use strict: false to ensure discriminator fields are updated via the base model
    const user = await User.findByIdAndUpdate(userId, updates, { new: true, strict: false });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('updateUser error', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    console.error('getAllUsers error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('deleteUser error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
