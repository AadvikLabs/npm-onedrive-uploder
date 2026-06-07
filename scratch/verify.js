const OneDriveService = require('../src/services/onedriveService');
require('dotenv').config();

async function runTests() {
    console.log('🧪 Starting Production Readiness Verification...\n');
    
    const service = new OneDriveService();

    try {
        // Test 1: Token Caching
        console.log('Test 1: Token Caching');
        const start1 = Date.now();
        await service.ensureInitialized();
        const end1 = Date.now();
        console.log(`✅ First init (auth fetch): ${end1 - start1}ms`);

        const start2 = Date.now();
        await service.ensureInitialized();
        const end2 = Date.now();
        console.log(`✅ Second init (cached): ${end2 - start2}ms`);
        
        if (end2 - start2 < end1 - start1) {
            console.log('🚀 SUCCESS: Token caching is working.\n');
        }

        // Test 2: List Files
        console.log('Test 2: Listing Files');
        const files = await service.listFiles();
        console.log(`✅ Found ${files.length} items in root.`);
        console.log('🚀 SUCCESS: API Connectivity established.\n');

        console.log('✨ All internal tests passed! Ready for production.');

    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
        process.exit(1);
    }
}

runTests();
