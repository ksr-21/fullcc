const uploadFile = (req, res) => {
    if (!req.file) { res.status(400); throw new Error('Please upload a file'); }
    res.json({
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
};
export { uploadFile };
