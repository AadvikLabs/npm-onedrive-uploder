const express = require('express');
const multer = require('multer');
const OneDriveService = require('../services/onedriveService');

const router = express.Router();
const service = new OneDriveService();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided.' });
        }

        const folderId = process.env.ONEDRIVE_FOLDER_ID || 'root';
        const result = await service.uploadToOneDrive(req.file.originalname, req.file.buffer, folderId);

        // Auto-generate sharing link for convenience
        const sharingUrl = await service.createSharingLink(result.id);
        const downloadUrl = await service.getDownloadUrl(result.id);

        res.json({
            success: true,
            data: {
                ...result,
                sharingUrl: sharingUrl,
                downloadUrl: downloadUrl,
                proxyUrl: `/api/proxy/${result.id}`
            }
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/files', async (req, res) => {
    try {
        const folderId = process.env.ONEDRIVE_FOLDER_ID || 'root';
        const files = await service.listFiles(folderId);
        res.json({ success: true, data: files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/share/:fileId', async (req, res) => {
    try {
        const url = await service.createSharingLink(req.params.fileId);
        res.json({ success: true, url });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Public Proxy Route for Previews and Downloads
router.get('/proxy/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const mode = req.query.mode === 'attachment' ? 'attachment' : 'inline';
        
        // Use the service to get a fresh stream
        const fileData = await service.getFileStream(fileId);
        
        res.setHeader('Content-Type', fileData.mimeType);
        res.setHeader('Content-Disposition', `${mode}; filename="${fileData.name}"`);
        
        // Check if it's a stream or a buffer
        if (fileData.stream.pipe) {
            fileData.stream.pipe(res);
        } else {
            res.send(fileData.stream);
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).send('Error streaming file');
    }
});

module.exports = router;
