import Invite, { getInviteModelByTag } from '../models/Invite.js';
import { transformUpdate } from '../utils/queryHelper.js';

const validateInvite = (body, inviterRole) => {
  const { tag, yearOfStudy, year, rollNo, division, div, email } = body;
  const normalizedYearOfStudy = yearOfStudy ?? year;
  const normalizedDivision = typeof division === 'string' && division.trim() ? division : div;

  // Rules logic
  let allowed = false;
  if (inviterRole === 'Super Admin') allowed = true;
  else if (inviterRole === 'Director') {
    if (['HOD/Dean', 'Teacher', 'Student'].includes(tag)) allowed = true;
  } else if (inviterRole === 'HOD/Dean') {
    if (['Teacher', 'Student'].includes(tag)) allowed = true;
  }

  if (!allowed) return { error: `Your role (${inviterRole}) is not authorized to add a ${tag}`, status: 403 };

  if (tag === 'Student') {
    if (!normalizedYearOfStudy || isNaN(Number(normalizedYearOfStudy)) || Number(normalizedYearOfStudy) < 1 || Number(normalizedYearOfStudy) > 6) {
      return { error: 'yearOfStudy is required and should be between 1 and 6 for student invites', status: 400 };
    }
    if (!normalizedDivision || !normalizedDivision.trim()) {
      return { error: 'division is required for student invites', status: 400 };
    }
    if (!rollNo) {
      return { error: 'rollNo is required for student invites', status: 400 };
    }
  }

  if (!email) return { error: 'Email is required', status: 400 };

  return { error: null };
};

export const createInvite = async (req, res) => {
  try {
    const { name, email, tag, collegeId, department, tempPassword, yearOfStudy, year, rollNo, division, div, avatarUrl, designation, qualification } = req.body;
    const inviterId = req.user.userId;
    const inviterRole = req.user.role;

    const validation = validateInvite(req.body, inviterRole);
    if (validation.error) return res.status(validation.status).json({ message: validation.error });

    // Check if invite or user already exists
    const existingInvite = await Invite.findOne({ email: email.toLowerCase() });
    if (existingInvite) return res.status(400).json({ message: 'Invitation already sent to this email' });

    const InviteModel = getInviteModelByTag(tag);
    const inviteData = {
      name,
      email: email.toLowerCase(),
      tag,
      department,
      collegeId: collegeId || req.user.collegeId,
      invitedBy: inviterId,
      tempPassword,
      avatarUrl,
      designation,
      qualification
    };

    if (tag === 'Student') {
      const normalizedYearOfStudy = yearOfStudy ?? year;
      const normalizedDivision = typeof division === 'string' && division.trim() ? division : div;
      const normalizedRollNo = typeof rollNo === 'string' ? rollNo.trim() : rollNo;
      inviteData.yearOfStudy = Number(normalizedYearOfStudy);
      inviteData.year = Number(normalizedYearOfStudy);
      inviteData.rollNo = normalizedRollNo;
      inviteData.division = normalizedDivision.trim();
      inviteData.div = normalizedDivision.trim();
    }

    const invite = new InviteModel(inviteData);
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

export const createInvitesBatch = async (req, res) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users)) return res.status(400).json({ message: 'Users must be an array' });

    const inviterId = req.user.userId;
    const inviterRole = req.user.role;
    const collegeId = req.user.collegeId;

    const results = {
      successCount: 0,
      errors: []
    };

    const emails = users.map(u => u.email.toLowerCase());
    const existingInvites = await Invite.find({ email: { $in: emails } });
    const existingEmails = new Set(existingInvites.map(i => i.email.toLowerCase()));

    const invitesToCreate = [];

    for (const userData of users) {
      const validation = validateInvite(userData, inviterRole);
      if (validation.error) {
        results.errors.push({ email: userData.email, reason: validation.error });
        continue;
      }

      if (existingEmails.has(userData.email.toLowerCase())) {
        results.errors.push({ email: userData.email, reason: 'Invitation already sent to this email' });
        continue;
      }

      const { tag, name, email, department, tempPassword, yearOfStudy, year, rollNo, division, div, avatarUrl, designation, qualification } = userData;
      const InviteModel = getInviteModelByTag(tag);

      const inviteData = {
        name,
        email: email.toLowerCase(),
        tag,
        department: department || userData.department,
        collegeId: userData.collegeId || collegeId,
        invitedBy: inviterId,
        tempPassword,
        avatarUrl,
        designation,
        qualification
      };

      if (tag === 'Student') {
        const normalizedYearOfStudy = yearOfStudy ?? year;
        const normalizedDivision = typeof division === 'string' && division.trim() ? division : div;
        const normalizedRollNo = typeof rollNo === 'string' ? rollNo.trim() : rollNo;
        inviteData.yearOfStudy = Number(normalizedYearOfStudy);
        inviteData.year = Number(normalizedYearOfStudy);
        inviteData.rollNo = normalizedRollNo;
        inviteData.division = normalizedDivision.trim();
        inviteData.div = normalizedDivision.trim();
      }

      invitesToCreate.push(new InviteModel(inviteData));
    }

    if (invitesToCreate.length > 0) {
      await Invite.insertMany(invitesToCreate);
      results.successCount = invitesToCreate.length;
    }

    res.status(results.errors.length > 0 && results.successCount === 0 ? 400 : 201).json(results);
  } catch (error) {
    console.error('createInvitesBatch error', error);
    res.status(500).json({ message: `Server error: ${error.message}` });
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
