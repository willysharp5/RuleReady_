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

// Delete all saved research records to start fresh
export const deleteAllSavedResearch = mutation({
  handler: async (ctx) => {
    console.log("🔄 Deleting all saved research records...");
    
    const allResearch = await ctx.db.query("savedResearch").collect();
    console.log(`Found ${allResearch.length} saved research records`);
    
    for (const research of allResearch) {
      await ctx.db.delete(research._id);
    }
    
    console.log(`✅ Deleted ${allResearch.length} saved research records`);
    
    return {
      success: true,
      deleted: allResearch.length,
    };
  },
});

