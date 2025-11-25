# LuciusAI Backend

Node.js/Express backend for LuciusAI.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```
   PORT=10000
   MONGO_URI=mongodb+srv://...
   OPENAI_API_KEY=sk-...
   SESSION_SECRET=...
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

## API Endpoints

- `/api/tenders`: Tender search and details.
- `/api/ai-tender`: AI generation endpoints (draft, analyze).
- `/api/company`: Company profile management.
- `/api/payments`: Stripe integration.

## Production

The server is ready for deployment on platforms like Render or Railway.
- Start command: `npm start`
