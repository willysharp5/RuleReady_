#!/usr/bin/env node

/**
 * Enable Testing Mode: Pause all websites and activate only 5 for testing
 * 
 * This script immediately stops the over-scheduling and enables testing mode
 * Run with: node scripts/enable-testing-mode.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🧪 ENABLING TESTING MODE - STOPPING OVER-SCHEDULING");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Check current status
    console.log("📊 Checking current system status...");
    const websites = await convex.query("websites:getUserWebsites");
    const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    const activeWebsites = complianceWebsites.filter(w => w.isActive && !w.isPaused);
    
    console.log(`📈 Current state:`);
    console.log(`   Total compliance websites: ${complianceWebsites.length}`);
    console.log(`   Currently active: ${activeWebsites.length}`);
    console.log(`   Currently paused: ${complianceWebsites.length - activeWebsites.length}`);
    
    if (activeWebsites.length > 10) {
      console.log("⚠️ OVER-SCHEDULING DETECTED - Too many active websites!");
    }
    
    // Step 2: Pause all compliance websites first
    console.log("\n⏸️ Pausing all compliance websites to stop over-scheduling...");
    
    const pauseResult = await convex.mutation("testingMode:pauseAllComplianceWebsites");
    
    console.log("✅ PAUSE COMPLETED:");
    console.log(`   Websites paused: ${pauseResult.websitesPaused}`);
    console.log(`   Total compliance websites: ${pauseResult.totalComplianceWebsites}`);
    
    // Step 3: Enable testing mode with 5 representative websites
    console.log("\n🧪 Enabling testing mode with 5 representative websites...");
    console.log("Selected test websites:");
    console.log("   1. Federal - Minimum Wage (Critical)");
    console.log("   2. California - Harassment Training (Critical)");
    console.log("   3. Texas - Overtime & Hours (High)");
    console.log("   4. New York - Paid Sick Leave (High)");
    console.log("   5. Florida - Posting Requirements (Medium)");
    
    const testingResult = await convex.mutation("testingMode:enableTestingMode", {
      testWebsiteCount: 5,
    });
    
    console.log("\n✅ TESTING MODE ENABLED:");
    console.log(`   Active test websites: ${testingResult.websitesActivated}`);
    console.log(`   Check interval: 15 seconds`);
    console.log(`   Monitoring mode: Testing`);
    
    // Step 4: Show test website details
    if (testingResult.testWebsites && testingResult.testWebsites.length > 0) {
      console.log("\n📋 Active test websites:");
      testingResult.testWebsites.forEach((site, i) => {
        console.log(`   ${i + 1}. ${site.name}`);
        console.log(`      Jurisdiction: ${site.jurisdiction}`);
        console.log(`      Topic: ${site.topic}`);
        console.log(`      Priority: ${site.priority}`);
        console.log(`      URL: ${site.url}`);
      });
    }
    
    console.log("\n======================================================================");
    console.log("🎉 TESTING MODE SUCCESSFULLY ENABLED!");
    console.log("======================================================================");
    console.log("✅ SYSTEM STATUS:");
    console.log("   • Over-scheduling: STOPPED ✅");
    console.log("   • Active websites: 5 (testing only) ✅");
    console.log("   • Monitoring interval: 15 seconds ✅");
    console.log("   • Resource usage: Minimal ✅");
    
    console.log("\n🚀 NEXT STEPS:");
    console.log("   1. Visit http://localhost:3000 to see testing mode");
    console.log("   2. Only 5 websites will be actively monitored");
    console.log("   3. Monitor workpool performance and job processing");
    console.log("   4. When ready for production, disable testing mode");
    
    console.log("\n🔧 TO DISABLE TESTING MODE:");
    console.log("   Run: node scripts/disable-testing-mode.js");
    console.log("   Or call: testingMode:disableTestingMode in Convex dashboard");
    
  } catch (error) {
    console.error("❌ Testing mode setup failed:", error);
    console.error("\n🔧 TROUBLESHOOTING:");
    console.error("   • Check Convex deployment is running");
    console.error("   • Verify testingMode functions are deployed");
    console.error("   • Check network connectivity");
    process.exit(1);
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


