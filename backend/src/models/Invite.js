import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  tag: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
  department: { type: String },
  tempPassword: { type: String },
  isApproved: { type: Boolean, default: false },
  isRegistered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Invite', inviteSchema);
