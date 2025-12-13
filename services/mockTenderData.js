// services/mockTenderData.js
// Generates realistic-looking tender data for demo purposes
// Use this until the real RSS feeds (TED, Contracts Finder) are working again

const MOCK_TENDERS = [
  {
    _id: "demo_001",
    title: "Cloud Infrastructure Migration Services for Public Health Agency",
    short_description: "Seeking experienced cloud migration partner to move legacy healthcare systems to AWS/Azure. Must have ISO 27001 certification.",
    description_raw: "The contracting authority requires a qualified partner to assist with the migration of critical healthcare data systems to a secure cloud environment. The project includes architecture design, data migration, staff training, and 12 months of support.",
    country: "UK",
    region: "UK",
    authority: "NHS Digital",
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    published_at: new Date(),
    budget: "£450,000 - £750,000",
    match_score: 87,
    rationale: "Matches your cloud infrastructure and healthcare experience. High budget alignment.",
    source: "MockData",
    url: "https://www.contractsfinder.service.gov.uk/notice/demo-001",
    is_stub: true
  },
  {
    _id: "demo_002",
    title: "AI-Powered Tender Document Analysis Platform",
    short_description: "Development of machine learning system to analyze and score tender responses for procurement teams.",
    description_raw: "We are seeking a software development partner to build an AI-powered platform that can automatically analyze tender submissions, extract key information, and provide scoring recommendations to procurement officers.",
    country: "DACH",
    region: "DACH",
    authority: "Federal Ministry of Digital Affairs (Germany)",
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    published_at: new Date(),
    budget: "€320,000 - €480,000",
    match_score: 92,
    rationale: "Perfect match for your AI/ML expertise and public sector experience. High-value contract.",
    source: "MockData",
    url: "https://ted.europa.eu/demo-002",
    is_stub: true
  },
  {
    _id: "demo_003",
    title: "Cybersecurity Assessment and Compliance Framework",
    short_description: "Comprehensive security audit and implementation of ISO 27001 compliance framework for local government.",
    description_raw: "The municipality requires an information security partner to conduct a full security assessment of all IT systems and implement an ISO 27001-compliant framework covering all departments.",
    country: "FR",
    region: "FR",
    authority: "Ville de Paris",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    published_at: new Date(),
    budget: "€180,000 - €250,000",
    match_score: 78,
    rationale: "Good fit for cybersecurity capabilities. French market entry opportunity.",
    source: "MockData",
    url: "https://ted.europa.eu/demo-003",
    is_stub: true
  },
  {
    _id: "demo_004",
    title: "Digital Transformation Consultancy for Education Sector",
    short_description: "Strategic consultancy to develop and implement digital transformation roadmap for nationwide school network.",
    description_raw: "National education authority seeks experienced digital transformation consultants to develop a comprehensive 5-year digitalization strategy covering over 500 schools, including cloud migration, digital learning platforms, and staff training.",
    country: "SE",
    region: "Nordics",
    authority: "Swedish National Agency for Education",
    deadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
    published_at: new Date(),
    budget: "€1,200,000 - €1,800,000",
    match_score: 85,
    rationale: "Large-scale transformation project matching your consultancy expertise. Multi-year engagement.",
    source: "MockData",
    url: "https://ted.europa.eu/demo-004",
    is_stub: true
  },
  {
    _id: "demo_005",
    title: "Smart City IoT Platform Development",
    short_description: "Build and deploy citywide IoT sensor network for traffic, air quality, and energy monitoring.",
    description_raw: "The city is implementing a smart city initiative and requires a technology partner to design, build, and maintain an IoT platform that collects real-time data from thousands of sensors across the metropolitan area.",
    country: "ES",
    region: "ES",
    authority: "Barcelona City Council",
    deadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    published_at: new Date(),
    budget: "€650,000 - €950,000",
    match_score: 81,
    rationale: "IoT and platform development expertise required. Smart city sector growth opportunity.",
    source: "MockData",
    url: "https://ted.europa.eu/demo-005",
    is_stub: true
  }
];

/**
 * Returns mock tender data for demo purposes
 * @returns {Array} Array of mock tender objects
 */
function getMockTenders() {
  return MOCK_TENDERS.map(tender => ({
    ...tender,
    // Ensure dates are fresh
    deadline: new Date(Date.now() + (Math.random() * 60 + 30) * 24 * 60 * 60 * 1000),
    published_at: new Date(Date.now() - (Math.random() * 7) * 24 * 60 * 60 * 1000)
  }));
}

module.exports = { getMockTenders };
