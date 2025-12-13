
// dev-test-ingest.js
const { ingestFromTED } = require("./services/tenderIngestor");
const mongoose = require("mongoose");
require("dotenv").config();

async function test() {
  console.log("--- Starting Ingestion Test ---");
  // Mock Mongoose if no URI (or just let it fail/warn as per logic)
  if (!process.env.MONGO_URI) {
    console.log("No MONGO_URI, expecting file-based cache behavior");
  }

  await ingestFromTED();
  console.log("--- Finished Ingestion Test ---");
  process.exit(0);
}

test();
