const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');

console.log('📰 Auto Press Release Generator - Media Coverage on Autopilot');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Target publications that government tender companies read
const TARGET_PUBLICATIONS = [
    { name: 'TechCrunch', focus: 'SaaS/AI launches', reach: 'Very High' },
    { name: 'Government Technology Magazine', focus: 'GovTech innovation', reach: 'High' },
    { name: 'Public Sector Executive', focus: 'Public procurement', reach: 'High' },
    { name: 'Construction News', focus: 'Construction tenders', reach: 'Medium' },
    { name: 'Computer Weekly', focus: 'Enterprise IT', reach: 'Medium' },
    { name: 'ProductHunt', focus: 'New products', reach: 'Very High' },
];

async function generatePressRelease() {
    try {
        const prompt = `
Write a compelling press release for LuciusAI launch.

HEADLINE: Focus on the problem we solve (government tender writing takes 10+ hours)

KEY FACTS:
- LuciusAI uses GPT-4o AI to write government tender proposals
- Reduces time from 10 hours → 30 minutes (95% faster)
- Already helping 100+ companies win public sector contracts
- Covers UK, EU, and US government tenders
- $12M in contract value won by customers so far
- Available now with free trial

ANGLE: "New AI tool makes government contracts accessible to small businesses"

Include:
- Problem statement (tender writing is complex, time-consuming)
- Solution (AI does the heavy lifting)
- Results/proof (customer wins)
- Quote from founder
- Call to action

Format as professional press release, 400-500 words.
`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.6,
            messages: [{ role: 'user', content: prompt }],
        });

        return completion.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error('Press release generation failed:', error);
        return null;
    }
}

async function generatePitchEmail(publication) {
    try {
        const prompt = `
Write a personalized pitch email to ${publication.name} editor.

CONTEXT:
- They cover: ${publication.focus}
- Reach: ${publication.reach}
- We're pitching LuciusAI story

STORY ANGLE:
"How AI is Democratizing Government Contracts for Small Businesses"

KEY HOOK:
- SMEs miss out on €billions in government contracts due to complex tender writing
- New AI tool makes it accessible (real customer won €200K contract)
- Timely: Government pushing for SME participation

EMAIL:
- Short subject line
- Why this story matters to their audience
- Unique angle
- Offer exclusive first look
- Call to action

Keep under 150 words.
`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }],
        });

        return completion.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error('Pitch email generation failed:', error);
        return null;
    }
}

async function runAutoPR() {
    console.log('📰 AUTO PR SYSTEM ACTIVATED\n');
    console.log('═'.repeat(70));

    // 1. Generate press release
    console.log('\n📝 Step 1: Generating Press Release...\n');
    const pressRelease = await generatePressRelease();

    if (pressRelease) {
        console.log(pressRelease);
        console.log('\n' + '═'.repeat(70));
    }

    // 2. Generate pitch emails for each publication
    console.log('\n✉️  Step 2: Generating Media Pitches...\n');

    for (const pub of TARGET_PUBLICATIONS) {
        console.log(`\n🎯 Pitching: ${pub.name}`);
        console.log(`   Focus: ${pub.focus} | Reach: ${pub.reach}`);
        console.log('---');

        const pitchEmail = await generatePitchEmail(pub);

        if (pitchEmail) {
            console.log(pitchEmail);
        }

        console.log('\n' + '-'.repeat(70));

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('\n\n✅ AUTO PR COMPLETE!\n');
    console.log('📊 Expected Results:');
    console.log('   - 2-3 publications pick up story');
    console.log('   - 5,000-20,000 readers see LuciusAI');
    console.log('   - 100-300 inbound signups from PR');
    console.log('   - SEO boost from backlinks');
    console.log('   - Investor attention from press\n');
    console.log('💡 Action: Copy press release to Medium, LinkedIn, company blog\n');
    console.log('💡 Action: Submit pitches to editors (emails generated above)\n');
}

runAutoPR().catch(console.error);
