import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    content: { type: String },
    mediaUrls: [{ type: String }],
    mediaType: { type: String, enum: ['image', 'video'] },
    reactions: {
        type: Map,
        of: [String]
    },
    comments: [{
        id: String,
        authorId: { type: String, required: true },
        text: { type: String, required: true },
        timestamp: { type: Number, default: Date.now }
    }],
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    isEvent: { type: Boolean, default: false },
    eventDetails: {
        title: String,
        date: String,
        location: String,
        link: String,
        category: String,
        organizer: String,
        attendees: [String],
        tags: [String],
        maxSeats: Number
    },
    isConfession: { type: Boolean, default: false },
    confessionMood: {
        type: String,
        enum: ['love', 'funny', 'sad', 'chaos', 'deep']
    },
    sharedPost: {
        originalId: String,
        originalAuthorId: String,
        originalTimestamp: Number,
        originalContent: String,
        originalMediaUrls: [String],
        originalMediaType: String,
        originalIsEvent: Boolean,
        originalEventDetails: mongoose.Schema.Types.Mixed,
        originalIsConfession: Boolean
    },
    isOpportunity: { type: Boolean, default: false },
    opportunityDetails: {
        title: String,
        organization: String,
        applyLink: String,
        type: { type: String, enum: ['Internship', 'Job', 'Volunteer', 'Campus Role'] },
        stipend: String,
        location: { type: String, enum: ['Remote', 'On-site', 'Hybrid'] },
        tags: [String],
        lastDateToApply: String
    },
    isProject: { type: Boolean, default: false },
    projectDetails: {
        title: String,
        description: String,
        techStack: [String],
        githubUrl: String,
        demoUrl: String,
        lookingFor: [String]
    },
    isRoadmap: { type: Boolean, default: false },
    roadmapDetails: mongoose.Schema.Types.Mixed,
    timestamp: { type: Number, default: Date.now }
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);
export default Post;
