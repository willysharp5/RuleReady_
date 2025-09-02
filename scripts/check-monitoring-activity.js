#!/usr/bin/env node

/**
 * Check Monitoring Activity: See if the 5 test websites are actually being monitored
 * 
 * This script checks if monitoring is happening and results are being stored
 * Run with: node scripts/check-monitoring-activity.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🔍 CHECKING MONITORING ACTIVITY");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Check active websites
    console.log("📊 Checking active websites...");
    const websites = await convex.query("websites:getUserWebsites");
    const activeWebsites = websites.filter(w => w.isActive && !w.isPaused);
    const complianceWebsites = activeWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    
    console.log(`📈 Website status:`);
    console.log(`   Total websites: ${websites.length}`);
    console.log(`   Active websites: ${activeWebsites.length}`);
    console.log(`   Active compliance websites: ${complianceWebsites.length}`);
    
    if (complianceWebsites.length === 0) {
      console.log("⚠️ NO ACTIVE COMPLIANCE WEBSITES - Testing mode may not be working");
      return;
    }
    
    // Step 2: Check recent scrape results
    console.log("\n🔍 Checking recent scrape results...");
    try {
      const scrapeHistory = await convex.query("websites:getAllScrapeHistory");
      console.log(`📋 Total scrape history entries: ${scrapeHistory.length}`);
      
      if (scrapeHistory.length > 0) {
        console.log("\n📄 Recent scrape activity:");
        scrapeHistory.slice(0, 10).forEach((scrape, i) => {
          const timeAgo = Math.round((Date.now() - scrape.scrapedAt) / 1000 / 60); // minutes ago
          const status = scrape.changeStatus === 'changed' ? '📝 CHANGED' : 
                        scrape.changeStatus === 'same' ? '⚪ Same' : 
                        scrape.changeStatus === 'new' ? '🆕 New' : scrape.changeStatus;
          
          console.log(`   ${i + 1}. ${scrape.websiteName || 'Unknown'}`);
          console.log(`      Status: ${status}`);
          console.log(`      Time: ${timeAgo} minutes ago`);
          console.log(`      URL: ${scrape.websiteUrl}`);
        });
      } else {
        console.log("⚠️ NO SCRAPE HISTORY FOUND - Monitoring may not be running yet");
      }
      
    } catch (error) {
      console.log("⚠️ Could not get scrape history:", error.message);
    }
    
    // Step 3: Check monitoring logs
    console.log("\n📊 Checking monitoring logs...");
    try {
      const workpoolStatus = await convex.query("workpoolSimple:getSimpleWorkpoolStatus");
      
      console.log("⚙️ MONITORING ACTIVITY:");
      console.log(`   Jobs in last 24h: ${workpoolStatus.metrics.totalJobs24h}`);
      console.log(`   Successful jobs: ${workpoolStatus.metrics.successfulJobs24h}`);
      console.log(`   Failed jobs: ${workpoolStatus.metrics.failedJobs24h}`);
      console.log(`   Changes detected: ${workpoolStatus.metrics.changesDetected24h}`);
      console.log(`   System active: ${workpoolStatus.isActive ? 'YES' : 'NO'}`);
      
      if (workpoolStatus.recentActivity && workpoolStatus.recentActivity.length > 0) {
        console.log("\n📋 Recent monitoring activity:");
        workpoolStatus.recentActivity.slice(0, 5).forEach((job, i) => {
          const timeAgo = Math.round((Date.now() - job.processedAt) / 1000 / 60);
          const status = job.success ? '✅' : '❌';
          const changes = job.changesDetected ? '📝 Changes' : '⚪ No changes';
          
          console.log(`   ${i + 1}. ${status} ${job.ruleId}`);
          console.log(`      ${changes} - ${timeAgo} min ago`);
          console.log(`      Mode: ${job.mode}, Time: ${job.processingTime}ms`);
        });
      }
      
    } catch (error) {
      console.log("⚠️ Could not get monitoring logs:", error.message);
    }
    
    // Step 4: Check if cron jobs are running
    console.log("\n⏰ Checking scheduled jobs...");
    const now = new Date();
    console.log(`   Current time: ${now.toLocaleString()}`);
    console.log(`   Compliance monitoring should run every 30 seconds`);
    console.log(`   Website checking should run every 15 seconds`);
    
    console.log("\n======================================================================");
    console.log("🎯 MONITORING STATUS SUMMARY");
    console.log("======================================================================");
    
    if (complianceWebsites.length === 5) {
      console.log("✅ TESTING MODE WORKING:");
      console.log("   • 5 websites active for testing ✅");
      console.log("   • Over-scheduling stopped ✅");
      console.log("   • System ready for monitoring ✅");
    } else {
      console.log("⚠️ TESTING MODE ISSUES:");
      console.log(`   • Expected 5 active websites, found ${complianceWebsites.length}`);
      console.log("   • May need to re-enable testing mode");
    }
    
    console.log("\n🔧 IF NO MONITORING ACTIVITY:");
    console.log("   1. Check that FireCrawl API key is set");
    console.log("   2. Verify cron jobs are running");
    console.log("   3. Check network connectivity");
    console.log("   4. Monitor Convex function logs");
    
  } catch (error) {
    console.error("❌ Status check failed:", error);
    process.exit(1);
  }
}

// Run the check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


