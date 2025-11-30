// routes/auto-content-api.js
/**
 * AUTOMATED CONTENT GENERATION API
 * 
 * Generates fresh blog posts automatically every week using AI
 * Posts get indexed by Google → automatic SEO traffic
 * 
 * NOW PERSISTENT WITH MONGODB
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const BlogPost = require('../models/BlogPost');

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
                Task 2: Write a short excerpt (2 sentences).
                Task 3: Generate SEO title and meta description.
                
                Output format (JSON):
                {
                    "title": "SEO Optimized Title",
                    "content": "Full markdown content...",
                    "excerpt": "Short summary...",
                    "seoTitle": "Title for Google",
                    "seoDescription": "Meta description...",
                    "keywords": ["keyword1", "keyword2"]
                }
                `
            },
            {
                role: 'user',
                content: `Topic: "${topic}"\n\nInclude real examples and a CTA to LuciusAI. Return ONLY valid JSON.`
            }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
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

        const generatedData = await generateBlogPost(topic);
        const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Save to MongoDB
        const newPost = new BlogPost({
            title: generatedData.title,
            slug: slug + '-' + Date.now(), // Ensure uniqueness
            content: generatedData.content,
            excerpt: generatedData.excerpt,
            seo: {
                title: generatedData.seoTitle,
                description: generatedData.seoDescription,
                keywords: generatedData.keywords
            },
            isPublished: true,
            publishedAt: new Date()
        });

        await newPost.save();

        console.log(`✅ Blog post saved to DB: ${newPost.title}`);

        res.json({
            success: true,
            post: newPost
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
router.get('/blog/:slug', async (req, res) => {
    try {
        const post = await BlogPost.findOne({ slug: req.params.slug });

        if (!post) {
            return res.status(404).send('Blog not found');
        }

        // Increment views
        post.views += 1;
        await post.save();

        // Convert markdown to HTML (simple version)
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.seo.title || post.title} | LuciusAI Blog</title>
  <meta name="description" content="${post.seo.description || post.excerpt}">
  <style>
    body { max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    h1 { font-size: 2.5rem; margin-bottom: 20px; color: #111; }
    h2 { font-size: 1.8rem; margin-top: 40px; color: #222; }
    h3 { font-size: 1.4rem; margin-top: 30px; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 30px; }
    .cta { background: #4F46E5; color: white; padding: 15px 30px; display: inline-block; border-radius: 8px; text-decoration: none; margin: 40px 0; font-weight: 600; text-align: center; }
    .cta:hover { background: #4338ca; }
    pre { background: #f4f4f5; padding: 15px; border-radius: 8px; overflow-x: auto; }
    img { max-width: 100%; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>${post.title}</h1>
  <div class="meta">Published on ${new Date(post.publishedAt).toLocaleDateString()} • ${post.views} views</div>
  
  <div style="white-space: pre-wrap;">${post.content}</div>
  
  <hr style="margin: 60px 0; border: 0; border-top: 1px solid #eee;">
  
  <div style="text-align: center; background: #f9fafb; padding: 40px; border-radius: 12px;">
    <h3>Win More Tenders with AI</h3>
    <p>LuciusAI analyzes tenders and writes winning proposals in minutes.</p>
    <a href="https://www.ailucius.com" class="cta">Start Free Trial →</a>
  </div>
</body>
</html>
        `;

        res.send(html);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

/**
 * List all auto-generated blogs (JSON for frontend)
 */
router.get('/blogs', async (req, res) => {
    try {
        const blogs = await BlogPost.find({ isPublished: true })
            .sort({ publishedAt: -1 })
            .select('title slug excerpt publishedAt views');

        res.json({ blogs, count: blogs.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

