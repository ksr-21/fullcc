import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  senderId: mongoose.Schema.Types.ObjectId,
  text: String,
  timestamp: { type: Date, default: Date.now },
  deletedFor: [mongoose.Schema.Types.ObjectId],
});

const departmentChatSchema = new mongoose.Schema({
  department: { type: String, required: true },
  collegeId: mongoose.Schema.Types.ObjectId,
  channel: String,
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('DepartmentChat', departmentChatSchema);
