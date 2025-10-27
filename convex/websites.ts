import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./helpers";
import { internal } from "./_generated/api";
// Feature flags (environment-overridable). Avoid Next.js path aliases in Convex.
const FEATURES = {
  complianceMode: (process.env.NEXT_PUBLIC_COMPLIANCE_MODE ?? 'true') === 'true',
  freezeLegacyWrites: (process.env.NEXT_PUBLIC_FREEZE_LEGACY_WRITES ?? 'true') === 'true',
};

function freezeIfLegacy(website: any) {
  const isCompliance = !!website?.complianceMetadata?.isComplianceWebsite;
  if (FEATURES.complianceMode && FEATURES.freezeLegacyWrites && !isCompliance) {
    throw new Error("Legacy website writes are disabled in compliance mode");
  }
}

// Create a new website to monitor
export const createWebsite = mutation({
  args: {
    url: v.string(),
    name: v.string(),
    checkInterval: v.number(), // in minutes
    notificationPreference: v.optional(v.union(
      v.literal("none"),
      v.literal("email"),
      v.literal("webhook"),
      v.literal("both")
    )),
    monitorType: v.optional(v.union(
      v.literal("single_page"),
      v.literal("full_site")
    )),
    crawlLimit: v.optional(v.number()),
    crawlDepth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: no auth required
    // General website monitoring is supported alongside compliance monitoring
    
    // Webhook support removed

    const websiteId = await ctx.db.insert("websites", {
      url: args.url,
      name: args.name,
      isActive: true,
      checkInterval: args.checkInterval,
      notificationPreference: args.notificationPreference || "none",
      monitorType: args.monitorType || "single_page",
      crawlLimit: args.crawlLimit,
      crawlDepth: args.crawlDepth,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // If it's a full site monitor, trigger initial crawl
    if (args.monitorType === "full_site") {
      await ctx.scheduler.runAfter(0, internal.crawl.performCrawl, {
        websiteId,
      });
    }

    return websiteId;
  },
});

// Internal query to get all websites (for actions)
export const getAllWebsites = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("websites").collect();
  },
});

// Get all websites (single-user mode - no authentication required)
export const getUserWebsites = query({
  handler: async (ctx) => {
    // Single-user mode: return all websites
    const allWebsites = await ctx.db.query("websites").collect();

    // If no websites exist but we have compliance rules, auto-create them
    if (allWebsites.length === 0) {
      const rules = await ctx.db.query("complianceRules").collect();
      if (rules.length > 0) {
        console.log(`🔄 Auto-creating ${rules.length} compliance websites...`);
        // This will be handled by the auto-setup mutation
      }
    }

    // Single-user mode: return all websites
    const userWebsites = allWebsites.filter(w => !w.complianceMetadata?.isComplianceWebsite);
    const complianceWebsites = allWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite);

    // Combine and sort by priority, then by name
    const combinedWebsites = [...userWebsites, ...complianceWebsites];
    
    // Remove duplicates (in case user has both personal and compliance versions)
    const uniqueWebsites = combinedWebsites.filter((website, index, self) => 
      index === self.findIndex(w => w.url === website.url)
    );
    
    // Sort: compliance websites first (by priority), then regular websites
    return uniqueWebsites.sort((a, b) => {
      const aIsCompliance = a.complianceMetadata?.isComplianceWebsite || false;
      const bIsCompliance = b.complianceMetadata?.isComplianceWebsite || false;
      
      // Compliance websites first
      if (aIsCompliance && !bIsCompliance) return -1;
      if (!aIsCompliance && bIsCompliance) return 1;
      
      // Both compliance: sort by priority
      if (aIsCompliance && bIsCompliance) {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.complianceMetadata?.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.complianceMetadata?.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
      }
      
      // Same type or both regular: sort by name
      return a.name.localeCompare(b.name);
    });
  },
});

