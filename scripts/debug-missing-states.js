#!/usr/bin/env node

/**
 * Debug Missing States: Investigate why some states are missing from filters
 * 
 * This script analyzes the imported data to find missing states and rules
 * Run with: node scripts/debug-missing-states.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🔍 DEBUGGING MISSING STATES AND RULES");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Check database stats
    console.log("📊 Checking database statistics...");
    const importStats = await convex.query("complianceImport:getImportStats");
    console.log(`📈 Database stats: ${importStats.rules} rules, ${importStats.reports} reports, ${importStats.embeddings} embeddings`);
    
    // Step 2: Get all jurisdictions
    console.log("\n🗺️ Checking jurisdictions...");
    const jurisdictions = await convex.query("complianceQueries:getJurisdictions");
    console.log(`📍 Found ${jurisdictions.length} jurisdictions in database`);
    
    // List all jurisdictions
    console.log("\n📋 All jurisdictions:");
    jurisdictions.forEach((j, i) => {
      console.log(`   ${i + 1}. ${j.name} (${j.type}): ${j.ruleCount} rules`);
    });
    
    // Step 3: Check for specific missing states
    const expectedStates = ["Texas", "Washington", "California", "New York", "Florida"];
    console.log("\n🔍 Checking for expected states:");
    
    for (const state of expectedStates) {
      const found = jurisdictions.find(j => j.name === state);
      if (found) {
        console.log(`   ✅ ${state}: Found with ${found.ruleCount} rules`);
      } else {
        console.log(`   ❌ ${state}: NOT FOUND`);
      }
    }
    
    // Step 4: Get dashboard data to see what's being displayed
    console.log("\n📊 Checking dashboard display...");
    const dashboard = await convex.query("complianceQueries:getComplianceDashboard", {});
    console.log(`📋 Dashboard shows: ${dashboard.rules.length} rules out of ${dashboard.stats.totalRules} total`);
    
    // Step 5: Test specific state searches
    console.log("\n🔍 Testing state-specific searches...");
    const testStates = ["Texas", "Washington", "California"];
    
    for (const state of testStates) {
      try {
        const stateRules = await convex.query("complianceQueries:searchRules", {
          searchTerm: state,
          limit: 5
        });
        console.log(`   🎯 ${state}: Found ${stateRules.length} rules`);
        if (stateRules.length > 0) {
          stateRules.slice(0, 2).forEach(rule => {
            console.log(`      • ${rule.name || rule.ruleId}`);
          });
        }
      } catch (error) {
        console.log(`   ❌ ${state}: Search failed - ${error.message}`);
      }
    }
    
    // Step 6: Check if websites are being created
    console.log("\n🌐 Checking website creation...");
    try {
      // This might fail if no user is authenticated
      const websites = await convex.query("websites:getUserWebsites");
      console.log(`📱 Found ${websites.length} websites total`);
      
      const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite);
      console.log(`🏛️ Compliance websites: ${complianceWebsites.length}`);
      
      if (complianceWebsites.length > 0) {
        console.log("\n📋 Sample compliance websites:");
        complianceWebsites.slice(0, 10).forEach((site, i) => {
          console.log(`   ${i + 1}. ${site.name}`);
        });
        
        // Check for specific states in websites
        console.log("\n🔍 Checking for specific states in websites:");
        for (const state of testStates) {
          const stateWebsites = complianceWebsites.filter(w => 
            w.name.includes(state) || w.complianceMetadata?.jurisdiction === state
          );
          console.log(`   ${state}: ${stateWebsites.length} websites`);
        }
      }
      
    } catch (error) {
      console.log("⚠️ Website query requires authentication");
      console.log(`   Error: ${error.message}`);
    }
    
    console.log("\n======================================================================");
    console.log("🎯 ANALYSIS COMPLETE");
    console.log("======================================================================");
    
    if (jurisdictions.length < 50) {
      console.log("⚠️ POTENTIAL ISSUE: Expected ~52 jurisdictions, found " + jurisdictions.length);
      console.log("   This might indicate incomplete CSV import");
    }
    
    if (importStats.rules < 1298) {
      console.log("⚠️ POTENTIAL ISSUE: Expected 1,298+ rules, found " + importStats.rules);
      console.log("   Some rules might have failed to import");
    }
    
    console.log("\n🔧 RECOMMENDATIONS:");
    console.log("   1. Check CSV import logs for any failed imports");
    console.log("   2. Verify user authentication for website queries");
    console.log("   3. Re-run CSV import if states are missing");
    console.log("   4. Check website creation during import process");
    
  } catch (error) {
    console.error("❌ Debug analysis failed:", error);
    process.exit(1);
  }
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
