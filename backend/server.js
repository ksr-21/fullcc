import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './src/config/db.js';
import { notFound, errorHandler } from './src/middleware/error.js';

import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import collegeRoutes from './src/routes/collegeRoutes.js';
import postRoutes from './src/routes/postRoutes.js';
import storyRoutes from './src/routes/storyRoutes.js';
import groupRoutes from './src/routes/groupRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import academicRoutes from './src/routes/academicRoutes.js';
import noticeRoutes from './src/routes/noticeRoutes.js';
import careerRoutes from './src/routes/careerRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';

import socketService from './src/services/socketService.js';

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => { res.send('Campus Connect API is running...'); });

socketService(io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => { console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`); });
