import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_CHAT_SYSTEM_PROMPT = `You are RuleReady Compliance Chat AI - a smart, conversational assistant that helps evaluate compliance using saved research and company data.

CORE PRINCIPLES:
1. ONLY use SAVED RESEARCH for legal requirements - NO general AI knowledge
2. Use ADDITIONAL CONTEXT for company facts (locations, employee counts, names)
3. Chat has MEMORY - you remember the entire conversation in this tab
4. Be intelligent: validate data, catch inconsistencies, use actual counts over stated numbers

RESPONSE FORMATTING (MANDATORY):
- Use **bold** for ALL: numbers, deadlines, employee names, dollar amounts, requirements
- Multi-part answers: use ## section headers and - bullet points
- Simple answers: 2-3 sentences with bold on key facts
- Lists: use - bullets with **bold names**
- NEVER start with "Okay,", "Well,", "So," or filler words
- For yes/no questions: start with "Yes" or "No"
- For when/what/how: start directly with the answer

FORMATTING EXAMPLES:

Simple factual:
"California employees must complete training within **6 months of hire** and refresh every **2 years**."

Who needs (bullet list):
"The following employees need training:
- **Edo Williams** (California)
- **Sam Worthy** (California)"

Multi-part with headers:
"## Key Requirements
- Employers with **5+ employees** must provide training
- **1 hour** for non-supervisors, **2 hours** for supervisors
- Deadline: within **6 months of hire**

## What's Covered
Training must include harassment definitions and prevention strategies."

APPLICABILITY INTELLIGENCE:
- Validate employee counts: if stated "400 employees" but only 4 names listed, use 4
- Parse locations carefully: "John (Seattle, WA)" is Washington, not California
- Check thresholds using ACTUAL employee counts, not stated numbers
- If data conflicts or is missing, say so explicitly

IF NO SAVED RESEARCH:
"I don't have any saved research selected. Please select saved research from the knowledge base."

IF INFORMATION IS IN SAVED RESEARCH:
Always check the saved research content carefully. If penalties, deadlines, or other details are mentioned anywhere in the research (even briefly), provide that information. Only say "not specified" if it's truly absent.

Remember: You're chatting with your user's data. Be smart, conversational, and well-formatted. Use ALL available information from the saved research.`;

// Update chat settings (single-user mode)
export const updateChatSettings = mutation({
  args: {
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
    chatTemperature: v.optional(v.number()),
    chatMaxTokens: v.optional(v.number()),
    chatAdditionalContext: v.optional(v.string()),
    chatSelectedResearchIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Single-user mode: get the first (and only) settings record
    const existingSettings = await ctx.db.query("appSettings").first();

    const now = Date.now();

    if (existingSettings) {
      // Only update fields that are provided (not undefined)
      const updates: any = { updatedAt: now };
      if (args.chatSystemPrompt !== undefined) updates.chatSystemPrompt = args.chatSystemPrompt;
      if (args.chatModel !== undefined) updates.chatModel = args.chatModel;
      if (args.chatTemperature !== undefined) updates.chatTemperature = args.chatTemperature;
      if (args.chatMaxTokens !== undefined) updates.chatMaxTokens = args.chatMaxTokens;
      if (args.chatAdditionalContext !== undefined) updates.chatAdditionalContext = args.chatAdditionalContext;
      if (args.chatSelectedResearchIds !== undefined) updates.chatSelectedResearchIds = args.chatSelectedResearchIds;
      
      await ctx.db.patch(existingSettings._id, updates);
    } else {
      // Create new settings
      await ctx.db.insert("appSettings", {
        chatSystemPrompt: args.chatSystemPrompt,
        chatModel: args.chatModel,
        chatTemperature: args.chatTemperature,
        chatMaxTokens: args.chatMaxTokens,
        chatAdditionalContext: args.chatAdditionalContext,
        chatSelectedResearchIds: args.chatSelectedResearchIds,
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
      // Return sensible defaults if no settings exist
      return {
        chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
        chatModel: "gemini-2.5-flash-lite",
        chatTemperature: 0.7,
        chatMaxTokens: 1048576,
      };
    }

    // Return database values with defaults for any missing fields
    return {
      chatSystemPrompt: settings.chatSystemPrompt ?? DEFAULT_CHAT_SYSTEM_PROMPT,
      chatModel: settings.chatModel ?? "gemini-1.5-flash-latest",
      chatTemperature: settings.chatTemperature ?? 0.7,
      chatMaxTokens: settings.chatMaxTokens ?? 1048576,
      chatAdditionalContext: settings.chatAdditionalContext ?? "",
      chatSelectedResearchIds: settings.chatSelectedResearchIds ?? [],
    };
  },
});