// Get a specific website (internal)
export const getWebsite = internalQuery({
  args: {
    websiteId: v.id("websites"),
    userId: v.optional(v.id("users")), // Optional for single-user mode
  },
  handler: async (ctx, args) => {
    const website = await ctx.db.get(args.websiteId);
    if (!website) {
      return null;
    }
    // Single-user mode: no user ownership check needed
    return website;
  },
});

// Get website by ID (single-user mode - no authentication)
export const getWebsiteById = internalQuery({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.websiteId);
  },
});

// Toggle website monitoring
export const toggleWebsiteActive = mutation({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    // Single-user mode: skip authentication
    const user = await getCurrentUser(ctx);

    const website = await ctx.db.get(args.websiteId);
    if (!website) {
      throw new Error("Website not found");
    }
    
    // Skip user ownership check in single-user mode
    // Single-user mode: no user ownership check needed

    await ctx.db.patch(args.websiteId, {
      isActive: !website.isActive,
      updatedAt: Date.now(),
    });

    return !website.isActive;
  },
});

// Pause/Resume website monitoring (single-user mode)
export const pauseWebsite = mutation({
  args: {
    websiteId: v.id("websites"),
    isPaused: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Single-user mode: skip authentication
    const website = await ctx.db.get(args.websiteId);
    if (!website) {
      throw new Error("Website not found");
    }
    freezeIfLegacy(website);

    await ctx.db.patch(args.websiteId, {
      isPaused: args.isPaused,
      updatedAt: Date.now(),
    });

    return args.isPaused;
  },
});

// Update website settings
export const updateWebsite = mutation({
  args: {
    websiteId: v.id("websites"),
    url: v.optional(v.string()), // NEW: Allow URL updates
    notificationPreference: v.optional(v.union(
      v.literal("none"),
      v.literal("email"),
      v.literal("webhook"),
      v.literal("both")
    )),
    checkInterval: v.optional(v.number()),
    monitorType: v.optional(v.union(
      v.literal("single_page"),
      v.literal("full_site")
    )),
    crawlLimit: v.optional(v.number()),
    crawlDepth: v.optional(v.number()),
    // NEW: Compliance priority management
    compliancePriority: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"), v.literal("testing"))),
    overrideComplianceInterval: v.optional(v.boolean()),
    priorityChangeReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Single-user mode: skip authentication
    const website = await ctx.db.get(args.websiteId);
    if (!website) {
      throw new Error("Website not found");
    }
    freezeIfLegacy(website);

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.url !== undefined) {
      updates.url = args.url;
    }

    if (args.notificationPreference !== undefined) {
      updates.notificationPreference = args.notificationPreference;
    }

    // Webhook removed

    if (args.checkInterval !== undefined) {
      updates.checkInterval = args.checkInterval;
    }

    if (args.monitorType !== undefined) {
      updates.monitorType = args.monitorType;
    }

    if (args.crawlLimit !== undefined) {
      updates.crawlLimit = args.crawlLimit;
    }

    if (args.crawlDepth !== undefined) {
      updates.crawlDepth = args.crawlDepth;
    }

    // NEW: Handle compliance priority updates
    if (args.compliancePriority !== undefined && website.complianceMetadata?.isComplianceWebsite) {
      // Calculate interval from priority (unless manual override)
      const priorityIntervals = {
        testing: 0.25,    // 15 seconds (for testing)
        critical: 1440,   // Daily
        high: 2880,       // Every 2 days
        medium: 10080,    // Weekly
        low: 43200        // Monthly
      };
      
      const priorityInterval = priorityIntervals[args.compliancePriority];
      
      // Use priority interval unless manual override is specified
      if (!args.overrideComplianceInterval) {
        updates.checkInterval = priorityInterval;
      }
      
      // Update compliance metadata
      updates.complianceMetadata = {
        ...website.complianceMetadata,
        priority: args.compliancePriority,
      };
      
      // Update corresponding compliance rule
      await ctx.runMutation(internal.compliancePriority.updateRulePriority, {
        ruleId: website.complianceMetadata.ruleId,
        priority: args.compliancePriority,
        hasManualOverride: args.overrideComplianceInterval || false,
        newInterval: updates.checkInterval || website.checkInterval,
      });
    }

    await ctx.db.patch(args.websiteId, updates);

    // If changing to full site monitoring, trigger initial crawl
    if (args.monitorType === "full_site" && website.monitorType !== "full_site") {
      await ctx.scheduler.runAfter(0, internal.crawl.performCrawl, {
        websiteId: args.websiteId,
      });
    }
  },
});

