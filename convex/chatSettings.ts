import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, getCurrentUser } from "./helpers";

// Update chat settings
export const updateChatSettings = mutation({
  args: {
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
    enableComplianceContext: v.optional(v.boolean()),
    maxContextReports: v.optional(v.number()),
    enableSemanticSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Get existing settings
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

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
        userId: user._id,
        defaultWebhookUrl: undefined,
        emailNotificationsEnabled: true,
        emailTemplate: undefined,
        aiAnalysisEnabled: false,
        aiModel: undefined,
        aiBaseUrl: undefined,
        aiSystemPrompt: undefined,
        aiMeaningfulChangeThreshold: 70,
        aiApiKey: undefined,
        emailOnlyIfMeaningful: false,
        webhookOnlyIfMeaningful: false,
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

// Get chat settings
export const getChatSettings = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        chatSystemPrompt: "You are a professional compliance assistant specializing in US employment law.",
        chatModel: "gemini-2.0-flash-exp",
        enableComplianceContext: true,
        maxContextReports: 5,
        enableSemanticSearch: true,
      };
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!settings) {
      return {
        chatSystemPrompt: "You are a professional compliance assistant specializing in US employment law.",
        chatModel: "gemini-2.0-flash-exp",
        enableComplianceContext: true,
        maxContextReports: 5,
        enableSemanticSearch: true,
      };
    }

    return {
      chatSystemPrompt: settings.chatSystemPrompt || "You are a professional compliance assistant specializing in US employment law.",
      chatModel: settings.chatModel || "gemini-2.0-flash-exp",
      enableComplianceContext: settings.enableComplianceContext ?? true,
      maxContextReports: settings.maxContextReports || 5,
      enableSemanticSearch: settings.enableSemanticSearch ?? true,
    };
  },
});
