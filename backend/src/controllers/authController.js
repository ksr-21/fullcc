import User from '../models/User.js';
import { generateToken } from '../config/jwt.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, department, tag, collegeId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      password,
      department,
      tag: tag || 'Student',
      collegeId,
      isRegistered: true,
    });
    await user.save();

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      tag: user.tag,
      collegeId: user.collegeId,
      token: generateToken(user._id.toString(), user.tag),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    let user;
    try {
      user = await User.findOne({ email }).maxTimeMS(5000);
    } catch (err) {
      console.error('Database query failed:', err);
      return res.status(503).json({ message: 'Database service unavailable' });
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      tag: user.tag,
      collegeId: user.collegeId,
      token: generateToken(user._id.toString(), user.tag),
    });
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
