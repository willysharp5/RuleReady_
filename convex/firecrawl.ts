import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import FirecrawlApp from "@mendable/firecrawl-js";

// Initialize Firecrawl client (simplified for single-user mode)
export const getFirecrawlClient = async (ctx: any, userId: string | null | undefined) => {
  // Single-user mode: use environment variable
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable not set");
  }
  
  return new FirecrawlApp({ apiKey });
};

// Scrape a URL and track changes
export const scrapeUrl = internalAction({
  args: {
    websiteId: v.id("websites"),
    url: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    scrapeResultId: Id<"scrapeResults">;
    changeStatus: string | undefined;
    visibility: string | undefined;
    previousScrapeAt: string | undefined;
  }> => {
    const firecrawl = await getFirecrawlClient(ctx, null);

    try {
      // Scrape with change tracking and PDF parsing
      const result = await firecrawl.scrapeUrl(args.url, {
        formats: ["markdown", "links", "changeTracking"],
        changeTrackingOptions: {
          modes: ["git-diff"],
        },
        onlyMainContent: false,
        waitFor: 2000,
        parsePDF: true, // v1 API: Enable PDF parsing
        proxy: "auto",
        maxAge: 172800000, // 2 days cache
        blockAds: true,
        removeBase64Images: true,
      }) as any;

      if (!result.success) {
        throw new Error(`Firecrawl scrape failed: ${result.error}`);
      }

      const markdown = result?.markdown || "";
      const changeTracking = result?.changeTracking;
      const metadata = result?.metadata;
      
      if (changeTracking?.changeStatus === "changed") {
        console.log(`Change detected for ${args.url}: ${changeTracking.changeStatus}`);
      }

      // Store the scrape result
      const scrapeResultId = await ctx.runMutation(api.websites.storeScrapeResult, {
        websiteId: args.websiteId,
        markdown: markdown,
        changeStatus: changeTracking?.changeStatus || "new",
        visibility: changeTracking?.visibility || "visible",
        previousScrapeAt: changeTracking?.previousScrapeAt
          ? new Date(changeTracking.previousScrapeAt).getTime()
          : undefined,
        scrapedAt: Date.now(),
        firecrawlMetadata: metadata,
        title: metadata?.title || undefined,
        description: metadata?.description || undefined,
        url: args.url,
        diff: changeTracking?.diff ? {
          text: changeTracking.diff.text || "",
          json: changeTracking.diff.json || null,
        } : undefined,
      });

      // AI analysis removed - handled by compliance crawler
      // Run AI analysis if content changed
      // if (changeTracking?.changeStatus === "changed" && changeTracking?.diff) {
      //   try {
      //     await ctx.scheduler.runAfter(0, internal.changeAnalysis.analyzeComplianceChange, {
      //       scrapeResultId,
      //       websiteName: args.websiteId, // Will need to get actual website name
      //       websiteUrl: args.url,
      //       diff: {
      //         text: changeTracking.diff.text || "",
      //         json: changeTracking.diff.json || null,
      //       },
      //     });
      //     console.log(`🤖 Scheduled AI analysis for change in ${args.url}`);
      //   } catch (error) {
      //     console.error("Failed to schedule AI analysis:", error);
      //   }
      // }

      // Create change alert if content changed
      if (changeTracking?.changeStatus === "changed" || changeTracking?.diff) {
        const diffPreview = changeTracking?.diff?.text ? 
          changeTracking.diff.text.substring(0, 200) + (changeTracking.diff.text.length > 200 ? "..." : "") :
          "Website content has changed since last check";
          
        try {
          await ctx.runMutation(api.websites.createChangeAlert, {
            websiteId: args.websiteId,
            scrapeResultId,
            changeType: "content_changed",
            summary: diffPreview,
          });
        } catch (e) {
          console.log("Change alert creation skipped:", (e as Error).message);
        }
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
    // Single-user mode: get website without authentication
    const website = await ctx.runQuery(internal.websites.getWebsiteById, {
      websiteId: args.websiteId,
    });

    if (!website) {
      throw new Error("Website not found");
    }

    console.log(`🎯 Manual "Check Now" triggered for: ${website.name}`);
    console.log(`📊 Website status: Active=${website.isActive}, Paused=${website.isPaused || false}`);

    // Update lastChecked immediately
    await ctx.runMutation(internal.websites.updateLastChecked, {
      websiteId: args.websiteId,
    });

    // Use compliance crawler for compliance websites, direct scraping for others
    if (website.complianceMetadata?.ruleId) {
      console.log(`🎯 Triggering compliance crawl for rule: ${website.complianceMetadata.ruleId}`);
      await ctx.scheduler.runAfter(0, internal.complianceCrawler.crawlComplianceRuleInternal, {
        ruleId: website.complianceMetadata.ruleId,
        forceRecrawl: true,
      });
    } else {
      console.log(`🌐 Triggering direct scrape for: ${website.url}`);
      await ctx.scheduler.runAfter(0, internal.firecrawl.scrapeUrl, {
        websiteId: args.websiteId,
        url: website.url,
      });
    }

    return { success: true };
  },
});

// Crawl an entire website
export const crawlWebsite = action({
  args: {
    url: v.string(),
    limit: v.optional(v.number()),
    config: v.optional(v.any()),
    saveToDb: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const firecrawl = await getFirecrawlClient(ctx, null);

    try {
      // Use provided config or default crawl options
      const crawlOptions = args.config ? {
        limit: args.limit || 10,
        scrapeOptions: args.config,
      } : {
        limit: args.limit || 10,
        scrapeOptions: {
          formats: ["markdown", "links", "changeTracking"],
          changeTrackingOptions: {
            modes: ["git-diff"],
          },
          onlyMainContent: false,
          waitFor: 2000,
          parsePDF: true, // v1 API: Enable PDF parsing
          proxy: "auto",
          maxAge: 172800000, // 2 days cache
          blockAds: true,
          removeBase64Images: true,
        },
      };

      const crawlResult = await firecrawl.crawlUrl(args.url, crawlOptions) as any;

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