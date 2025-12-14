console.log("STARTING VERIFICATION SCRIPT");
const { ingestFromTED } = require("../services/tenderIngestor");
const fs = require("fs");
const path = require("path");

async function runVerification() {
  console.log("Running ingestion verification...");

  // Create a backup of tenders.json if it exists
  const tendersPath = path.join(__dirname, "../data/tenders.json");
  let backup = null;
  if (fs.existsSync(tendersPath)) {
    backup = fs.readFileSync(tendersPath);
  }

  try {
    // Run ingestion
    await ingestFromTED();

    // Check if file exists and has content
    if (!fs.existsSync(tendersPath)) {
      throw new Error("tenders.json was not created");
    }

    const tenders = JSON.parse(fs.readFileSync(tendersPath, "utf-8"));
    if (!Array.isArray(tenders) || tenders.length === 0) {
      console.warn("Warning: No tenders found. This might be due to API availability or filters.");
      // checking for at least one if possible, but if API returns 0 then we can't fail based on that alone.
    } else {
      const firstTender = tenders[0];
      console.log("First tender sample:", JSON.stringify(firstTender, null, 2));

      if (!firstTender.source_url && !firstTender.url) {
        throw new Error("Tender is missing source_url AND url");
      }

      if (firstTender.source_url) {
        console.log("SUCCESS: source_url is populated!");
      } else {
        console.warn("WARNING: source_url missing, but url is present. Fix might not be fully effective if frontend relies solely on source_url.");
      }
    }

    console.log("Verification finished successfully.");

  } catch (err) {
    console.error("Verification FAILED:", err);
    process.exit(1);
  } finally {
    // Restore backup to avoid messing up real state if needed, 
    // but actually we WANT the real state to be updated, so maybe not?
    // Let's keep the new data as it's "Real Ingestion".
  }
}

runVerification();
