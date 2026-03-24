import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  id: String,
  label: String,
});

const timetableCellSchema = new mongoose.Schema({
  subjectId: String,
  subjectIds: [String],
  facultyId: String,
  facultyIds: [String],
  roomId: String,
  type: { type: String, enum: ['lecture', 'practical'] },
  batches: [{
    id: String,
    name: String,
    subjectId: String,
    facultyIds: [String],
    roomId: String,
  }],
});

const collegeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  adminUids: [mongoose.Schema.Types.ObjectId],
  departments: [String],
  classes: mongoose.Schema.Types.Mixed,
  timetable: mongoose.Schema.Types.Mixed,
  timeSlots: [timeSlotSchema],
  timeSlotsByClass: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  location: String,
  website: String,
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('College', collegeSchema);
