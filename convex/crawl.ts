import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getFirecrawlClient } from "./firecrawl";

// Perform initial crawl when a full site monitor is created
export const performInitialCrawl = internalAction({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get website details
    const website = await ctx.runQuery(internal.websites.getWebsite, {
      websiteId: args.websiteId,
      userId: args.userId,
    });

    if (!website || website.monitorType !== "full_site") {
      throw new Error("Website not found or not a full site monitor");
    }

    // Create crawl session
    const sessionId = await ctx.runMutation(internal.crawl.createCrawlSession, {
      websiteId: args.websiteId,
      userId: args.userId,
    });

    try {
      // Perform the crawl using Firecrawl
      const firecrawl = await getFirecrawlClient(ctx, args.userId);
      const crawlResult = await firecrawl.crawlUrl(website.url, {
        limit: website.crawlLimit || 10,
        maxDepth: website.crawlDepth || 3,
        scrapeOptions: {
          formats: ["markdown", "changeTracking"],
        },
      }) as any;

      if (!crawlResult.success) {
        throw new Error(`Firecrawl crawl failed: ${crawlResult.error}`);
      }

      const pages = crawlResult.data || [];
      
      // Store all crawled pages
      for (const page of pages) {
        const pageUrl = page.url || page.metadata?.url;
        if (!pageUrl) continue;

        // Calculate relative path and depth
        const baseUrl = new URL(website.url);
        const pageUrlObj = new URL(pageUrl);
        const relativePath = pageUrlObj.pathname;
        const depth = relativePath.split('/').filter(p => p).length;

        // Store the page
        await ctx.runMutation(internal.crawl.storeCrawledPage, {
          websiteId: args.websiteId,
          crawlSessionId: sessionId,
          url: pageUrl,
          path: relativePath,
          depth: depth,
          status: "found",
          title: page.metadata?.title,
        });

        // Store the scrape result
        if (page.markdown) {
          await ctx.runMutation(internal.websites.storeScrapeResult, {
            websiteId: args.websiteId,
            userId: args.userId,
            markdown: page.markdown,
            changeStatus: page.changeTracking?.changeStatus || "new",
            visibility: page.changeTracking?.visibility || "visible",
            previousScrapeAt: page.changeTracking?.previousScrapeAt
              ? new Date(page.changeTracking.previousScrapeAt).getTime()
              : undefined,
            scrapedAt: Date.now(),
            firecrawlMetadata: page.metadata,
            ogImage: page.metadata?.ogImage,
            title: page.metadata?.title,
            description: page.metadata?.description,
            diff: page.changeTracking?.diff ? {
              text: page.changeTracking.diff.text || "",
              json: page.changeTracking.diff.json || null,
            } : undefined,
          });
        }
      }

      // Complete the crawl session
      await ctx.runMutation(internal.crawl.completeCrawlSession, {
        sessionId,
        pagesFound: pages.length,
        websiteId: args.websiteId,
      });

      // Don't send crawl summary webhook - individual page changes will trigger their own webhooks

      return { success: true, pagesFound: pages.length };
    } catch (error) {
      // Mark session as failed
      await ctx.runMutation(internal.crawl.failCrawlSession, {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});

// Create a new crawl session
export const createCrawlSession = internalMutation({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("crawlSessions", {
      websiteId: args.websiteId,
      userId: args.userId,
      startedAt: Date.now(),
      status: "running",
      pagesFound: 0,
    });
  },
});

// Store a crawled page
export const storeCrawledPage = internalMutation({
  args: {
    websiteId: v.id("websites"),
    crawlSessionId: v.id("crawlSessions"),
    url: v.string(),
    path: v.string(),
    depth: v.number(),
    status: v.union(
      v.literal("found"),
      v.literal("changed"),
      v.literal("removed"),
      v.literal("new")
    ),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if page already exists
    const existingPage = await ctx.db
      .query("crawledPages")
      .withIndex("by_url", (q) => q.eq("websiteId", args.websiteId).eq("url", args.url))
      .first();

    if (existingPage) {
      // Update existing page
      await ctx.db.patch(existingPage._id, {
        crawlSessionId: args.crawlSessionId,
        status: args.status,
        lastChecked: Date.now(),
        title: args.title,
      });
    } else {
      // Create new page
      await ctx.db.insert("crawledPages", {
        websiteId: args.websiteId,
        crawlSessionId: args.crawlSessionId,
        url: args.url,
        path: args.path,
        depth: args.depth,
        status: args.status,
        lastChecked: Date.now(),
        title: args.title,
      });
    }
  },
});

// Complete a crawl session
export const completeCrawlSession = internalMutation({
  args: {
    sessionId: v.id("crawlSessions"),
    pagesFound: v.number(),
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
      status: "completed",
      pagesFound: args.pagesFound,
    });

    // Update website with total pages and last crawl time
    await ctx.db.patch(args.websiteId, {
      totalPages: args.pagesFound,
      lastCrawlAt: Date.now(),
      lastChecked: Date.now(),
    });
  },
});

// Mark crawl session as failed
export const failCrawlSession = internalMutation({
  args: {
    sessionId: v.id("crawlSessions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
      status: "failed",
      error: args.error,
    });
  },
});

// Check all pages in a full site monitor
export const checkCrawledPages = internalAction({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ pagesChecked: number; errors: number } | undefined> => {
    // Get all crawled pages for this website
    const pages = await ctx.runQuery(internal.crawl.getCrawledPages, {
      websiteId: args.websiteId,
    });

    const website = await ctx.runQuery(internal.websites.getWebsite, {
      websiteId: args.websiteId,
      userId: args.userId,
    });

    if (!website) return;

    // Create a new crawl session for this check
    const sessionId = await ctx.runMutation(internal.crawl.createCrawlSession, {
      websiteId: args.websiteId,
      userId: args.userId,
    });

    let changedCount = 0;
    let errors = 0;

    // Check each page
    for (const page of pages) {
      try {
        // Trigger scrape for each page
        await ctx.scheduler.runAfter(0, internal.firecrawl.scrapeUrl, {
          websiteId: args.websiteId,
          url: page.url,
          userId: args.userId,
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error checking page ${page.url}:`, error);
        errors++;
      }
    }

    // Complete the session
    await ctx.runMutation(internal.crawl.completeCrawlSession, {
      sessionId,
      pagesFound: pages.length,
      websiteId: args.websiteId,
    });

    return { 
      pagesChecked: pages.length,
      errors,
    };
  },
});

// Get all crawled pages for a website
export const getCrawledPages = internalQuery({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crawledPages")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .collect();
  },
});

// Get crawl session by ID
export const getCrawlSession = internalQuery({
  args: {
    sessionId: v.id("crawlSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Get crawled pages for a specific session
export const getCrawledPagesForSession = internalQuery({
  args: {
    sessionId: v.id("crawlSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crawledPages")
      .withIndex("by_session", (q) => q.eq("crawlSessionId", args.sessionId))
      .collect();
  },
});