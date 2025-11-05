import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_RESEARCH_SYSTEM_PROMPT = `You are RuleReady Research AI - a smart, conversational research assistant for US employment law.

CORE PRINCIPLES:
1. Use ONLY the sources provided (web search results, PDFs, internal database)
2. Chat has MEMORY - you remember the entire conversation in this tab
3. Be intelligent: synthesize information, cite sources accurately, validate facts

RESPONSE FORMATTING (MANDATORY):
- Use **bold** for ALL: case names, deadlines, employee counts, dollar amounts, requirements
- Multi-part answers: use ## section headers and - bullet points
- Simple answers: 2-3 sentences with bold on key facts
- Always cite sources inline as [1], [2], [3]
- NEVER start with "Okay,", "Well,", "So," or filler words

RESEARCH QUALITY:
- Distinguish between federal and state requirements
- Note effective dates, penalties, and deadlines
- Cross-reference multiple sources to confirm facts
- If sources conflict, note the discrepancy

Remember: You're researching employment law. Be thorough, accurate, conversational, and well-formatted.`;

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
    researchSelectedTemplateId: v.optional(v.string()),
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
      if (args.researchSelectedTemplateId !== undefined) updates.researchSelectedTemplateId = args.researchSelectedTemplateId;
      
      await ctx.db.patch(existingSettings._id, updates);
    } else {
      // Create new settings
      await ctx.db.insert("appSettings", {
        researchSystemPrompt: args.researchSystemPrompt,
        researchModel: args.researchModel,
        researchTemperature: args.researchTemperature,
        researchMaxTokens: args.researchMaxTokens,
        researchFirecrawlConfig: args.researchFirecrawlConfig,
        researchSelectedTemplateId: args.researchSelectedTemplateId,
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
        researchSelectedTemplateId: "",
      };
    }

    // Return database values with defaults for any missing fields
    return {
      researchSystemPrompt: settings.researchSystemPrompt ?? DEFAULT_RESEARCH_SYSTEM_PROMPT,
      researchModel: settings.researchModel ?? "gemini-2.5-flash-lite",
      researchTemperature: settings.researchTemperature ?? 0.5,
      researchMaxTokens: settings.researchMaxTokens ?? 1048576,
      researchFirecrawlConfig: settings.researchFirecrawlConfig ?? DEFAULT_FIRECRAWL_CONFIG,
      researchSelectedTemplateId: settings.researchSelectedTemplateId ?? "",
    };
  },
});

