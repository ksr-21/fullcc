import Notice from '../models/Notice.js';

export const createNotice = async (req, res) => {
  try {
    const body = { ...req.body, authorId: req.user.userId, timestamp: new Date() };
    const notice = new Notice(body);
    await notice.save();
    res.status(201).json(notice);
  } catch (error) {
    console.error('createNotice error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({}).sort({ timestamp: -1 });
    res.json(notices);
  } catch (error) {
    console.error('getNotices error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json(notice);
  } catch (error) {
    console.error('getNoticeById error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
