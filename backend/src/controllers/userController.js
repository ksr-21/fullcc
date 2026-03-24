import User from '../models/User.js';

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
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.bio = req.body.bio || user.bio;
        user.avatarUrl = req.body.avatarUrl || user.avatarUrl;
        if (req.body.password) { user.password = req.body.password; }
        const updatedUser = await user.save();
        res.json(updatedUser);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

const getAllUsers = async (req, res) => {
    const users = await User.find({ collegeId: req.user.collegeId });
    res.json(users);
};

export { getUserProfile, updateUserProfile, getAllUsers };
