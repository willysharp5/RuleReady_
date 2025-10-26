import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user settings (single-user mode)
export const getUserSettings = query({
  handler: async (ctx) => {
    // Single-user mode: get the first (and only) settings record
    const settings = await ctx.db.query("userSettings").first();

    if (!settings) {
      // Return default settings if none exist
      return {
        emailNotificationsEnabled: true,
        chatSystemPrompt: undefined,
        enableComplianceContext: true,
        maxContextReports: 5,
        enableSemanticSearch: true,
      };
    }

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
    aiSystemPrompt: v.optional(v.string()), // For change analysis
  },
  handler: async (ctx, args) => {
    // Single-user mode: update or create the single settings record
    const existingSettings = await ctx.db.query("userSettings").first();
    
    const updateData = {
      chatSystemPrompt: args.chatSystemPrompt,
      enableComplianceContext: args.enableComplianceContext,
      maxContextReports: args.maxContextReports,
      enableSemanticSearch: args.enableSemanticSearch,
      aiSystemPrompt: args.aiSystemPrompt,
      updatedAt: Date.now(),
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, updateData);
    } else {
      await ctx.db.insert("userSettings", {
        emailNotificationsEnabled: true,
        ...updateData,
        createdAt: Date.now(),
      });
    }
  },
});

// Update email notification settings (single-user mode)
export const updateEmailSettings = mutation({
  args: {
    emailNotificationsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Single-user mode: update or create the single settings record
    const existingSettings = await ctx.db.query("userSettings").first();
    
    const updateData = {
      emailNotificationsEnabled: args.emailNotificationsEnabled,
      updatedAt: Date.now(),
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, updateData);
    } else {
      await ctx.db.insert("userSettings", {
        chatSystemPrompt: undefined,
        enableComplianceContext: true,
        maxContextReports: 5,
        enableSemanticSearch: true,
        ...updateData,
        createdAt: Date.now(),
      });
    }
  },
});