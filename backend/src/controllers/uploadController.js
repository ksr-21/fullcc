const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Please upload a file' });
    }

    // Always return a full URL if possible to avoid relative path issues on different environments
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({
        fileUrl,
        url: fileUrl, // Support both keys
        fileName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
};
export { uploadFile };
