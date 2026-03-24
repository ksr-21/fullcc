import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminUids: [{ type: String }],
    departments: [{ type: String }],
    classes: {
        type: Map,
        of: {
            type: Map,
            of: [String]
        }
    },
    timetable: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    timeSlots: [{
        id: String,
        label: String
    }],
    timeSlotsByClass: {
        type: Map,
        of: [{
            id: String,
            label: String
        }]
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'pending'
    },
    location: { type: String },
    website: { type: String }
}, { timestamps: true });

const College = mongoose.model('College', collegeSchema);
export default College;
