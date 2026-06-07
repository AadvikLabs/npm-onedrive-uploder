const OneDriveService = require('./src/services/onedriveService');
require('dotenv').config();

async function verifyUpload() {
    console.log('\n🔍 --- Verifying OneDrive Upload Service ---');

    try {
        const service = new OneDriveService();
        const testFileName = `test-upload-${Date.now()}.txt`;
        const testContent = Buffer.from('This is a test file from the OneDrive Asset Uploader.', 'utf-8');

        console.log(`⏳ Attempting to upload ${testFileName}...`);

        const result = await service.uploadToOneDrive(testFileName, testContent);

        console.log('✅ Upload Successful!');
        console.log(`   - ID: ${result.id}`);
        console.log(`   - Name: ${result.name}`);
        console.log(`   - WebURL: ${result.webUrl}`);
        console.log('\n🎉 Service is operational.');

    } catch (error) {
        console.error('\n❌ Upload Failed:', error.message);
        if (error.message.includes('credentials')) {
            console.log('💡 Check your .env file for MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_REFRESH_TOKEN.');
        }
    }
}

verifyUpload();
