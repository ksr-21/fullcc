import Post from '../models/Post.js';

const getPosts = async (req, res) => {
    const posts = await Post.find({ collegeId: req.user.collegeId }).sort({ timestamp: -1 });
    res.json(posts);
};

const createPost = async (req, res) => {
    const post = await Post.create({ ...req.body, authorId: req.user._id, collegeId: req.user.collegeId, timestamp: Date.now() });
    res.status(201).json(post);
};

const deletePost = async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (post) {
        if (post.authorId.toString() !== req.user._id.toString() && req.user.tag !== 'Director' && req.user.tag !== 'Super Admin') {
            res.status(401); throw new Error('User not authorized');
        }
        await post.deleteOne(); res.json({ message: 'Post removed' });
    } else { res.status(404); throw new Error('Post not found'); }
};

const reactToPost = async (req, res) => {
    const { reaction } = req.body;
    const post = await Post.findById(req.params.id);
    if (post) {
        if (!post.reactions) post.reactions = new Map();
        post.reactions.forEach((users, type) => {
            if (users.includes(req.user._id)) {
                post.reactions.set(type, users.filter(id => id.toString() !== req.user._id.toString()));
            }
        });
        const users = post.reactions.get(reaction) || [];
        users.push(req.user._id);
        post.reactions.set(reaction, users);
        await post.save(); res.json(post);
    } else { res.status(404); throw new Error('Post not found'); }
};

const addComment = async (req, res) => {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (post) {
        post.comments.push({ id: Math.random().toString(36).substring(7), authorId: req.user._id, text, timestamp: Date.now() });
        await post.save(); res.json(post);
    } else { res.status(404); throw new Error('Post not found'); }
};

export { getPosts, createPost, deletePost, reactToPost, addComment };
