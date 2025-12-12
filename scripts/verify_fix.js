const { SupportedRegions } = require("../services/tendersProvider");

if (Array.isArray(SupportedRegions) && SupportedRegions.includes("UK")) {
  console.log("Verification Passed: SupportedRegions is defined and includes UK.");
  process.exit(0);
} else {
  console.error("Verification Failed: SupportedRegions is not defined correctly.");
  process.exit(1);
}
