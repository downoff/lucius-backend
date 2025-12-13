// Quick test of server startup
require("dotenv").config();

console.log("Testing server startup...");
console.log("MONGO_URI:", process.env.MONGO_URI ? "SET" : "NOT SET");
console.log("PORT:", process.env.PORT || 10000);

try {
  const app = require("./server");
  console.log("Server loaded successfully");
} catch (err) {
  console.error("Server load failed:", err.message);
  console.error(err.stack);
}
