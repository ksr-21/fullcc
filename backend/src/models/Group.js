import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    category: {
        type: String,
        enum: ['Academic', 'Cultural', 'Sports', 'Tech', 'Social', 'Other'],
        default: 'Other'
    },
    privacy: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    memberIds: [{ type: String }],
    creatorId: { type: String, required: true },
    pendingMemberIds: [{ type: String }],
    followers: [{ type: String }],
    resources: [{
        id: String,
        title: String,
        url: String,
        type: { type: String, enum: ['pdf', 'image', 'link', 'other'] },
        uploadedBy: String,
        timestamp: { type: Number, default: Date.now }
    }],
    tagline: String,
    coverImage: String,
    visibilitySettings: {
        about: { type: Boolean, default: true },
        feed: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        members: { type: Boolean, default: true },
        resources: { type: Boolean, default: true }
    }
}, { timestamps: true });

const Group = mongoose.model('Group', groupSchema);
export default Group;
