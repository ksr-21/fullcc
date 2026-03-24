import mongoose from 'mongoose';

const roadmapStepSchema = new mongoose.Schema({
  title: String,
  description: String,
  resources: [{ name: String, url: String }],
  duration: String,
});

const careerRoadmapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  steps: [roadmapStepSchema],
  avgSalary: String,
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
  color: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('CareerRoadmap', careerRoadmapSchema);
