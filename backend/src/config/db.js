import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI is not defined in the environment variables');
            return;
        }
        const conn = await mongoose.connect(mongoUri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        if (error.message.includes('IP address is not on your Atlas cluster\'s IP whitelist')) {
            console.error('👉 Tip: It seems like your current IP is not whitelisted in MongoDB Atlas. Please add your IP to the whitelist in the Atlas dashboard.');
        }
        // Instead of exiting, we log the error. The app might still start but fail on DB operations.
        // This allows better visibility into what's happening.
    }
};

export default connectDB;
