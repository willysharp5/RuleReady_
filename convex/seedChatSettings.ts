import { mutation } from "./_generated/server";

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

const DEFAULT_CHAT_MODEL = "gemini-2.0-flash-exp";

// Initialize chat settings in database with current UI defaults
export const seedChatSettings = mutation({
  handler: async (ctx) => {
    const existingSettings = await ctx.db.query("appSettings").first();
    const now = Date.now();

    if (existingSettings) {
      // Update existing settings with chat defaults
      await ctx.db.patch(existingSettings._id, {
        chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
        chatModel: DEFAULT_CHAT_MODEL,
        updatedAt: now,
      });
      
      return { 
        success: true, 
        message: "Updated existing appSettings with chat defaults",
        settingsId: existingSettings._id
      };
    } else {
      // Create new settings with chat defaults
      const settingsId = await ctx.db.insert("appSettings", {
        chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
        chatModel: DEFAULT_CHAT_MODEL,
        createdAt: now,
        updatedAt: now,
      });
      
      return { 
        success: true, 
        message: "Created new appSettings with chat defaults",
        settingsId
      };
    }
  },
});

