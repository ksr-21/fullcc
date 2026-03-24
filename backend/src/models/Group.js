import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  senderId: mongoose.Schema.Types.ObjectId,
  text: String,
  timestamp: { type: Date, default: Date.now },
  deletedFor: [mongoose.Schema.Types.ObjectId],
});

const groupResourceSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  title: String,
  url: String,
  type: { type: String, enum: ['pdf', 'image', 'link', 'other'] },
  uploadedBy: mongoose.Schema.Types.ObjectId,
  timestamp: { type: Date, default: Date.now },
});

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['Academic', 'Cultural', 'Sports', 'Tech', 'Social', 'Other'],
  },
  privacy: { type: String, enum: ['public', 'private'], default: 'public' },
  collegeId: mongoose.Schema.Types.ObjectId,
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pendingMemberIds: [mongoose.Schema.Types.ObjectId],
  messages: [messageSchema],
  followers: [mongoose.Schema.Types.ObjectId],
  resources: [groupResourceSchema],
  tagline: String,
  coverImage: String,
  visibilitySettings: {
    about: { type: Boolean, default: true },
    feed: { type: Boolean, default: true },
    events: { type: Boolean, default: true },
    members: { type: Boolean, default: true },
    resources: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Group', groupSchema);
