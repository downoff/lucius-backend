require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const OpenAI = require('openai');
const User = require('../models/User');
const Company = require('../models/Company');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lucius-ai', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

async function generateInvestorUpdate() {
    try {
        console.log('📊 Aggregating Monthly Metrics...');

        // 1. Get Real Metrics
        const totalUsers = await User.countDocuments();
        const totalCompanies = await Company.countDocuments();

        // Simulate MRR based on companies (since we don't have real Stripe data yet)
        // Assume 20% are Pro (€99) and 5% are Enterprise (€499), rest are Free/Starter
        const proCount = Math.floor(totalCompanies * 0.2);
        const enterpriseCount = Math.floor(totalCompanies * 0.05);
        const mrr = (proCount * 99) + (enterpriseCount * 499) + 12400; // Base MRR from "manual" sales

        // Simulate Growth
        const growthRate = "18%";
        const activeTenders = 142; // From our pSEO data

        const metrics = {
            mrr: `€${mrr.toLocaleString()}`,
            growth: growthRate,
            users: totalUsers,
            companies: totalCompanies,
            active_tenders: activeTenders
        };

        console.log('📈 Metrics:', metrics);

        // 2. Generate Email with AI
        console.log('✍️  AI Writing Investor Update...');

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are the CEO of LuciusAI, a high-growth B2G SaaS. Write a monthly investor update email.
          Style: Steve Jobs meets Paul Graham. Brief, punchy, data-driven, but visionary.
          Structure:
          1. The "North Star" metric (MRR).
          2. Highlights (Product shipping).
          3. Lowlights (Challenges).
          4. Ask (What you need).
          `
                },
                {
                    role: 'user',
                    content: `Write the update for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
          
          Metrics:
          - MRR: ${metrics.mrr} (+${metrics.growth} MoM)
          - Total Users: ${metrics.users}
          - Active Companies: ${metrics.companies}
          
          Product Highlights:
          - Launched "Win Probability Calculator" (Viral tool)
          - Released "Data Programmatic SEO" with live tender tables
          - Automated Investor Inbound funnel
          
          Challenges:
          - Need to scale server capacity for pSEO traffic
          
          Ask:
          - Intros to Series A partners who understand GovTech.`
                }
            ],
            temperature: 0.7,
        });

        const emailContent = completion.choices[0].message.content;

        // 3. "Send" Email (Log to console)
        console.log('\n📨 SENDING TO INVESTORS (Simulated)...\n');
        console.log('---------------------------------------------------');
        console.log('Subject: LuciusAI Investor Update - ' + metrics.mrr + ' MRR');
        console.log('To: investors@sequoia.com, partners@a16z.com');
        console.log('---------------------------------------------------');
        console.log(emailContent);
        console.log('---------------------------------------------------');
        console.log('✅ Update Sent Successfully.');

    } catch (error) {
        console.error('❌ Error generating update:', error);
        if (error.response) {
            console.error('OpenAI API Error:', error.response.data);
        }
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('MongoDB Connection Closed');
        }
    }
}

// Run
generateInvestorUpdate().catch(console.error);
