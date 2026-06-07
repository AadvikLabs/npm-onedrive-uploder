const OneDriveService = require('./src/services/onedriveService');

class OneDriveStorage {
    constructor(config) {
        this.service = new OneDriveService(config);
    }

    async uploadFile(fileBuffer, fileName, options = {}) {
        const folderId = options.folderId || 'root';
        return await this.service.uploadToOneDrive(fileName, fileBuffer, folderId);
    }

    async downloadFile(fileId) {
        return await this.service.downloadFile(fileId);
    }

    async listFiles(folderId) {
        return await this.service.listFiles(folderId);
    }

    async deleteFile(fileId) {
        return await this.service.deleteFile(fileId);
    }

    isAvailable() {
        return this.service.isAvailable();
    }
}

module.exports = { OneDriveStorage };