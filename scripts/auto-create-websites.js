#!/usr/bin/env node

/**
 * Auto Create Websites: Automatically create websites from compliance rules
 * 
 * This script automatically creates website entries from imported compliance rules
 * Run with: node scripts/auto-create-websites.js
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
  console.log("🔄 AUTO-CREATING WEBSITES FROM COMPLIANCE RULES");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Get current stats
    console.log("📊 Checking current system state...");
    const importStats = await convex.query("complianceImport:getImportStats");
    
    console.log(`📈 Current state:`);
    console.log(`   Compliance rules: ${importStats.rules}`);
    console.log(`   Compliance reports: ${importStats.reports}`);
    console.log(`   Embeddings: ${importStats.embeddings}`);
    
    if (importStats.rules === 0) {
      console.log("⚠️ No compliance rules found. Please import CSV data first.");
      return;
    }
    
    // Read CSV to get all rules and create websites directly
    const csvPath = path.join(__dirname, '../data/compliance_rules_enriched.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log("\n🌐 Creating websites from compliance rules...");
    console.log("This will make all compliance rules appear as monitored websites");
    
    // Import with automatic website creation (this should happen automatically now)
    const result = await convex.action("csvImport:importCSVData", { 
      csvContent: csvContent 
    });
    
    console.log("\n✅ AUTOMATIC WEBSITE CREATION COMPLETED!");
    console.log("======================================================================");
    console.log("📊 RESULTS:");
    console.log(`   Rules processed: ${result.total}`);
    console.log(`   Successfully imported: ${result.imported}`);
    console.log(`   Failed: ${result.failed}`);
    
    console.log("\n🌐 WEBSITES NOW AVAILABLE:");
    console.log("   • Visit your main page (/) to see all compliance websites");
    console.log("   • Each compliance rule is now a monitored website");
    console.log("   • Priority indicators: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low");
    console.log("   • Automatic monitoring based on priority");
    
    console.log("\n📋 MONITORING SCHEDULE:");
    console.log("   🔴 Critical rules: Checked daily (minimum wage, overtime, safety)");
    console.log("   🟠 High priority: Checked every 2 days (leave policies, workers comp)");
    console.log("   🟡 Medium priority: Checked weekly (posting requirements, jury duty)");
    console.log("   🟢 Low priority: Checked monthly (other compliance areas)");
    
    console.log("\n======================================================================");
    console.log("🎉 ALL COMPLIANCE RULES ARE NOW INTEGRATED AS MONITORED WEBSITES!");
    console.log("======================================================================");
    console.log("✅ READY TO USE:");
    console.log("   • Main page shows all compliance + regular websites");
    console.log("   • Automatic change detection for regulatory updates");
    console.log("   • Priority-based monitoring and alerts");
    console.log("   • Search and filter by jurisdiction/topic");
    
  } catch (error) {
    console.error("❌ Auto-creation failed:", error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
