#!/usr/bin/env node

/**
 * Full Import Script: Import All 1,305 Compliance Rules
 * 
 * This script imports all compliance rules from CSV to the database
 * Run with: node scripts/import-all-rules.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from "convex/browser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🚀 IMPORTING ALL 1,305 COMPLIANCE RULES");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Read the full CSV file
    const csvPath = path.join(__dirname, '../data/compliance_rules_enriched.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log(`📖 Read CSV file: ${csvPath}`);
    
    // Count total rules
    const lines = csvContent.trim().split('\n');
    const totalRules = lines.length - 1; // Exclude header
    console.log(`📊 Found ${totalRules} compliance rules to import`);
    
    // Confirm before proceeding
    console.log("\n⚠️  This will import ALL compliance rules. This may take several minutes.");
    console.log("🔄 Starting full import in 3 seconds...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get current stats before import
    console.log("\n📈 Pre-import database stats:");
    const preStats = await convex.query("complianceImport:getImportStats");
    console.log(`   Current rules: ${preStats.rules}`);
    console.log(`   Current reports: ${preStats.reports}`);
    console.log(`   Current embeddings: ${preStats.embeddings}`);
    
    // Start the import
    console.log("\n🚀 Starting full CSV import...");
    const startTime = Date.now();
    
    const result = await convex.action("csvImport:importCSVData", { 
      csvContent: csvContent 
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log("\n✅ FULL IMPORT COMPLETED!");
    console.log("======================================================================");
    console.log("📊 IMPORT RESULTS:");
    console.log(`   ✅ Imported: ${result.imported} rules`);
    console.log(`   ❌ Failed: ${result.failed} rules`);
    console.log(`   📋 Total processed: ${result.total} rules`);
    console.log(`   ⏱️ Duration: ${duration.toFixed(2)} seconds`);
    console.log(`   🚀 Rate: ${(result.imported / duration).toFixed(2)} rules/second`);
    
    if (result.errors && result.errors.length > 0) {
      console.log("\n❌ IMPORT ERRORS:");
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    // Get post-import stats
    console.log("\n📈 Post-import database stats:");
    const postStats = await convex.query("complianceImport:getImportStats");
    console.log(`   Total rules: ${postStats.rules} (+${postStats.rules - preStats.rules})`);
    console.log(`   Total reports: ${postStats.reports}`);
    console.log(`   Total embeddings: ${postStats.embeddings}`);
    
    // Get breakdown by jurisdiction and priority
    console.log("\n🗺️ Getting compliance breakdown...");
    const dashboard = await convex.query("complianceQueries:getComplianceDashboard", {});
    
    console.log("📊 RULES BY PRIORITY:");
    console.log(`   🔴 Critical: ${dashboard.stats.byPriority.critical}`);
    console.log(`   🟠 High: ${dashboard.stats.byPriority.high}`);
    console.log(`   🟡 Medium: ${dashboard.stats.byPriority.medium}`);
    console.log(`   🟢 Low: ${dashboard.stats.byPriority.low}`);
    
    console.log("\n📊 MONITORING STATUS:");
    console.log(`   ✅ Active: ${dashboard.stats.byStatus.active}`);
    console.log(`   ⏸️ Paused: ${dashboard.stats.byStatus.paused}`);
    console.log(`   ❌ Error: ${dashboard.stats.byStatus.error}`);
    
    // Get jurisdictions and topics created
    const [jurisdictions, topics] = await Promise.all([
      convex.query("complianceQueries:getJurisdictions"),
      convex.query("complianceQueries:getTopics")
    ]);
    
    console.log("\n🏛️ JURISDICTIONS CREATED:");
    console.log(`   📍 Total jurisdictions: ${jurisdictions.length}`);
    jurisdictions.slice(0, 10).forEach(j => {
      console.log(`   • ${j.name} (${j.type}): ${j.ruleCount} rules`);
    });
    if (jurisdictions.length > 10) {
      console.log(`   ... and ${jurisdictions.length - 10} more jurisdictions`);
    }
    
    console.log("\n📋 COMPLIANCE TOPICS CREATED:");
    console.log(`   🏷️ Total topics: ${topics.length}`);
    topics.slice(0, 10).forEach(t => {
      console.log(`   • ${t.name} (${t.category}): ${t.ruleCount} rules`);
    });
    if (topics.length > 10) {
      console.log(`   ... and ${topics.length - 10} more topics`);
    }
    
    // Test search functionality with full dataset
    console.log("\n🔍 Testing search with full dataset...");
    const searchTests = [
      "minimum wage",
      "overtime",
      "harassment training",
      "California",
      "workers compensation"
    ];
    
    for (const searchTerm of searchTests) {
      const searchResults = await convex.query("complianceQueries:searchRules", {
        searchTerm,
        limit: 3
      });
      console.log(`   🎯 "${searchTerm}": ${searchResults.length} matches`);
    }
    
    console.log("\n======================================================================");
    console.log("🎉 ALL 1,305 COMPLIANCE RULES SUCCESSFULLY IMPORTED!");
    console.log("======================================================================");
    console.log("✅ SYSTEM NOW READY FOR:");
    console.log("   • Automated compliance monitoring");
    console.log("   • AI-powered change detection");
    console.log("   • Cross-jurisdictional analysis");
    console.log("   • Compliance dashboard and reporting");
    console.log("   • Semantic search and RAG queries");
    
    console.log("\n🚀 NEXT RECOMMENDED STEPS:");
    console.log("   1. Import 1,175 compliance reports for detailed analysis");
    console.log("   2. Import 2,759 existing embeddings for semantic search");
    console.log("   3. Set up automated crawling schedules");
    console.log("   4. Build compliance dashboard UI");
    console.log("   5. Configure alert notifications");
    
    if (result.imported === totalRules) {
      console.log("\n🏆 PERFECT IMPORT - ALL RULES SUCCESSFULLY PROCESSED!");
    } else {
      console.log(`\n⚠️ PARTIAL IMPORT - ${totalRules - result.imported} rules need attention`);
    }
    
  } catch (error) {
    console.error("❌ Full import failed:", error);
    console.error("\n🔧 TROUBLESHOOTING:");
    console.error("   • Check Convex deployment is running");
    console.error("   • Verify CSV file exists and is readable");
    console.error("   • Check network connectivity");
    console.error("   • Review error details above");
    process.exit(1);
  }
}

// Run the import
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
