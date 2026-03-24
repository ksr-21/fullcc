import Story from '../models/Story.js';

export const createStory = async (req, res) => {
  try {
    const body = { ...req.body, authorId: req.user.userId, timestamp: new Date(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
    const story = new Story(body);
    await story.save();
    res.status(201).json(story);
  } catch (error) {
    console.error('createStory error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStories = async (req, res) => {
  try {
    const stories = await Story.find({}).sort({ timestamp: -1 }).limit(200);
    res.json(stories);
  } catch (error) {
    console.error('getStories error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (!story.viewedBy.includes(req.user.userId)) {
      story.viewedBy.push(req.user.userId);
      await story.save();
    }

    res.json(story);
  } catch (error) {
    console.error('viewStory error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const likeStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const index = story.likedBy.indexOf(req.user.userId);
    if (index === -1) story.likedBy.push(req.user.userId);
    else story.likedBy.splice(index, 1);

    await story.save();
    res.json(story);
  } catch (error) {
    console.error('likeStory error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
