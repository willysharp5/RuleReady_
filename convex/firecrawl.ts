import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import FirecrawlApp from "@mendable/firecrawl-js";
import { requireCurrentUserForAction } from "./helpers";

// Initialize Firecrawl client
const getFirecrawlClient = () => {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }
  return new FirecrawlApp({ apiKey });
};

// Scrape a URL and track changes
export const scrapeUrl = internalAction({
  args: {
    websiteId: v.id("websites"),
    url: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    scrapeResultId: Id<"scrapeResults">;
    changeStatus: string | undefined;
    visibility: string | undefined;
    previousScrapeAt: string | undefined;
  }> => {
    const firecrawl = getFirecrawlClient();

    try {
      // Scrape with change tracking - markdown is required for changeTracking
      const result = await firecrawl.scrapeUrl(args.url, {
        formats: ["markdown", "changeTracking"],
        changeTrackingOptions: {
          modes: ["git-diff"], // Enable git-diff to see what changed
        }
      }) as any;

      if (!result.success) {
        throw new Error(`Firecrawl scrape failed: ${result.error}`);
      }

      console.log("Full Firecrawl response:", JSON.stringify(result, null, 2));
      
      // Firecrawl returns markdown directly on the result object
      const markdown = result?.markdown || "";
      const changeTracking = result?.changeTracking;
      const metadata = result?.metadata;
      
      console.log("Extracted markdown:", markdown ? `${markdown.substring(0, 100)}...` : "No markdown");
      console.log("Markdown length:", markdown.length);

      // Store the scrape result
      const scrapeResultId = await ctx.runMutation(internal.websites.storeScrapeResult, {
        websiteId: args.websiteId,
        userId: args.userId,
        markdown: markdown,
        changeStatus: changeTracking?.changeStatus || "new",
        visibility: changeTracking?.visibility || "visible",
        previousScrapeAt: changeTracking?.previousScrapeAt
          ? new Date(changeTracking.previousScrapeAt).getTime()
          : undefined,
        scrapedAt: Date.now(),
        firecrawlMetadata: metadata,
        ogImage: metadata?.ogImage || undefined,
        title: metadata?.title || undefined,
        description: metadata?.description || undefined,
        diff: changeTracking?.diff ? {
          text: changeTracking.diff.text || "",
          json: changeTracking.diff.json || null,
        } : undefined,
      }) as Id<"scrapeResults">;

      // If content changed, create an alert
      if (changeTracking?.changeStatus === "changed") {
        const diffPreview = changeTracking?.diff?.text ? 
          changeTracking.diff.text.substring(0, 200) + (changeTracking.diff.text.length > 200 ? "..." : "") :
          "Website content has changed since last check";
          
        await ctx.runMutation(internal.websites.createChangeAlert, {
          websiteId: args.websiteId,
          userId: args.userId,
          scrapeResultId,
          changeType: "content_changed",
          summary: diffPreview,
        });
      }

      return {
        success: true,
        scrapeResultId,
        changeStatus: changeTracking?.changeStatus,
        visibility: changeTracking?.visibility,
        previousScrapeAt: changeTracking?.previousScrapeAt,
      };
    } catch (error) {
      console.error("Firecrawl scrape error:", error);
      throw error;
    }
  },
});

// Public action to initiate a manual scrape
export const triggerScrape = action({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserForAction(ctx);

    // Get website details
    const website = await ctx.runQuery(internal.websites.getWebsite, {
      websiteId: args.websiteId,
      userId: userId,
    });

    if (!website) {
      throw new Error("Website not found");
    }

    // Trigger the scrape
    await ctx.scheduler.runAfter(0, internal.firecrawl.scrapeUrl, {
      websiteId: args.websiteId,
      url: website.url,
      userId: userId,
    });

    return { success: true };
  },
});

// Crawl an entire website (for initial setup or full refresh)
export const crawlWebsite = action({
  args: {
    url: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserForAction(ctx);

    const firecrawl = getFirecrawlClient();

    try {
      const crawlResult = await firecrawl.crawlUrl(args.url, {
        limit: args.limit || 10,
        scrapeOptions: {
          formats: ["markdown", "changeTracking"],
        },
      }) as any;

      if (!crawlResult.success) {
        throw new Error(`Firecrawl crawl failed: ${crawlResult.error}`);
      }

      return {
        success: true,
        totalPages: crawlResult.data?.length || 0,
        pages: crawlResult.data?.map((page: any) => ({
          url: page.url,
          title: page.metadata?.title,
          changeStatus: page.changeTracking?.changeStatus,
          visibility: page.changeTracking?.visibility,
        })),
      };
    } catch (error) {
      console.error("Firecrawl crawl error:", error);
      throw error;
    }
  },
});