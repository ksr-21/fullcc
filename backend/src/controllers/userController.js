import User from '../models/User.js';
import { transformUpdate } from '../utils/queryHelper.js';

const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        const mongoUpdate = transformUpdate(req.body);
        const updatedUser = await User.findByIdAndUpdate(req.user._id, mongoUpdate, { new: true });
        res.json(updatedUser);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

const getUserById = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

const updateUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        const mongoUpdate = transformUpdate(req.body);
        const updatedUser = await User.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
        res.json(updatedUser);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        await user.deleteOne();
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

const getAllUsers = async (req, res) => {
    const users = await User.find({ collegeId: req.user.collegeId });
    res.json(users);
};

export { getUserProfile, updateUserProfile, getUserById, updateUser, deleteUser, getAllUsers };
