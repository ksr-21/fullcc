import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    uid: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    department: { type: String },
    tag: {
        type: String,
        enum: ['Student', 'Teacher', 'HOD/Dean', 'Director', 'Super Admin'],
        default: 'Student'
    },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    avatarUrl: { type: String },
    bio: { type: String },
    interests: [{ type: String }],
    skills: [{ type: String }],
    resumeScore: { type: Number },
    badges: [{
        id: String,
        name: String,
        icon: String,
        color: String
    }],
    achievements: [{
        title: String,
        description: String
    }],
    yearOfStudy: { type: Number },
    rollNo: { type: String },
    division: { type: String },
    followingGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    isApproved: { type: Boolean, default: false },
    isRegistered: { type: Boolean, default: false },
    isFrozen: { type: Boolean, default: false },
    requestedCollegeName: { type: String },
    tempPassword: { type: String },
    personalNotes: [{
        id: String,
        title: String,
        content: String,
        timestamp: { type: Number, default: Date.now }
    }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
