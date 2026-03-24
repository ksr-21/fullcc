import mongoose from 'mongoose';

const skillBadgeSchema = new mongoose.Schema({
  id: String,
  name: String,
  icon: String,
  color: String,
});

const personalNoteSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: String,
  timestamp: Date,
});

const achievementSchema = new mongoose.Schema({
  title: String,
  description: String,
});

const userSchema = new mongoose.Schema({
  firebaseId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  department: String,
  tag: {
    type: String,
    enum: ['Student', 'Teacher', 'HOD/Dean', 'Director', 'Super Admin'],
    required: true,
  },
  collegeId: mongoose.Schema.Types.ObjectId,
  avatarUrl: String,
  bio: String,
  interests: [String],
  skills: [String],
  resumeScore: Number,
  badges: [skillBadgeSchema],
  achievements: [achievementSchema],
  yearOfStudy: Number,
  rollNo: String,
  division: String,
  followingGroups: [mongoose.Schema.Types.ObjectId],
  savedPosts: [mongoose.Schema.Types.ObjectId],
  isApproved: { type: Boolean, default: false },
  isRegistered: { type: Boolean, default: false },
  isFrozen: { type: Boolean, default: false },
  requestedCollegeName: String,
  tempPassword: String,
  personalNotes: [personalNoteSchema],
  followers: [mongoose.Schema.Types.ObjectId],
  following: [mongoose.Schema.Types.ObjectId],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
