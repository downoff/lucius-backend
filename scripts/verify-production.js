const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:10000'; // Default to local, but can be set to prod URL
const COLORS = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

console.log(`${COLORS.cyan}🚀 Starting Production Verification for LuciusAI...${COLORS.reset}\n`);

async function verifyEndpoint(name, url, method = 'GET', body = null) {
    try {
        const start = Date.now();
        let response;

        if (method === 'GET') {
            response = await axios.get(url);
        } else if (method === 'POST') {
            response = await axios.post(url, body);
        }

        const duration = Date.now() - start;

        if (response.status >= 200 && response.status < 300) {
            console.log(`${COLORS.green}✅ [PASS] ${name} (${duration}ms)${COLORS.reset}`);
            return true;
        } else {
            console.log(`${COLORS.red}❌ [FAIL] ${name} - Status: ${response.status}${COLORS.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${COLORS.red}❌ [FAIL] ${name} - Error: ${error.message}${COLORS.reset}`);
        if (error.response) {
            console.log(`   Response data: ${JSON.stringify(error.response.data)}`);
        }
        return false;
    }
}

async function runVerification() {
    let passed = 0;
    let total = 0;

    // 1. Health Check
    total++;
    if (await verifyEndpoint('Health Check', `${API_URL}/health`)) passed++;

    // 2. Public API (Marketing)
    total++;
    if (await verifyEndpoint('Public API (Marketing)', `${API_URL}/api/public/marketing-content`)) passed++;

    // 3. Bid/No-Bid Scorer (Mock Test)
    // We use a mock body to test the endpoint exists and validates input
    total++;
    const bidBody = {
        tenderText: "This is a test tender description for verification purposes.",
        companyProfile: "Test Company"
    };
    // Note: This might cost credits/money if live, so we might want to skip in automated CI unless flagged
    // For now, we'll assume we want to verify it works.
    if (await verifyEndpoint('Bid Scorer AI', `${API_URL}/api/tools/bid-no-bid`, 'POST', bidBody)) passed++;

    // 4. Viral Growth Endpoints
    total++;
    // Check if achievements endpoint is reachable (even if 404 for random user, it should be a valid route)
    // Actually, let's check a static route or ensure the server is up.
    // We'll check the 'share-win' endpoint with invalid data to see if it handles it gracefully (400 or 500)
    // A 400 Bad Request means the endpoint exists and logic ran.
    try {
        await axios.post(`${API_URL}/api/growth/share-win`, {});
        console.log(`${COLORS.red}❌ [FAIL] Viral Share - Should have failed with 400${COLORS.reset}`);
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.log(`${COLORS.green}✅ [PASS] Viral Share (Validation Check)${COLORS.reset}`);
            passed++;
        } else {
            console.log(`${COLORS.red}❌ [FAIL] Viral Share - Unexpected error: ${error.message}${COLORS.reset}`);
        }
    }

    console.log(`\n${COLORS.cyan}--- Summary ---${COLORS.reset}`);
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${COLORS.green}${passed}${COLORS.reset}`);
    console.log(`Failed: ${COLORS.red}${total - passed}${COLORS.reset}`);

    if (passed === total) {
        console.log(`\n${COLORS.green}✨ SYSTEM READY FOR PRODUCTION ✨${COLORS.reset}`);
        process.exit(0);
    } else {
        console.log(`\n${COLORS.red}⚠️ SYSTEM HAS ISSUES ⚠️${COLORS.reset}`);
        process.exit(1);
    }
}

runVerification();
