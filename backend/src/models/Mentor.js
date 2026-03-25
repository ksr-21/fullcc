import mongoose from 'mongoose';

const mentorSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true },
  role: String,
  company: String,
  expertise: [String],
  availableFor: [String],
  rating: { type: Number, default: 0 },
  avatarUrl: String,
  bio: String,
  connections: [mongoose.Schema.Types.ObjectId],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Mentor', mentorSchema);
