import express from 'express';
import upload from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  // Use the public URL path, not the internal filesystem path
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.json({
    url: fileUrl,
    fileUrl: fileUrl,
    filename: req.file.filename
  });
});

export default router;
