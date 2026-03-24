import Conversation from '../models/Conversation.js';
import { transformUpdate } from '../utils/queryHelper.js';

export const createConversation = async (req, res) => {
  try {
    const existing = await Conversation.findOne({ participantIds: { $all: req.body.participantIds } });
    if (existing) return res.json(existing);

    const convo = new Conversation({ ...req.body, creatorId: req.user.userId });
    await convo.save();
    res.status(201).json(convo);
  } catch (error) {
    console.error('createConversation error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const convos = await Conversation.find({ participantIds: req.user.userId }).sort({ lastMessageAt: -1 });
    res.json(convos);
  } catch (error) {
    console.error('getConversations error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addMessage = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const newMessage = {
      senderId: req.user.userId,
      text: req.body.text,
      timestamp: new Date(),
    };
    conversation.messages.push(newMessage);
    conversation.lastMessage = newMessage;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    res.json(conversation);
  } catch (error) {
    console.error('addMessage error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    console.error('getConversationById error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateConversation = async (req, res) => {
  try {
    const mongoUpdate = transformUpdate(req.body);
    const conversation = await Conversation.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    console.error('updateConversation error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('deleteConversation error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
