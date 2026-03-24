import User from '../models/User.js';
import Invite from '../models/Invite.js';
import { generateToken } from '../config/jwt.js';

export const verifyInvite = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Special case for superadmin
    if (email.toLowerCase() === 'superadmin@gmail.com') {
      return res.status(200).json({
        email: 'superadmin@gmail.com',
        tag: 'Super Admin',
        requiresInviteCode: false
      });
    }

    const invite = await Invite.findOne({ email: email.toLowerCase() });
    if (!invite) {
      return res.status(404).json({ message: 'No invitation found for this email. Please contact your administrator.' });
    }

    if (invite.isRegistered) {
      return res.status(400).json({ message: 'This invitation has already been used.' });
    }

    res.status(200).json({
      email: invite.email,
      tag: invite.tag,
      collegeId: invite.collegeId,
      department: invite.department,
      requiresInviteCode: !!invite.tempPassword
    });
  } catch (error) {
    console.error('Verify invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, inviteCode, avatarUrl } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    let userData = {
      name,
      email: email.toLowerCase(),
      password,
      avatarUrl,
      isRegistered: true,
    };

    // Special case for superadmin
    if (email.toLowerCase() === 'superadmin@gmail.com') {
      userData.tag = 'Super Admin';
      userData.isApproved = true;
    } else {
      const invite = await Invite.findOne({ email: email.toLowerCase() });
      if (!invite) {
        return res.status(403).json({ message: 'Registration requires an invitation.' });
      }

      if (invite.tempPassword && invite.tempPassword !== inviteCode) {
        return res.status(400).json({ message: 'Invalid invitation code.' });
      }

      userData.tag = invite.tag;
      userData.collegeId = invite.collegeId;
      userData.department = invite.department;
      userData.isApproved = true; // Auto-approve if they have an invite

      invite.isRegistered = true;
      await invite.save();
    }

    const user = new User(userData);
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
      user = await User.findOne({ email: email.toLowerCase() }).maxTimeMS(5000);
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
