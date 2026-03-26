import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  collegeId: mongoose.Schema.Types.ObjectId,
  mediaUrl: String,
  imageUrl: String,
  targetDepartments: [String],
  targetYears: [Number],
  targetClasses: [String],
  targetDept: String,
  targetAudience: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Notice', noticeSchema);
