import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create all compliance websites for single-user mode (no auth required)
export const createAllComplianceWebsites = mutation({
  handler: async (ctx) => {
    console.log("🔄 Creating all compliance websites for single-user mode...");
    
    // Get all existing websites and compliance rules
    const existingWebsites = await ctx.db.query("websites").collect();
    const complianceWebsites = existingWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    const allRules = await ctx.db.query("complianceRules").collect();
    
    // Find rules that don't have websites yet
    const existingUrls = new Set(existingWebsites.map(w => w.url));
    const rulesWithoutWebsites = allRules.filter(rule => !existingUrls.has(rule.sourceUrl));
    
    console.log(`📊 Analysis: ${complianceWebsites.length} existing websites, ${rulesWithoutWebsites.length} rules need websites`);
    
    if (rulesWithoutWebsites.length === 0) {
      console.log(`✅ All ${allRules.length} rules already have websites`);
      return {
        alreadyExists: true,
        count: complianceWebsites.length,
        totalRules: allRules.length,
      };
    }
    
    console.log(`🔄 Creating websites for ${rulesWithoutWebsites.length} missing rules...`);
    
    let created = 0;
    const systemUserId = undefined; // Single-user mode: no user ID needed
    
    // Create websites for each missing rule
    for (const rule of rulesWithoutWebsites) {
      try {
        // Create website name with priority indicator
        const priorityPrefix = {
          testing: "[TEST]",
          critical: "[CRITICAL]",
          high: "[HIGH]",
          medium: "[MEDIUM]", 
          low: "[LOW]"
        }[rule.priority];
        
        const websiteName = `${priorityPrefix} ${rule.jurisdiction} - ${rule.topicLabel}`;
        
        // Determine monitoring settings
        const monitoringSettings = {
          testing: { interval: 0.25, notification: "none" as const },   // 15 seconds (testing)
          critical: { interval: 1440, notification: "email" as const }, // Daily
          high: { interval: 2880, notification: "email" as const },     // Every 2 days
          medium: { interval: 10080, notification: "email" as const },  // Weekly
          low: { interval: 43200, notification: "none" as const }       // Monthly
        }[rule.priority];
        
        // Create website entry
        await ctx.db.insert("websites", {
          url: rule.sourceUrl,
          name: websiteName,
          isActive: true,
          isPaused: false,
          checkInterval: monitoringSettings.interval,
          notificationPreference: monitoringSettings.notification,
          monitorType: "single_page",
          complianceMetadata: {
            ruleId: rule.ruleId,
            jurisdiction: rule.jurisdiction,
            topicKey: rule.topicKey,
            priority: rule.priority,
            isComplianceWebsite: true,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        created++;
        
        if (created % 100 === 0) {
          console.log(`✅ Created ${created} compliance websites...`);
        }
        
      } catch (error) {
        console.error(`Failed to create website for rule ${rule.ruleId}:`, error);
      }
    }
    
    console.log(`🎉 Single-user setup completed: ${created} compliance websites created`);
    
    return {
      success: true,
      created,
      total: rulesWithoutWebsites.length,
      totalRules: allRules.length,
      existingWebsites: complianceWebsites.length,
    };
  },
});

// Check if setup is needed
export const needsSetup = query({
  handler: async (ctx) => {
    const websites = await ctx.db.query("websites").collect();
    const rules = await ctx.db.query("complianceRules").collect();
    const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    
    return {
      needsSetup: complianceWebsites.length === 0 && rules.length > 0,
      rulesCount: rules.length,
      websitesCount: websites.length,
      complianceWebsitesCount: complianceWebsites.length,
    };
  },
});
