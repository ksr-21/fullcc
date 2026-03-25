import Invite, { getInviteModelByTag } from '../models/Invite.js';
import { transformUpdate } from '../utils/queryHelper.js';

export const createInvite = async (req, res) => {
  try {
    const { name, email, tag, collegeId, department, tempPassword, yearOfStudy, year, rollNo, division, div, avatarUrl, designation, qualification } = req.body;
    const inviterId = req.user.userId;
    const inviterRole = req.user.role;
    const normalizedYearOfStudy = yearOfStudy ?? year;
    const normalizedDivision = typeof division === 'string' && division.trim() ? division : div;
    const normalizedRollNo = typeof rollNo === 'string' ? rollNo.trim() : rollNo;

    // Rules logic
    let allowed = false;

    if (inviterRole === 'Super Admin') {
      // Superadmin can add anyone, but mostly Directors
      if (['Director', 'Super Admin'].includes(tag)) allowed = true;
    } else if (inviterRole === 'Director') {
      // Director adds HOD, Faculty (Teacher), Students
      if (['HOD/Dean', 'Teacher', 'Student'].includes(tag)) allowed = true;
    } else if (inviterRole === 'HOD/Dean') {
      // HOD adds Faculty (Teacher), Students
      if (['Teacher', 'Student'].includes(tag)) allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ message: `Your role (${inviterRole}) is not authorized to add a ${tag}` });
    }

    // Validate student-specific fields when inviting students
    if (tag === 'Student') {
      if (!normalizedYearOfStudy || isNaN(Number(normalizedYearOfStudy)) || Number(normalizedYearOfStudy) < 1 || Number(normalizedYearOfStudy) > 6) {
        return res.status(400).json({ message: 'yearOfStudy is required and should be between 1 and 6 for student invites' });
      }
      if (!normalizedDivision || !normalizedDivision.trim()) {
        return res.status(400).json({ message: 'division is required for student invites' });
      }
      if (!normalizedRollNo) {
        return res.status(400).json({ message: 'rollNo is required for student invites' });
      }
    }

    // Check if invite or user already exists
    const existingInvite = await Invite.findOne({ email });
    if (existingInvite) return res.status(400).json({ message: 'Invitation already sent to this email' });

    const InviteModel = getInviteModelByTag(tag);
    const invite = new InviteModel({
      name,
      email,
      department,
      yearOfStudy: tag === 'Student' ? Number(normalizedYearOfStudy) : undefined,
      year: tag === 'Student' ? Number(normalizedYearOfStudy) : undefined,
      rollNo: tag === 'Student' ? normalizedRollNo : undefined,
      division: tag === 'Student' ? normalizedDivision.trim() : undefined,
      div: tag === 'Student' ? normalizedDivision.trim() : undefined,
      avatarUrl,
      designation,
      qualification,
      collegeId: collegeId || req.user.collegeId,
      invitedBy: inviterId,
      tempPassword
    });

    await invite.save();
    res.status(201).json(invite);
  } catch (error) {
    console.error('createInvite error', error);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

export const getInvites = async (req, res) => {
  try {
    const { email, collegeId } = req.query;
    const query = {};
    if (email) query.email = email;
    if (collegeId) query.collegeId = collegeId;
    const invites = await Invite.find(query);
    res.json(invites);
  } catch (error) {
    console.error('getInvites error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateInvite = async (req, res) => {
  try {
    const mongoUpdate = transformUpdate(req.body);
    const invite = await Invite.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    res.json(invite);
  } catch (error) {
    console.error('updateInvite error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
