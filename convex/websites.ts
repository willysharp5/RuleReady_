import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireCurrentUser, getCurrentUser } from "./helpers";

// Create a new website to monitor
export const createWebsite = mutation({
  args: {
    url: v.string(),
    name: v.string(),
    checkInterval: v.number(), // in minutes
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const websiteId = await ctx.db.insert("websites", {
      url: args.url,
      name: args.name,
      userId: user._id,
      isActive: true,
      checkInterval: args.checkInterval,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return websiteId;
  },
});

// Get all websites for the current user
export const getUserWebsites = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const websites = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return websites;
  },
});

// Get a specific website (internal)
export const getWebsite = internalQuery({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== args.userId) {
      return null;
    }
    return website;
  },
});

// Toggle website monitoring
export const toggleWebsiteActive = mutation({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== user._id) {
      throw new Error("Website not found");
    }

    await ctx.db.patch(args.websiteId, {
      isActive: !website.isActive,
      updatedAt: Date.now(),
    });

    return !website.isActive;
  },
});

// Store scrape result (internal)
export const storeScrapeResult = internalMutation({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
    markdown: v.string(),
    changeStatus: v.union(
      v.literal("new"),
      v.literal("same"),
      v.literal("changed"),
      v.literal("removed")
    ),
    visibility: v.union(v.literal("visible"), v.literal("hidden")),
    previousScrapeAt: v.optional(v.number()),
    scrapedAt: v.number(),
    firecrawlMetadata: v.optional(v.any()),
    ogImage: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    diff: v.optional(v.object({
      text: v.string(),
      json: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    // Store the scrape result
    const scrapeResultId = await ctx.db.insert("scrapeResults", {
      websiteId: args.websiteId,
      userId: args.userId,
      markdown: args.markdown,
      changeStatus: args.changeStatus,
      visibility: args.visibility,
      previousScrapeAt: args.previousScrapeAt,
      scrapedAt: args.scrapedAt,
      firecrawlMetadata: args.firecrawlMetadata,
      ogImage: args.ogImage,
      title: args.title,
      description: args.description,
      diff: args.diff,
    });

    // Update website last checked time
    await ctx.db.patch(args.websiteId, {
      lastChecked: args.scrapedAt,
      updatedAt: Date.now(),
    });

    return scrapeResultId;
  },
});

// Create change alert (internal)
export const createChangeAlert = internalMutation({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
    scrapeResultId: v.id("scrapeResults"),
    changeType: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("changeAlerts", {
      websiteId: args.websiteId,
      userId: args.userId,
      scrapeResultId: args.scrapeResultId,
      changeType: args.changeType,
      summary: args.summary,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

// Get recent scrape results for a website
export const getWebsiteScrapeHistory = query({
  args: {
    websiteId: v.id("websites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Verify website ownership
    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== user._id) {
      return [];
    }

    const results = await ctx.db
      .query("scrapeResults")
      .withIndex("by_website_time", (q) => q.eq("websiteId", args.websiteId))
      .order("desc")
      .take(args.limit || 10);

    return results;
  },
});

// Get unread alerts for the current user
export const getUnreadAlerts = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const alerts = await ctx.db
      .query("changeAlerts")
      .withIndex("by_read_status", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .order("desc")
      .collect();

    // Include website details
    const alertsWithWebsites = await Promise.all(
      alerts.map(async (alert) => {
        const website = await ctx.db.get(alert.websiteId);
        return {
          ...alert,
          websiteName: website?.name,
          websiteUrl: website?.url,
        };
      })
    );

    return alertsWithWebsites;
  },
});

// Mark alert as read
export const markAlertAsRead = mutation({
  args: {
    alertId: v.id("changeAlerts"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== user._id) {
      throw new Error("Alert not found");
    }

    await ctx.db.patch(args.alertId, {
      isRead: true,
    });
  },
});

// Get all scrape history for check log
export const getAllScrapeHistory = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Get all websites for the user
    const websites = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const websiteMap = new Map(websites.map(w => [w._id, w]));

    // Get all scrape results for user's websites
    const allScrapes = await ctx.db
      .query("scrapeResults")
      .withIndex("by_user_time", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100); // Limit to last 100 scrapes

    // Count scrapes per website
    const scrapeCounts = new Map<string, number>();
    for (const scrape of allScrapes) {
      scrapeCounts.set(scrape.websiteId, (scrapeCounts.get(scrape.websiteId) || 0) + 1);
    }

    // Group scrapes by website and find position
    const scrapesByWebsite = new Map<string, typeof allScrapes>();
    for (const scrape of allScrapes) {
      if (!scrapesByWebsite.has(scrape.websiteId)) {
        scrapesByWebsite.set(scrape.websiteId, []);
      }
      scrapesByWebsite.get(scrape.websiteId)!.push(scrape);
    }

    // Enrich with website info and check if it's truly the first scrape
    return allScrapes.map((scrape) => {
      const websiteScrapes = scrapesByWebsite.get(scrape.websiteId) || [];
      const scrapeIndex = websiteScrapes.findIndex(s => s._id === scrape._id);
      const isFirstScrape = scrapeIndex === websiteScrapes.length - 1; // Last in array is oldest
      
      return {
        ...scrape,
        websiteName: websiteMap.get(scrape.websiteId)?.name || "Unknown",
        websiteUrl: websiteMap.get(scrape.websiteId)?.url || "",
        isFirstScrape: isFirstScrape,
        scrapeNumber: websiteScrapes.length - scrapeIndex,
        totalScrapes: websiteScrapes.length,
      };
    });
  },
});

// Get latest scrape result for each website
export const getLatestScrapeForWebsites = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {};
    }

    const websites = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const latestScrapes: Record<string, any> = {};
    
    for (const website of websites) {
      const latestScrape = await ctx.db
        .query("scrapeResults")
        .withIndex("by_website_time", (q) => q.eq("websiteId", website._id))
        .order("desc")
        .first();
      
      if (latestScrape) {
        latestScrapes[website._id] = latestScrape;
      }
    }

    return latestScrapes;
  },
});

// Delete a website and all related data
export const deleteWebsite = mutation({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== user._id) {
      throw new Error("Website not found");
    }

    // Delete all scrape results
    const scrapeResults = await ctx.db
      .query("scrapeResults")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .collect();

    for (const result of scrapeResults) {
      await ctx.db.delete(result._id);
    }

    // Delete all alerts
    const alerts = await ctx.db
      .query("changeAlerts")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .collect();

    for (const alert of alerts) {
      await ctx.db.delete(alert._id);
    }

    // Delete the website
    await ctx.db.delete(args.websiteId);
  },
});