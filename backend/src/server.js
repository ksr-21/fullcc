import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import collegeRoutes from './routes/collegeRoutes.js';
import postRoutes from './routes/postRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import careerRoutes from './routes/careerRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

import socketService from './services/socketService.js';

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

const whitelist = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(',');

const io = new Server(httpServer, { cors: { origin: whitelist, methods: ['GET', 'POST'] } });

app.use(helmet());
app.use(cors({ origin: whitelist }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// uploads is typically at the root of backend
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => { res.send('Campus Connect API is running...'); });

socketService(io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => { console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`); });