// Create checking status entry (internal)
export const createCheckingStatus = internalMutation({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const website = await ctx.db.get(args.websiteId);
    if (!website) throw new Error("Website not found");
    freezeIfLegacy(website);
    // Create a temporary "checking" status entry
    const scrapeResultId = await ctx.db.insert("scrapeResults", {
      websiteId: args.websiteId,
      markdown: "Checking for changes...",
      changeStatus: "checking",
      visibility: "visible",
      scrapedAt: Date.now(),
    });

    return scrapeResultId;
  },
});

// Update lastChecked timestamp immediately (to prevent duplicate checks)
export const updateLastChecked = internalMutation({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    const website = await ctx.db.get(args.websiteId);
    if (!website) throw new Error("Website not found");
    freezeIfLegacy(website);
    await ctx.db.patch(args.websiteId, {
      lastChecked: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Remove checking status entries (internal)
export const removeCheckingStatus = internalMutation({
  args: {
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    // Find and remove any checking status entries for this website
    const checkingEntries = await ctx.db
      .query("scrapeResults")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .filter((q) => q.eq(q.field("changeStatus"), "checking"))
      .collect();

    for (const entry of checkingEntries) {
      await ctx.db.delete(entry._id);
    }
  },
});

// Store scrape result (public for manual checks, internal for automated)
export const storeScrapeResult = mutation({
  args: {
    websiteId: v.id("websites"),
    userId: v.optional(v.id("users")), // Optional for single-user mode
    markdown: v.string(),
    changeStatus: v.union(
      v.literal("new"),
      v.literal("same"),
      v.literal("changed"),
      v.literal("removed"),
      v.literal("checking")
    ),
    visibility: v.union(v.literal("visible"), v.literal("hidden")),
    previousScrapeAt: v.optional(v.number()),
    scrapedAt: v.number(),
    firecrawlMetadata: v.optional(v.any()),
    ogImage: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()), // Add URL parameter
    diff: v.optional(v.object({
      text: v.string(),
      json: v.any(),
    })),
    isManualCheck: v.optional(v.boolean()), // Allow in compliance mode for manual checks
  },
  handler: async (ctx, args) => {
    // Allow storing scrape results in compliance mode for change tracking log visibility
    // (but only for manual "Check Now" operations)
    if (FEATURES.complianceMode && !args.isManualCheck) {
      console.log("Legacy storeScrapeResult disabled in compliance mode (except manual checks)");
      return "legacy-disabled" as any;
    }
    
    const website = await ctx.db.get(args.websiteId);
    if (!website) throw new Error("Website not found");
    freezeIfLegacy(website);
    // Remove any checking status entries first (skip if no userId in single-user mode)
    if (args.userId) {
      await ctx.runMutation(internal.websites.removeCheckingStatus, {
        websiteId: args.websiteId,
      });
    }

    // Store the scrape result
    const scrapeResultId = await ctx.db.insert("scrapeResults", {
      websiteId: args.websiteId,
      markdown: args.markdown,
      changeStatus: args.changeStatus,
      visibility: args.visibility,
      previousScrapeAt: args.previousScrapeAt,
      scrapedAt: args.scrapedAt,
      firecrawlMetadata: args.firecrawlMetadata,
      title: args.title,
      description: args.description,
      url: args.url,
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

// Create change alert (single-user mode compatible)
export const createChangeAlert = mutation({
  args: {
    websiteId: v.id("websites"),
    userId: v.optional(v.id("users")), // Optional for single-user mode
    scrapeResultId: v.id("scrapeResults"),
    changeType: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    // Allow in single-user mode even in compliance mode
    console.log(`Creating change alert for ${args.changeType}: ${args.summary}`);
    
    const website = await ctx.db.get(args.websiteId);
    if (!website) throw new Error("Website not found");
    freezeIfLegacy(website);
    await ctx.db.insert("changeAlerts", {
      websiteId: args.websiteId,
      scrapeResultId: args.scrapeResultId,
      changeType: args.changeType,
      summary: args.summary,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

// LEGACY: Get recent scrape results - DEPRECATED (disabled in compliance mode)
export const getWebsiteScrapeHistory = query({
  args: {
    websiteId: v.id("websites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Skip in compliance mode - use compliance reports instead
    if (FEATURES.complianceMode) {
      console.log("Legacy getWebsiteScrapeHistory disabled in compliance mode");
      return [];
    }
    
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Verify website ownership
    const website = await ctx.db.get(args.websiteId);
    if (!website) {
      return [];
    }
    // Single-user mode: no user ownership check needed

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
    // Compliance mode: surface recent compliance changes as alert-like entries
    if (FEATURES.complianceMode) {
      const recentChanges = await ctx.db
        .query("complianceChanges")
        .withIndex("by_date", (q) => q.gte("detectedAt", Date.now() - 14 * 24 * 60 * 60 * 1000))
        .order("desc")
        .take(50);

      const results: any[] = [];
      for (const change of recentChanges) {
        const rule = await ctx.db
          .query("complianceRules")
          .withIndex("by_rule_id", (q) => q.eq("ruleId", change.ruleId))
          .first();
        results.push({
          _id: `${change.changeId}` as any,
          websiteId: rule?.sourceUrl as any,
          userId: undefined,
          scrapeResultId: undefined,
          changeType: change.changeType,
          summary: change.changeDescription,
          isRead: false,
          createdAt: change.detectedAt,
          websiteName: rule ? `${rule.jurisdiction} - ${rule.topicLabel}` : "Compliance Rule",
          websiteUrl: rule?.sourceUrl || "",
        });
      }
      return results;
    }

    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const alerts = await ctx.db
      .query("changeAlerts")
      .filter((q) => q.eq(q.field("isRead"), false))
      .order("desc")
      .collect();

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
    // Single-user mode: no auth required
    const alert = await ctx.db.get(args.alertId);
    if (!alert) {
      throw new Error("Alert not found");
    }

    await ctx.db.patch(args.alertId, {
      isRead: true,
    });
  },
});

// Get all scrape history for check log (single-user mode)
export const getAllScrapeHistory = query({
  handler: async (ctx) => {
    // Compliance mode: combine compliance reports with recent manual scrape results
    if (FEATURES.complianceMode) {
      // Get recent manual scrape results (from Check Now buttons)
      const recentScrapes = await ctx.db
        .query("scrapeResults")
        .order("desc")
        .take(20); // Recent manual checks
      
      const reports = await ctx.db.query("complianceReports").take(30); // Reduced to make room
      const rulesById = new Map<string, any>();
      for (const report of reports) {
        if (!rulesById.has(report.ruleId)) {
          const rule = await ctx.db
            .query("complianceRules")
            .withIndex("by_rule_id", (q) => q.eq("ruleId", report.ruleId))
            .first();
          if (rule) rulesById.set(report.ruleId, rule);
        }
      }
      const sorted = [...reports]
        .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))
        .slice(0, 50);
      // Combine recent scrapes with compliance reports
      const recentScrapeData = recentScrapes.map(s => ({
        _id: s._id,
        websiteId: s.websiteId,
        markdown: s.markdown,
        changeStatus: s.changeStatus,
        visibility: s.visibility,
        previousScrapeAt: s.previousScrapeAt,
        scrapedAt: s.scrapedAt,
        firecrawlMetadata: s.firecrawlMetadata,
        title: s.title,
        description: s.description,
        url: s.url,
        diff: s.diff,
        websiteName: s.title || "Manual Check",
        websiteUrl: s.url || "",
        aiAnalysis: undefined,
        isFirstScrape: false,
        scrapeNumber: 0,
        totalScrapes: 0,
      }));
      
      const reportData = sorted.map((r, i) => {
        const rule = rulesById.get(r.ruleId);
        return {
          _id: `${r.reportId}` as any,
          websiteId: (rule?.sourceUrl || "") as any,
          userId: undefined,
          markdown: r.reportContent.substring(0, 1000) + "...", // Truncate content
          changeStatus: "same",
          visibility: "visible",
          previousScrapeAt: undefined,
          scrapedAt: r.generatedAt,
          firecrawlMetadata: undefined,
          ogImage: undefined,
          title: rule ? `${rule.jurisdiction} - ${rule.topicLabel}` : undefined,
          description: undefined,
          url: rule?.sourceUrl,
          diff: undefined,
          aiAnalysis: undefined, // No AI analysis for compliance reports
          websiteName: rule ? `${rule.jurisdiction} - ${rule.topicLabel}` : "Compliance Rule",
          websiteUrl: rule?.sourceUrl || "",
          isFirstScrape: false,
          scrapeNumber: i + 1,
          totalScrapes: sorted.length,
        };
      });
      
      // Combine and sort by most recent first
      const combined = [...recentScrapeData, ...reportData]
        .sort((a, b) => b.scrapedAt - a.scrapedAt)
        .slice(0, 50);
      
      return combined;
    }

    // Legacy mode: return real scrape history (limited to avoid read caps)
    const websites = await ctx.db.query("websites").take(200); // Limit websites too
    const websiteMap = new Map(websites.map(w => [w._id, w]));

    const allScrapes = await ctx.db
      .query("scrapeResults")
      .order("desc")
      .take(50); // Reduce from 100 to 50 to stay under read limits

    const scrapesByWebsite = new Map<string, typeof allScrapes>();
    for (const scrape of allScrapes) {
      if (!scrapesByWebsite.has(scrape.websiteId)) {
        scrapesByWebsite.set(scrape.websiteId, []);
      }
      scrapesByWebsite.get(scrape.websiteId)!.push(scrape);
    }

    return allScrapes.map((scrape) => {
      const websiteScrapes = scrapesByWebsite.get(scrape.websiteId) || [];
      const scrapeIndex = websiteScrapes.findIndex(s => s._id === scrape._id);
      const isFirstScrape = scrapeIndex === websiteScrapes.length - 1;
      return {
        ...scrape,
        websiteName: websiteMap.get(scrape.websiteId)?.name || "Unknown",
        websiteUrl: scrape.url || websiteMap.get(scrape.websiteId)?.url || "",
        isFirstScrape,
        scrapeNumber: websiteScrapes.length - scrapeIndex,
        totalScrapes: websiteScrapes.length,
      };
    });
  },
});

// Get latest scrape result for each website (single-user mode)
export const getLatestScrapeForWebsites = query({
  handler: async (ctx) => {
    // Compliance mode: return latest compliance report per rule, keyed by synthetic id (limited)
    if (FEATURES.complianceMode) {
      const rules = await ctx.db.query("complianceRules").take(50); // Limit to avoid read caps
      const byWebsiteId: Record<string, any> = {};
      for (const rule of rules) {
        const report = await ctx.db
          .query("complianceReports")
          .withIndex("by_rule", (q) => q.eq("ruleId", rule.ruleId))
          .order("desc")
          .first();
        if (report) {
          const syntheticId = `${rule.sourceUrl}`;
          byWebsiteId[syntheticId] = {
            _id: report.reportId,
            websiteId: syntheticId,
            markdown: report.reportContent.substring(0, 500) + "...", // Truncate
            scrapedAt: report.generatedAt,
            title: `${rule.jurisdiction} - ${rule.topicLabel}`,
            url: rule.sourceUrl,
          };
        }
      }
      return byWebsiteId;
    }

    // Legacy mode: return latest scrape per website (limited)
    const websites = await ctx.db.query("websites").take(50); // Limit to avoid read caps
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
    // Single-user mode: no auth required
    const website = await ctx.db.get(args.websiteId);
    if (!website) {
      throw new Error("Website not found");
    }

    // Schedule async deletion of all related data to avoid memory limits
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: args.websiteId,
      dataType: "scrapeResults"
    });
    
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: args.websiteId,
      dataType: "changeAlerts"
    });
    
    if (website.monitorType === "full_site") {
      await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
        websiteId: args.websiteId,
        dataType: "crawlSessions"
      });
    }

    // Delete the website immediately
    await ctx.db.delete(args.websiteId);
  },
});

// Internal function to delete website data asynchronously
export const deleteWebsiteData = internalMutation({
  args: {
    websiteId: v.id("websites"),
    dataType: v.union(
      v.literal("scrapeResults"),
      v.literal("changeAlerts"),
      v.literal("crawlSessions")
    ),
  },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 20;
    let hasMore = true;
    
    while (hasMore) {
      let items: any[] = [];
      
      switch (args.dataType) {
        case "scrapeResults":
          items = await ctx.db
            .query("scrapeResults")
            .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
            .take(BATCH_SIZE);
          break;
        case "changeAlerts":
          items = await ctx.db
            .query("changeAlerts")
            .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
            .take(BATCH_SIZE);
          break;
        case "crawlSessions":
          items = await ctx.db
            .query("crawlSessions")
            .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
            .take(BATCH_SIZE);
          break;
      }
      
      if (items.length === 0) {
        hasMore = false;
      } else {
        await Promise.all(items.map(item => ctx.db.delete(item._id)));
      }
    }
  },
});

// Create website from API
export const createWebsiteFromApi = internalMutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
    name: v.string(),
    checkInterval: v.number(),
    notificationPreference: v.optional(v.union(
      v.literal("none"),
      v.literal("email")
    )),
    monitorType: v.optional(v.union(
      v.literal("single_page"),
      v.literal("full_site")
    )),
    crawlLimit: v.optional(v.number()),
    crawlDepth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const websiteId = await ctx.db.insert("websites", {
      url: args.url,
      name: args.name,
      isActive: true,
      checkInterval: args.checkInterval,
      notificationPreference: args.notificationPreference || "none",
      monitorType: args.monitorType || "single_page",
      crawlLimit: args.crawlLimit,
      crawlDepth: args.crawlDepth,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // If it's a full site monitor, trigger initial crawl
    if (args.monitorType === "full_site") {
      await ctx.scheduler.runAfter(0, internal.crawl.performCrawl, {
        websiteId,
      });
    }

    return websiteId;
  },
});

// Pause/resume website from API
export const pauseWebsiteFromApi = internalMutation({
  args: {
    userId: v.id("users"),
    websiteId: v.string(),
    isPaused: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find the website
    const websiteId = args.websiteId as Id<"websites">;
    const website = await ctx.db.get(websiteId);
    
    if (!website) {
      return false;
    }
    // Single-user mode: no user ownership check needed
    freezeIfLegacy(website);

    // Update the pause status
    await ctx.db.patch(websiteId, {
      isPaused: args.isPaused,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Delete website from API
export const deleteWebsiteFromApi = internalMutation({
  args: {
    userId: v.id("users"),
    websiteId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the website
    const websiteId = args.websiteId as Id<"websites">;
    const website = await ctx.db.get(websiteId);
    
    if (!website) {
      return false;
    }
    // Single-user mode: no user ownership check needed
    freezeIfLegacy(website);

    // Schedule async deletion of all related data
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: websiteId,
      dataType: "scrapeResults"
    });
    
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: websiteId,
      dataType: "changeAlerts"
    });
    
    if (website.monitorType === "full_site") {
      await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
        websiteId: websiteId,
        dataType: "crawlSessions"
      });
    }

    // Delete the website immediately
    await ctx.db.delete(websiteId);
    
    return true;
  },
});

// LEGACY: Update scrape result with AI analysis - DISABLED in compliance mode
/*
export const updateScrapeResultAIAnalysis = internalMutation({
  args: {
    scrapeResultId: v.id("scrapeResults"),
    analysis: v.object({
      meaningfulChangeScore: v.number(),
      isMeaningfulChange: v.boolean(),
      reasoning: v.string(),
      analyzedAt: v.number(),
      model: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scrapeResultId, {
      aiAnalysis: args.analysis,
    });
  },
});
*/

// LEGACY: Get a specific scrape result - DISABLED in compliance mode
/*
export const getScrapeResult = internalQuery({
  args: {
    scrapeResultId: v.id("scrapeResults"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.scrapeResultId);
  },
});
*/

// Create websites from compliance rules
export const createWebsitesFromComplianceRules = mutation({
  handler: async (ctx) => {
    // Single-user mode: no auth required
    
    console.log("🔄 Creating websites from compliance rules...");
    
    // Get all compliance rules
    const rules = await ctx.db.query("complianceRules").collect();
    console.log(`📊 Found ${rules.length} compliance rules to convert`);
    
    let created = 0;
    let skipped = 0;
    
    // Process each rule
    for (const rule of rules) {
      try {
        // Check if website already exists for this URL
        const existingWebsite = await ctx.db
          .query("websites")
          .filter((q) => q.eq(q.field("url"), rule.sourceUrl))
          .first();
        
        if (existingWebsite) {
          skipped++;
          continue;
        }
        
        // Create website name with priority indicator
        const priorityPrefix = {
          testing: "[TEST]",
          critical: "[CRITICAL]",
          high: "[HIGH]",
          medium: "[MEDIUM]", 
          low: "[LOW]"
        }[rule.priority];
        
        const websiteName = `${priorityPrefix} ${rule.jurisdiction} - ${rule.topicLabel}`;
        
        // Determine monitoring settings
        const monitoringSettings = {
          testing: { interval: 0.25, notification: "none" as const },   // 15 seconds (testing)
          critical: { interval: 1440, notification: "email" as const }, // Daily
          high: { interval: 2880, notification: "email" as const },     // Every 2 days
          medium: { interval: 10080, notification: "email" as const },  // Weekly
          low: { interval: 43200, notification: "none" as const }       // Monthly
        }[rule.priority];
        
        // Create website entry
        await ctx.db.insert("websites", {
          url: rule.sourceUrl,
          name: websiteName,
          isActive: true,
          isPaused: false,
          checkInterval: monitoringSettings.interval,
          notificationPreference: monitoringSettings.notification,
          monitorType: "single_page",
          complianceMetadata: {
            ruleId: rule.ruleId,
            jurisdiction: rule.jurisdiction,
            topicKey: rule.topicKey,
            priority: rule.priority,
            isComplianceWebsite: true,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        created++;
        
        if (created % 100 === 0) {
          console.log(`✅ Created ${created} compliance websites...`);
        }
        
      } catch (error) {
        console.error(`Failed to create website for rule ${rule.ruleId}:`, error);
      }
    }
    
    console.log(`🎉 Completed: ${created} websites created, ${skipped} skipped (already exist)`);
    
    return {
      success: true,
      created,
      skipped,
      total: rules.length,
    };
  },
});

// Update scrape result with AI analysis
export const updateScrapeResultAIAnalysis = mutation({
  args: {
    scrapeResultId: v.id("scrapeResults"),
    analysis: v.object({
      meaningfulChangeScore: v.number(),
      isMeaningfulChange: v.boolean(),
      reasoning: v.string(),
      analyzedAt: v.number(),
      model: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scrapeResultId, {
      aiAnalysis: args.analysis,
    });
    
    return { success: true };
  },
});