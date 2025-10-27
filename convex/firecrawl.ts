"use node";

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
      // Scrape with v2 API (SDK v4.4.1+ uses .scrape() not .scrapeUrl())
      const result = await firecrawl.scrape(args.url, {
        formats: ["markdown", "links"],
        onlyMainContent: false,
        waitFor: 2000,
        // parsers removed for v1 compatibility; will re-enable when v4 is confirmed active
        maxAge: 172800000,
        removeBase64Images: true,
      }) as any;

      // v4 API returns Document directly
      if (!result || !result.markdown) {
        throw new Error(`Firecrawl scrape failed - no content returned`);
      }

      // v4 API response structure
      const markdown = result.markdown || "";
      const metadata = result.metadata || {};
      
      // Note: v4 API doesn't have built-in changeTracking like v1
      // We handle change detection separately

      // Store the scrape result
      const scrapeResultId = await ctx.runMutation(api.websites.storeScrapeResult, {
        websiteId: args.websiteId,
        markdown: markdown,
        changeStatus: "new", // Will be updated by change detection logic
        visibility: "visible",
        scrapedAt: Date.now(),
        firecrawlMetadata: metadata,
        title: metadata?.title || undefined,
        description: metadata?.description || undefined,
        url: args.url,
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

      // Change detection handled separately (v4 API doesn't have built-in changeTracking)

      return {
        success: true,
        scrapeResultId,
        changeStatus: "new",
        visibility: "visible",
        previousScrapeAt: undefined,
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
    websiteId: v.optional(v.id("websites")),
  },
  handler: async (ctx, args) => {
    const firecrawl = await getFirecrawlClient(ctx, null);

    try {
      // Strip v2-only keys to avoid v1 API 400s in environments still resolving v1
      const sanitizeScrapeOptions = (opts: any) => {
        if (!opts || typeof opts !== "object") return {};
        const {
          formats,
          onlyMainContent,
          waitFor,
          maxAge,
          removeBase64Images,
          // v2-only keys we drop for compatibility
          parsers,
          changeTrackingOptions,
          blockAds,
          skipTlsVerification,
          parsePDF,
          ...rest
        } = opts;
        return {
          ...(formats ? { formats } : {}),
          ...(typeof onlyMainContent === "boolean" ? { onlyMainContent } : {}),
          ...(typeof waitFor === "number" ? { waitFor } : {}),
          ...(typeof maxAge === "number" ? { maxAge } : {}),
          ...(typeof removeBase64Images === "boolean" ? { removeBase64Images } : {}),
          // drop rest to be safe against unknown keys
        } as any;
      };
      // Use provided config or default crawl options (sanitized)
      const crawlOptions = args.config ? {
        limit: args.limit || 10,
        scrapeOptions: sanitizeScrapeOptions(args.config),
      } : {
        limit: args.limit || 10,
        scrapeOptions: {
          formats: ["markdown", "links"],
          onlyMainContent: false,
          waitFor: 2000,
          // parsers removed for v1 compatibility; will re-enable when v4 is confirmed active
          maxAge: 172800000,
          removeBase64Images: true,
        },
      };

      const crawlResult = await firecrawl.crawl(args.url, crawlOptions) as any;

      // v4 API returns different structure
      if (!crawlResult || (!crawlResult.data && !crawlResult.jobId)) {
        throw new Error(`Firecrawl crawl failed - no data or job ID returned`);
      }

      // Optionally persist results when immediate data is available and websiteId provided
      let saved: string[] | undefined = undefined;
      if (args.saveToDb && args.websiteId && Array.isArray(crawlResult.data)) {
        saved = [];
        for (const page of crawlResult.data) {
          const markdown: string | undefined = (page as any)?.markdown;
          const title: string | undefined = (page as any)?.metadata?.title;
          const description: string | undefined = (page as any)?.metadata?.description;
          const pageUrl: string | undefined = (page as any)?.url || (page as any)?.metadata?.url || args.url;
          if (!markdown) continue;
          const scrapeResultId = await ctx.runMutation(api.websites.storeScrapeResult, {
            websiteId: args.websiteId,
            markdown,
            changeStatus: "new",
            visibility: "visible",
            previousScrapeAt: undefined,
            scrapedAt: Date.now(),
            firecrawlMetadata: (page as any)?.metadata,
            title,
            description,
            url: pageUrl,
          });
          // Log to change tracking as a new tracked snapshot
          try {
            const preview = markdown.substring(0, 200);
            await ctx.runMutation(api.websites.createChangeAlert, {
              websiteId: args.websiteId,
              scrapeResultId,
              changeType: "monitor_once_saved",
              summary: preview.length > 0 ? preview : `Saved initial snapshot from Monitor Once for ${pageUrl}`,
            });
          } catch (e) {
            console.log("Change alert creation skipped:", (e as Error).message);
          }
          saved.push(String(scrapeResultId));
        }
      }

      return {
        success: true,
        totalPages: crawlResult.data?.length || 0,
        jobId: crawlResult.jobId || crawlResult.id,
        pages: crawlResult.data?.map((page: any) => ({
          url: page.url,
          title: page.metadata?.title,
          changeStatus: "new",
          visibility: "visible",
        })),
        savedScrapeResultIds: saved,
      };
    } catch (error) {
      console.error("Firecrawl crawl error:", error);
      throw error;
    }
  },
});