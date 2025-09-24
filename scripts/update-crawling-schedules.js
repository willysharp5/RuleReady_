#!/usr/bin/env node

/**
 * Update Crawling Schedules
 * 
 * Apply the new smart crawling strategy to all compliance rules
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function updateCrawlingSchedules() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log(`🔄 ${isDryRun ? 'DRY RUN:' : 'APPLYING:'} Smart Crawling Schedule Updates...\n`);
  
  try {
    const result = await client.action("complianceCrawler:updateCrawlingSchedules", {
      dryRun: isDryRun
    });
    
    console.log("\n✅ SCHEDULE UPDATE RESULTS:");
    console.log("=".repeat(50));
    console.log(`📊 Total Rules: ${result.total}`);
    console.log(`🔄 ${isDryRun ? 'Would Update' : 'Updated'}: ${result.updated}`);
    console.log(`📋 Mode: ${result.dryRun ? 'DRY RUN' : 'APPLIED'}`);
    
    if (isDryRun) {
      console.log("\n💡 To apply these changes, run:");
      console.log("   node scripts/update-crawling-schedules.js");
    } else {
      console.log("\n🎉 Crawling schedules successfully updated!");
      console.log("📈 Rules now follow smart jurisdiction/topic-based frequencies:");
      console.log("   • Federal rules: Weekly monitoring");
      console.log("   • Critical topics (min wage, harassment): 2x more frequent");
      console.log("   • High topics (overtime, sick leave): 1.33x more frequent");
      console.log("   • Low topics (family leave): Less frequent");
    }
    
  } catch (error) {
    console.error("❌ Schedule update failed:", error);
    process.exit(1);
  }
}

// Run the update
updateCrawlingSchedules().catch(console.error);
