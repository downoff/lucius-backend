# LuciusAI Backend - Automated $1M/Month Growth Engine

Enterprise-grade AI-powered tender management system with complete automation for customer acquisition, investor relations, and content marketing.

## 🚀 Features

### Core Product
- **AI Tender Copilot** (GPT-4o powered)
  - PDF document analysis
  - Automated proposal generation
  - Multi-language support (6 languages)
  - Compliance checking

### Automation Systems
- **Auto-SDR**: Daily automated cold email outreach to qualified leads
- **Auto-Blog**: Weekly AI-generated blog posts with social media content
- **Auto-Investor Updates**: Monthly investor communication
- **Auto-Demo Scripts**: Marketing copy generation
- **Programmatic SEO**: 1,260 auto-generated landing pages

### Enterprise Features
- Custom branding
- API access
- Team collaboration
- Analytics tracking
- SSO ready

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)
- OpenAI API key

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` file:

```env
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/lucius-ai
OPENAI_API_KEY=sk-...
JWT_SECRET=your_secret_key_here
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SESSION_SECRET=random_session_secret
```

### Run Locally

```bash
npm start
```

Server runs on `http://localhost:5000`

## 🤖 Automation Scripts

Run these scripts manually or set up as cron jobs:

```bash
# Daily - Automated SDR (3 personalized emails to leads)
node scripts/auto-sdr.js

# Weekly - Generate blog post + social media content
node scripts/auto-content-api.js

# Monthly - Send investor update email
node scripts/auto-investor-update.js

# One-time - Generate demo video script
node scripts/auto-demo-video.js

# One-time - Generate sitemap (copy to frontend/public)
node scripts/generate-sitemap.js

# Verification - Check deployment readiness
node scripts/verify-deployment.js
```

## 📚 API Endpoints

### Core Routes
- `POST /api/tender/upload` - Upload tender PDF
- `POST /api/tender/analyze` - Analyze tender requirements
- `POST /api/tender/proposal` - Generate AI proposal
- `GET /api/tenders/matching` - Get matching tenders

### Automation Routes
- `POST /api/auto-content/generate` - Generate blog post
- `POST /api/lead-magnet/download` - Download lead magnet PDF
- `POST /api/analytics/event` - Track analytics event
- `POST /api/analytics/conversion` - Track conversion

### pSEO Routes
- `GET /ai-tender-writing/:tenderType/:industry/:location` - Dynamic SEO pages

## 🚀 Deployment

### Render.com

1. Connect this repo to Render
2. Create new Web Service
3. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add all environment variables
5. Deploy

### Cron Jobs (Render)

Add these cron jobs in Render dashboard:

```bash
# Daily SDR - 10 AM UTC
0 10 * * * node scripts/auto-sdr.js

# Weekly Blog - Monday 9 AM UTC
0 9 * * 1 node scripts/auto-content-api.js

# Monthly Investor Update - 1st of month, 9 AM UTC
0 9 1 * * node scripts/auto-investor-update.js
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Test automation scripts
node scripts/verify-deployment.js
```

## 📊 Key Technologies

- **AI**: OpenAI GPT-4o for all AI features
- **Database**: MongoDB with Mongoose ODM
- **Payments**: Stripe
- **Authentication**: Passport.js
- **Email**: SendGrid (optional)
- **PDF Processing**: pdf-parse

## 🛡️ Security

- Rate limiting on all API endpoints
- Helmet.js for security headers
- CORS with allowlist
- Secure session management
- Environment variable protection

## 📈 Monitoring

Health check endpoint: `GET /health`

Returns:
```json
{
  "status": "ok",
  "message": "Lucius AI backend is healthy."
}
```

## 🆘 Support

Check the logs for detailed error messages. All automation scripts include comprehensive logging.

## 📄 License

Proprietary - LuciusAI

---

**Built for $1M/month growth. Deploy once, scale automatically.** 🚀
