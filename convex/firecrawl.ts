import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import FirecrawlApp from "@mendable/firecrawl-js";
import { requireCurrentUserForAction, getCurrentUserForAction } from "./helpers";

// Initialize Firecrawl client with user's API key (single-user mode compatible)
export const getFirecrawlClient = async (ctx: any, userId: string | null | undefined) => {
  // Try to get user's API key if userId is provided
  if (userId) {
    const userKeyData = await ctx.runQuery(internal.firecrawlKeys.getDecryptedFirecrawlKey, { userId });
    
    if (userKeyData && userKeyData.key) {
      // Using user's Firecrawl API key
      // Update last used timestamp
      await ctx.runMutation(internal.firecrawlKeys.updateLastUsed, { keyId: userKeyData.keyId });
      return new FirecrawlApp({ apiKey: userKeyData.key });
    }
  }
  
  // Fallback to environment variable if user hasn't set their own key
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error("No Firecrawl API key found in environment or user settings");
    throw new Error("No Firecrawl API key found. Please add your API key in settings.");
  }
  // Using environment Firecrawl API key
  return new FirecrawlApp({ apiKey });
};

// Scrape a URL and track changes
export const scrapeUrl = internalAction({
  args: {
    websiteId: v.id("websites"),
    url: v.string(),
    // Removed userId - not needed in single-user mode
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
      // Scraping URL with change tracking
      // Scrape with change tracking - markdown is required for changeTracking
      const result = await firecrawl.scrapeUrl(args.url, {
        formats: ["markdown", "changeTracking"],
        changeTrackingOptions: {
          modes: ["git-diff"], // Enable git-diff to see what changed
        },
        // Try to get more content with valid options
        onlyMainContent: false, // Include all content, not just main content
        waitFor: 2000, // Wait longer for content to load
      }) as any;

      if (!result.success) {
        throw new Error(`Firecrawl scrape failed: ${result.error}`);
      }

      // Log only essential info, not the full response
      
      // Firecrawl returns markdown directly on the result object
      const markdown = result?.markdown || "";
      const changeTracking = result?.changeTracking;
      const metadata = result?.metadata;
      
      // Log only essential change status
      if (changeTracking?.changeStatus === "changed") {
        console.log(`Change detected for ${args.url}: ${changeTracking.changeStatus}`);
      }

      // Store the scrape result (single-user mode)
      const scrapeResultId = await ctx.runMutation(api.websites.storeScrapeResult, {
        websiteId: args.websiteId,
 // Single-user mode
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
        url: args.url, // Pass the actual URL that was scraped
        diff: changeTracking?.diff ? {
          text: changeTracking.diff.text || "",
          json: changeTracking.diff.json || null,
        } : undefined,
        isManualCheck: true, // Allow in compliance mode
      }) as Id<"scrapeResults">;

      // If content changed, create alerts and send notifications (single-user mode)
      if (changeTracking?.changeStatus === "changed" || changeTracking?.diff) {
        const diffPreview = changeTracking?.diff?.text ? 
          changeTracking.diff.text.substring(0, 200) + (changeTracking.diff.text.length > 200 ? "..." : "") :
          "Website content has changed since last check";
          
        // Create change alert (single-user mode - always create)
        try {
          await ctx.runMutation(api.websites.createChangeAlert, {
            websiteId: args.websiteId,
 // Single-user mode
            scrapeResultId,
            changeType: "content_changed",
            summary: diffPreview,
          });
        } catch (e) {
          console.log("Change alert creation skipped:", (e as Error).message);
        }

        // Trigger AI analysis if there's a diff (single-user mode - always try)
        if (changeTracking?.diff) {
          try {
            await ctx.scheduler.runAfter(0, internal.aiAnalysis.analyzeChange, {
              scrapeResultId,
              websiteName: metadata?.title || args.url,
              websiteUrl: args.url,
              diff: changeTracking.diff,
            });
          } catch (e) {
            console.log("AI analysis scheduling skipped:", (e as Error).message);
          }
        }

        // Get user settings to check if AI analysis is enabled (single-user mode)
        let userSettings = null;
        try {
          userSettings = await ctx.runQuery(api.userSettings.getUserSettings);
        } catch (e) {
          console.log("User settings not available, using defaults");
        }

        // Get website details for notifications (single-user mode)
        let website = null;
        try {
          website = await ctx.runQuery(internal.websites.getWebsiteById, {
            websiteId: args.websiteId,
          });
        } catch (e) {
          console.log("Website details not available");
        }

        // Send notifications if enabled (single-user mode)
        if ((!userSettings || !userSettings.aiAnalysisEnabled) || !changeTracking?.diff) {

          if (website && website.notificationPreference !== "none") {
            // Send email notification
            if (website.notificationPreference === "email") {
              // Get email configuration (single-user mode)
              let emailConfig = null;
              try {
                emailConfig = await ctx.runQuery(api.emailConfig.getEmailConfig);
                } catch (e) {
                  console.log("Email config not available:", (e as Error).message);
                }
              
              if (emailConfig?.email && emailConfig.isVerified) {
                await ctx.scheduler.runAfter(0, internal.notifications.sendEmailNotification, {
                  email: emailConfig.email,
                  websiteName: website.name,
                  websiteUrl: args.url,
                  changeType: "content_changed",
                  changeStatus: changeTracking.changeStatus,
                  diff: changeTracking?.diff,
                  title: metadata?.title,
                  scrapedAt: Date.now(),
                });
              }
            }
          }
        }
        // If AI analysis IS enabled, notifications will be handled by the AI analysis callback
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
    // Single-user mode: get website without any authentication
    const website = await ctx.runQuery(internal.websites.getWebsiteById, {
      websiteId: args.websiteId,
    });

    if (!website) {
      throw new Error("Website not found");
    }

    // Check Now overrides active status - always proceed with manual checks
    console.log(`🎯 Manual "Check Now" triggered for: ${website.name}`);
    console.log(`📊 Website status: Active=${website.isActive}, Paused=${website.isPaused || false}`);
    console.log(`🚀 Proceeding with manual check regardless of status...`);

    // Update lastChecked immediately to prevent duplicate checks
    await ctx.runMutation(internal.websites.updateLastChecked, {
      websiteId: args.websiteId,
    });

    // Single-user mode: Use compliance-specific crawler instead of legacy system
    if (website.complianceMetadata?.ruleId) {
      // This is a compliance website, use compliance crawler
      console.log(`🎯 Triggering compliance crawl for rule: ${website.complianceMetadata.ruleId}`);
      await ctx.scheduler.runAfter(0, internal.complianceCrawler.crawlComplianceRuleInternal, {
        ruleId: website.complianceMetadata.ruleId,
        forceRecrawl: true,
      });
    } else {
      // For non-compliance websites, use direct scraping
      console.log(`🌐 Triggering direct scrape for: ${website.url}`);
      await ctx.scheduler.runAfter(0, internal.firecrawl.scrapeUrl, {
        websiteId: args.websiteId,
        url: website.url,
      });
    }

    return { success: true };
  },
});

// Crawl an entire website (for initial setup or full refresh)
export const crawlWebsite = action({
  args: {
    url: v.string(),
    limit: v.optional(v.number()),
    saveToDb: v.optional(v.boolean()),
    instructions: v.optional(v.string()),
    templateMarkdown: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: make authentication optional
    const userId = await getCurrentUserForAction(ctx);

    const firecrawl = await getFirecrawlClient(ctx, userId);

    try {
      // Build scrape options with safe defaults and allow optional overrides
      const baseOptions: any = {
        limit: args.limit || 10,
        scrapeOptions: {
          formats: ["markdown", "changeTracking"],
          onlyMainContent: false,
          waitFor: 2000,
        },
      };

      // Inject AI prompt/instructions if provided (Firecrawl may ignore unknown keys safely)
      if (args.instructions) {
        (baseOptions.scrapeOptions as any).instructions = args.instructions;
      }
      if (args.templateMarkdown) {
        (baseOptions.scrapeOptions as any).extractTemplate = args.templateMarkdown;
      }
      // Merge user-provided config last to allow expert overrides
      const mergedOptions = args.config ? { ...baseOptions, ...args.config } : baseOptions;

      const crawlResult = await firecrawl.crawlUrl(args.url, mergedOptions) as any;

      if (!crawlResult.success) {
        throw new Error(`Firecrawl crawl failed: ${crawlResult.error}`);
      }

      let storedCount = 0;
      if (args.saveToDb) {
        // Try to find an existing website record for this URL to attach results
        const websites = await ctx.runQuery(internal.websites.getAllWebsites, {});
        const match = (websites || []).find((w: any) => w.url === args.url);

        if (match && Array.isArray(crawlResult.data)) {
          for (const page of crawlResult.data) {
            try {
              await ctx.runMutation(api.websites.storeScrapeResult, {
                websiteId: match._id,
                markdown: page.markdown || page.text || "",
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
                url: page.url || args.url,
                diff: page.changeTracking?.diff ? {
                  text: page.changeTracking.diff.text || "",
                  json: page.changeTracking.diff.json || null,
                } : undefined,
                isManualCheck: true,
              });
              storedCount += 1;
            } catch (e) {
              console.log("One-time crawl store skipped:", (e as Error).message);
            }
          }
        }
      }

      return {
        success: true,
        totalPages: crawlResult.data?.length || 0,
        storedPages: storedCount,
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