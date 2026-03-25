import User, { getUserModelByTag } from '../models/User.js';
import Invite from '../models/Invite.js';
import College from '../models/College.js';
import { generateToken } from '../config/jwt.js';

const resolveRoleForUser = async (user) => {
  if (user.tag) {
    return user.tag;
  }

  const adminCollege = await College.findOne({ adminUids: user._id }).select('_id');
  if (adminCollege) {
    user.tag = 'Director';
    if (!user.collegeId) {
      user.collegeId = adminCollege._id.toString();
    }
    await user.save();
    return user.tag;
  }

  return user.tag;
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already registered' });
    }

    // Find and validate invitation
    const invite = await Invite.findOne({ email });
    if (!invite) {
      return res.status(403).json({ message: 'No invitation found for this email' });
    }

    const UserModel = getUserModelByTag(invite.tag);
    const user = new UserModel({
      name: name || invite.name,
      email,
      password,
      tag: invite.tag,
      department: invite.department,
      collegeId: invite.collegeId,
      yearOfStudy: invite.yearOfStudy ?? invite.year,
      rollNo: invite.rollNo,
      division: invite.division ?? invite.div,
      avatarUrl: invite.avatarUrl,
      isRegistered: true,
      isApproved: (invite.tag === 'Super Admin' || invite.tag === 'Director') ? true : false,
    });

    await user.save();
    const resolvedTag = await resolveRoleForUser(user);

    // If Director registered, add them to college's adminUids and mark college as active
    if (invite.tag === 'Director' && invite.collegeId) {
      try {
        await College.findByIdAndUpdate(
          invite.collegeId,
          {
            $addToSet: { adminUids: user._id },
            $set: { status: 'active' }
          },
          { new: true }
        );
      } catch (collegeErr) {
        console.warn('Could not update college admin:', collegeErr);
        // Don't fail the registration if college update fails
      }
    }
    
    // Cleanup: remove the invite once registered
    await Invite.deleteOne({ _id: invite._id });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      tag: resolvedTag,
      collegeId: user.collegeId,
      isApproved: user.isApproved,
      token: generateToken(user._id.toString(), resolvedTag),
    });
  } catch (error) {
    console.error('Register error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
    });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: `Validation error: ${messages}` });
    }
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// One-time Super Admin seeding — only works when NO Super Admin exists yet
export const seedSuperAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ tag: 'Super Admin' });
    if (existing) {
      return res.status(409).json({ message: 'A Super Admin already exists. Use the login page.' });
    }

    const user = new User({
      name,
      email,
      password,
      tag: 'Super Admin',
      isRegistered: true,
      isApproved: true,
    });
    await user.save();

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      tag: user.tag,
      isApproved: user.isApproved,
      token: generateToken(user._id.toString(), user.tag),
    });
  } catch (error) {
    console.error('Seed Super Admin error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: `Validation error: ${messages}` });
    }
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

    const resolvedTag = await resolveRoleForUser(user);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      tag: resolvedTag,
      collegeId: user.collegeId,
      token: generateToken(user._id.toString(), resolvedTag),
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
