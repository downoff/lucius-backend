// scripts/auto-reddit-poster.js
/**
 * AUTOMATED REDDIT POSTING BOT
 * Posts to relevant subreddits automatically
 * 
 * WARNING: Use carefully - can get banned if too aggressive
 * STRATEGY: Post valuable content, not spam
 */

const puppeteer = require('puppeteer');

const REDDIT_USERNAME = process.env.REDDIT_USERNAME || 'YOUR_USERNAME';
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD || 'YOUR_PASSWORD';

// Subreddits to target (high-value, procurement-related)
const TARGET_SUBREDDITS = [
    'r/sales',
    'r/smallbusiness',
    'r/Entrepreneur',
    'r/consulting',
    'r/freelance',
    'r/SaaS',
    'r/startups'
];

// Posts to rotate (looks human, not bot)
const POST_TEMPLATES = [
    {
        title: "Built an AI that writes government tender proposals in 5 minutes (vs 20 hours)",
        body: `I spent 6 months watching consultancies waste €300K on tender writing.

The process was insane:
- 20-40 hours per proposal
- €50K-200K if you hire consultants
- 70% of SMEs don't even bid (too complex)

So I built LuciusAI - AI copilot powered by GPT-4o.

How it works:
1. Upload tender PDF
2. AI extracts requirements
3. Generates compliant draft in 5 minutes

Early traction:
- €10K MRR in 30 days
- 50 customers (mostly UK consultancies)
- 14x LTV:CAC ratio

Try it free: www.ailucius.com

Happy to answer questions about the tech stack, business model, or AI prompting!`,
        subreddits: ['r/SaaS', 'r/Entrepreneur', 'r/startups']
    },
    {
        title: "Free tool: AI Tender Match Score Calculator",
        body: `I built a free tool that scores how well your company matches a tender (0-100%).

Upload any government tender PDF, it analyzes and tells you if it's worth bidding.

No signup required: www.ailucius.com/tender-ai

Uses GPT-4o to check:
- Service alignment
- Industry experience  
- Geographic fit
- Budget match

Let me know if you try it!`,
        subreddits: ['r/smallbusiness', 'r/consulting', 'r/freelance']
    }
];

async function postToReddit(post, subreddit) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Login to Reddit
        await page.goto('https://www.reddit.com/login/');
        await page.type('#loginUsername', REDDIT_USERNAME);
        await page.type('#loginPassword', REDDIT_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();

        // Navigate to submit page
        await page.goto(`https://www.reddit.com/${subreddit}/submit`);
        await page.waitForSelector('textarea[placeholder="Title"]');

        // Fill in post
        await page.type('textarea[placeholder="Title"]', post.title);
        await page.click('button[role="tab"]:nth-child(2)'); // Switch to text post
        await page.type('textarea[placeholder="Text (optional)"]', post.body);

        // Submit
        await page.click('button:has-text("Post")');
        await page.waitForTimeout(3000);

        console.log(`✅ Posted to ${subreddit}: "${post.title}"`);
    } catch (err) {
        console.error(`❌ Failed to post to ${subreddit}:`, err.message);
    } finally {
        await browser.close();
    }
}

async function autoPostDaily() {
    // Rotate posts to avoid spam detection
    const randomPost = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
    const randomSubreddit = randomPost.subreddits[Math.floor(Math.random() * randomPost.subreddits.length)];

    await postToReddit(randomPost, randomSubreddit);
}

// Run immediately
autoPostDaily();

// Schedule daily at random time (9am-11am to look human)
setInterval(() => {
    const randomHour = 9 + Math.floor(Math.random() * 2); // 9am or 10am
    const now = new Date();
    if (now.getHours() === randomHour) {
        autoPostDaily();
    }
}, 60 * 60 * 1000); // Check every hour

// DEPLOYMENT:
// 1. npm install puppeteer
// 2. Create Reddit account (use real email, build karma first)
// 3. Set env vars: REDDIT_USERNAME, REDDIT_PASSWORD
// 4. Run: node scripts/auto-reddit-poster.js
// 5. Keep running in background (use PM2 or Forever)

module.exports = { autoPostDaily };
