import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    participantIds: [{ type: String }],
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    name: { type: String },
    isGroupChat: { type: Boolean, default: false },
    creatorId: { type: String }
}, { timestamps: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
