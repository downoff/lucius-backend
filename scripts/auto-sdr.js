const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const OpenAI = require('openai');
const sgMail = require('@sendgrid/mail');
const Company = require('../models/Company'); // Assuming Company model exists

console.log('🚀 Starting AI SDR Script (Production Mode)...');

// Check API Keys
if (!process.env.OPENAI_API_KEY || !process.env.SENDGRID_API_KEY || !process.env.MONGO_URI) {
    console.error('❌ FATAL: Missing API keys (OPENAI, SENDGRID, or MONGO_URI)');
    process.exit(1);
}

// Initialize Services
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ DB Connection Error:', err);
        process.exit(1);
    });

async function runAiSdr() {
    try {
        console.log('🕵️  AI SDR: Scouting for leads (Users who signed up but not paid)...');

        // Find leads: Companies created > 24h ago, NOT paid, NO email sent yet
        const leads = await Company.find({
            is_paid: false,
            createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24h
            'sdr_status.email_sent': { $ne: true }
        }).limit(5); // Process 5 at a time to be safe

        console.log(`✅ Found ${leads.length} leads to contact.\n`);

        for (const lead of leads) {
            const email = lead.contact_email || (lead.contact_emails && lead.contact_emails[0]);
            console.log(`🤖 Analyzing lead: ${lead.company_name} (${email})...`);

            if (!email) {
                console.log('   ⚠️ No email, skipping.');
                continue;
            }

            // Generate Personalized Email
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert B2G sales representative for LuciusAI.
                        Goal: Persuade a user who signed up but hasn't subscribed to start a free trial or upgrade.
                        Tone: Helpful, not pushy. Focus on value.
                        Context: They signed up but haven't paid.
                        Value Prop: "LuciusAI can write your next proposal in minutes. Don't let your account sit idle."
                        `
                    },
                    {
                        role: 'user',
                        content: `Lead Company: ${lead.company_name}.
                        Industry: ${lead.industry || 'Government Contracting'}.
                        Write a short, personal cold email.`
                    }
                ],
                temperature: 0.7,
            });

            const emailBody = completion.choices[0].message.content;

            // Send Email via SendGrid
            const msg = {
                to: email,
                from: process.env.PUBLIC_FROM_EMAIL || 'noreply@ailucius.com', // Verified sender
                subject: `Quick question about ${lead.company_name}'s tenders`,
                text: emailBody,
                html: emailBody.replace(/\n/g, '<br>')
            };

            try {
                await sgMail.send(msg);
                console.log(`   ✅ Email sent to ${email}`);

                // Update DB
                lead.sdr_status = { email_sent: true, sent_at: new Date() };
                await lead.save();

            } catch (emailError) {
                console.error(`   ❌ Failed to send email to ${email}:`, emailError.message);
            }

            // Rate limit safety
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log('\n✅ AI SDR Run Complete.');
        process.exit(0);

    } catch (error) {
        console.error('❌ AI SDR Failed:', error);
        process.exit(1);
    }
}

// Run
runAiSdr();
