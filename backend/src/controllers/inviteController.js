import Invite from '../models/Invite.js';
import { transformUpdate } from '../utils/queryHelper.js';

export const createInvite = async (req, res) => {
  try {
    const invite = new Invite(req.body);
    await invite.save();
    res.status(201).json(invite);
  } catch (error) {
    console.error('createInvite error', error);
    res.status(500).json({ message: 'Server error' });
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
