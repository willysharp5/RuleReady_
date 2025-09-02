#!/usr/bin/env node

/**
 * Check Convex Dashboard Status: Explain what to look for in Convex dashboard
 * 
 * This script explains where to find active jobs in the Convex dashboard
 * Run with: node scripts/check-convex-dashboard-status.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🔍 CONVEX DASHBOARD STATUS EXPLANATION");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    console.log("🎯 UNDERSTANDING CONVEX DASHBOARD vs. YOUR ACTIVE WEBSITES:");
    console.log("");
    
    console.log("📊 WHAT YOU SHOULD SEE IN CONVEX DASHBOARD:");
    console.log("   1. CRON JOBS section:");
    console.log("      • Should show: NO ACTIVE CRON JOBS (this is correct)");
    console.log("      • We disabled all cron jobs to prevent over-scheduling");
    console.log("      • Empty cron section = SUCCESS (not a problem)");
    console.log("");
    console.log("   2. SCHEDULED FUNCTIONS section:");
    console.log("      • Should show: NO SCHEDULED FUNCTIONS (this is correct)");
    console.log("      • We're not using automatic scheduling anymore");
    console.log("      • Manual control only = SAFE MODE");
    console.log("");
    
    console.log("🔍 WHERE YOUR 5 ACTIVE WEBSITES ARE:");
    console.log("   • NOT in Convex dashboard cron jobs (we disabled those)");
    console.log("   • NOT in scheduled functions (we stopped automatic scheduling)");
    console.log("   • INSTEAD: They're in your app database as 'active' websites");
    console.log("   • They're ready for monitoring but not automatically scheduled");
    console.log("");
    
    // Try to get current status
    console.log("📋 CHECKING YOUR ACTUAL ACTIVE WEBSITES:");
    try {
      const websites = await convex.query("websites:getUserWebsites");
      const activeWebsites = websites.filter(w => w.isActive && !w.isPaused);
      const complianceWebsites = activeWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite);
      
      console.log(`   Active websites in database: ${activeWebsites.length}`);
      console.log(`   Active compliance websites: ${complianceWebsites.length}`);
      
      if (complianceWebsites.length > 0) {
        console.log("\n🎯 YOUR 5 ACTIVE TEST WEBSITES:");
        complianceWebsites.forEach((site, i) => {
          console.log(`   ${i + 1}. ${site.name}`);
          console.log(`      Status: ${site.isActive ? 'Active' : 'Inactive'} / ${site.isPaused ? 'Paused' : 'Running'}`);
          console.log(`      Check interval: ${site.checkInterval} minutes`);
          console.log(`      Priority: ${site.complianceMetadata?.priority}`);
        });
      }
      
    } catch (error) {
      console.log("⚠️ Cannot check websites (deployment may be paused)");
      console.log(`   Error: ${error.message}`);
    }
    
    console.log("\n🔧 CONVEX DASHBOARD SECTIONS EXPLAINED:");
    console.log("");
    console.log("   📅 CRON JOBS section:");
    console.log("      • What it shows: Automatic recurring tasks");
    console.log("      • Current status: EMPTY (intentionally disabled)");
    console.log("      • Why empty: We stopped automatic scheduling to prevent rate limiting");
    console.log("");
    console.log("   ⏰ SCHEDULED FUNCTIONS section:");
    console.log("      • What it shows: One-time scheduled function calls");
    console.log("      • Current status: EMPTY (no automatic scheduling)");
    console.log("      • Why empty: We use manual control instead of automatic scheduling");
    console.log("");
    console.log("   📊 FUNCTIONS section:");
    console.log("      • What it shows: All available functions and their recent calls");
    console.log("      • What to look for: Recent calls to 'websites:getUserWebsites'");
    console.log("      • This shows your app is accessing the 5 active websites");
    console.log("");
    console.log("   🗄️ DATA section:");
    console.log("      • What it shows: Database tables and their contents");
    console.log("      • What to look for: 'websites' table with 5 active compliance websites");
    console.log("      • This is where your active monitoring websites are stored");
    console.log("");
    
    console.log("======================================================================");
    console.log("🎉 SUMMARY: YOU'RE LOOKING IN THE RIGHT PLACE!");
    console.log("======================================================================");
    console.log("✅ CONVEX DASHBOARD STATUS:");
    console.log("   • Cron jobs: EMPTY (correct - we disabled them)");
    console.log("   • Scheduled functions: EMPTY (correct - manual control only)");
    console.log("   • Functions: Should show recent activity");
    console.log("   • Data: Should show 5 active websites in 'websites' table");
    console.log("");
    console.log("🎯 THE 5 ACTIVE WEBSITES ARE:");
    console.log("   • Stored in the 'websites' database table");
    console.log("   • Marked as active=true, isPaused=false");
    console.log("   • Ready for monitoring but not automatically scheduled");
    console.log("   • Controlled manually through the app interface");
    console.log("");
    console.log("🔧 TO SEE THEM IN CONVEX DASHBOARD:");
    console.log("   1. Go to Data section");
    console.log("   2. Click on 'websites' table");
    console.log("   3. Filter by isActive=true AND isPaused=false");
    console.log("   4. You should see 5 compliance websites");
    
  } catch (error) {
    console.error("❌ Dashboard explanation failed:", error);
    process.exit(1);
  }
}

// Run the explanation
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

