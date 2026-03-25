import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  title: String,
  fileUrl: String,
  fileName: String,
  uploadedAt: { type: Date, default: Date.now },
});

const assignmentSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  title: String,
  description: String,
  fileUrl: String,
  fileName: String,
  postedAt: { type: Date, default: Date.now },
  dueDate: Date,
  submissions: mongoose.Schema.Types.Mixed,
});

const attendanceRecordSchema = new mongoose.Schema({
  date: Date,
  label: String,
  records: mongoose.Schema.Types.Mixed,
});

const feedbackSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  rating: Number,
  comment: String,
  timestamp: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId() },
  senderId: mongoose.Schema.Types.ObjectId,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const courseSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: Number, required: true },
  division: String,
  facultyId: mongoose.Schema.Types.ObjectId,
  collegeId: mongoose.Schema.Types.ObjectId,
  description: String,
  notes: [noteSchema],
  assignments: [assignmentSchema],
  attendanceRecords: [attendanceRecordSchema],
  facultyIds: [mongoose.Schema.Types.ObjectId],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingStudents: [mongoose.Schema.Types.ObjectId],
  messages: [messageSchema],
  personalNotes: mongoose.Schema.Types.Mixed,
  feedback: [feedbackSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Course', courseSchema);
