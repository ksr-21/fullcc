import mongoose from 'mongoose';

const mentorSchema = new mongoose.Schema({
    userId: { type: String },
    name: { type: String, required: true },
    role: { type: String, required: true },
    company: { type: String, required: true },
    expertise: [{ type: String }],
    availableFor: [{
        type: String,
        enum: ['Resume Review', 'Career Guidance', 'Mock Interview']
    }],
    rating: { type: Number, default: 0 },
    avatarUrl: { type: String }
}, { timestamps: true });

const Mentor = mongoose.model('Mentor', mentorSchema);
export default Mentor;
