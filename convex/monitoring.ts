import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const checkActiveWebsites = internalAction({
  handler: async (ctx) => {
    // Get all active websites that need checking
    const websites = await ctx.runQuery(internal.monitoring.getWebsitesToCheck);

    console.log(`Checking ${websites.length} websites`);

    // Schedule scrapes for each website
    for (const website of websites) {
      try {
        await ctx.scheduler.runAfter(0, internal.firecrawl.scrapeUrl, {
          websiteId: website._id,
          url: website.url,
          userId: website.userId,
        });
      } catch (error) {
        console.error(`Failed to schedule scrape for ${website.url}:`, error);
      }
    }
  },
});

// Internal query to get websites that need checking
export const getWebsitesToCheck = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all active websites
    const activeWebsites = await ctx.db
      .query("websites")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter websites that need checking based on their interval
    const websitesToCheck = activeWebsites.filter((website) => {
      if (!website.lastChecked) {
        // Never checked before
        return true;
      }

      const timeSinceLastCheck = now - website.lastChecked;
      const intervalInMs = website.checkInterval * 60 * 1000;

      return timeSinceLastCheck >= intervalInMs;
    });

    return websitesToCheck;
  },
});

import { internalQuery } from "./_generated/server";