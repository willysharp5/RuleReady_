#!/usr/bin/env node

/**
 * Trigger Test Monitoring: Manually trigger monitoring for the 5 test websites
 * 
 * This script manually triggers compliance monitoring to test the system
 * Run with: node scripts/trigger-test-monitoring.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🚀 MANUALLY TRIGGERING TEST MONITORING");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Check which websites are due for monitoring
    console.log("📊 Checking websites due for monitoring...");
    const rulesDue = await convex.query("complianceCrawler:getRulesDueForCrawling", {
      limit: 10,
    });
    
    console.log(`📋 Rules due for crawling: ${rulesDue.length}`);
    
    if (rulesDue.length === 0) {
      console.log("⚠️ No rules are due for crawling yet");
      console.log("   This might be because they were recently created");
      console.log("   Let's check the active test websites...");
      
      // Get active websites
      const websites = await convex.query("websites:getUserWebsites");
      const activeWebsites = websites.filter(w => w.isActive && !w.isPaused);
      
      console.log("\n🎯 Active test websites:");
      activeWebsites.forEach((site, i) => {
        const lastChecked = site.lastChecked || site.createdAt;
        const timeSinceCheck = Math.round((Date.now() - lastChecked) / 1000 / 60); // minutes
        const intervalMinutes = site.checkInterval;
        const isDue = timeSinceCheck >= intervalMinutes;
        
        console.log(`   ${i + 1}. ${site.name}`);
        console.log(`      Last checked: ${timeSinceCheck} minutes ago`);
        console.log(`      Check interval: ${intervalMinutes} minutes`);
        console.log(`      Due for check: ${isDue ? 'YES' : 'NO'}`);
        
        if (site.complianceMetadata?.ruleId) {
          console.log(`      Rule ID: ${site.complianceMetadata.ruleId}`);
        }
      });
      
      // If websites aren't due, let's manually trigger one for testing
      if (activeWebsites.length > 0) {
        const testWebsite = activeWebsites[0];
        console.log(`\n🧪 Manually triggering test crawl for: ${testWebsite.name}`);
        
        try {
          if (testWebsite.complianceMetadata?.ruleId) {
            const crawlResult = await convex.action("complianceCrawler:crawlComplianceRule", {
              ruleId: testWebsite.complianceMetadata.ruleId,
              forceRecrawl: true,
            });
            
            console.log("✅ MANUAL CRAWL COMPLETED:");
            console.log(`   Success: ${crawlResult.success}`);
            console.log(`   Changes detected: ${crawlResult.changesDetected}`);
            console.log(`   Content length: ${crawlResult.contentLength}`);
            
          } else {
            console.log("⚠️ Website missing compliance metadata");
          }
          
        } catch (error) {
          console.log("❌ Manual crawl failed:", error.message);
        }
      }
      
    } else {
      console.log(`✅ Found ${rulesDue.length} rules due for crawling`);
      
      // Show which rules are due
      rulesDue.slice(0, 5).forEach((rule, i) => {
        console.log(`   ${i + 1}. ${rule.ruleId}`);
        console.log(`      Jurisdiction: ${rule.jurisdiction}`);
        console.log(`      Topic: ${rule.topicLabel}`);
        console.log(`      Priority: ${rule.priority}`);
      });
      
      // Trigger the scheduled monitoring
      console.log("\n🔄 Triggering scheduled compliance monitoring...");
      
      try {
        const scheduleResult = await convex.action("workpoolSimple:scheduleComplianceJobs", {
          mode: "testing",
          maxJobs: 5,
        });
        
        console.log("✅ MONITORING TRIGGERED:");
        console.log(`   Jobs scheduled: ${scheduleResult.jobsScheduled}`);
        console.log(`   Mode: ${scheduleResult.mode}`);
        console.log(`   Max concurrency: ${scheduleResult.maxConcurrency}`);
        
      } catch (error) {
        console.log("❌ Failed to trigger monitoring:", error.message);
      }
    }
    
    // Step 2: Wait a moment and check for results
    console.log("\n⏳ Waiting 10 seconds for monitoring results...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check for new activity
    console.log("\n📊 Checking for new monitoring activity...");
    try {
      const workpoolStatus = await convex.query("workpoolSimple:getSimpleWorkpoolStatus");
      
      console.log("⚙️ UPDATED MONITORING ACTIVITY:");
      console.log(`   Jobs in last 24h: ${workpoolStatus.metrics.totalJobs24h}`);
      console.log(`   Successful jobs: ${workpoolStatus.metrics.successfulJobs24h}`);
      console.log(`   Changes detected: ${workpoolStatus.metrics.changesDetected24h}`);
      
      if (workpoolStatus.recentActivity && workpoolStatus.recentActivity.length > 0) {
        console.log("\n📋 Recent activity:");
        workpoolStatus.recentActivity.slice(0, 3).forEach((job, i) => {
          const timeAgo = Math.round((Date.now() - job.processedAt) / 1000 / 60);
          console.log(`   ${i + 1}. ${job.success ? '✅' : '❌'} ${job.ruleId} - ${timeAgo} min ago`);
        });
      } else {
        console.log("⚠️ No recent monitoring activity detected");
      }
      
    } catch (error) {
      console.log("⚠️ Could not get updated status:", error.message);
    }
    
    console.log("\n======================================================================");
    console.log("🎯 MONITORING TEST COMPLETE");
    console.log("======================================================================");
    
  } catch (error) {
    console.error("❌ Monitoring test failed:", error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


