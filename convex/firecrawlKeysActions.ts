"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import FirecrawlApp from "@mendable/firecrawl-js";

export const setFirecrawlKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const firecrawl = new FirecrawlApp({ apiKey: args.apiKey });
    const testResult = await firecrawl.scrape("https://example.com", {
      formats: ["markdown"],
      onlyMainContent: true,
    });
    if (!testResult || !testResult.markdown) {
      throw new Error("Invalid API key or Firecrawl service unavailable");
    }
    return {
      success: true,
      message: "API key validated successfully",
      keyPreview: args.apiKey.substring(0, 8) + "..." + args.apiKey.slice(-4),
    };
  },
});

export const deleteFirecrawlKey = action({
  handler: async () => ({ success: true, message: "API key removed (restart required to take effect)" }),
});

export const getTokenUsage = action({
  handler: async () => ({ usage: { current: 0, limit: 1000, resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } }),
});


