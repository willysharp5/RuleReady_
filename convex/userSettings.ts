import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, getCurrentUser } from "./helpers";

// Get user settings
export const getUserSettings = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!settings) {
      // Return default settings if none exist
      return {
        defaultWebhookUrl: null,
        emailNotificationsEnabled: true,
      };
    }

    return settings;
  },
});

// Update default webhook URL
export const updateDefaultWebhook = mutation({
  args: {
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Validate webhook URL if provided
    if (args.webhookUrl) {
      try {
        new URL(args.webhookUrl);
      } catch {
        throw new Error("Invalid webhook URL");
      }
    }

    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        defaultWebhookUrl: args.webhookUrl || undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        defaultWebhookUrl: args.webhookUrl || undefined,
        emailNotificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Toggle email notifications
export const toggleEmailNotifications = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        emailNotificationsEnabled: args.enabled,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        emailNotificationsEnabled: args.enabled,
        defaultWebhookUrl: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});