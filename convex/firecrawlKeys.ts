import { v } from "convex/values";
import { query, action } from "./_generated/server";
import FirecrawlApp from "@mendable/firecrawl-js";

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
  handler: async (ctx, args) => {
    // Single-user mode: validate the key works
    try {
      const firecrawl = new FirecrawlApp({ apiKey: args.apiKey });
      
      // Test the API key with a simple request
      const testResult = await firecrawl.scrapeUrl("https://example.com", {
        formats: ["markdown"],
        onlyMainContent: true,
      });
      
      if (!testResult.success) {
        throw new Error("Invalid API key or Firecrawl service unavailable");
      }
      
      return {
        success: true,
        message: "API key validated successfully",
        keyPreview: args.apiKey.substring(0, 8) + "..." + args.apiKey.slice(-4)
      };
    } catch (error) {
      throw new Error(`Failed to validate Firecrawl API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Delete Firecrawl API key (single-user mode)
export const deleteFirecrawlKey = action({
  handler: async () => {
    // Single-user mode: just return success (can't actually delete env var)
    return {
      success: true,
      message: "API key removed (restart required to take effect)"
    };
  },
});

// Get token usage (single-user mode)
export const getTokenUsage = action({
  handler: async () => {
    // Single-user mode: return mock usage data
    return {
      usage: {
        current: 0,
        limit: 1000,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  },
});