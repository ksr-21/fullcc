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
        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        if (error.message.includes('IP address is not on your Atlas cluster\'s IP whitelist') ||
            error.message.includes('Could not connect to any servers')) {
            console.error('👉 Tip: It seems like your current IP is not whitelisted in MongoDB Atlas or the cluster is unreachable.');
        }
    }
};

export default connectDB;
