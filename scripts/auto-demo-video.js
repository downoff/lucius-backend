const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');

console.log('🎬 Auto-Demo Video Script Generator...');

// Check API Key
if (!process.env.OPENAI_API_KEY) {
    console.error('❌ FATAL: OPENAI_API_KEY is missing');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateDemoScript() {
    try {
        console.log('✍️  Generating demo video script with AI...');

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are a product marketing expert. Write a 90-second demo video script for LuciusAI.
                    
                    Structure:
                    1. Hook (0-10s): The problem - "Writing government tenders is hell"
                    2. Solution (10-40s): Show LuciusAI features - Upload PDF, AI Analysis, Auto-Proposal
                    3. Social Proof (40-60s): "Used by 500+ companies, €12M in won tenders"
                    4. CTA (60-90s): "Start free trial at lucius.ai"
                    
                    Style: Fast-paced, visual, punchy. Like a Tech Crunch product demo.
                    `
                },
                {
                    role: 'user',
                    content: `Generate the script now. Include scene descriptions and voiceover text.`
                }
            ],
            temperature: 0.7,
        });

        const script = completion.choices[0].message.content;

        console.log('\n📄 DEMO VIDEO SCRIPT GENERATED:\n');
        console.log('---------------------------------------------------');
        console.log(script);
        console.log('---------------------------------------------------');
        console.log('\n✅ Script Complete. Next steps:');
        console.log('1. Record this script with screen recording');
        console.log('2. Upload to YouTube, LinkedIn, Twitter');
        console.log('3. Embed on homepage and investor landing page');

    } catch (error) {
        console.error('❌ Demo script generation failed:', error);
    }
}

generateDemoScript().catch(console.error);
