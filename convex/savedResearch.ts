import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Save a research result
export const saveResearch = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    jurisdiction: v.optional(v.string()),
    topic: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    // Accept old format for backwards compatibility
    internalSources: v.optional(v.array(v.any())),
    webSources: v.optional(v.array(v.any())),
    newsResults: v.optional(v.array(v.any())),
    // New combined format
    sources: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Combine all sources into a single array
    const allSources = [];
    if (args.sources) {
      allSources.push(...args.sources);
    }
    if (args.internalSources) {
      allSources.push(...args.internalSources);
    }
    if (args.webSources) {
      allSources.push(...args.webSources);
    }
    if (args.newsResults) {
      allSources.push(...args.newsResults);
    }
    
    const savedId = await ctx.db.insert("savedResearch", {
      title: args.title,
      content: args.content,
      jurisdiction: args.jurisdiction,
      topic: args.topic,
      templateUsed: args.templateUsed,
      sources: allSources.length > 0 ? allSources : undefined,
      savedAt: now,
      updatedAt: now,
    });
    
    return savedId;
  },
});

// Update saved research
export const updateSavedResearch = mutation({
  args: {
    id: v.id("savedResearch"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };
    
    if (args.title) updates.title = args.title;
    if (args.content) updates.content = args.content;
    
    await ctx.db.patch(args.id, updates);
    
    return { success: true };
  },
});

// Get all saved research
export const getAllSavedResearch = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("savedResearch")
      .withIndex("by_saved_at")
      .order("desc")
      .collect();
  },
});

// Delete saved research
export const deleteSavedResearch = mutation({
  args: {
    id: v.id("savedResearch"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

