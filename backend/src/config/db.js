import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI is not defined in the environment variables');
            return;
        }

        // Try to connect
        try {
            const conn = await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 10000,
            });
            console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        } catch (initialError) {
            if (initialError.message.includes('querySrv ECONNREFUSED') || 
                initialError.message.includes('ECONNREFUSED')) {
                console.warn('⚠️ DNS SRV resolution failed. Trying to force Google DNS (8.8.8.8)...');
                
                // Forcing public DNS for SRV resolution
                dns.setServers(['8.8.8.8', '8.8.4.4']);
                
                const conn = await mongoose.connect(mongoUri, {
                    serverSelectionTimeoutMS: 10000,
                });
                console.log(`✅ MongoDB Connected (via Public DNS): ${conn.connection.host}`);
            } else {
                throw initialError;
            }
        }
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        if (error.message.includes('IP address is not on your Atlas cluster\'s IP whitelist')) {
            console.error('👉 Tip: Ensure your current IP is whitelisted in MongoDB Atlas.');
        } else if (error.message.includes('querySrv')) {
            console.error('👉 Tip: Your local network seems to block SRV lookups. Use the non-SRV (Standard) connection string from Atlas.');
        }
        // Don't kill the process, but the server won't work well without a DB
    }
};

export default connectDB;
