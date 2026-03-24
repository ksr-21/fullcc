import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collegeId: mongoose.Schema.Types.ObjectId,
  textContent: String,
  mediaUrl: String,
  mediaType: { type: String, enum: ['image', 'video'] },
  backgroundColor: String,
  timestamp: { type: Date, default: Date.now },
  viewedBy: [mongoose.Schema.Types.ObjectId],
  likedBy: [mongoose.Schema.Types.ObjectId],
  fontFamily: { type: String, default: 'sans-serif' },
  fontWeight: { type: String, default: 'normal' },
  fontSize: { type: String, default: 'base' },
  groupId: mongoose.Schema.Types.ObjectId,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete stories after 24 hours
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Story', storySchema);
