const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');

console.log('🎯 Auto Partnership Outreach - Bringing customers to YOU');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Target partnership categories that bring government tender customers TO you
const PARTNERSHIP_TARGETS = {
    tender_platforms: [
        { name: 'TED (Tenders Electronic Daily)', type: 'referral_partner', value: 'High' },
        { name: 'BiP Solutions', type: 'integration_partner', value: 'High' },
        { name: 'Contracts Finder UK', type: 'data_partner', value: 'High' },
        { name: 'SAM.gov', type: 'integration_partner', value: 'High' },
    ],
    consulting_firms: [
        { name: 'Big 4 Consulting Firms', type: 'referral_partner', value: 'Very High' },
        { name: 'Tender Writing Consultants', type: 'white_label_partner', value: 'High' },
        { name: 'Procurement Consultancies', type: 'referral_partner', value: 'High' },
    ],
    trade_associations: [
        { name: 'EIC (Engineering Industries Association)', type: 'affiliate_partner', value: 'Medium' },
        { name: 'Construction Industry Associations', type: 'affiliate_partner', value: 'High' },
        { name: 'IT Trade Bodies', type: 'affiliate_partner', value: 'Medium' },
    ],
    software_platforms: [
        { name: 'Pipedrive', type: 'integration_partner', value: 'Medium' },
        { name: 'HubSpot', type: 'app_marketplace', value: 'Very High' },
        { name: 'Salesforce AppExchange', type: 'app_marketplace', value: 'Very High' },
    ]
};

async function generatePartnershipEmail(partner) {
    try {
        const prompt = `
Write a strategic partnership email to ${partner.name}.

CONTEXT:
- We're LuciusAI - AI-powered government tender proposal writer
- We help companies win public sector contracts faster
- We want to partner as: ${partner.type}
- They have customers who need our solution

PARTNERSHIP VALUE:
- For them: New revenue stream, enhanced offering, customer retention
- For us: Access to their customer base (inbound leads)

WRITE:
Subject line and email body proposing ${partner.type} partnership.
Be professional, value-focused, and specific about mutual benefits.
Mention we have 1,000+ companies in our database and can co-market.

Keep it under 200 words.
`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }],
        });

        return completion.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error('Partnership email generation failed:', error);
        return null;
    }
}

async function runPartnershipOutreach() {
    console.log('🤝 Generating partnership emails...\n');

    let totalEmails = 0;

    for (const [category, partners] of Object.entries(PARTNERSHIP_TARGETS)) {
        console.log(`\n📂 Category: ${category.toUpperCase()}`);
        console.log('═'.repeat(60));

        for (const partner of partners) {
            totalEmails++;
            console.log(`\n🎯 Partner #${totalEmails}: ${partner.name}`);
            console.log(`   Type: ${partner.type} | Value: ${partner.value}`);
            console.log('---');

            const email = await generatePartnershipEmail(partner);

            if (email) {
                console.log(email);
                console.log('\n' + '═'.repeat(60));

                // In production: Send via SendGrid/Mailgun
                // await sendEmail({
                //     to: partnerContactEmail,
                //     subject: extractedSubject,
                //     body: email
                // });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log(`\n\n✅ Partnership Outreach Complete!`);
    console.log(`📧 Generated ${totalEmails} strategic partnership emails`);
    console.log('\n🎯 Expected Results:');
    console.log('   - 20% response rate (4-5 interested partners)');
    console.log('   - 1-2 signed partnerships within 90 days');
    console.log('   - Each partner brings 50-200 qualified leads/month');
    console.log('   - INBOUND customers start flowing automatically\n');
}

runPartnershipOutreach().catch(console.error);
