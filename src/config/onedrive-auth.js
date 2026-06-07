const fetch = require('isomorphic-fetch');
require('dotenv').config();

const CLIENT_ID = process.env.MS_CLIENT_ID || process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET || process.env.CLIENT_SECRET;
const TENANT_ID = process.env.MS_TENANT_ID || process.env.TENANT_ID || 'common';
const REFRESH_TOKEN = process.env.MS_REFRESH_TOKEN;

// Token Cache
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    // If token exists and is not expired (with 1-minute buffer), return it
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        throw new Error('Missing credentials in .env (MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REFRESH_TOKEN)');
    }

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
        scope: 'offline_access Files.ReadWrite.All',
    });

    try {
        const response = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error_description || 'Failed to refresh token');
        }

        // Store token and set expiry (expires_in is in seconds)
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        return cachedToken;
    } catch (error) {
        console.error('Auth Error:', error.message);
        throw error;
    }
}

module.exports = { getAccessToken };
