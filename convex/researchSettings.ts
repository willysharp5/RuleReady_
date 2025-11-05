import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_RESEARCH_SYSTEM_PROMPT = `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Your role is to provide accurate, authoritative information about employment law based on the sources provided.

- Cite sources using inline [1], [2], [3] format
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed in your responses

If the user's question is extremely vague (like just "hello" or single word with no context), politely ask which jurisdiction and topic they're interested in. Otherwise, do your best to answer based on the sources and context available.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`;

const DEFAULT_FIRECRAWL_CONFIG = JSON.stringify({
  sources: ['web', 'news'],
  limit: 8,
  scrapeOptions: {
    formats: ['markdown'],
    onlyMainContent: true,
    maxAge: 86400000,
    removeBase64Images: true,
    timeout: 60000
  }
}, null, 2);

// Update research settings (single-user mode)
export const updateResearchSettings = mutation({
  args: {
    researchSystemPrompt: v.optional(v.string()),
    researchModel: v.optional(v.string()),
    researchTemperature: v.optional(v.number()),
    researchMaxTokens: v.optional(v.number()),
    researchFirecrawlConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: get the first (and only) settings record
    const existingSettings = await ctx.db.query("appSettings").first();

    const now = Date.now();

    if (existingSettings) {
      // Only update fields that are provided (not undefined)
      const updates: any = { updatedAt: now };
      if (args.researchSystemPrompt !== undefined) updates.researchSystemPrompt = args.researchSystemPrompt;
      if (args.researchModel !== undefined) updates.researchModel = args.researchModel;
      if (args.researchTemperature !== undefined) updates.researchTemperature = args.researchTemperature;
      if (args.researchMaxTokens !== undefined) updates.researchMaxTokens = args.researchMaxTokens;
      if (args.researchFirecrawlConfig !== undefined) updates.researchFirecrawlConfig = args.researchFirecrawlConfig;
      
      await ctx.db.patch(existingSettings._id, updates);
    } else {
      // Create new settings
      await ctx.db.insert("appSettings", {
        researchSystemPrompt: args.researchSystemPrompt,
        researchModel: args.researchModel,
        researchTemperature: args.researchTemperature,
        researchMaxTokens: args.researchMaxTokens,
        researchFirecrawlConfig: args.researchFirecrawlConfig,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get research settings (single-user mode)
export const getResearchSettings = query({
  handler: async (ctx) => {
    // Single-user mode: get the first settings record
    const settings = await ctx.db.query("appSettings").first();

    if (!settings) {
      // Return sensible defaults if no settings exist
      return {
        researchSystemPrompt: DEFAULT_RESEARCH_SYSTEM_PROMPT,
        researchModel: "gemini-2.5-flash-lite",
        researchTemperature: 0.5,
        researchMaxTokens: 1048576,
        researchFirecrawlConfig: DEFAULT_FIRECRAWL_CONFIG,
      };
    }

    // Return database values with defaults for any missing fields
    return {
      researchSystemPrompt: settings.researchSystemPrompt ?? DEFAULT_RESEARCH_SYSTEM_PROMPT,
      researchModel: settings.researchModel ?? "gemini-1.5-flash-latest",
      researchTemperature: settings.researchTemperature ?? 0.5,
      researchMaxTokens: settings.researchMaxTokens ?? 1048576,
      researchFirecrawlConfig: settings.researchFirecrawlConfig ?? DEFAULT_FIRECRAWL_CONFIG,
    };
  },
});

