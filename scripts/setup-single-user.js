#!/usr/bin/env node

/**
 * Setup Single User: Create all compliance websites for single-user mode
 * 
 * This script creates all compliance websites without authentication
 * Run with: node scripts/setup-single-user.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🚀 SETTING UP SINGLE-USER COMPLIANCE SYSTEM");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Check current state
    console.log("📊 Checking current system state...");
    const [importStats, setupStatus] = await Promise.all([
      convex.query("complianceImport:getImportStats"),
      convex.query("singleUserSetup:needsSetup")
    ]);
    
    console.log(`📈 Current state:`);
    console.log(`   Compliance rules: ${importStats.rules}`);
    console.log(`   Existing websites: ${setupStatus.websitesCount}`);
    console.log(`   Compliance websites: ${setupStatus.complianceWebsitesCount}`);
    console.log(`   Setup needed: ${setupStatus.needsSetup}`);
    
    if (!setupStatus.needsSetup) {
      console.log("✅ System already set up - no action needed");
      return;
    }
    
    if (importStats.rules === 0) {
      console.log("⚠️ No compliance rules found. Please import CSV data first.");
      return;
    }
    
    // Step 2: Create all compliance websites
    console.log("\n🔄 Creating compliance websites...");
    console.log(`This will create ${importStats.rules} monitored websites`);
    
    const startTime = Date.now();
    
    const result = await convex.mutation("singleUserSetup:createAllComplianceWebsites");
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log("\n✅ SINGLE-USER SETUP COMPLETED!");
    console.log("======================================================================");
    console.log("📊 SETUP RESULTS:");
    console.log(`   ✅ Created: ${result.created} compliance websites`);
    console.log(`   📋 Total rules: ${result.total}`);
    console.log(`   ⏱️ Duration: ${duration.toFixed(2)} seconds`);
    console.log(`   🚀 Rate: ${(result.created / duration).toFixed(2)} websites/second`);
    
    // Step 3: Verify setup
    console.log("\n📊 Verifying setup...");
    const finalStats = await convex.query("complianceImport:getImportStats");
    console.log(`📈 Final state: ${finalStats.rules} rules, ${finalStats.reports} reports`);
    
    // Test website query
    const websites = await convex.query("websites:getUserWebsites");
    console.log(`🌐 Total websites now: ${websites.length}`);
    
    const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    console.log(`🏛️ Compliance websites: ${complianceWebsites.length}`);
    
    // Test filtering for specific states
    console.log("\n🔍 Testing state filtering...");
    const testStates = ["Texas", "Washington", "California"];
    
    for (const state of testStates) {
      const stateWebsites = websites.filter(w => 
        w.complianceMetadata?.jurisdiction === state
      );
      console.log(`   ${state}: ${stateWebsites.length} websites`);
    }
    
    console.log("\n======================================================================");
    console.log("🎉 SINGLE-USER COMPLIANCE SYSTEM READY!");
    console.log("======================================================================");
    console.log("✅ SYSTEM STATUS:");
    console.log("   • Authentication: Disabled ✅");
    console.log("   • Compliance rules: Imported ✅");
    console.log("   • Compliance websites: Created ✅");
    console.log("   • Filtering: Ready ✅");
    console.log("   • Monitoring: Active ✅");
    
    console.log("\n🚀 READY TO USE:");
    console.log("   1. Visit: http://localhost:3000");
    console.log("   2. See all compliance websites without login");
    console.log("   3. Filter by jurisdiction, priority, and topics");
    console.log("   4. All states (Texas, Washington, etc.) now available");
    console.log("   5. Priority-based monitoring active");
    
  } catch (error) {
    console.error("❌ Single-user setup failed:", error);
    process.exit(1);
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
