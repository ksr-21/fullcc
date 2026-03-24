import Group from '../models/Group.js';

const getGroups = async (req, res) => {
    const groups = await Group.find({ collegeId: req.user.collegeId });
    res.json(groups);
};

const createGroup = async (req, res) => {
    const group = await Group.create({ ...req.body, collegeId: req.user.collegeId, memberIds: [req.user._id], creatorId: req.user._id });
    res.status(201).json(group);
};

const joinGroup = async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (group) {
        if (group.privacy === 'public') { if (!group.memberIds.includes(req.user._id)) { group.memberIds.push(req.user._id); await group.save(); } res.json(group); }
        else { if (!group.pendingMemberIds.includes(req.user._id)) { group.pendingMemberIds.push(req.user._id); await group.save(); } res.json({ message: 'Join request sent' }); }
    } else { res.status(404); throw new Error('Group not found'); }
};

const followGroup = async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (group) {
        if (!group.followers.includes(req.user._id)) { group.followers.push(req.user._id); }
        else { group.followers = group.followers.filter(id => id.toString() !== req.user._id.toString()); }
        await group.save(); res.json(group);
    } else { res.status(404); throw new Error('Group not found'); }
};

export { getGroups, createGroup, joinGroup, followGroup };
