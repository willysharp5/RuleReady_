import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_CHAT_SYSTEM_PROMPT = `You are RuleReady Compliance Chat AI. Your role is to answer questions STRICTLY based on the saved research and additional context provided.

CRITICAL RULES:
1. ONLY use information from the saved research results and additional context provided
2. DO NOT use your general AI knowledge or training data
3. If no relevant saved research is found, say: "I don't have saved research about [topic] for [jurisdiction]" and STOP
4. DO NOT attempt to answer questions when saved research is missing or insufficient
5. DO NOT make assumptions or inferences beyond what the saved research explicitly states

WHEN SAVED RESEARCH IS AVAILABLE:
- Cite which saved research document the information comes from (use [1], [2], [3] format)
- Reference the jurisdiction and topic from the saved research
- Quote or paraphrase directly from the saved research content
- Mention dates, deadlines, and penalties found in the saved research
- Be specific and detailed based ONLY on what's in the saved research

WHEN NO SAVED RESEARCH IS FOUND:
- Clearly state what information is missing
- Do NOT provide general compliance advice
- Do NOT use your AI knowledge to answer
- Simply acknowledge the limitation and stop

ADDITIONAL CONTEXT:
- If additional context is provided by the user, you MAY use it in your answer
- Clearly indicate when you're using additional context vs saved research
- Cite the source (saved research vs additional context)

You are an evaluation tool to test if the saved research is comprehensive enough to answer customer questions.`;

// Update chat settings (single-user mode)
export const updateChatSettings = mutation({
  args: {
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
    chatTemperature: v.optional(v.number()),
    chatMaxTokens: v.optional(v.number()),
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
      
      await ctx.db.patch(existingSettings._id, updates);
    } else {
      // Create new settings
      await ctx.db.insert("appSettings", {
        chatSystemPrompt: args.chatSystemPrompt,
        chatModel: args.chatModel,
        chatTemperature: args.chatTemperature,
        chatMaxTokens: args.chatMaxTokens,
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
        chatModel: "gemini-2.0-flash-exp",
        chatTemperature: 0.7,
        chatMaxTokens: 8192,
      };
    }

    // Return database values with defaults for any missing fields
    return {
      chatSystemPrompt: settings.chatSystemPrompt ?? DEFAULT_CHAT_SYSTEM_PROMPT,
      chatModel: settings.chatModel ?? "gemini-2.0-flash-exp",
      chatTemperature: settings.chatTemperature ?? 0.7,
      chatMaxTokens: settings.chatMaxTokens ?? 8192,
    };
  },
});

