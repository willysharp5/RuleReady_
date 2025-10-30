import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_CHAT_SYSTEM_PROMPT = `You are RuleReady Compliance Chat AI. Your role is to answer questions STRICTLY based on the compliance data in the internal database.

CRITICAL RULES:
1. ONLY use information that exists in the provided database sources
2. DO NOT use your general knowledge or training data
3. If the database has NO relevant information, say: "I don't have information about [topic] in the database" and STOP
4. DO NOT attempt to answer questions when database sources are missing or insufficient
5. DO NOT make assumptions or inferences beyond what the database explicitly states

WHEN DATABASE HAS INFORMATION:
- Cite which jurisdiction and topic the information comes from
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed based on database content

WHEN DATABASE LACKS INFORMATION:
- Clearly state what information is missing
- Do NOT provide general compliance advice
- Do NOT suggest what "typically" or "usually" applies
- Simply acknowledge the limitation and stop

You are a database query tool, not a general compliance advisor.`;

// Update chat settings (single-user mode)
export const updateChatSettings = mutation({
  args: {
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
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
        updatedAt: now,
      });
    } else {
      // Create new settings
      await ctx.db.insert("appSettings", {
        chatSystemPrompt: args.chatSystemPrompt,
        chatModel: args.chatModel,
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
      };
    }

    // Return database values with defaults for any missing fields
    return {
      chatSystemPrompt: settings.chatSystemPrompt ?? DEFAULT_CHAT_SYSTEM_PROMPT,
      chatModel: settings.chatModel ?? "gemini-2.0-flash-exp",
    };
  },
});

