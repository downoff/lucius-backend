const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');

console.log('💼 Auto Investor Magnet - VCs Finding YOU');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Platforms where investors actively look for deals
const INVESTOR_PLATFORMS = [
    { name: 'AngelList', type: 'profile', action: 'optimize_listing' },
    { name: 'Crunchbase', type: 'profile', action: 'create_company_page' },
    { name: 'LinkedIn', type: 'content', action: 'thought_leadership_posts' },
    { name: 'Twitter/X', type: 'content', action: 'founder_thread' },
    { name: 'ProductHunt', type: 'launch', action: 'product_launch' },
    { name: 'IndieHackers', type: 'community', action: 'milestone_posts' },
    { name: 'HackerNews', type: 'community', action: 'show_hn_post' },
];

async function generateInvestorContent(platform) {
    try {
        let prompt = '';

        switch (platform.action) {
            case 'optimize_listing':
                prompt = `
Create an AngelList company profile for LuciusAI that attracts investors.

COMPANY:
- LuciusAI - AI for government tender proposals
- Market: €500B annual government procurement
- Traction: 100+ customers, $10K MRR, 40% MoM growth
- Problem: SMEs miss €billions in contracts due to tender complexity
- Solution: AI cuts tender time 10hrs → 30min

WRITE:
- Compelling tagline
- One-liner (1 sentence what we do)
- Company description (3 paragraphs)
- Market opportunity
- Why now?
- Traction metrics

Make it investor-focused (TAM, growth, defensibility).
`;
                break;

            case 'thought_leadership_posts':
                prompt = `
Write 5 LinkedIn posts that position founder as thought leader AND attract investor attention.

TOPICS:
1. "Why government procurement is the next $100B SaaS opportunity"
2. "How we got to $10K MRR in 3 months (with metrics)"
3. "The AI moat: Why our government tender AI is defensible"
4. "SMEs are locked out of public contracts. Here's how we're changing that."
5. "Fundraising update: Why we're building LuciusAI"

Each post:
- Hook in first line
- Data/metrics
- Insights
- Subtle flex (traction, customer wins)
- Call to action

Make investors WANT to reach out.
`;
                break;

            case 'founder_thread':
                prompt = `
Write a viral Twitter thread about building LuciusAI.

THREAD STRUCTURE:
1. Hook: "We built an AI that's won $12M in government contracts. Here's how:"
2. Problem: Tender writing is hell
3. Solution: AI does it
4. Traction: Real numbers
5. Insights: What we learned
6. Future: Where we're going
7. CTA: We're fundraising

Make it:
- Authentic
- Data-driven
- Story-driven
- Investor-attracting

10-15 tweets max.
`;
                break;

            case 'product_launch':
                prompt = `
Write ProductHunt launch copy for LuciusAI.

ELEMENTS:
- Tagline (under 60 chars): "AI that writes government tender proposals"
- Description (3 paragraphs): Problem → Solution → Results
- First comment (founder): Why we built this, traction, ask for support
- Maker story: Personal journey

GOAL: #1 Product of the Day → Investor attention

Make it compelling for:
1. Users (free trial CTA)
2. Investors (traction mentions)
3. Press (unique angle)
`;
                break;

            default:
                return 'Action not defined';
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }],
        });

        return completion.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error(`Content generation failed for ${platform.name}:`, error);
        return null;
    }
}

async function runInvestorMagnet() {
    console.log('💼 INVESTOR MAGNET SYSTEM ACTIVATED\n');
    console.log('🎯 Goal: Make investors find YOU, not you finding them\n');
    console.log('═'.repeat(70));

    for (const platform of INVESTOR_PLATFORMS) {
        console.log(`\n📍 Platform: ${platform.name}`);
        console.log(`   Type: ${platform.type}`);
        console.log(`   Action: ${platform.action}`);
        console.log('---\n');

        const content = await generateInvestorContent(platform);

        if (content) {
            console.log(content);
        }

        console.log('\n' + '═'.repeat(70));

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n\n✅ INVESTOR MAGNET CONTENT GENERATED!\n');
    console.log('📊 Deployment Plan:\n');
    console.log('Week 1:');
    console.log('  • Create AngelList profile');
    console.log('  • Update Crunchbase');
    console.log('  • Launch on ProductHunt');
    console.log('\nWeek 2:');
    console.log('  • Post 5 LinkedIn thought leadership posts');
    console.log('  • Tweet founder thread');
    console.log('  • Post on IndieHackers');
    console.log('\nWeek 3-4:');
    console.log('  • Continue posting metrics/wins weekly');
    console.log('  • Engage with investors who comment');
    console.log('  • Update profiles with new traction\n');

    console.log('🎯 Expected Results:');
    console.log('   - 10-20 investors reach out organically');
    console.log('   - 3-5 intro calls without cold outreach');
    console.log('   - 1-2 term sheets within 90 days');
    console.log('   - Investors come to YOU\n');
}

runInvestorMagnet().catch(console.error);
