import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update chat settings (single-user mode)
export const updateChatSettings = mutation({
  args: {
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
    enableComplianceContext: v.optional(v.boolean()),
    maxContextReports: v.optional(v.number()),
    enableSemanticSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: get the first (and only) settings record
    const existingSettings = await ctx.db.query("userSettings").first();

    const now = Date.now();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        chatSystemPrompt: args.chatSystemPrompt,
        chatModel: args.chatModel,
        enableComplianceContext: args.enableComplianceContext,
        maxContextReports: args.maxContextReports,
        enableSemanticSearch: args.enableSemanticSearch,
        updatedAt: now,
      });
    } else {
      // Create new settings
      await ctx.db.insert("userSettings", {
        emailNotificationsEnabled: true,
        chatSystemPrompt: args.chatSystemPrompt,
        chatModel: args.chatModel,
        enableComplianceContext: args.enableComplianceContext,
        maxContextReports: args.maxContextReports,
        enableSemanticSearch: args.enableSemanticSearch,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get chat settings (single-user mode)
export const getChatSettings = query({
  handler: async (ctx) => {
    // Single-user mode: get the first settings record
    const settings = await ctx.db.query("userSettings").first();

    if (!settings) {
      throw new Error("Chat settings not initialized. Please configure in Settings page.");
    }

    // Return database values ONLY - no fallback defaults
    return {
      chatSystemPrompt: settings.chatSystemPrompt,
      chatModel: settings.chatModel,
      enableComplianceContext: settings.enableComplianceContext,
      maxContextReports: settings.maxContextReports,
      enableSemanticSearch: settings.enableSemanticSearch,
    };
  },
});