
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({});
    console.log('Users found:', users.map(u => ({ email: u.email, role: u.role, tag: u.tag })));
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
