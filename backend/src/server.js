import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import collegeRoutes from './routes/collegeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const whitelist = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
app.use(cors({ origin: whitelist }));
app.use(helmet());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => res.json({ message: 'Campus Connect backend is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/upload', uploadRoutes);

connectDB();

import { Server as SocketIOServer } from 'socket.io';

const io = new SocketIOServer(server, {
  cors: { origin: whitelist, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
  });

  socket.on('chatMessage', (data) => {
    io.to(data.room).emit('chatMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));

export default app;
