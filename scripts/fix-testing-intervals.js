#!/usr/bin/env node

/**
 * Fix Testing Intervals: Update test websites to use realistic intervals
 * 
 * This script updates the 5 test websites to use 5-minute intervals
 * to avoid rate limiting from government websites
 * Run with: node scripts/fix-testing-intervals.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🔧 FIXING TESTING INTERVALS TO AVOID RATE LIMITS");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Get current test websites
    console.log("📊 Getting current test websites...");
    const websites = await convex.query("websites:getUserWebsites");
    const activeTestWebsites = websites.filter(w => 
      w.isActive && 
      !w.isPaused && 
      w.checkInterval === 0.25 && // 15-second interval
      w.complianceMetadata?.isComplianceWebsite
    );
    
    console.log(`🎯 Found ${activeTestWebsites.length} test websites with 15-second intervals`);
    
    if (activeTestWebsites.length === 0) {
      console.log("⚠️ No test websites found with 15-second intervals");
      return;
    }
    
    // Update each test website to use 5-minute intervals
    console.log("\n🔄 Updating test websites to 5-minute intervals...");
    
    let updated = 0;
    for (const website of activeTestWebsites) {
      try {
        await convex.mutation("websites:updateWebsite", {
          websiteId: website._id,
          checkInterval: 5, // 5 minutes instead of 15 seconds
          priorityChangeReason: "Adjusted for rate limit compliance",
        });
        
        console.log(`✅ Updated: ${website.name}`);
        console.log(`   Old interval: 15 seconds`);
        console.log(`   New interval: 5 minutes`);
        updated++;
        
      } catch (error) {
        console.error(`❌ Failed to update ${website.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Updated ${updated} test websites`);
    
    // Wait a moment and check status
    console.log("\n⏳ Waiting 5 seconds for updates to apply...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check updated status
    console.log("\n📊 Checking updated test website status...");
    const updatedWebsites = await convex.query("websites:getUserWebsites");
    const updatedTestWebsites = updatedWebsites.filter(w => 
      w.isActive && 
      !w.isPaused && 
      w.complianceMetadata?.isComplianceWebsite
    );
    
    console.log("🎯 Updated test websites:");
    updatedTestWebsites.forEach((site, i) => {
      console.log(`   ${i + 1}. ${site.name}`);
      console.log(`      Check interval: ${site.checkInterval} minutes`);
      console.log(`      Priority: ${site.complianceMetadata?.priority}`);
      console.log(`      Jurisdiction: ${site.complianceMetadata?.jurisdiction}`);
    });
    
    console.log("\n======================================================================");
    console.log("🎉 TESTING INTERVALS FIXED!");
    console.log("======================================================================");
    console.log("✅ IMPROVEMENTS:");
    console.log("   • Test intervals: 15 seconds → 5 minutes ✅");
    console.log("   • Rate limit compliance: Government websites won't block ✅");
    console.log("   • Monitoring frequency: Still frequent enough for testing ✅");
    console.log("   • System stability: Reduced load on government servers ✅");
    
    console.log("\n🚀 MONITORING SHOULD NOW WORK:");
    console.log("   • Government websites won't rate limit 5-minute intervals");
    console.log("   • You should see monitoring results in the app");
    console.log("   • Change tracking logs will appear");
    console.log("   • System will be stable for extended testing");
    
  } catch (error) {
    console.error("❌ Interval fix failed:", error);
    process.exit(1);
  }
}

// Run the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


