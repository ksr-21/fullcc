import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const skillBadgeSchema = new mongoose.Schema({
  id: String,
  name: String,
  icon: String,
  color: String,
}, { _id: false });

const personalNoteSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: String,
  timestamp: Date,
}, { _id: false });

const achievementSchema = new mongoose.Schema({
  title: String,
  description: String,
}, { _id: false });

const userBaseSchema = new mongoose.Schema({
  uid: { type: String, unique: true, sparse: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String },
  department: String,
  collegeId: { type: String, trim: true },
  avatarUrl: String,
  bio: String,
  interests: [String],
  skills: [String],
  resumeScore: Number,
  badges: [skillBadgeSchema],
  achievements: [achievementSchema],
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
}, {
  timestamps: true,
  discriminatorKey: 'tag',
  collection: 'users'
});

userBaseSchema.pre('save', async function savePassword(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userBaseSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userBaseSchema);

const studentSchema = new mongoose.Schema({
  yearOfStudy: { type: Number, required: true, min: 1, max: 6 },
  rollNo: { type: String, required: true, trim: true },
  division: { type: String, required: true, trim: true },
});

const teacherSchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true },
  designation: { type: String, trim: true },
  qualification: { type: String, trim: true },
});

const hodSchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true },
  designation: { type: String, trim: true },
  qualification: { type: String, trim: true },
});

export const StudentUser = mongoose.models.Student || User.discriminator('Student', studentSchema);
export const TeacherUser = mongoose.models.Teacher || User.discriminator('Teacher', teacherSchema);
export const HodDeanUser = mongoose.models['HOD/Dean'] || User.discriminator('HOD/Dean', hodSchema);

export const getUserModelByTag = (tag) => {
  switch (tag) {
    case 'Student':
      return StudentUser;
    case 'Teacher':
      return TeacherUser;
    case 'HOD/Dean':
      return HodDeanUser;
    default:
      return User;
  }
};

export default User;
