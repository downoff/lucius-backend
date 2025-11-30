const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');

console.log('🚀 Starting AI SDR Script...');

// Check API Key
if (!process.env.OPENAI_API_KEY) {
    console.error('❌ FATAL: OPENAI_API_KEY is missing in .env file');
    process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Mock Data Source
const NEW_LEADS = [
    { name: "Sarah Jenkins", role: "Procurement Manager", company: "City of Manchester", email: "sarah.j@manchester.gov.uk", tender: "Digital Transformation Framework" },
    { name: "David Mueller", role: "CTO", company: "TechSolutions GmbH", email: "d.mueller@techsolutions.de", tender: "Cloud Migration Services" },
    { name: "Jean Dupont", role: "Director", company: "Construct France", email: "j.dupont@construct.fr", tender: "Public Infrastructure Project" }
];

async function runAiSdr() {
    try {
        console.log('🕵️  AI SDR: Scouting for new leads...');

        // Simulate processing delay
        await new Promise(r => setTimeout(r, 1000));
        console.log(`✅ Found ${NEW_LEADS.length} high-value targets matching our ICP.\n`);

        for (const lead of NEW_LEADS) {
            console.log(`🤖 Analyzing lead: ${lead.name} (${lead.company})...`);

            // Generate Personalized Email
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert B2G sales representative. Write a cold email to a potential client.
                        Goal: Get them to try LuciusAI for their upcoming tender.
                        Tone: Professional, concise, helpful. No fluff.
                        Value Prop: "We can automate 80% of your proposal for [Tender Name] and increase win probability."
                        `
                    },
                    {
                        role: 'user',
                        content: `Lead: ${lead.name}, ${lead.role} at ${lead.company}.
                        Context: They are bidding on "${lead.tender}".
                        Write the email.`
                    }
                ],
                temperature: 0.7,
            });

            const emailBody = completion.choices[0].message.content;

            // "Send" Email
            console.log('---------------------------------------------------');
            console.log(`📧 SENDING TO: ${lead.email}`);
            console.log(`Subject: Question about ${lead.tender}`);
            console.log(emailBody);
            console.log('---------------------------------------------------');

            // Simulate sending delay
            await new Promise(r => setTimeout(r, 1500));
        }

        console.log('\n✅ AI SDR Run Complete. 3 Emails Sent.');
    } catch (error) {
        console.error('❌ AI SDR Failed:', error);
        if (error.response) {
            console.error('OpenAI Error Data:', error.response.data);
        }
    }
}

// Run
runAiSdr().catch(err => {
    console.error('❌ Unhandled Promise Rejection:', err);
});
