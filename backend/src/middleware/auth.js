import User from '../models/User.js';
import { verifyToken } from '../config/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      ...decoded,
      _id: user._id,
      userId: user._id.toString(),
      role: user.tag,
      tag: user.tag,
      collegeId: user.collegeId,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...allowedRoles) => {
  // If first argument is an array, use it directly (legacy support)
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        error: `Unauthorized access. Role '${req.user?.role}' not in [${roles.join(', ')}]`
      });
    }
    next();
  };
};

export const protect = authenticate;
