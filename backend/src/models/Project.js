import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  techStack: [String],
  githubUrl: String,
  demoUrl: String,
  lookingFor: [String],
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collegeId: mongoose.Schema.Types.ObjectId,
  timestamp: { type: Date, default: Date.now },
  collaborators: [mongoose.Schema.Types.ObjectId],
  images: [String],
  status: { type: String, enum: ['planning', 'in-progress', 'completed'], default: 'planning' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Project', projectSchema);
