import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireCurrentUser, getCurrentUser } from "./helpers";
import { internal } from "./_generated/api";

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
    webhookUrl: v.optional(v.string()),
    monitorType: v.optional(v.union(
      v.literal("single_page"),
      v.literal("full_site")
    )),
    crawlLimit: v.optional(v.number()),
    crawlDepth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    
    // Get user settings for default webhook
    let webhookUrl = args.webhookUrl;
    if (!webhookUrl && args.notificationPreference && ['webhook', 'both'].includes(args.notificationPreference)) {
      const userSettings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      
      if (userSettings?.defaultWebhookUrl) {
        webhookUrl = userSettings.defaultWebhookUrl;
      }
    }

    const websiteId = await ctx.db.insert("websites", {
      url: args.url,
      name: args.name,
      userId: user._id,
      isActive: true,
      checkInterval: args.checkInterval,
      notificationPreference: args.notificationPreference || "none",
      webhookUrl,
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
        userId: user._id,
      });
    }

    return websiteId;
  },
});

// Get all websites for the current user (including compliance websites)
export const getUserWebsites = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Get user's personal websites
    const userWebsites = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get all compliance websites (shared across all users)
    const complianceWebsites = await ctx.db
      .query("websites")
      .filter((q) => q.eq(q.field("complianceMetadata.isComplianceWebsite"), true))
      .collect();

    // Combine and sort by priority, then by name
    const allWebsites = [...userWebsites, ...complianceWebsites];
    
    // Remove duplicates (in case user has both personal and compliance versions)
    const uniqueWebsites = allWebsites.filter((website, index, self) => 
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

// Pause/Resume website monitoring
export const pauseWebsite = mutation({
  args: {
    websiteId: v.id("websites"),
    isPaused: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== user._id) {
      throw new Error("Website not found");
    }

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
    notificationPreference: v.optional(v.union(
      v.literal("none"),
      v.literal("email"),
      v.literal("webhook"),
      v.literal("both")
    )),
    webhookUrl: v.optional(v.string()),
    checkInterval: v.optional(v.number()),
    monitorType: v.optional(v.union(
      v.literal("single_page"),
      v.literal("full_site")
    )),
    crawlLimit: v.optional(v.number()),
    crawlDepth: v.optional(v.number()),
    // NEW: Compliance priority management
    compliancePriority: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
    overrideComplianceInterval: v.optional(v.boolean()),
    priorityChangeReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== user._id) {
      throw new Error("Website not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.notificationPreference !== undefined) {
      updates.notificationPreference = args.notificationPreference;
    }

    if (args.webhookUrl !== undefined) {
      updates.webhookUrl = args.webhookUrl;
    }

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
        hasManualOverride: args.overrideComplianceInterval || false,
        originalPriority: website.complianceMetadata.originalPriority || website.complianceMetadata.priority,
        lastPriorityChange: Date.now(),
        priorityChangeReason: args.priorityChangeReason || "Priority updated via settings",
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
        userId: user._id,
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
    // Create a temporary "checking" status entry
    const scrapeResultId = await ctx.db.insert("scrapeResults", {
      websiteId: args.websiteId,
      userId: args.userId,
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
    userId: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    // Remove any checking status entries first
    await ctx.runMutation(internal.websites.removeCheckingStatus, {
      websiteId: args.websiteId,
      userId: args.userId,
    });

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
        websiteUrl: scrape.url || websiteMap.get(scrape.websiteId)?.url || "",
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

    // Schedule async deletion of all related data to avoid memory limits
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: args.websiteId,
      userId: user._id,
      dataType: "scrapeResults"
    });
    
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: args.websiteId,
      userId: user._id,
      dataType: "changeAlerts"
    });
    
    if (website.monitorType === "full_site") {
      await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
        websiteId: args.websiteId,
        userId: user._id,
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
    userId: v.id("users"),
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
      v.literal("email"),
      v.literal("webhook"),
      v.literal("both")
    )),
    webhookUrl: v.optional(v.string()),
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
      userId: args.userId,
      isActive: true,
      checkInterval: args.checkInterval,
      notificationPreference: args.notificationPreference || "none",
      webhookUrl: args.webhookUrl,
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
        userId: args.userId,
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
    
    if (!website || website.userId !== args.userId) {
      return false;
    }

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
    
    if (!website || website.userId !== args.userId) {
      return false;
    }

    // Schedule async deletion of all related data
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: websiteId,
      userId: args.userId,
      dataType: "scrapeResults"
    });
    
    await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
      websiteId: websiteId,
      userId: args.userId,
      dataType: "changeAlerts"
    });
    
    if (website.monitorType === "full_site") {
      await ctx.scheduler.runAfter(0, internal.websites.deleteWebsiteData, {
        websiteId: websiteId,
        userId: args.userId,
        dataType: "crawlSessions"
      });
    }

    // Delete the website immediately
    await ctx.db.delete(websiteId);
    
    return true;
  },
});

// Update scrape result with AI analysis
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

// Get a specific scrape result (internal)
export const getScrapeResult = internalQuery({
  args: {
    scrapeResultId: v.id("scrapeResults"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.scrapeResultId);
  },
});

// Create websites from compliance rules
export const createWebsitesFromComplianceRules = mutation({
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    
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
          critical: { interval: 1440, notification: "both" as const }, // Daily
          high: { interval: 2880, notification: "email" as const },     // Every 2 days
          medium: { interval: 10080, notification: "email" as const },  // Weekly
          low: { interval: 43200, notification: "none" as const }       // Monthly
        }[rule.priority];
        
        // Create website entry
        await ctx.db.insert("websites", {
          url: rule.sourceUrl,
          name: websiteName,
          userId: user._id,
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