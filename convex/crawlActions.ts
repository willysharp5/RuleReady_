"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getFirecrawlClient } from "./firecrawl";

// Perform a crawl for a full site monitor (Node runtime)
export const performCrawl = internalAction({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    const website = await ctx.runQuery(internal.websites.getWebsite, {
      websiteId: args.websiteId,
    });

    if (!website) {
      throw new Error("Website not found");
    }
    if (website.monitorType !== "full_site") {
      throw new Error("Website is not a full site monitor");
    }

    await ctx.runMutation(internal.websites.updateLastChecked, {
      websiteId: args.websiteId,
    });

    const sessionId = await ctx.runMutation(internal.crawl.createCrawlSession, {
      websiteId: args.websiteId,
    });

    try {
      const firecrawl = await getFirecrawlClient(ctx, null);
      const crawlResponse = await firecrawl.crawl(website.url, {
        limit: website.crawlLimit || 10,
        scrapeOptions: {
          formats: ["markdown", "links"],
          onlyMainContent: false,
          // parsers removed for v1 compatibility
        },
      }) as any;

      if (crawlResponse.jobId || crawlResponse.id) {
        const jobId = crawlResponse.jobId || crawlResponse.id;
        await ctx.runMutation(internal.crawl.updateCrawlSessionJobId, {
          sessionId,
          jobId,
        });
        await ctx.scheduler.runAfter(5000, internal.crawlActions.checkCrawlJobStatus, {
          sessionId,
          jobId,
          websiteId: args.websiteId,
          attempt: 1,
        });
        return { success: true, pagesFound: 0, jobId };
      }

      const pages = crawlResponse.data || [];
      await ctx.runMutation(internal.crawl.completeCrawlSession, {
        sessionId,
        pagesFound: pages.length,
        websiteId: args.websiteId,
      });
      return { success: true, pagesFound: pages.length };
    } catch (error) {
      await ctx.runMutation(internal.crawl.failCrawlSession, {
        sessionId,
        error: (error as Error).message || String(error),
      });
      throw error;
    }
  },
});

// Check the status of an async crawl job (Node runtime)
export const checkCrawlJobStatus = internalAction({
  args: {
    sessionId: v.id("crawlSessions"),
    jobId: v.string(),
    websiteId: v.id("websites"),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const firecrawl = await getFirecrawlClient(ctx, null);
    const status = await firecrawl.getCrawlStatus(args.jobId) as any;

    if (status.status === "completed" && status.data) {
      await ctx.runMutation(internal.crawl.completeCrawlSession, {
        sessionId: args.sessionId,
        pagesFound: status.data.length,
        websiteId: args.websiteId,
      });
      return { success: true, pagesFound: status.data.length };
    }

    if (status.status === "failed" || status.status === "error") {
      await ctx.runMutation(internal.crawl.failCrawlSession, {
        sessionId: args.sessionId,
        error: status.error || "Unknown error",
      });
      throw new Error(`Crawl job failed: ${status.error || "Unknown error"}`);
    }

    if (args.attempt < 60) {
      await ctx.scheduler.runAfter(10000, internal.crawlActions.checkCrawlJobStatus, {
        sessionId: args.sessionId,
        jobId: args.jobId,
        websiteId: args.websiteId,
        attempt: args.attempt + 1,
      });
      return { success: true, status: status.status } as any;
    }

    await ctx.runMutation(internal.crawl.failCrawlSession, {
      sessionId: args.sessionId,
      error: "Crawl job timed out after 10 minutes",
    });
    throw new Error("Crawl job timed out after 10 minutes");
  },
});

// Check crawled pages (Node runtime; delegates to performCrawl for full site)
export const checkCrawledPages = internalAction({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args): Promise<{ pagesChecked: number; errors: number } | undefined> => {
    const website = await ctx.runQuery(internal.websites.getWebsite, {
      websiteId: args.websiteId,
    });
    if (!website) return;
    if (website.monitorType === "full_site") {
      await ctx.scheduler.runAfter(0, internal.crawlActions.performCrawl, {
        websiteId: args.websiteId,
      });
      return { pagesChecked: 0, errors: 0 };
    }
    await ctx.scheduler.runAfter(0, internal.firecrawl.scrapeUrl, {
      websiteId: args.websiteId,
      url: website.url,
    });
    return { pagesChecked: 1, errors: 0 };
  },
});


