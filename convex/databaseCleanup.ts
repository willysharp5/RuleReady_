import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Clear all scraping and monitoring data
export const clearAllScrapingData = mutation({
  handler: async (ctx) => {
    console.log("🧹 Clearing all scraping and monitoring data...");
    
    let totalDeleted = 0;
    
    // Clear scrapeResults
    const scrapeResults = await ctx.db.query("scrapeResults").collect();
    console.log(`  - Deleting ${scrapeResults.length} scrapeResults...`);
    for (const result of scrapeResults) {
      await ctx.db.delete(result._id);
      totalDeleted++;
    }
    
    // Clear changeAlerts
    const changeAlerts = await ctx.db.query("changeAlerts").collect();
    console.log(`  - Deleting ${changeAlerts.length} changeAlerts...`);
    for (const alert of changeAlerts) {
      await ctx.db.delete(alert._id);
      totalDeleted++;
    }
    
    // Clear crawlSessions
    const crawlSessions = await ctx.db.query("crawlSessions").collect();
    console.log(`  - Deleting ${crawlSessions.length} crawlSessions...`);
    for (const session of crawlSessions) {
      await ctx.db.delete(session._id);
      totalDeleted++;
    }
    
    // Clear complianceMonitoringLogs
    const monitoringLogs = await ctx.db.query("complianceMonitoringLogs").collect();
    console.log(`  - Deleting ${monitoringLogs.length} complianceMonitoringLogs...`);
    for (const log of monitoringLogs) {
      await ctx.db.delete(log._id);
      totalDeleted++;
    }
    
    // Clear complianceChanges
    const changes = await ctx.db.query("complianceChanges").collect();
    console.log(`  - Deleting ${changes.length} complianceChanges...`);
    for (const change of changes) {
      await ctx.db.delete(change._id);
      totalDeleted++;
    }
    
    // Clear embeddingJobs
    const embeddingJobs = await ctx.db.query("embeddingJobs").collect();
    console.log(`  - Deleting ${embeddingJobs.length} embeddingJobs...`);
    for (const job of embeddingJobs) {
      await ctx.db.delete(job._id);
      totalDeleted++;
    }
    
    // Clear reportSources
    const reportSources = await ctx.db.query("reportSources").collect();
    console.log(`  - Deleting ${reportSources.length} reportSources...`);
    for (const source of reportSources) {
      await ctx.db.delete(source._id);
      totalDeleted++;
    }
    
    console.log(`✅ Deleted ${totalDeleted} total documents`);
    
    return {
      success: true,
      deletedCount: totalDeleted,
      message: `Cleared ${totalDeleted} scraping/monitoring records`
    };
  },
});

// Clear user tables (not needed in single-user mode)
export const clearUserTables = mutation({
  handler: async (ctx) => {
    console.log("👤 Clearing user tables...");
    
    let totalDeleted = 0;
    
    // Clear users
    const users = await ctx.db.query("users").collect();
    console.log(`  - Deleting ${users.length} users...`);
    for (const user of users) {
      await ctx.db.delete(user._id);
      totalDeleted++;
    }
    
    // Clear userSettings
    const userSettings = await ctx.db.query("userSettings").collect();
    console.log(`  - Deleting ${userSettings.length} userSettings...`);
    for (const setting of userSettings) {
      await ctx.db.delete(setting._id);
      totalDeleted++;
    }
    
    console.log(`✅ Deleted ${totalDeleted} user records`);
    
    return {
      success: true,
      deletedCount: totalDeleted,
      message: `Cleared ${totalDeleted} user records`
    };
  },
});

// Clear all websites (for fresh start)
export const clearAllWebsites = mutation({
  handler: async (ctx) => {
    console.log("🌐 Clearing all websites...");
    
    const websites = await ctx.db.query("websites").collect();
    console.log(`  - Deleting ${websites.length} websites...`);
    
    for (const website of websites) {
      await ctx.db.delete(website._id);
    }
    
    console.log(`✅ Deleted ${websites.length} websites`);
    
    return {
      success: true,
      deletedCount: websites.length,
      message: `Cleared ${websites.length} websites`
    };
  },
});

// Clear AI reports (keeping schema for fresh generation)
export const clearAIReports = mutation({
  handler: async (ctx) => {
    console.log("🤖 Clearing AI reports...");
    
    let totalDeleted = 0;
    
    // Clear complianceAIReports
    const aiReports = await ctx.db.query("complianceAIReports").collect();
    console.log(`  - Deleting ${aiReports.length} complianceAIReports...`);
    for (const report of aiReports) {
      await ctx.db.delete(report._id);
      totalDeleted++;
    }
    
    // Clear complianceReports
    const reports = await ctx.db.query("complianceReports").collect();
    console.log(`  - Deleting ${reports.length} complianceReports...`);
    for (const report of reports) {
      await ctx.db.delete(report._id);
      totalDeleted++;
    }
    
    // Clear complianceEmbeddings
    const embeddings = await ctx.db.query("complianceEmbeddings").collect();
    console.log(`  - Deleting ${embeddings.length} complianceEmbeddings...`);
    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
      totalDeleted++;
    }
    
    console.log(`✅ Deleted ${totalDeleted} AI reports and embeddings`);
    
    return {
      success: true,
      deletedCount: totalDeleted,
      message: `Cleared ${totalDeleted} AI reports and embeddings`
    };
  },
});

// Master cleanup - clears everything except core schema
export const masterCleanup = mutation({
  handler: async (ctx) => {
    console.log("🔥 MASTER CLEANUP - Clearing all data except core schema...\n");
    
    const results = {
      scraping: 0,
      users: 0,
      websites: 0,
      aiReports: 0,
      total: 0
    };
    
    // 1. Clear scraping data
    const scrapingResult = await ctx.runMutation(api.databaseCleanup.clearAllScrapingData, {});
    results.scraping = scrapingResult.deletedCount;
    
    // 2. Clear user data
    const userResult = await ctx.runMutation(api.databaseCleanup.clearUserTables, {});
    results.users = userResult.deletedCount;
    
    // 3. Clear websites
    const websiteResult = await ctx.runMutation(api.databaseCleanup.clearAllWebsites, {});
    results.websites = websiteResult.deletedCount;
    
    // 4. Clear AI reports
    const aiResult = await ctx.runMutation(api.databaseCleanup.clearAIReports, {});
    results.aiReports = aiResult.deletedCount;
    
    results.total = results.scraping + results.users + results.websites + results.aiReports;
    
    console.log("\n✅ MASTER CLEANUP COMPLETE!");
    console.log(`   - Scraping/Monitoring: ${results.scraping} deleted`);
    console.log(`   - Users: ${results.users} deleted`);
    console.log(`   - Websites: ${results.websites} deleted`);
    console.log(`   - AI Reports: ${results.aiReports} deleted`);
    console.log(`   - TOTAL: ${results.total} deleted\n`);
    
    console.log("📋 Tables kept with schema intact:");
    console.log("   ✓ complianceRules (core rules)");
    console.log("   ✓ complianceTemplates (templates)");
    console.log("   ✓ complianceTopics (topics)");
    console.log("   ✓ jurisdictions (jurisdictions)");
    console.log("   ✓ complianceDeadlines (deadlines)\n");
    
    return {
      success: true,
      results,
      message: `Database cleanup complete! Deleted ${results.total} total documents.`
    };
  },
});

// Import this properly
import { api } from "./_generated/api";

