const http = require('http'); //HTTP server
const url = require('url'); //URL parsing
const fetch = require('isomorphic-fetch'); //HTTP client
const { exec } = require('child_process'); //Child process management
require('dotenv').config(); //Loads environment variables from .env file

// Configuration
const CLIENT_ID = process.env.MS_CLIENT_ID || process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET || process.env.CLIENT_SECRET;
const PORT = process.env.PORT || 3000;
const REDIRECT_URI = `http://localhost:${PORT}/auth/callback`;
const TENANT = 'common'; // 'common' allows both Personal (Consumer) and Work/School accounts

// Validation: Check for basic Client Credentials
if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_ID.includes('your_')) {
    console.error('❌ Error: MS_CLIENT_ID and MS_CLIENT_SECRET must be set correctly in .env file.');
    console.log('Please add them and retry.');
    process.exit(1);
}

// Scopes required for the application
// - Files.Read: To read file properties
// - Files.ReadWrite: To upload files
// - offline_access: CRITICAL for getting a Refresh Token for long-term access
// - User.Read: To verify user identity
const SCOPES = ['Files.Read', 'Files.ReadWrite', 'offline_access', 'User.Read'].join(' ');

/**
 * Step 1: Start a temporary local HTTP server.
 * This server listens for the OAuth callback from Microsoft.
 */
const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);

    // Filter validation for the callback path
    if (reqUrl.pathname === '/auth/callback') {
        const authCode = reqUrl.query.code;

        if (authCode) {
            console.log(`\n✅ Authorization Code received.`);
            // Send a nice HTML response to the user in the browser
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<h1>Authentication Successful!</h1><p>You can close this window and return to the console.</p>');
            res.end();

            // Proceed to Step 2: Exchange the code for actual tokens
            await exchangeCodeForToken(authCode);
        } else {
            res.writeHead(400);
            res.end('Authorization code missing.');
        }
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Start listening and initiate the flow
server.listen(PORT, () => {
    console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
    startAuthFlow();
});

/**
 * Initiates the OAuth flow by constructing the Authorization URL
 * and opening it in the user's default browser.
 */
function startAuthFlow() {
    const authUrl = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_mode=query&scope=${encodeURIComponent(SCOPES)}`;

    console.log('\nPlease log in via the browser window that opens.');
    console.log('If it does not open, copy and paste this URL:\n');
    console.log(authUrl);

    // Try to open the browser automatically
    exec(`start "${authUrl}"`, (err) => {
        // Suppress errors if 'start' command fails (non-Windows)
    });
}

/**
 * Step 2: Exchanges the temporary Authorization Code for Access & Refresh Tokens.
 * 
 * @param {string} code - The authorization code received from the callback.
 */
async function exchangeCodeForToken(code) {
    console.log('\n⏳ Exchanging code for tokens...');

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);

    try {
        const response = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();

        if (data.error) {
            console.error('❌ Token Exchange Error:', data.error_description);
            process.exit(1);
        }

        console.log('✅ Tokens received!');

        // Proceed to Step 3: Fetch the user's Root Folder ID
        await getFolderId(data.access_token, data.refresh_token);

    } catch (error) {
        console.error('❌ Error during token exchange:', error);
        process.exit(1);
    }
}

/**
 * Step 3: Fetches the ID of the root folder (or allows 'root' alias).
 * Logs the final configuration values for the user.
 * 
 * @param {string} accessToken - The short-lived access token.
 * @param {string} refreshToken - The long-lived refresh token.
 */
async function getFolderId(accessToken, refreshToken) {
    console.log('\n⏳ Fetching Root Folder ID...');

    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const data = await response.json();

        if (data.error) {
            console.error('❌ Error fetching folder:', data.error);
        } else {
            console.log('✅ Folder ID found!');

            console.log('\n🎉 --- SETUP COMPLETE ---');
            console.log('Add these lines to your .env file:\n');

            console.log(`MS_REFRESH_TOKEN=${refreshToken}`);
            console.log(`ONEDRIVE_FOLDER_ID=${data.id}`);

            console.log('\n(You can also use "root" as the folder ID)');
        }

    } catch (error) {
        console.error('❌ Error fetching folder ID:', error);
    } finally {
        console.log('\nPress Ctrl+C to exit (or script will close shortly).');
        server.close();
        process.exit(0);
    }
}
