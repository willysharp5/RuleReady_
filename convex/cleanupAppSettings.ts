import { mutation } from "./_generated/server";

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

