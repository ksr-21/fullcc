import mongoose from 'mongoose';

const inviteBaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  department: String,
  avatarUrl: String,
  collegeId: { type: String, trim: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isApproved: { type: Boolean, default: false },
  isRegistered: { type: Boolean, default: false },
  tempPassword: { type: String },
}, {
  timestamps: true,
  discriminatorKey: 'tag',
  collection: 'invites'
});

const Invite = mongoose.models.Invite || mongoose.model('Invite', inviteBaseSchema);

const studentInviteSchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true },
  yearOfStudy: { type: Number, required: true, min: 1, max: 6 },
  year: { type: Number, min: 1, max: 6 },
  rollNo: { type: String, required: true, trim: true },
  division: { type: String, required: true, trim: true },
  div: { type: String, trim: true },
});

const teacherInviteSchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true },
  designation: { type: String, trim: true },
  qualification: { type: String, trim: true },
});

const hodInviteSchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true },
});

const directorInviteSchema = new mongoose.Schema({});
const superAdminInviteSchema = new mongoose.Schema({});

export const StudentInvite = mongoose.models.StudentInvite || Invite.discriminator('StudentInvite', studentInviteSchema, 'Student');
export const TeacherInvite = mongoose.models.TeacherInvite || Invite.discriminator('TeacherInvite', teacherInviteSchema, 'Teacher');
export const HodDeanInvite = mongoose.models.HodDeanInvite || Invite.discriminator('HodDeanInvite', hodInviteSchema, 'HOD/Dean');
export const DirectorInvite = mongoose.models.DirectorInvite || Invite.discriminator('DirectorInvite', directorInviteSchema, 'Director');
export const SuperAdminInvite = mongoose.models.SuperAdminInvite || Invite.discriminator('SuperAdminInvite', superAdminInviteSchema, 'Super Admin');

export const getInviteModelByTag = (tag) => {
  switch (tag) {
    case 'Student':
      return StudentInvite;
    case 'Teacher':
      return TeacherInvite;
    case 'HOD/Dean':
      return HodDeanInvite;
    case 'Director':
      return DirectorInvite;
    case 'Super Admin':
      return SuperAdminInvite;
    default:
      return Invite;
  }
};

export default Invite;
