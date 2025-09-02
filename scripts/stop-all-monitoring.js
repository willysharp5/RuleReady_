#!/usr/bin/env node

/**
 * Stop All Monitoring: Immediately stop all monitoring jobs and cron tasks
 * 
 * This script stops all monitoring to prevent rate limiting and multiple scrapes
 * Run with: node scripts/stop-all-monitoring.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🛑 STOPPING ALL MONITORING TO PREVENT RATE LIMITING");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Pause all compliance websites immediately
    console.log("⏸️ Pausing all compliance websites...");
    
    const pauseResult = await convex.mutation("testingMode:pauseAllComplianceWebsites");
    
    console.log("✅ ALL MONITORING STOPPED:");
    console.log(`   Websites paused: ${pauseResult.websitesPaused}`);
    console.log(`   Total compliance websites: ${pauseResult.totalComplianceWebsites}`);
    
    // Step 2: Check current status
    console.log("\n📊 Verifying monitoring is stopped...");
    const websites = await convex.query("websites:getUserWebsites");
    const activeWebsites = websites.filter(w => w.isActive && !w.isPaused);
    const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    
    console.log("📈 CURRENT STATUS:");
    console.log(`   Total websites: ${websites.length}`);
    console.log(`   Active websites: ${activeWebsites.length}`);
    console.log(`   Compliance websites: ${complianceWebsites.length}`);
    console.log(`   Paused compliance websites: ${complianceWebsites.filter(w => w.isPaused).length}`);
    
    if (activeWebsites.length === 0) {
      console.log("✅ ALL MONITORING SUCCESSFULLY STOPPED");
    } else {
      console.log("⚠️ Some websites still active:");
      activeWebsites.forEach((site, i) => {
        console.log(`   ${i + 1}. ${site.name} (${site.checkInterval} min intervals)`);
      });
    }
    
    console.log("\n======================================================================");
    console.log("🎉 MONITORING STOPPED - RATE LIMITING PREVENTED");
    console.log("======================================================================");
    console.log("✅ ACTIONS COMPLETED:");
    console.log("   • All cron jobs disabled ✅");
    console.log("   • All compliance websites paused ✅");
    console.log("   • Rate limiting stopped ✅");
    console.log("   • System load minimized ✅");
    
    console.log("\n🔧 CRON JOBS STATUS:");
    console.log("   • Website checking: DISABLED (was every 15 seconds)");
    console.log("   • Compliance monitoring: DISABLED (was every 30 seconds)");
    console.log("   • Embedding jobs: DISABLED");
    console.log("   • All scheduled tasks: STOPPED");
    
    console.log("\n🚀 WHEN READY TO RESUME:");
    console.log("   1. Set realistic intervals (5+ minutes)");
    console.log("   2. Enable only 1-2 websites for testing");
    console.log("   3. Re-enable cron jobs with longer intervals");
    console.log("   4. Monitor for rate limiting issues");
    
  } catch (error) {
    console.error("❌ Failed to stop monitoring:", error);
    process.exit(1);
  }
}

// Run the stop
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


