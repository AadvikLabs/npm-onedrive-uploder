# @aadvik-teklabs/onedrive-uploader

[![npm version](https://img.shields.io/npm/v/@aadvik-teklabs/onedrive-uploader.svg)](https://www.npmjs.com/package/@aadvik-teklabs/onedrive-uploader)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A production-ready **Microsoft OneDrive** asset uploader for Node.js. Handles OAuth2 refresh-token flow automatically (with in-memory token caching) and exposes a simple class-based API for uploading, listing, downloading, and deleting files via the Microsoft Graph API.

---

## ✨ Features

- 🚀 **Simple API** — `OneDriveStorage` class with `uploadFile`, `listFiles`, `downloadFile`, `deleteFile`
- 🔐 **Automatic OAuth2** — refresh-token flow with cached access tokens (auto-refreshed 60s before expiry)
- 📁 **Folder support** — upload to `root` or any folder by ID
- 🌐 **Multi-tenant** — supports `common` or specific Azure AD tenant IDs
- ⚡ **Microsoft Graph** — uses the official `@microsoft/microsoft-graph-client`

---

## 📦 Installation

```bash
npm install @aadvik-teklabs/onedrive-uploader
```

---

## 🔧 Setup

### 1. Register an Azure AD application

1. Go to <https://portal.azure.com> → **Azure Active Directory** → **App registrations** → **New registration**.
2. Add a **Web** redirect URI (e.g. `http://localhost:3000/callback`).
3. Under **API permissions**, add delegated permissions: `Files.ReadWrite.All` and `offline_access`.
4. Under **Certificates & secrets**, create a **Client secret**.
5. Complete the OAuth2 auth-code flow once to obtain a **Refresh Token** (a helper script `verify-oauth.js` is included in the repo).

### 2. Create a `.env` file

```env
MS_CLIENT_ID=your-azure-app-client-id
MS_CLIENT_SECRET=your-azure-app-client-secret
MS_TENANT_ID=common
MS_REFRESH_TOKEN=your-long-lived-refresh-token
```

---

## 🚀 Usage

### Basic upload

```js
const { OneDriveStorage } = require('@aadvik-teklabs/onedrive-uploader');
const fs = require('fs');

const storage = new OneDriveStorage();

async function main() {
    const buffer = fs.readFileSync('./photo.jpg');
    const result = await storage.uploadFile(buffer, 'photo.jpg');
    console.log('Uploaded:', result);
}

main().catch(console.error);
```

### Upload to a specific folder

```js
const result = await storage.uploadFile(buffer, 'invoice.pdf', {
    folderId: '01ABCD1234EFGH5678',
});
```

### List files

```js
const files = await storage.listFiles('root'); // or a folder ID
console.log(files);
```

### Download a file

```js
const stream = await storage.downloadFile('01ABCD1234EFGH5678');
```

### Delete a file

```js
await storage.deleteFile('01ABCD1234EFGH5678');
```

### Express integration example

```js
const express = require('express');
const multer = require('multer');
const { OneDriveStorage } = require('@aadvik-teklabs/onedrive-uploader');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const storage = new OneDriveStorage();

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const result = await storage.uploadFile(req.file.buffer, req.file.originalname);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000);
```

---

## 📖 API Reference

### `new OneDriveStorage(config?)`

Creates a new client instance. Reads credentials from environment variables (`MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REFRESH_TOKEN`).

### `uploadFile(buffer, fileName, options?)`

- `buffer` — `Buffer` of file contents
- `fileName` — target file name
- `options.folderId` — optional folder ID (defaults to `'root'`)

### `listFiles(folderId)`
Returns an array of files in the given folder.

### `downloadFile(fileId)`
Returns a download stream.

### `deleteFile(fileId)`
Deletes a file by ID.

### `isAvailable()`
Returns `true` after successful authentication.

---

## 🔒 Security

- Never commit `.env` to source control.
- Rotate the `MS_REFRESH_TOKEN` if it may have been exposed.
- Use least-privilege scopes on the Azure AD app.

---

## 📝 License

MIT © [Aadvik Labs](https://github.com/AadvikLabs)

## 🔗 Links

- [GitHub Repository](https://github.com/AadvikLabs/npm-onedrive-uploder)
- [Report Issues](https://github.com/AadvikLabs/npm-onedrive-uploder/issues)
- [Microsoft Graph API Docs](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)
