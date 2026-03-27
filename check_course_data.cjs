const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const CourseSchema = new mongoose.Schema({
  attendanceRecords: Array
}, { strict: false });

const Course = mongoose.model('Course', CourseSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const course = await Course.findOne({ "attendanceRecords.0": { $exists: true } });
  if (course) {
    console.log('Course ID:', course._id);
    console.log('First Attendance Record:', JSON.stringify(course.attendanceRecords[0], null, 2));
    console.log('Date Type:', typeof course.attendanceRecords[0].date);
    if (course.attendanceRecords[0].date instanceof Date) {
        console.log('Date is instance of Date');
        console.log('ISO String:', course.attendanceRecords[0].date.toISOString());
    }
  } else {
    console.log('No courses with attendance found');
  }
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
