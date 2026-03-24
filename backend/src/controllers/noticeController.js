import Notice from '../models/Notice.js';
import { transformUpdate } from '../utils/queryHelper.js';

const getNotices = async (req, res) => {
    const notices = await Notice.find({ collegeId: req.user.collegeId }).sort({ timestamp: -1 });
    res.json(notices);
};

const createNotice = async (req, res) => {
    const notice = await Notice.create({ ...req.body, authorId: req.user._id, collegeId: req.user.collegeId, timestamp: Date.now() });
    res.status(201).json(notice);
};

const deleteNotice = async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (notice) { await notice.deleteOne(); res.json({ message: 'Notice removed' }); }
    else { res.status(404); throw new Error('Notice not found'); }
};

const updateNotice = async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (notice) {
        const mongoUpdate = transformUpdate(req.body);
        const updatedNotice = await Notice.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
        res.json(updatedNotice);
    } else {
        res.status(404);
        throw new Error('Notice not found');
    }
};

export { getNotices, createNotice, deleteNotice, updateNotice };
