import { mutation } from "./_generated/server";
import { v } from "convex/values";

// One-time cleanup to remove old fields from appSettings
export const cleanupOldFields = mutation({
  handler: async (ctx) => {
    const settings = await ctx.db.query("appSettings").first();
    
    if (!settings) {
      return { message: "No settings found" };
    }
    
    // Delete the old record
    await ctx.db.delete(settings._id);
    
    // Create new clean record with only the fields we need
    const cleanSettings = {
      // Only include fields from our cleaned schema
      chatSystemPrompt: settings.chatSystemPrompt,
      chatModel: settings.chatModel,
      enableComplianceContext: settings.enableComplianceContext,
      maxContextReports: settings.maxContextReports,
      enableSemanticSearch: settings.enableSemanticSearch,
      researchSystemPrompt: settings.researchSystemPrompt,
      researchModel: settings.researchModel,
      researchFirecrawlConfig: settings.researchFirecrawlConfig,
      createdAt: settings.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    
    await ctx.db.insert("appSettings", cleanSettings);
    
    return { 
      message: "Cleaned up appSettings - removed old fields",
      fieldsKept: Object.keys(cleanSettings)
    };
  },
});

// Remove deprecated fields from all jurisdictions and topics
export const removeDeprecatedFields = mutation({
  handler: async (ctx) => {
    console.log("🔄 Starting migration to remove deprecated fields...");
    
    // Update all jurisdictions
    const jurisdictions = await ctx.db.query("jurisdictions").collect();
    console.log(`Found ${jurisdictions.length} jurisdictions`);
    
    for (const jurisdiction of jurisdictions) {
      const { crawlSettings, ruleCount, ...cleanData } = jurisdiction as any;
      await ctx.db.replace(jurisdiction._id, cleanData);
    }
    console.log(`✅ Updated ${jurisdictions.length} jurisdictions`);
    
    // Update all topics
    const topics = await ctx.db.query("complianceTopics").collect();
    console.log(`Found ${topics.length} topics`);
    
    for (const topic of topics) {
      const { changeFrequency, priority, ruleCount, ...cleanData } = topic as any;
      await ctx.db.replace(topic._id, cleanData);
    }
    console.log(`✅ Updated ${topics.length} topics`);
    
    return {
      success: true,
      jurisdictionsUpdated: jurisdictions.length,
      topicsUpdated: topics.length,
    };
  },
});

