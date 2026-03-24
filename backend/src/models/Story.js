import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    textContent: { type: String },
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ['image', 'video'] },
    backgroundColor: { type: String },
    timestamp: { type: Number, default: Date.now },
    viewedBy: [{ type: String }],
    likedBy: [{ type: String }],
    fontFamily: { type: String },
    fontWeight: { type: String },
    fontSize: { type: String },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }
}, { timestamps: true });

const Story = mongoose.model('Story', storySchema);
export default Story;
