import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Number, default: Date.now },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    mediaUrl: { type: String },
    targetDepartments: [{ type: String }],
    targetYears: [{ type: Number }],
    targetClasses: [{ type: String }],
    targetDept: { type: String },
    targetAudience: { type: String }
}, { timestamps: true });

const Notice = mongoose.model('Notice', noticeSchema);
export default Notice;
