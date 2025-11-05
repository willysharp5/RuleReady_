import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Utility to estimate document size in bytes
function estimateDocumentSize(data: any): number {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

// Truncate source content to reduce document size
function truncateSources(messages: any[]) {
  return messages.map(msg => {
    if (msg.role !== 'assistant') return msg;
    
    return {
      ...msg,
      // Truncate source content fields to first 500 chars each
      scrapedUrlSources: msg.scrapedUrlSources?.map((s: any) => ({
        ...s,
        content: s.content ? s.content.substring(0, 500) + '...[truncated]' : s.content,
        markdown: s.markdown ? s.markdown.substring(0, 500) + '...[truncated]' : s.markdown,
      })),
      internalSources: msg.internalSources?.map((s: any) => ({
        ...s,
        content: s.content ? s.content.substring(0, 500) + '...[truncated]' : s.content,
      })),
      webSources: msg.webSources?.map((s: any) => ({
        ...s,
        content: s.content ? s.content.substring(0, 500) + '...[truncated]' : s.content,
        markdown: s.markdown ? s.markdown.substring(0, 500) + '...[truncated]' : s.markdown,
      })),
    };
  });
}

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
      model: v.optional(v.string()),
      jurisdiction: v.optional(v.string()),
      topic: v.optional(v.string()),
      selectedTemplate: v.optional(v.string()),
      urls: v.optional(v.array(v.string())),
      additionalContext: v.optional(v.string()),
    }),
    followUpQuestions: v.optional(v.array(v.string())),
    truncateSources: v.optional(v.boolean()), // Whether to truncate source content
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
    
    // Truncate sources if requested
    const messagesToSave = args.truncateSources ? truncateSources(args.messages) : args.messages;
    
    // Estimate document size
    const docData = {
      title,
      messages: messagesToSave,
      filters: args.filters,
      settingsSnapshot: args.settingsSnapshot,
      followUpQuestions: args.followUpQuestions,
      messageCount: messagesToSave.length,
      savedAt: now,
      updatedAt: now,
    };
    const estimatedSize = estimateDocumentSize(docData);
    const MAX_SIZE = 900000; // 900KB limit (Convex limit is 1MB, leave buffer)
    
    // If size exceeds limit, throw error
    if (estimatedSize > MAX_SIZE) {
      throw new Error(`Document too large (${Math.round(estimatedSize / 1024)}KB). Please truncate sources or clear some messages.`);
    }
    
    // Update existing conversation or create new one
    if (args.conversationId) {
      // Update existing
      await ctx.db.patch(args.conversationId, {
        messages: messagesToSave,
        filters: args.filters,
        settingsSnapshot: args.settingsSnapshot,
        followUpQuestions: args.followUpQuestions,
        messageCount: messagesToSave.length,
        updatedAt: now,
      });
      
      return { 
        success: true, 
        conversationId: args.conversationId,
        title,
        isUpdate: true,
        wasTruncated: args.truncateSources || false,
        sizeKB: Math.round(estimatedSize / 1024)
      };
    } else {
      // Create new
      const conversationId = await ctx.db.insert("researchConversations", {
        title,
        messages: messagesToSave,
        filters: args.filters,
        settingsSnapshot: args.settingsSnapshot,
        followUpQuestions: args.followUpQuestions,
        messageCount: messagesToSave.length,
        savedAt: now,
        updatedAt: now,
      });
      
      return { 
        success: true, 
        conversationId,
        title,
        isUpdate: false,
        wasTruncated: args.truncateSources || false,
        sizeKB: Math.round(estimatedSize / 1024)
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

// Check if document size would exceed limits (for warning dialog)
export const checkDocumentSize = query({
  args: {
    messages: v.array(v.object({
      id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      scrapedUrlSources: v.optional(v.array(v.any())),
      internalSources: v.optional(v.array(v.any())),
      webSources: v.optional(v.array(v.any())),
      newsResults: v.optional(v.array(v.any())),
    })),
  },
  handler: async (ctx, args) => {
    const docData = {
      messages: args.messages,
    };
    const estimatedSize = estimateDocumentSize(docData);
    const MAX_SIZE = 900000; // 900KB limit
    const WARNING_SIZE = 700000; // 700KB - show warning
    
    return {
      sizeKB: Math.round(estimatedSize / 1024),
      exceedsLimit: estimatedSize > MAX_SIZE,
      needsWarning: estimatedSize > WARNING_SIZE,
      percentUsed: Math.round((estimatedSize / MAX_SIZE) * 100),
    };
  },
});

