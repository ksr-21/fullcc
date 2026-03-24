import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  deletedFor: [mongoose.Schema.Types.ObjectId],
  mediaUrl: String,
  mediaType: { type: String, enum: ['image', 'video', 'file'] },
});

const conversationSchema = new mongoose.Schema({
  participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  collegeId: mongoose.Schema.Types.ObjectId,
  messages: [messageSchema],
  name: String,
  isGroupChat: { type: Boolean, default: false },
  creatorId: mongoose.Schema.Types.ObjectId,
  lastMessage: messageSchema,
  lastMessageAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Conversation', conversationSchema);
