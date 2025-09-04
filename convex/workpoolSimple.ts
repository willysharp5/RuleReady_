import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Simple job queue for compliance monitoring (public for testing)
export const scheduleComplianceJobs = action({
  args: {
    mode: v.union(v.literal("testing"), v.literal("production")),
    maxJobs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxJobs = args.maxJobs || (args.mode === "testing" ? 5 : 50);
    
    console.log(`📅 [${args.mode.toUpperCase()}] Scheduling compliance monitoring jobs...`);
    
    // Get active websites due for monitoring
    const allWebsites = await ctx.runQuery(internal.websites.getAllWebsites);
    const activeWebsites = allWebsites.filter(w => 
      w.isActive && 
      !w.isPaused && 
      w.complianceMetadata?.isComplianceWebsite
    );
    
    // Filter websites that are due for checking
    const now = Date.now();
    const websitesDue = activeWebsites.filter(website => {
      const lastChecked = website.lastChecked || website.createdAt;
      const checkIntervalMs = website.checkInterval * 60 * 1000; // Convert minutes to ms
      return (now - lastChecked) >= checkIntervalMs;
    }).slice(0, maxJobs);
    
    console.log(`📊 Found ${websitesDue.length} websites due for monitoring (max: ${maxJobs})`);
    
    if (websitesDue.length === 0) {
      console.log("⏭️ No websites due for monitoring at this time");
      return {
        jobsScheduled: 0,
        mode: args.mode,
        message: "No websites due for monitoring",
      };
    }
    
    // Schedule jobs with staggered timing (simple approach)
    let scheduled = 0;
    for (let i = 0; i < websitesDue.length; i++) {
      const website = websitesDue[i];
      const delay = i * 2000; // 2 second delay between jobs
      
      try {
        // Schedule compliance crawl
        await ctx.scheduler.runAfter(delay, internal.complianceCrawler.crawlComplianceRule, {
          ruleId: website.complianceMetadata?.ruleId || `website_${website._id}`,
        });
        
        // Log the job
        await ctx.runMutation(internal.workpoolSimple.logComplianceJob, {
          websiteId: website._id,
          ruleId: website.complianceMetadata?.ruleId || `website_${website._id}`,
          mode: args.mode,
          scheduledAt: Date.now() + delay,
          priority: website.complianceMetadata?.priority || "medium",
        });
        
        scheduled++;
      } catch (error) {
        console.error(`Failed to schedule job for ${website._id}:`, error);
      }
    }
    
    console.log(`✅ [${args.mode.toUpperCase()}] Scheduled ${scheduled} compliance monitoring jobs`);
    
    return {
      jobsScheduled: scheduled,
      mode: args.mode,
      websitesDue: websitesDue.length,
      maxConcurrency: maxJobs,
    };
  },
});

// Log compliance monitoring job
export const logComplianceJob = internalMutation({
  args: {
    websiteId: v.id("websites"),
    ruleId: v.string(),
    mode: v.union(v.literal("testing"), v.literal("production")),
    scheduledAt: v.number(),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"), v.literal("testing")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("complianceMonitoringLogs", {
      websiteId: args.websiteId,
      ruleId: args.ruleId,
      success: true, // Will be updated when job completes
      changesDetected: false, // Will be updated when job completes
      severity: "none", // Will be updated when job completes
      processingTime: 0, // Will be updated when job completes
      mode: args.mode,
      processedAt: args.scheduledAt,
      error: undefined,
      metadata: {
        priority: args.priority,
      },
    });
  },
});

// Get simple workpool status (public for testing)
export const getSimpleWorkpoolStatus = query({
  handler: async (ctx) => {
    // Get recent monitoring logs
    const recentLogs = await ctx.db
      .query("complianceMonitoringLogs")
      .order("desc")
      .take(50);
    
    // Calculate metrics for last 24 hours
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentLogs24h = recentLogs.filter(log => log.processedAt >= last24Hours);
    
    const metrics = {
      totalJobs24h: recentLogs24h.length,
      successfulJobs24h: recentLogs24h.filter(log => log.success).length,
      failedJobs24h: recentLogs24h.filter(log => !log.success).length,
      changesDetected24h: recentLogs24h.filter(log => log.changesDetected).length,
      averageProcessingTime: recentLogs24h.length > 0 ? 
        recentLogs24h.reduce((sum, log) => sum + log.processingTime, 0) / recentLogs24h.length : 0,
      testingModeJobs: recentLogs24h.filter(log => log.mode === "testing").length,
      productionModeJobs: recentLogs24h.filter(log => log.mode === "production").length,
    };
    
    return {
      metrics,
      recentActivity: recentLogs.slice(0, 10).map(log => ({
        ruleId: log.ruleId,
        success: log.success,
        changesDetected: log.changesDetected,
        severity: log.severity,
        processingTime: log.processingTime,
        mode: log.mode,
        processedAt: log.processedAt,
        error: log.error,
      })),
      isActive: recentLogs24h.length > 0,
    };
  },
});
