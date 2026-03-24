import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Number, default: Date.now },
    deletedFor: [{ type: String }],
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;
