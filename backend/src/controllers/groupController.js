import Group from '../models/Group.js';

export const createGroup = async (req, res) => {
  try {
    const body = { ...req.body, creatorId: req.user.userId, memberIds: [req.user.userId] };
    const group = new Group(body);
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    console.error('createGroup error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({}).sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    console.error('getGroups error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.memberIds.includes(req.user.userId)) {
      group.memberIds.push(req.user.userId);
      await group.save();
    }

    res.json(group);
  } catch (error) {
    console.error('joinGroup error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.memberIds = group.memberIds.filter((userId) => userId.toString() !== req.user.userId);
    await group.save();

    res.json(group);
  } catch (error) {
    console.error('leaveGroup error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
