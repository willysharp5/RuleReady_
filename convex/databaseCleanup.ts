import { mutation } from "./_generated/server";

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

// Clear app settings (for clean reset)
export const clearAppSettings = mutation({
  handler: async (ctx) => {
    console.log("⚙️  Clearing app settings...");
    
    let totalDeleted = 0;
    
    // Clear appSettings
    const appSettings = await ctx.db.query("appSettings").collect();
    console.log(`  - Deleting ${appSettings.length} appSettings...`);
    for (const setting of appSettings) {
      await ctx.db.delete(setting._id);
      totalDeleted++;
    }
    
    console.log(`✅ Deleted ${totalDeleted} app settings`);
    
    return {
      success: true,
      deletedCount: totalDeleted,
      message: `Cleared ${totalDeleted} app settings (will use defaults)`
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

// Clear AI reports (WITHOUT embeddings - too large)
export const clearReportsOnly = mutation({
  handler: async (ctx) => {
    console.log("📄 Clearing AI reports (NOT embeddings - clear those manually)...");
    
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
    
    console.log(`✅ Deleted ${totalDeleted} AI reports`);
    console.log(`⚠️  You must manually clear complianceEmbeddings in the dashboard (too large for mutation)`);
    
    return {
      success: true,
      deletedCount: totalDeleted,
      message: `Cleared ${totalDeleted} AI reports (embeddings must be cleared manually)`
    };
  },
});
