import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { transformUpdate } from '../utils/queryHelper.js';

const findConversationByIdentifier = (identifier) => {
  if (mongoose.isValidObjectId(identifier)) {
    return Conversation.findById(identifier);
  }
  return Conversation.findOne({ systemKey: identifier });
};

const findConversationByIdentifierAndUpdate = (identifier, update, options = { new: true }) => {
  if (mongoose.isValidObjectId(identifier)) {
    return Conversation.findByIdAndUpdate(identifier, update, options);
  }
  return Conversation.findOneAndUpdate({ systemKey: identifier }, update, options);
};

const findConversationByIdentifierAndDelete = (identifier) => {
  if (mongoose.isValidObjectId(identifier)) {
    return Conversation.findByIdAndDelete(identifier);
  }
  return Conversation.findOneAndDelete({ systemKey: identifier });
};

export const createConversation = async (req, res) => {
  try {
    const participantIds = Array.isArray(req.body.participantIds) ? req.body.participantIds : [];
    const systemKey = typeof req.body.systemKey === 'string' && req.body.systemKey.trim()
      ? req.body.systemKey.trim()
      : undefined;

    let existing = null;
    if (systemKey) {
      existing = await Conversation.findOne({ systemKey });
    } else if (!req.body.isGroupChat && participantIds.length > 0) {
      existing = await Conversation.findOne({ isGroupChat: false, participantIds: { $all: participantIds } });
      if (existing && existing.participantIds.length !== participantIds.length) {
        existing = null;
      }
    }

    if (existing) return res.json(existing);

    const payload = {
      ...req.body,
      systemKey,
      creatorId: req.body.creatorId === 'system' ? 'system' : req.user.userId,
    };
    delete payload._id;

    const convo = new Conversation(payload);
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
    const conversation = await findConversationByIdentifier(req.params.id);
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
    const conversation = await findConversationByIdentifier(req.params.id);
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
    const conversation = await findConversationByIdentifierAndUpdate(req.params.id, mongoUpdate, { new: true });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    console.error('updateConversation error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const conversation = await findConversationByIdentifierAndDelete(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('deleteConversation error', error);
    res.status(500).json({ message: 'Server error' });
  }
};
