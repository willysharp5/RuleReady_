import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./helpers";

// Automatically set up compliance websites for a user
export const autoSetupComplianceWebsites = mutation({
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    
    console.log("🔄 Auto-setting up compliance websites for user...");
    
    // Check if user already has compliance websites
    const existingWebsites = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const complianceWebsites = existingWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    
    if (complianceWebsites.length > 0) {
      console.log(`✅ User already has ${complianceWebsites.length} compliance websites`);
      return {
        alreadySetup: true,
        websiteCount: complianceWebsites.length,
      };
    }
    
    // Get all compliance rules
    const rules = await ctx.db.query("complianceRules").collect();
    console.log(`📊 Found ${rules.length} compliance rules to convert`);
    
    let created = 0;
    
    // Create websites for each rule
    for (const rule of rules) {
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
          userId: user._id,
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
            hasManualOverride: false,
            originalPriority: rule.priority,
            lastPriorityChange: Date.now(),
            priorityChangeReason: "Auto-setup from compliance rules",
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
    
    console.log(`🎉 Auto-setup completed: ${created} compliance websites created`);
    
    return {
      success: true,
      created,
      total: rules.length,
      alreadySetup: false,
    };
  },
});

// Check if user needs compliance setup
export const needsComplianceSetup = query({
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    
    // Check if user has any compliance websites
    const websites = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite);
    
    // Also check if there are compliance rules available
    const totalRules = await ctx.db.query("complianceRules").collect();
    
    return {
      needsSetup: complianceWebsites.length === 0 && totalRules.length > 0,
      complianceWebsiteCount: complianceWebsites.length,
      totalRulesAvailable: totalRules.length,
      hasAnyWebsites: websites.length > 0,
    };
  },
});
