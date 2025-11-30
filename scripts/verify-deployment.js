const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Pre-Deployment Verification for LuciusAI\n');

const checks = [];

// 1. Check environment variables
function checkEnv() {
    console.log('1️⃣ Checking environment variables...');
    const required = ['OPENAI_API_KEY', 'MONGO_URI', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.log('   ❌ Missing: ' + missing.join(', '));
        console.log('   ⚠️  Create .env file with these variables');
        return false;
    }
    console.log('   ✅ All environment variables present\n');
    return true;
}

// 2. Verify automation scripts exist
function checkScripts() {
    console.log('2️⃣ Checking automation scripts...');
    const fs = require('fs');
    const scriptsDir = path.join(__dirname, 'scripts');
    const requiredScripts = [
        'auto-content-api.js',
        'auto-sdr.js',
        'auto-investor-update.js',
        'auto-demo-video.js',
        'generate-sitemap.js'
    ];

    const missing = requiredScripts.filter(script =>
        !fs.existsSync(path.join(scriptsDir, script))
    );

    if (missing.length > 0) {
        console.log('   ❌ Missing scripts: ' + missing.join(', '));
        return false;
    }
    console.log('   ✅ All automation scripts present\n');
    return true;
}

// 3. Test OpenAI connection
async function testOpenAI() {
    console.log('3️⃣ Testing OpenAI API connection...');
    try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'Say "OK"' }],
            max_tokens: 10
        });

        console.log('   ✅ OpenAI API working (GPT-4o verified)\n');
        return true;
    } catch (error) {
        console.log('   ❌ OpenAI API failed:', error.message);
        return false;
    }
}

// 4. Summary
async function runChecks() {
    require('dotenv').config({ path: path.resolve(__dirname, '.env') });

    const results = [];
    results.push(checkEnv());
    results.push(checkScripts());
    results.push(await testOpenAI());

    console.log('═══════════════════════════════════════');
    if (results.every(r => r)) {
        console.log('✅ ALL CHECKS PASSED - READY TO DEPLOY');
    } else {
        console.log('❌ SOME CHECKS FAILED - FIX BEFORE DEPLOYING');
    }
    console.log('═══════════════════════════════════════\n');
}

runChecks().catch(console.error);
