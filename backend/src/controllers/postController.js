import Post from '../models/Post.js';
import { transformUpdate } from '../utils/queryHelper.js';

export const createPost = async (req, res) => {
  try {
    const body = { ...req.body, authorId: req.user.userId, timestamp: new Date() };
    const post = new Post(body);
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error('createPost error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFeed = async (req, res) => {
  try {
    const feed = await Post.find({}).sort({ timestamp: -1 }).limit(100);
    res.json(feed);
  } catch (error) {
    console.error('getFeed error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    console.error('getPostById error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const mongoUpdate = transformUpdate(req.body);
    const post = await Post.findOneAndUpdate({ _id: req.params.id, authorId: req.user.userId }, mongoUpdate, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found or unauthorized' });
    res.json(post);
  } catch (error) {
    console.error('updatePost error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, authorId: req.user.userId });
    if (!post) return res.status(404).json({ message: 'Post not found or unauthorized' });
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('deletePost error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = { authorId: req.user.userId, text: req.body.text, timestamp: new Date() };
    post.comments.push(comment);
    await post.save();
    res.json(post);
  } catch (error) {
    console.error('addComment error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleReaction = async (req, res) => {
  try {
    const { type } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const reactions = post.reactions || {};
    reactions[type] = reactions[type] || [];
    if (reactions[type].includes(req.user.userId)) {
      reactions[type] = reactions[type].filter((u) => u.toString() !== req.user.userId);
    } else {
      reactions[type].push(req.user.userId);
    }

    post.reactions = reactions;
    await post.save();
    res.json(post);
  } catch (error) {
    console.error('toggleReaction error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
