import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Get Firecrawl API key from environment (single-user mode)
export const getUserFirecrawlKey = query({
  handler: async () => {
    // Single-user mode: use environment variable
    const apiKey = process.env.FIRECRAWL_API_KEY;
    return apiKey ? { 
      encryptedKey: apiKey,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    } : null;
  },
});

// Set Firecrawl API key (single-user mode - stores in environment)
export const setFirecrawlKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; keyPreview: string }> => {
    // Proxy to Node runtime action to validate with Firecrawl SDK
    return await ctx.runAction((internal as any).firecrawlKeysActions.setFirecrawlKey, { apiKey: args.apiKey });
  },
});

// Delete Firecrawl API key (single-user mode)
export const deleteFirecrawlKey = action({
  handler: async (ctx): Promise<{ success: boolean; message: string }> => {
    return await ctx.runAction((internal as any).firecrawlKeysActions.deleteFirecrawlKey, {});
  },
});

// Get token usage (single-user mode)
export const getTokenUsage = action({
  handler: async (ctx): Promise<{ usage: { current: number; limit: number; resetDate: string } }> => {
    return await ctx.runAction((internal as any).firecrawlKeysActions.getTokenUsage, {});
  },
});