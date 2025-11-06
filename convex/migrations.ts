import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Restore Tab 2's original settings
export const restoreTab2Settings = mutation({
  args: { conversationId: v.id("chatConversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return { success: false, message: "Conversation not found" };
    
    await ctx.db.patch(args.conversationId, {
      settingsSnapshot: {
        ...conv.settingsSnapshot,
        jurisdiction: 'California',
        topic: 'Harassment Training',
        selectedResearchIds: ["pn731rccz9vhs1aetwnngeckzs7tt86c" as any],
      }
    });
    
    return { success: true };
  },
});

// Clear all research conversation settings to start fresh
export const clearAllResearchSettings = mutation({
  handler: async (ctx) => {
    const conversations = await ctx.db.query("researchConversations").collect();
    
    for (const conv of conversations) {
      await ctx.db.patch(conv._id, {
        settingsSnapshot: {
          systemPrompt: conv.settingsSnapshot.systemPrompt,
          firecrawlConfig: conv.settingsSnapshot.firecrawlConfig,
          model: conv.settingsSnapshot.model,
          jurisdiction: '',
          topic: '',
          selectedTemplate: '',
          urls: [''],
          additionalContext: '',
          lastPromptSent: ''
        }
      });
    }
    
    return { 
      success: true, 
      message: `Cleared settings for ${conversations.length} research conversations`,
      count: conversations.length
    };
  },
});

