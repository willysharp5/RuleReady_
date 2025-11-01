import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update editor settings (single-user mode)
export const updateEditorSettings = mutation({
  args: {
    editorModel: v.optional(v.string()),
    editorTemperature: v.optional(v.number()),
    editorMaxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: get the first (and only) settings record
    const existingSettings = await ctx.db.query("appSettings").first();

    const now = Date.now();

    if (existingSettings) {
      // Only update fields that are provided (not undefined)
      const updates: any = { updatedAt: now };
      if (args.editorModel !== undefined) updates.editorModel = args.editorModel;
      if (args.editorTemperature !== undefined) updates.editorTemperature = args.editorTemperature;
      if (args.editorMaxTokens !== undefined) updates.editorMaxTokens = args.editorMaxTokens;
      
      await ctx.db.patch(existingSettings._id, updates);
    } else {
      // Create new settings
      await ctx.db.insert("appSettings", {
        editorModel: args.editorModel,
        editorTemperature: args.editorTemperature,
        editorMaxTokens: args.editorMaxTokens,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get editor settings (single-user mode)
export const getEditorSettings = query({
  handler: async (ctx) => {
    // Single-user mode: get the first settings record
    const settings = await ctx.db.query("appSettings").first();

    if (!settings) {
      // Return sensible defaults if no settings exist
      return {
        editorModel: "gemini-2.0-flash-exp",
        editorTemperature: 0.3,
        editorMaxTokens: 2048,
      };
    }

    // Return database values with defaults for any missing fields
    return {
      editorModel: settings.editorModel ?? "gemini-2.0-flash-exp",
      editorTemperature: settings.editorTemperature ?? 0.3,
      editorMaxTokens: settings.editorMaxTokens ?? 2048,
    };
  },
});

