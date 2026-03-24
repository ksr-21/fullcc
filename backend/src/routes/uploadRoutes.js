import express from 'express';
import upload from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: `${req.protocol}://${req.get('host')}/${req.file.path.replace('\\', '/')}` });
});

export default router;
