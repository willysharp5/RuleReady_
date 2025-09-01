#!/usr/bin/env node

/**
 * Test Website Conversion: Test converting compliance rules to websites
 * 
 * This script provides instructions for testing the website conversion
 * Run with: node scripts/test-website-conversion.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🧪 TESTING COMPLIANCE TO WEBSITE CONVERSION");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Get current stats
    console.log("📊 Getting current system state...");
    const importStats = await convex.query("complianceImport:getImportStats");
    
    console.log(`📈 Current database state:`);
    console.log(`   Compliance rules: ${importStats.rules}`);
    console.log(`   Compliance reports: ${importStats.reports}`);
    console.log(`   Embeddings: ${importStats.embeddings}`);
    
    if (importStats.rules === 0) {
      console.log("⚠️ No compliance rules found. Please import CSV data first.");
      return;
    }
    
    console.log("\n🌐 WEBSITE CONVERSION INSTRUCTIONS:");
    console.log("======================================================================");
    console.log("To convert compliance rules to monitored websites:");
    console.log("");
    console.log("📱 OPTION 1: Use Admin Interface");
    console.log("   1. Visit http://localhost:3000/admin");
    console.log("   2. Look for 'Integrate with Website Monitoring' section");
    console.log("   3. Click 'Create Websites' button");
    console.log("   4. Wait for conversion to complete");
    console.log("");
    console.log("🔧 OPTION 2: Use Convex Dashboard");
    console.log("   1. Visit https://dashboard.convex.dev");
    console.log("   2. Go to your deployment functions");
    console.log("   3. Call 'websites:createWebsitesFromComplianceRules'");
    console.log("   4. No arguments needed");
    console.log("");
    console.log("✅ EXPECTED RESULTS:");
    console.log(`   • ${importStats.rules} new monitored websites created`);
    console.log("   • Each compliance rule becomes a website with:");
    console.log("     - Priority indicators (🔴🟠🟡🟢)");
    console.log("     - Jurisdiction and topic in name");
    console.log("     - Automatic monitoring intervals");
    console.log("     - Integration with existing change detection");
    console.log("");
    console.log("🎯 AFTER CONVERSION:");
    console.log("   • Visit main page (/) to see all websites");
    console.log("   • Compliance rules will appear alongside regular websites");
    console.log("   • Automatic monitoring will begin immediately");
    console.log("   • Changes will be detected using existing system");
    
    console.log("\n======================================================================");
    console.log("🚀 READY TO INTEGRATE COMPLIANCE WITH WEBSITE MONITORING!");
    console.log("======================================================================");
    
  } catch (error) {
    console.error("❌ Test preparation failed:", error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
