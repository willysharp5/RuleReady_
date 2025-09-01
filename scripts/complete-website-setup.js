#!/usr/bin/env node

/**
 * Complete Website Setup: Create missing compliance websites
 * 
 * This script creates websites for any compliance rules that don't have them yet
 * Run with: node scripts/complete-website-setup.js
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🔧 COMPLETING COMPLIANCE WEBSITE SETUP");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Get current state
    console.log("📊 Analyzing current state...");
    const [rules, websites] = await Promise.all([
      convex.query("csvImport:getAllRules"),
      convex.query("websites:getUserWebsites")
    ]);
    
    console.log(`📈 Current state:`);
    console.log(`   Total compliance rules: ${rules.length}`);
    console.log(`   Total websites: ${websites.length}`);
    
    const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    console.log(`   Compliance websites: ${complianceWebsites.length}`);
    
    // Step 2: Find rules without websites
    const websiteUrls = new Set(websites.map(w => w.url));
    const rulesWithoutWebsites = rules.filter(rule => !websiteUrls.has(rule.sourceUrl));
    
    console.log(`\n🔍 Analysis:`);
    console.log(`   Rules without websites: ${rulesWithoutWebsites.length}`);
    
    if (rulesWithoutWebsites.length === 0) {
      console.log("✅ All rules already have websites!");
      
      // Show breakdown by jurisdiction
      console.log("\n🗺️ Websites by jurisdiction:");
      const byJurisdiction = {};
      complianceWebsites.forEach(w => {
        const jurisdiction = w.complianceMetadata?.jurisdiction || "Unknown";
        byJurisdiction[jurisdiction] = (byJurisdiction[jurisdiction] || 0) + 1;
      });
      
      Object.entries(byJurisdiction)
        .sort(([,a], [,b]) => b - a)
        .forEach(([jurisdiction, count]) => {
          console.log(`   ${jurisdiction}: ${count} websites`);
        });
      
      return;
    }
    
    // Step 3: Show missing rules by jurisdiction
    console.log("\n❌ Missing websites by jurisdiction:");
    const missingByJurisdiction = {};
    rulesWithoutWebsites.forEach(rule => {
      const jurisdiction = rule.jurisdiction || "Unknown";
      if (!missingByJurisdiction[jurisdiction]) {
        missingByJurisdiction[jurisdiction] = [];
      }
      missingByJurisdiction[jurisdiction].push(rule);
    });
    
    Object.entries(missingByJurisdiction).forEach(([jurisdiction, rules]) => {
      console.log(`   ${jurisdiction}: ${rules.length} missing`);
      rules.slice(0, 3).forEach(rule => {
        console.log(`      • ${rule.topicLabel}`);
      });
    });
    
    // Step 4: Create missing websites
    console.log("\n🔄 Creating missing compliance websites...");
    
    const result = await convex.mutation("singleUserSetup:createAllComplianceWebsites");
    
    console.log("✅ SETUP COMPLETED!");
    console.log(`   Created: ${result.created || 0} new websites`);
    console.log(`   Already existed: ${result.alreadyExists ? 'Yes' : 'No'}`);
    
    // Step 5: Final verification
    console.log("\n📊 Final verification...");
    const finalWebsites = await convex.query("websites:getUserWebsites");
    const finalCompliance = finalWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    
    console.log(`🌐 Final website count: ${finalWebsites.length}`);
    console.log(`🏛️ Final compliance websites: ${finalCompliance.length}`);
    
    // Test specific states
    const testStates = ["Texas", "Washington", "California", "New York"];
    console.log("\n🔍 Final state verification:");
    
    for (const state of testStates) {
      const stateWebsites = finalCompliance.filter(w => 
        w.complianceMetadata?.jurisdiction === state
      );
      console.log(`   ${state}: ${stateWebsites.length} websites`);
    }
    
    console.log("\n======================================================================");
    console.log("🎉 ALL COMPLIANCE WEBSITES NOW AVAILABLE!");
    console.log("======================================================================");
    
  } catch (error) {
    console.error("❌ Setup completion failed:", error);
    process.exit(1);
  }
}

// Run the completion
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
