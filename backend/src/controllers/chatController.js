import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const getConversations = async (req, res) => {
    const conversations = await Conversation.find({ participantIds: req.user._id, collegeId: req.user.collegeId }).populate('messages');
    res.json(conversations);
};

const createConversation = async (req, res) => {
    const conversation = await Conversation.create({ ...req.body, participantIds: [...new Set([...req.body.participantIds, req.user._id])], collegeId: req.user.collegeId, creatorId: req.user._id });
    res.status(201).json(conversation);
};

const sendMessage = async (req, res) => {
    const { text, conversationId } = req.body;
    const message = await Message.create({ senderId: req.user._id, text, conversationId, timestamp: Date.now() });
    await Conversation.findByIdAndUpdate(conversationId, { $push: { messages: message._id } });
    res.status(201).json(message);
};

export { getConversations, createConversation, sendMessage };
