const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
  tag: String,
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'test@gmail.com' });
  console.log('User Data:', JSON.stringify(user, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
