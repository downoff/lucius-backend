// routes/auto-content-api.js
/**
 * AUTOMATED CONTENT GENERATION API
 * 
 * Generates fresh blog posts automatically every week using AI
 * Posts get indexed by Google → automatic SEO traffic
 * 
 * ZERO manual work - runs on schedule
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Auto-generate blog post topics
const BLOG_TOPICS = [
    'Top 10 Mistakes in Government Tender Writing (And How to Avoid Them)',
    'AI vs Human Tender Writers: Complete Cost Comparison 2025',
    'How to Win Your First Government Contract: Beginner\'s Guide',
    'Essential Certifications for UK Public Sector Tenders',
    'Understanding CPV Codes: The Complete Guide',
    '5 Red Flags That Mean You Should NOT Bid on a Tender',
    'How to Calculate Your Win Probability Before Bidding',
    'Tender Writing Timeline: From RFP to Submission',
    'Best Practices for EU Framework Agreement Bids',
    'Government Tender Evaluation Criteria Explained'
];

/**
 * Auto-generate a complete blog post using GPT-4
 */
async function generateBlogPost(topic) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are an expert tender writing consultant and social media strategist.
                
                Task 1: Write a comprehensive, SEO-optimized blog post (1500 words).
                Task 2: Write a LinkedIn post (professional, value-driven) promoting the blog.
                Task 3: Write a Twitter thread (5 tweets, punchy) promoting the blog.
                
                Output format:
                [BLOG CONTENT MARKDOWN]
                
                ---
                
                ## 📱 Social Media Assets
                
                ### LinkedIn Post
                [Content]
                
                ### Twitter Thread
                [Content]
                `
            },
            {
                role: 'user',
                content: `Topic: "${topic}"\n\nInclude real examples and a CTA to LuciusAI.`
            }
        ],
        temperature: 0.7,
        max_tokens: 4000
    });

    return completion.choices[0].message.content;
}

/**
 * API endpoint to trigger auto-generation
 * Call this from a cron job daily/weekly
 */
router.post('/generate-blog', async (req, res) => {
    try {
        // Pick random topic
        const topic = BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)];

        console.log(`🤖 Auto-generating blog post: ${topic}`);

        const content = await generateBlogPost(topic);

        // Save to database or file system
        const fs = require('fs');
        const path = require('path');
        const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const filename = `blog-${Date.now()}-${slug}.md`;

        fs.writeFileSync(
            path.join(__dirname, '../generated-blogs', filename),
            content
        );

        console.log(`✅ Blog post generated: ${filename}`);

        res.json({
            success: true,
            topic,
            filename,
            preview: content.substring(0, 500) + '...'
        });
    } catch (err) {
        console.error('Blog generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Serve auto-generated blogs as public pages
 * Each becomes a unique SEO landing page
 */
router.get('/blog/:slug', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const blogsDir = path.join(__dirname, '../generated-blogs');

    // Find blog file matching slug
    const files = fs.readdirSync(blogsDir);
    const matchingFile = files.find(f => f.includes(req.params.slug));

    if (!matchingFile) {
        return res.status(404).send('Blog not found');
    }

    const content = fs.readFileSync(path.join(blogsDir, matchingFile), 'utf-8');

    // Convert markdown to HTML (simple version)
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${req.params.slug.replace(/-/g, ' ')} | LuciusAI Blog</title>
  <meta name="description" content="Expert insights on government tender writing from LuciusAI">
  <style>
    body { max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: -apple-system, sans-serif; line-height: 1.6; }
    h1 { font-size: 2.5rem; margin-bottom: 20px; }
    h2 { font-size: 1.8rem; margin-top: 40px; }
    h3 { font-size: 1.4rem; margin-top: 30px; }
    .cta { background: #4F46E5; color: white; padding: 15px 30px; display: inline-block; border-radius: 8px; text-decoration: none; margin: 40px 0; font-weight: 600; }
  </style>
</head>
<body>
  <pre style="white-space: pre-wrap; font-family: Georgia, serif;">${content}</pre>
  
  <hr style="margin: 60px 0;">
  
  <div style="text-align: center;">
    <h3>Try LuciusAI - AI Tender Writing</h3>
    <p>Generate professional tender proposals in 5 minutes instead of 20 hours.</p>
    <a href="https://www.ailucius.com/pricing" class="cta">Start Free Trial →</a>
  </div>
</body>
</html>
  `;

    res.send(html);
});

/**
 * List all auto-generated blogs
 */
router.get('/blogs', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const blogsDir = path.join(__dirname, '../generated-blogs');

    if (!fs.existsSync(blogsDir)) {
        fs.mkdirSync(blogsDir, { recursive: true });
    }

    const files = fs.readdirSync(blogsDir);

    const blogs = files.map(file => {
        const slug = file.replace('blog-', '').replace('.md', '');
        return {
            slug,
            url: `/auto-content/blog/${slug}`,
            file
        };
    });

    res.json({ blogs, count: blogs.length });
});

module.exports = router;

/**
 * AUTOMATION SETUP:
 * 
 * 1. Add route to server.js:
 *    app.use('/auto-content', require('./routes/auto-content-api'));
 * 
 * 2. Create cron job (runs weekly):
 *    curl -X POST https://www.ailucius.com/auto-content/generate-blog
 * 
 * 3. Set up on Render.com cron jobs (free tier):
 *    - Schedule: weekly
 *    - Command: curl -X POST $RENDER_EXTERNAL_URL/auto-content/generate-blog
 * 
 * RESULT: New SEO blog post generated every week automatically
 * Each post = new keyword ranking = more organic traffic
 * 
 * Expected: 50+ blog posts per year → 5K-10K visitors/month from blog SEO
 */
