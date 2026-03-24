import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
  firebaseId: { type: String, unique: true, sparse: true },
  uid: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  department: String,
  tag: {
    type: String,
    enum: ['Student', 'Teacher', 'HOD/Dean', 'Director', 'Super Admin'],
    required: true,
  },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
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
  followingGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  isApproved: { type: Boolean, default: false },
  isRegistered: { type: Boolean, default: false },
  isFrozen: { type: Boolean, default: false },
  requestedCollegeName: String,
  tempPassword: String,
  personalNotes: [personalNoteSchema],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

userSchema.pre('save', async function savePassword(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
