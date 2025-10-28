import { mutation } from "./_generated/server";

// One-time cleanup mutation to remove old fields from appSettings
// Use patch with 'replace' to remove old fields
export const cleanupOldFields = mutation({
  handler: async (ctx) => {
    const settings = await ctx.db.query("appSettings").first();
    
    if (!settings) {
      return { success: false, message: "No settings found to clean up" };
    }
    
    // Use replace to completely overwrite with only the fields we want
    await ctx.db.replace(settings._id, {
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
    });
    
    return { 
      success: true,
      message: "Successfully cleaned up appSettings - old fields removed",
      recordId: settings._id
    };
  },
});

