import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../config/jwt.js';

// In a Firebase -> Mongo replace, client will pass firebaseId as uid and email
export const register = async (req, res) => {
  try {
    const { firebaseId, name, email, department, tag } = req.body;
    if (!firebaseId || !name || !email || !tag) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let user = await User.findOne({ firebaseId });
    if (user) return res.status(409).json({ message: 'User already exists' });

    user = new User({ firebaseId, name, email, department, tag, isRegistered: true });
    await user.save();

    const token = generateToken(user._id.toString(), user.tag);
    return res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { firebaseId, email } = req.body;
    if (!firebaseId && !email) return res.status(400).json({ message: 'firebaseId or email required' });

    const user = await User.findOne(firebaseId ? { firebaseId } : { email });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const token = generateToken(user._id.toString(), user.tag);
    return res.status(200).json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const token = generateToken(userId, role);
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
