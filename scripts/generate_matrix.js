const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

// Configuration
const OUTPUT_FILE = path.join(__dirname, '../data/seo_matrix.json');
const TARGET_COUNT = 50;

// Mock Data for Fallback
const MOCK_DATA = [
  {
    "slug": "construction-tenders-uk-mock",
    "industry": "Construction (Mock)",
    "location": "UK",
    "keywords": ["NEC3", "JCT Contracts", "BIM Level 2"],
    "pain_points": "navigating complex compliance matrices",
    "content_hook": "Automate your construction bids today."
  },
  {
    "slug": "software-tenders-usa-mock",
    "industry": "Software",
    "location": "USA",
    "keywords": ["FedRAMP", "NIST", "Agile"],
    "pain_points": "meeting federal security standards",
    "content_hook": "Win more federal software contracts."
  },
  {
    "slug": "medical-devices-germany",
    "industry": "Medical Devices",
    "location": "Germany",
    "keywords": ["MDR", "ISO 13485", "Clinical Eval"],
    "pain_points": "EU MDR compliance documentation",
    "content_hook": "Accelerate your medical device approvals."
  }
];

async function generateMatrix() {
  console.log(`🚀 Starting PSEO Matrix Generation (Target: ${TARGET_COUNT} Pages)...`);

  // Check Input
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️  WARNING: OPENAI_API_KEY not found. Generating MOCK data for architecture testing.");
    saveData(MOCK_DATA);
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
    You are a Technical SEO Expert. 
    Generate a JSON array of ${TARGET_COUNT} unique objects for a Programmatic SEO campaign for "Lucius AI" (an AI Tender Proposal Writer).
    
    Target format "AI Tender Writer for {Industry} in {Location}".
    
    The array must contain exactly these fields for each object:
    - "slug": URL friendly string (e.g., "construction-tenders-uk").
    - "industry": Name of the industry (e.g., "Construction", "Medical Devices", "Security").
    - "location": Region/Country (e.g., "UK", "Germany", "USA", "California").
    - "keywords": Array of 3 specific technical keywords relevant to tendering in that niche (e.g., "NEC3", "ISO 13485").
    - "pain_points": A short string describing specific bid writing pain points for that niche.
    - "content_hook": A sentence to grab attention.

    ENSURE DIVERSITY:
    - Mix Industries: Construction, IT, Healthcare, Logistics, Defense, Facilities Management.
    - Mix Locations: UK, USA, EU check (Germany, France), Canada, Australia.
    - DO NOT repeat the exact same combination.
    - Output strictly valid JSON.
    `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a JSON generator." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    // Parse Response
    const responseContent = completion.choices[0].message.content;
    const data = JSON.parse(responseContent); // Expecting { "items": [...] } or just [...]

    // Handle if GPT returns { "data": [...] } or simple array
    let items = Array.isArray(data) ? data : (data.items || data.data || data.matrix);

    if (!items || !Array.isArray(items)) {
      throw new Error("Invalid structure returned by AI");
    }

    console.log(`✅ Generated ${items.length} records.`);
    saveData(items);

  } catch (error) {
    console.error("❌ Generation Failed:", error);
    console.log("⚠️  Falling back to Mock Data due to error.");
    saveData(MOCK_DATA);
  }
}

function saveData(items) {
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2));
  console.log(`💾 Saved ${items.length} records to ${OUTPUT_FILE}`);
}

generateMatrix();
