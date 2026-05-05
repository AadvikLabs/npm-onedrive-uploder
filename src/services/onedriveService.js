const { getAccessToken } = require('../config/onedrive-auth');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

class OneDriveService {
    constructor(config) {
        this.config = config;
        this.client = null;
        this.isInitialized = false;
    }

    async ensureInitialized() {
        try {
            const accessToken = await getAccessToken(this.config);
            this.client = Client.init({
                authProvider: (done) => done(null, accessToken),
            });
            this.isInitialized = true;
        } catch (error) {
            this.isInitialized = false;
            throw new Error(`OneDrive Auth Failed: ${error.message}`);
        }
    }

    isAvailable() {
        return this.isInitialized;
    }

    async uploadToOneDrive(fileName, fileBuffer, folderId = 'root') {
        try {
            await this.ensureInitialized();

            // 1. Prepare Folder Path
            let itemPath;
            if (folderId === 'root') {
                itemPath = `/me/drive/root:/${fileName}`;
            } else {
                // Ensure folder exists
                try {
                    await this.client.api(`/me/drive/root/children/${folderId}`).get();
                } catch (e) {
                    // If it doesn't exist and looks like a name (not an ID), create it
                    if (!folderId.match(/^[A-Z0-9]{16}!/)) { 
                        try {
                            await this.client.api('/me/drive/root/children').post({
                                name: folderId,
                                folder: {},
                                "@microsoft.graph.conflictBehavior": "replace"
                            });
                        } catch (err) {
                            console.warn(`Folder creation skipped or failed: ${err.message}`);
                        }
                    }
                }
                itemPath = `/me/drive/root:/${folderId}/${fileName}`;
            }

            // 2. Determine Upload Strategy (Simple vs Session)
            const FOUR_MB = 4 * 1024 * 1024;
            
            let response;
            if (fileBuffer.length <= FOUR_MB) {
                response = await this.client.api(`${itemPath}:/content`).put(fileBuffer);
            } else {
                const payload = {
                    item: {
                        "@microsoft.graph.conflictBehavior": "replace",
                        name: fileName
                    }
                };
                
                const session = await this.client.api(`${itemPath}:/createUploadSession`).post(payload);
                const uploadUrl = session.uploadUrl;
                
                const fileSize = fileBuffer.length;
                const chunkSize = 327680 * 10; 
                let cursor = 0;
                
                while (cursor < fileSize) {
                    const end = Math.min(cursor + chunkSize, fileSize);
                    const chunk = fileBuffer.slice(cursor, end);
                    
                    const uploadResponse = await fetch(uploadUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Length': chunk.length,
                            'Content-Range': `bytes ${cursor}-${end - 1}/${fileSize}`
                        },
                        body: chunk
                    });
                    
                    if (!uploadResponse.ok) {
                        const errData = await uploadResponse.json();
                        throw new Error(`Chunk upload failed: ${errData.error?.message || 'Unknown error'}`);
                    }

                    response = await uploadResponse.json();
                    cursor = end;
                }
            }
            
            return {
                id: response.id,
                name: response.name,
                webUrl: response.webUrl,
                size: response.size,
                contentType: response.file?.mimeType || null
            };
        } catch (error) {
            console.error('OneDrive Upload Error:', error.message);
            throw new Error(`Upload Failed: ${error.message}`);
        }
    }

    async createSharingLink(fileId) {
        try {
            await this.ensureInitialized();
            const response = await this.client.api(`/me/drive/items/${fileId}/createLink`).post({
                type: 'view',
                scope: 'anonymous'
            });
            return response.link.webUrl;
        } catch (error) {
            throw new Error(`Sharing Link Failed: ${error.message}`);
        }
    }

    async getDownloadUrl(fileId) {
        try {
            await this.ensureInitialized();
            const response = await this.client.api(`/me/drive/items/${fileId}`).get();
            return response['@microsoft.graph.downloadUrl'];
        } catch (error) {
            throw new Error(`Download URL Fetch Failed: ${error.message}`);
        }
    }

    async getFileStream(fileId) {
        try {
            await this.ensureInitialized();
            const metadata = await this.client.api(`/me/drive/items/${fileId}`).get();
            const response = await this.client.api(`/me/drive/items/${fileId}/content`).get();
            
            return {
                stream: response,
                name: metadata.name,
                mimeType: metadata.file?.mimeType || 'application/octet-stream'
            };
        } catch (error) {
            throw new Error(`File Stream Failed: ${error.message}`);
        }
    }

    async downloadFile(fileId) {
        try {
            await this.ensureInitialized();
            const response = await this.client.api(`/me/drive/items/${fileId}/content`).get();
            
            if (Buffer.isBuffer(response)) return response;

            if (response.pipe || typeof response.on === 'function') {
                return new Promise((resolve, reject) => {
                    const chunks = [];
                    response.on('data', chunk => chunks.push(chunk));
                    response.on('end', () => resolve(Buffer.concat(chunks)));
                    response.on('error', reject);
                });
            }

            try {
                if (response.arrayBuffer) {
                    const ab = await response.arrayBuffer();
                    return Buffer.from(ab);
                }
            } catch (e) {}

            return Buffer.from(response);
        } catch (error) {
            throw new Error(`Download Failed: ${error.message}`);
        }
    }

    async deleteFile(fileId) {
        try {
            await this.ensureInitialized();
            await this.client.api(`/me/drive/items/${fileId}`).delete();
        } catch (error) {
            throw new Error(`Delete Failed: ${error.message}`);
        }
    }

    async listFiles(folderId = 'root') {
        try {
            await this.ensureInitialized();
            let apiPath = folderId === 'root' ? '/me/drive/root/children' : 
                         (folderId.includes('/') ? `/me/drive/root:/${folderId}:/children` : `/me/drive/items/${folderId}/children`);

            const response = await this.client.api(apiPath).get();
            return response.value.map(item => ({
                id: item.id,
                name: item.name,
                size: item.size,
                webUrl: item.webUrl,
                folder: !!item.folder,
                mimeType: item.file?.mimeType
            }));
        } catch (error) {
            throw new Error(`List Files Failed: ${error.message}`);
        }
    }

    async searchFiles(query) {
        try {
            await this.ensureInitialized();
            const response = await this.client.api(`/me/drive/root/search(q='${query}')`).get();
            return response.value;
        } catch (error) {
            throw new Error(`Search Failed: ${error.message}`);
        }
    }
}

module.exports = OneDriveService;