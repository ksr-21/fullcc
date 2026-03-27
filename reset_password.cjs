const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Dynamically import User model from the backend
    const User = require('./backend/src/models/User.js').default;

    const user = await User.findOne({ email: 'test@gmail.com' });
    if (user) {
      user.password = 'password123';
      await user.save();
      console.log('Password updated for test@gmail.com');
    } else {
      console.log('User test@gmail.com not found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
