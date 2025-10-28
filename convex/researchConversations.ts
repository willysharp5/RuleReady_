import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Save or update a research conversation
export const saveConversation = mutation({
  args: {
    conversationId: v.optional(v.id("researchConversations")),
    title: v.optional(v.string()),
    messages: v.array(v.object({
      id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      scrapedUrlSources: v.optional(v.array(v.any())),
      internalSources: v.optional(v.array(v.any())),
      webSources: v.optional(v.array(v.any())),
      newsResults: v.optional(v.array(v.any())),
    })),
    filters: v.object({
      jurisdiction: v.optional(v.string()),
      topic: v.optional(v.string()),
      templateUsed: v.optional(v.string()),
    }),
    settingsSnapshot: v.object({
      systemPrompt: v.optional(v.string()),
      firecrawlConfig: v.optional(v.string()),
      additionalContext: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Auto-generate title from first user message if not provided
    const title = args.title || (() => {
      const firstUserMsg = args.messages.find(m => m.role === 'user');
      const preview = firstUserMsg?.content.substring(0, 50) || 'Research Session';
      const jurisdictionPrefix = args.filters.jurisdiction ? `${args.filters.jurisdiction} - ` : '';
      return `${jurisdictionPrefix}${preview}${preview.length >= 50 ? '...' : ''}`;
    })();
    
    // Update existing conversation or create new one
    if (args.conversationId) {
      // Update existing
      await ctx.db.patch(args.conversationId, {
        messages: args.messages,
        filters: args.filters,
        settingsSnapshot: args.settingsSnapshot,
        messageCount: args.messages.length,
        updatedAt: now,
      });
      
      return { 
        success: true, 
        conversationId: args.conversationId,
        title,
        isUpdate: true
      };
    } else {
      // Create new
      const conversationId = await ctx.db.insert("researchConversations", {
        title,
        messages: args.messages,
        filters: args.filters,
        settingsSnapshot: args.settingsSnapshot,
        messageCount: args.messages.length,
        savedAt: now,
        updatedAt: now,
      });
      
      return { 
        success: true, 
        conversationId,
        title,
        isUpdate: false
      };
    }
  },
});

// Get all saved conversations
export const getAllConversations = query({
  handler: async (ctx) => {
    const conversations = await ctx.db
      .query("researchConversations")
      .order("desc")
      .collect();
    
    return conversations.map(c => ({
      _id: c._id,
      title: c.title,
      messageCount: c.messageCount,
      jurisdiction: c.filters.jurisdiction,
      topic: c.filters.topic,
      savedAt: c.savedAt,
      firstMessage: c.messages[0]?.content.substring(0, 100) || '',
    }));
  },
});

// Get a specific conversation by ID
export const getConversation = query({
  args: { conversationId: v.id("researchConversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

// Update conversation title
export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("researchConversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Delete a conversation
export const deleteConversation = mutation({
  args: { conversationId: v.id("researchConversations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.conversationId);
    return { success: true };
  },
});

