import Story from '../models/Story.js';
import { transformUpdate } from '../utils/queryHelper.js';

const getStories = async (req, res) => {
    const stories = await Story.find({ collegeId: req.user.collegeId }).sort({ timestamp: -1 });
    res.json(stories);
};

const createStory = async (req, res) => {
    const story = await Story.create({ ...req.body, authorId: req.user._id, collegeId: req.user.collegeId, timestamp: Date.now() });
    res.status(201).json(story);
};

const deleteStory = async (req, res) => {
    const story = await Story.findById(req.params.id);
    if (story) {
        if (story.authorId.toString() !== req.user._id.toString() && req.user.tag !== 'Director') {
            res.status(401); throw new Error('User not authorized');
        }
        await story.deleteOne(); res.json({ message: 'Story removed' });
    } else { res.status(404); throw new Error('Story not found'); }
};

const markStoryAsViewed = async (req, res) => {
    const story = await Story.findById(req.params.id);
    if (story) {
        if (!story.viewedBy.includes(req.user._id)) { story.viewedBy.push(req.user._id); await story.save(); }
        res.json(story);
    } else { res.status(404); throw new Error('Story not found'); }
};

const updateStory = async (req, res) => {
    const story = await Story.findById(req.params.id);
    if (story) {
        const mongoUpdate = transformUpdate(req.body);
        const updatedStory = await Story.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
        res.json(updatedStory);
    } else {
        res.status(404);
        throw new Error('Story not found');
    }
};

export { getStories, createStory, deleteStory, markStoryAsViewed, updateStory };
