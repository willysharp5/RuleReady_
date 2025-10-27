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
    const existingSettings = await ctx.db.query("appSettings").first();

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
      await ctx.db.insert("appSettings", {
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
    const settings = await ctx.db.query("appSettings").first();

    if (!settings) {
      // Return sensible defaults if no settings exist (e.g., after database cleanup)
      return {
        chatSystemPrompt: "You are RuleReady AI, an expert assistant for US employment law compliance. Help users understand employment law requirements across different jurisdictions.",
        chatModel: "gemini-1.5-flash",
        enableComplianceContext: true,
        maxContextReports: 5,
        enableSemanticSearch: true,
      };
    }

    // Return database values with defaults for any missing fields
    return {
      chatSystemPrompt: settings.chatSystemPrompt ?? "You are RuleReady AI, an expert assistant for US employment law compliance.",
      chatModel: settings.chatModel ?? "gemini-1.5-flash",
      enableComplianceContext: settings.enableComplianceContext ?? true,
      maxContextReports: settings.maxContextReports ?? 5,
      enableSemanticSearch: settings.enableSemanticSearch ?? true,
    };
  },
});