const OpenAI = require('openai');

// Auto-generate FAQ sections for SEO pages
async function generateFAQs(pageContext) {
    const { tenderType, industry, location } = pageContext;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
Generate 8 FAQ questions and answers for a page about "${tenderType}" for "${industry}" in "${location}".

These FAQs should:
1. Target "People Also Ask" queries in Google
2. Include long-tail keywords
3. Provide helpful, specific answers
4. Be 50-100 words per answer
5. Include pricing, timeline, requirements, and tips

Format as JSON array:
[
  {
    "question": "Question text?",
    "answer": "Detailed answer..."
  }
]

Focus on questions real companies would ask when bidding on ${industry} government tenders in ${location}.
`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [{ role: 'user', content: prompt }],
        });

        const result = JSON.parse(completion.choices[0].message.content);
        return result.faqs || result;
    } catch (error) {
        console.error('FAQ generation failed:', error);
        // Return fallback FAQs
        return generateFallbackFAQs(pageContext);
    }
}

function generateFallbackFAQs(pageContext) {
    const { tenderType, industry, location } = pageContext;

    return [
        {
            question: `How long does it take to write a ${industry} tender in ${location}?`,
            answer: `With LuciusAI, you can write a professional ${industry} tender proposal in 30-45 minutes. Manually, it typically takes 10-15 hours. Our AI analyzes requirements, generates compliant content, and ensures you meet all mandatory criteria for ${location} government contracts.`
        },
        {
            question: `What are the requirements for ${industry} government tenders in ${location}?`,
            answer: `${location} ${industry} tenders typically require: company registration, financial statements, technical capability proof, health & safety policies, insurance certificates, and past project references. LuciusAI helps you address each requirement systematically.`
        },
        {
            question: `How much does ${industry} tender writing cost?`,
            answer: `Professional ${industry} tender writers charge €2,000-€10,000 per proposal. LuciusAI costs €99/month for unlimited tenders, saving you €1,900+ per tender while delivering faster results.`
        },
        {
            question: `What is the success rate for ${industry} tenders in ${location}?`,
            answer: `The average win rate for ${industry} government tenders in ${location} is 15-25%. Companies using LuciusAI report 25-35% win rates due to better compliance checking and professional presentation.`
        },
        {
            question: `Can AI write government ${industry} tenders?`,
            answer: `Yes. LuciusAI's GPT-4o AI is specifically trained on ${location} government tender requirements. It analyzes tender documents, extracts mandatory criteria, generates compliant proposals, and checks for completeness before submission.`
        },
        {
            question: `How do I bid on ${location} government ${industry} contracts?`,
            answer: `To bid on ${location} ${industry} tenders: 1) Find opportunities on official procurement portals, 2) Review requirements carefully, 3) Use LuciusAI to generate a compliant proposal, 4) Submit before deadline, 5) Track your submission status.`
        },
        {
            question: `What are common mistakes in ${industry} tender submissions?`,
            answer: `Common mistakes include: missing mandatory requirements, unclear pricing, late submissions, poor formatting, and incomplete documentation. LuciusAI prevents these by automatically checking compliance and highlighting missing elements.`
        },
        {
            question: `How can I improve my ${industry} tender win rate?`,
            answer: `Improve your win rate by: using AI to ensure compliance, submitting professional proposals, addressing all evaluation criteria, providing clear pricing, including relevant case studies, and submitting early to avoid technical issues.`
        }
    ];
}

module.exports = { generateFAQs };
