import mongoose from 'mongoose';

const departmentChatSchema = new mongoose.Schema({
    department: { type: String, required: true },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
    channel: { type: String },
    messages: [{
        id: String,
        senderId: String,
        text: String,
        timestamp: { type: Number, default: Date.now }
    }]
}, { timestamps: true });

const DepartmentChat = mongoose.model('DepartmentChat', departmentChatSchema);
export default DepartmentChat;
