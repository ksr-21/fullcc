import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  authorId: mongoose.Schema.Types.ObjectId,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const sharedPostInfoSchema = new mongoose.Schema({
  originalId: mongoose.Schema.Types.ObjectId,
  originalAuthorId: mongoose.Schema.Types.ObjectId,
  originalTimestamp: Date,
  originalContent: String,
  originalMediaUrls: [String],
  originalMediaType: { type: String, enum: ['image', 'video'] },
  originalIsEvent: Boolean,
  originalEventDetails: {
    title: String,
    date: String,
    location: String,
    link: String,
  },
  originalIsConfession: Boolean,
});

const eventDetailsSchema = new mongoose.Schema({
  title: String,
  date: String,
  location: String,
  link: String,
  category: String,
  organizer: String,
  attendees: [mongoose.Schema.Types.ObjectId],
  tags: [String],
  maxSeats: Number,
});

const opportunityDetailsSchema = new mongoose.Schema({
  title: String,
  organization: String,
  applyLink: String,
  type: { type: String, enum: ['Internship', 'Job', 'Volunteer', 'Campus Role'] },
  stipend: String,
  location: { type: String, enum: ['Remote', 'On-site', 'Hybrid'] },
  tags: [String],
  lastDateToApply: String,
});

const projectDetailsSchema = new mongoose.Schema({
  title: String,
  description: String,
  techStack: [String],
  githubUrl: String,
  demoUrl: String,
  lookingFor: [String],
});

const roadmapStepSchema = new mongoose.Schema({
  title: String,
  description: String,
  resources: [{ name: String, url: String }],
  duration: String,
});

const roadmapDetailsSchema = new mongoose.Schema({
  title: String,
  description: String,
  steps: [roadmapStepSchema],
  avgSalary: String,
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
  color: String,
});

const postSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  collegeId: mongoose.Schema.Types.ObjectId,
  content: String,
  mediaUrls: [String],
  mediaType: { type: String, enum: ['image', 'video'] },
  timestamp: { type: Date, default: Date.now },
  reactions: mongoose.Schema.Types.Mixed,
  comments: [commentSchema],
  groupId: mongoose.Schema.Types.ObjectId,
  isEvent: Boolean,
  eventDetails: eventDetailsSchema,
  isConfession: Boolean,
  confessionMood: { type: String, enum: ['love', 'funny', 'sad', 'chaos', 'deep'] },
  sharedPost: sharedPostInfoSchema,
  isOpportunity: Boolean,
  opportunityDetails: opportunityDetailsSchema,
  isProject: Boolean,
  projectDetails: projectDetailsSchema,
  isRoadmap: Boolean,
  roadmapDetails: roadmapDetailsSchema,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Post', postSchema);
