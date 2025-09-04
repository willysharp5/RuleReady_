import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./helpers";

// Convert all compliance rules to monitored websites
export const convertComplianceRulesToWebsites = internalAction({
  args: {
    userId: v.optional(v.id("users")), // Optional user ID for system-level import
  },
  handler: async (ctx, args): Promise<any> => {
    // For system-level import, create a default user ID or use provided one
    // This is a one-time setup operation
    const userId = args.userId || "system_user" as any; // Placeholder for system import
    
    console.log("🔄 Converting compliance rules to monitored websites...");
    
    // Get all compliance rules
    const rules: any = await ctx.runQuery(internal.csvImport.getAllRules);
    console.log(`📊 Found ${rules.length} compliance rules to convert`);
    
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process each rule
    for (const rule of rules) {
      try {
        // Create website name from rule
        const websiteName = `${rule.jurisdiction} - ${rule.topicLabel}`;
        
        // Determine monitoring settings based on priority
        const monitoringSettings = getMonitoringSettings(rule.priority, rule.topicKey);
        
        // Create or update website entry
        const result = await ctx.runMutation(internal.complianceWebsiteIntegration.createComplianceWebsite, {
          userId,
          url: rule.sourceUrl,
          name: websiteName,
          checkInterval: monitoringSettings.checkInterval,
          notificationPreference: monitoringSettings.notificationPreference,
          monitorType: "single_page", // Compliance rules are single pages
          priority: rule.priority,
          ruleId: rule.ruleId,
          jurisdiction: rule.jurisdiction,
          topicKey: rule.topicKey,
        });
        
        if (result.created) {
          created++;
        } else {
          updated++;
        }
        
        if ((created + updated) % 100 === 0) {
          console.log(`✅ Processed ${created + updated} compliance websites...`);
        }
        
      } catch (error) {
        console.error(`Failed to create website for rule ${rule.ruleId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${rule.ruleId}: ${errorMessage}`);
        failed++;
      }
    }
    
    console.log(`🎉 Conversion completed: ${created} created, ${updated} updated, ${failed} failed`);
    
    return {
      success: true,
      created,
      updated,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors
      total: rules.length,
    };
  },
});

// Create a website entry for a compliance rule
export const createComplianceWebsite = internalMutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
    name: v.string(),
    checkInterval: v.number(),
    notificationPreference: v.union(
      v.literal("none"),
      v.literal("email"),
      v.literal("webhook"),
      v.literal("both")
    ),
    monitorType: v.union(v.literal("single_page"), v.literal("full_site")),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    ruleId: v.string(),
    jurisdiction: v.string(),
    topicKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if website already exists for this rule
    const existingWebsite = await ctx.db
      .query("websites")
      .filter((q) => q.eq(q.field("url"), args.url))
      .first();
    
    if (existingWebsite) {
      // Update existing website with compliance metadata
      await ctx.db.patch(existingWebsite._id, {
        name: args.name,
        checkInterval: args.checkInterval,
        notificationPreference: args.notificationPreference,
        monitorType: args.monitorType,
        updatedAt: Date.now(),
      });
      
      return { created: false, websiteId: existingWebsite._id };
    } else {
      // Create new website entry with compliance metadata
      const websiteId = await ctx.db.insert("websites", {
        url: args.url,
        name: args.name,
        userId: args.userId,
        isActive: true,
        isPaused: false,
        checkInterval: args.checkInterval,
        notificationPreference: args.notificationPreference,
        monitorType: args.monitorType,
        crawlLimit: undefined,
        crawlDepth: undefined,
        lastCrawlAt: undefined,
        totalPages: undefined,
        complianceMetadata: {
          ruleId: args.ruleId,
          jurisdiction: args.jurisdiction,
          topicKey: args.topicKey,
          priority: args.priority,
          isComplianceWebsite: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      return { created: true, websiteId };
    }
  },
});

// Get monitoring settings based on compliance rule priority
function getMonitoringSettings(priority: string, topicKey: string) {
  switch (priority) {
    case "critical":
      return {
        checkInterval: 1440, // Daily (24 hours)
        notificationPreference: "both" as const, // Email and webhook
      };
    case "high":
      return {
        checkInterval: 2880, // Every 2 days (48 hours)
        notificationPreference: "email" as const,
      };
    case "medium":
      return {
        checkInterval: 10080, // Weekly (7 days)
        notificationPreference: "email" as const,
      };
    case "low":
    default:
      return {
        checkInterval: 43200, // Monthly (30 days)
        notificationPreference: "none" as const,
      };
  }
}

// Get compliance website statistics
export const getComplianceWebsiteStats = action({
  handler: async (ctx): Promise<any> => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }
    
    const userId = typeof user === 'object' ? user._id : user;
    
    // Get all websites for this user
    const websites: any = await ctx.runQuery(internal.websites.getUserWebsites);
    
    // Filter compliance websites (those with compliance-like names)
    const complianceWebsites = websites.filter((site: any) => 
      site.name.includes(' - ') && // Compliance sites have "Jurisdiction - Topic" format
      (site.name.includes('Federal') || site.name.includes('Alabama') || site.name.includes('California')) // Common jurisdictions
    );
    
    // Group by jurisdiction
    const byJurisdiction = complianceWebsites.reduce((acc: any, site: any) => {
      const jurisdiction = site.name.split(' - ')[0];
      if (!acc[jurisdiction]) acc[jurisdiction] = 0;
      acc[jurisdiction]++;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalWebsites: websites.length,
      complianceWebsites: complianceWebsites.length,
      regularWebsites: websites.length - complianceWebsites.length,
      byJurisdiction,
      sampleComplianceWebsites: complianceWebsites.slice(0, 10),
    };
  },
});

// Batch update compliance websites with better names and categories
export const updateComplianceWebsiteMetadata = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;
    
    console.log("🔄 Updating compliance website metadata...");
    
    // Get all websites that look like compliance websites
    const allWebsites = await ctx.runQuery(internal.websites.getAllWebsites);
    const complianceWebsites = allWebsites.filter((site: any) => 
      site.name.includes(' - ') && 
      site.url.includes('.gov')
    );
    
    console.log(`📊 Found ${complianceWebsites.length} compliance websites to update`);
    
    let updated = 0;
    
    // Process in batches
    for (let i = 0; i < complianceWebsites.length; i += batchSize) {
      const batch = complianceWebsites.slice(i, i + batchSize);
      
      for (const website of batch) {
        try {
          // Extract jurisdiction and topic from name
          const [jurisdiction, topic] = website.name.split(' - ');
          
          // Create enhanced name with priority indicator
          const rules = await ctx.runQuery(internal.csvImport.getAllRules);
          const rule = rules.find((r: any) => r.sourceUrl === website.url);
          
          if (rule) {
            const priorityIcon = {
              critical: "🔴",
              high: "🟠", 
              medium: "🟡",
              low: "🟢"
            }[rule.priority as keyof typeof priorityIcon];
            
            const enhancedName = `${priorityIcon} ${jurisdiction} - ${topic}`;
            
            await ctx.runMutation(internal.websites.updateWebsite, {
              websiteId: website._id,
              updates: {
                name: enhancedName,
                updatedAt: Date.now(),
              }
            });
            
            updated++;
          }
          
        } catch (error) {
          console.error(`Failed to update website ${website._id}:`, error);
        }
      }
      
      console.log(`✅ Updated ${updated} compliance websites...`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Metadata update completed: ${updated} websites updated`);
    
    return { updated, total: complianceWebsites.length };
  },
});
