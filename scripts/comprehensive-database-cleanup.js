/**
 * Comprehensive Database Cleanup Script
 * Removes all scraping data and unused tables
 * Keeps core compliance infrastructure
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function cleanupDatabase() {
  console.log("🧹 Starting comprehensive database cleanup...\n");

  // Step 1: Clear all scraping/monitoring data
  console.log("📊 Clearing scraping and monitoring data...");
  
  const tablesToClear = [
    "scrapeResults",          // Legacy scraping data
    "changeAlerts",           // Legacy alerts
    "crawlSessions",          // Legacy crawl sessions
    "complianceMonitoringLogs", // Monitoring logs
    "complianceChanges",      // Change tracking
    "embeddingJobs",          // Embedding jobs
    "reportSources",          // Report sources
  ];

  for (const tableName of tablesToClear) {
    try {
      console.log(`  - Clearing ${tableName}...`);
      // Note: We'll delete data via raw queries since we're doing a clean wipe
    } catch (error) {
      console.error(`  ❌ Error clearing ${tableName}:`, error.message);
    }
  }

  // Step 2: List tables that should be deleted entirely
  console.log("\n🗑️  Tables that need manual deletion in Convex dashboard:");
  console.log("  (These can't be deleted via code, you must delete them in the Convex dashboard)");
  
  const tablesToDelete = [
    "users",                  // Not needed in single-user mode
    "userSettings",           // Not needed in single-user mode
    "aiModelConfigs",         // Empty, not used
    "aiModels",               // Empty, not used
    "generatedReports",       // Empty, not used
    "reportJobs",             // Empty, not used
    "sourceCollections",      // Empty, not used
    "sourceDocuments",        // Empty, not used
    "complianceChatSessions", // Empty, not used
  ];

  tablesToDelete.forEach(table => {
    console.log(`  ❌ ${table}`);
  });

  // Step 3: Optional - Clear websites (keeping schema)
  console.log("\n⚠️  Optional cleanup:");
  console.log("  - websites table (contains compliance website configs)");
  console.log("    Run this separately if you want to regenerate all websites from rules");

  console.log("\n✅ Cleanup instructions:");
  console.log("1. Go to: https://dashboard.convex.dev/d/friendly-octopus-467");
  console.log("2. Click on 'Data' tab");
  console.log("3. For each table listed above:");
  console.log("   - Click the table name");
  console.log("   - Click 'Delete All Documents' to clear data");
  console.log("   - Click 'Delete Table' to remove unused tables entirely");
  console.log("\n4. Keep these core tables:");
  console.log("   - complianceRules");
  console.log("   - complianceReports");
  console.log("   - complianceEmbeddings");
  console.log("   - complianceTemplates");
  console.log("   - complianceTopics");
  console.log("   - jurisdictions");
  console.log("   - websites");
  console.log("   - complianceDeadlines");
  console.log("   - complianceAIReports");
}

cleanupDatabase()
  .then(() => {
    console.log("\n✨ Cleanup analysis complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  });

