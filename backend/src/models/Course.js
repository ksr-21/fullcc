import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: Number, required: true },
    division: { type: String },
    facultyId: { type: String, required: true },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
    description: { type: String },
    notes: [{
        id: String,
        title: String,
        fileUrl: String,
        fileName: String,
        uploadedAt: { type: Number, default: Date.now }
    }],
    assignments: [{
        id: String,
        title: String,
        description: String,
        fileUrl: String,
        fileName: String,
        postedAt: { type: Number, default: Date.now },
        dueDate: Number,
        submissions: {
            type: Map,
            of: {
                submitted: Boolean,
                submittedAt: Number,
                fileUrl: String,
                grade: String,
                feedback: String
            }
        }
    }],
    attendanceRecords: [{
        date: Number,
        label: String,
        records: {
            type: Map,
            of: {
                status: { type: String, enum: ['present', 'absent', 'late'] },
                note: String
            }
        }
    }],
    facultyIds: [{ type: String }],
    students: [{ type: String }],
    pendingStudents: [{ type: String }],
    messages: [{
        id: String,
        senderId: String,
        text: String,
        timestamp: { type: Number, default: Date.now }
    }],
    personalNotes: {
        type: Map,
        of: String
    },
    feedback: [{
        studentId: String,
        rating: Number,
        comment: String,
        timestamp: { type: Number, default: Date.now }
    }]
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
export default Course;
