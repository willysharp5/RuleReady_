import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get app settings (single-user mode)
export const getUserSettings = query({
  handler: async (ctx) => {
    // Single-user mode: get the first (and only) settings record
    const settings = await ctx.db.query("appSettings").first();

    if (!settings) {
      // Return default settings if none exist
      return {
        chatSystemPrompt: undefined,
        enableComplianceContext: true,
        maxContextReports: 5,
        enableSemanticSearch: true,
      };
    }

    return settings;
  },
});

// Get app settings (alias for compatibility)
export const getAppSettings = query({
  handler: async (ctx) => {
    const settings = await ctx.db.query("appSettings").first();
    return settings;
  },
});

// Update chat settings (single-user mode)
export const updateChatSettings = mutation({
  args: {
    chatSystemPrompt: v.optional(v.string()),
    enableComplianceContext: v.optional(v.boolean()),
    maxContextReports: v.optional(v.number()),
    enableSemanticSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: update or create the single settings record
    const existingSettings = await ctx.db.query("appSettings").first();
    
    const updateData = {
      chatSystemPrompt: args.chatSystemPrompt,
      enableComplianceContext: args.enableComplianceContext,
      maxContextReports: args.maxContextReports,
      enableSemanticSearch: args.enableSemanticSearch,
      updatedAt: Date.now(),
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, updateData);
    } else {
      await ctx.db.insert("appSettings", {
        ...updateData,
        createdAt: Date.now(),
      });
    }
  },
});

// One-time cleanup to remove old fields from appSettings
export const cleanupOldFieldsNow = mutation({
  handler: async (ctx) => {
    const settings = await ctx.db.query("appSettings").first();
    
    if (!settings) {
      return { success: false, message: "No settings to clean" };
    }
    
    // Replace the entire document with only clean fields
    await ctx.db.replace(settings._id, {
      chatSystemPrompt: settings.chatSystemPrompt,
      chatModel: settings.chatModel,
      researchSystemPrompt: settings.researchSystemPrompt,
      researchModel: settings.researchModel,
      researchFirecrawlConfig: settings.researchFirecrawlConfig,
      createdAt: settings.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    
    return { success: true, message: "Cleaned up old fields from appSettings" };
  },
});
