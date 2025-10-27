import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// PHASE 2.1: Smart Crawling Strategy - Jurisdiction-based patterns
const crawlingStrategies = {
  federal: { 
    frequency: "weekly", 
    depth: 3, 
    priority: "critical",
    domains: ["dol.gov", "eeoc.gov", "nlrb.gov"],
    checkIntervalMinutes: 10080, // 1 week
    selectors: [".content-main", ".law-text", ".regulation", ".guidance"]
  },
  state_labor_dept: { 
    frequency: "bi-weekly", 
    depth: 2, 
    priority: "high",
    domains: ["state.gov", "labor.gov", "employment.gov"],
    checkIntervalMinutes: 20160, // 2 weeks
    selectors: [".content-main", ".law-text", ".regulation", ".statute"]
  },
  municipal: { 
    frequency: "monthly", 
    depth: 1, 
    priority: "medium",
    domains: ["city.gov", "county.gov", "municipal.gov"],
    checkIntervalMinutes: 43200, // 1 month
    selectors: [".ordinance", ".municipal-code", ".city-law"]
  }
};

// Topic-based priority mapping for intelligent scheduling
const topicPriorities = {
  minimum_wage: "critical", // Changes frequently, high business impact
  overtime: "high",
  paid_sick_leave: "high", // Rapidly evolving area
  harassment_training: "high", // Frequent updates and deadlines
  workers_comp: "medium",
  posting_requirements: "medium",
  background_checks: "medium",
  meal_rest_breaks: "medium",
  family_leave: "low", // Less frequent changes
  youth_employment: "low",
  // Default for unlisted topics
  default: "medium"
};

// Main compliance crawler that integrates with existing FireCrawl (public for testing)
export const crawlComplianceRule = action({
  args: { 
    ruleId: v.string(),
    forceRecrawl: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<any> => {
    console.log(`🔍 Starting compliance crawl for rule: ${args.ruleId}`);
    
    // 1. Get rule details and determine crawling strategy
    const rule: any = await ctx.runQuery(internal.complianceCrawler.getRule, { ruleId: args.ruleId });
    if (!rule) {
      throw new Error(`Rule ${args.ruleId} not found`);
    }
    
    // 2. Get crawling strategy based on jurisdiction and topic
    const strategy = getCrawlingStrategy(rule.jurisdiction, rule.topicKey);
    console.log(`📋 Using strategy: ${strategy.frequency} frequency, depth ${strategy.depth}`);
    
    // 3. Check if we need to crawl (based on last check time and strategy)
    if (!args.forceRecrawl && !shouldCrawlNow(rule, strategy)) {
      console.log(`⏭️ Skipping crawl - not due yet for ${args.ruleId}`);
      return { skipped: true, reason: "not_due", nextCrawlDue: calculateNextCrawlTime(rule, strategy) };
    }
    
    // 4. Perform intelligent scraping with compliance context
    const crawlResult: any = await performComplianceCrawl(ctx, rule, strategy);
    
    // 5. Parse using compliance template structure
    const parsedContent = await ctx.runAction(internal.complianceParser.parseComplianceContent, {
      content: crawlResult.content,
      ruleId: rule.ruleId,
      previousContent: crawlResult.previousContent,
    });
    
    // 6. Compare against previous version with AI analysis
    const changeAnalysis = await detectAndAnalyzeChanges(ctx, parsedContent, rule);

    // 6b. When content is new or significantly changed, persist a versioned report and trigger AI processing
    if (changeAnalysis.changeType === "new_content" || changeAnalysis.hasSignificantChanges) {
      try {
        const reportId = `${rule.ruleId}_${Date.now()}`;
        // reportImport removed - using direct database insert instead
        await ctx.runMutation(internal.complianceWebsiteIntegration.storeComplianceReport, {
          reportId,
          ruleId: rule.ruleId,
          reportContent: parsedContent.rawContent,
          contentHash: parsedContent.contentHash,
          contentLength: parsedContent.rawContent.length,
          extractedSections: {
            overview: parsedContent.sections.overview,
            coveredEmployers: parsedContent.sections.coveredEmployers,
            coveredEmployees: parsedContent.sections.coveredEmployees,
            employerResponsibilities: parsedContent.sections.employerResponsibilities,
            trainingRequirements: parsedContent.sections.trainingRequirements,
            postingRequirements: parsedContent.sections.postingRequirements,
            penalties: parsedContent.sections.penalties,
            sources: parsedContent.sections.sources,
          },
          processingMethod: "scheduled_crawl",
        });

        // Fire off AI-processed structured report (best-effort)
        try {
          await ctx.runAction(internal.geminiFlashLite.processComplianceDataWithGemini, {
            rawContent: parsedContent.rawContent,
            sourceUrl: rule.sourceUrl,
            jurisdiction: rule.jurisdiction,
            topicKey: rule.topicKey,
            useTemplate: true,
          });
        } catch (aiError) {
          console.error("AI processing failed (non-fatal):", aiError);
        }
      } catch (persistError) {
        console.error("Failed to persist versioned compliance report:", persistError);
      }
    }
    
    // 7. Update rule monitoring data
    await ctx.runMutation(internal.complianceCrawler.updateRuleMonitoring, {
      ruleId: args.ruleId,
      lastChecked: Date.now(),
      crawlResult: {
        success: crawlResult.success,
        contentLength: crawlResult.content.length,
        responseTime: crawlResult.responseTime,
      },
      changeDetected: changeAnalysis.hasSignificantChanges,
    });
    
    // 7.5. Store in scrapeResults for change tracking log visibility
    const ruleWebsites = await ctx.runQuery(api.websites.getUserWebsites);
    const website = ruleWebsites.find((w: any) => w.complianceMetadata?.ruleId === args.ruleId);
    
    if (website) {
      // Always create meaningful content for change tracking log
      let displayContent = crawlResult.content;
      if (!displayContent || displayContent.length === 0) {
        displayContent = `# ${rule.jurisdiction} - ${rule.topicLabel}

## Compliance Check Completed

**Source:** ${rule.sourceUrl}
**Checked:** ${new Date().toLocaleString()}
**Status:** ${changeAnalysis.hasSignificantChanges ? 'Changes detected' : 'No changes detected'}

## Note
This compliance rule was monitored but content could not be extracted. This may be due to:
- PDF format that requires manual review
- Website access restrictions  
- Dynamic content loading
- Authentication requirements

## Recommendation
Please review the official source directly for the most current compliance information.

**Rule ID:** ${rule.ruleId}
**Priority:** ${rule.priority}`;
      }
      
      try {
        const scrapeResultId = await ctx.runMutation(api.websites.storeScrapeResult, {
          websiteId: website._id,
          userId: undefined, // Single-user mode
          markdown: displayContent.substring(0, 10000), // Increased limit
          changeStatus: changeAnalysis.hasSignificantChanges ? "changed" : "same",
          visibility: "visible",
          scrapedAt: Date.now(),
          url: rule.sourceUrl,
          title: `${rule.jurisdiction} - ${rule.topicLabel}`,
          description: `Compliance check for ${rule.topicLabel}`,
          isManualCheck: true, // Flag to allow in compliance mode
        });
        
        console.log(`✅ Successfully stored scrape result: ${scrapeResultId} for ${website.name}`);
      } catch (storageError) {
        console.error(`❌ Failed to store scrape result for ${website.name}:`, storageError);
      }
    }
    
    // 8. Generate change alerts with severity scoring
    if (changeAnalysis.hasSignificantChanges) {
      await generateComplianceAlert(ctx, rule, changeAnalysis);
    }
    
    // 9. Schedule embedding update if content changed
    if (changeAnalysis.hasSignificantChanges) {
      await ctx.runMutation(internal.embeddingJobs.createEmbeddingJob, {
        jobType: "update_existing",
        entityIds: [args.ruleId],
        priority: changeAnalysis.severity === "critical" ? "high" : "medium",
      });
    }
    
    console.log(`✅ Compliance crawl completed for ${args.ruleId}`);
    
    return {
      success: true,
      changesDetected: changeAnalysis.hasSignificantChanges,
      severity: changeAnalysis.severity,
      nextCrawlScheduled: calculateNextCrawlTime(rule, strategy),
      contentLength: crawlResult.content.length,
    };
  },
});

// Get rule by rule ID
export const getRule = internalQuery({
  args: { ruleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();
  },
});

// Update rule monitoring data
export const updateRuleMonitoring = internalMutation({
  args: {
    ruleId: v.string(),
    lastChecked: v.number(),
    crawlResult: v.object({
      success: v.boolean(),
      contentLength: v.number(),
      responseTime: v.optional(v.number()),
    }),
    changeDetected: v.boolean(),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();
    
    if (!rule) {
      throw new Error(`Rule ${args.ruleId} not found`);
    }
    
    await ctx.db.patch(rule._id, {
      lastSignificantChange: args.changeDetected ? args.lastChecked : rule.lastSignificantChange,
      updatedAt: args.lastChecked,
      // Note: Removed metadata update for now - would need to extend schema
    });
  },
});

// Internal version for use by schedulers
export const crawlComplianceRuleInternal = internalAction({
  args: { 
    ruleId: v.string(),
    forceRecrawl: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<any> => {
    console.log(`🔍 Starting compliance crawl for rule: ${args.ruleId}`);
    
    // 1. Get rule details and determine crawling strategy
    const rule: any = await ctx.runQuery(internal.complianceCrawler.getRule, { ruleId: args.ruleId });
    if (!rule) {
      throw new Error(`Rule ${args.ruleId} not found`);
    }
    
    // 2. Get crawling strategy based on jurisdiction and topic
    const strategy = getCrawlingStrategy(rule.jurisdiction, rule.topicKey);
    
    // 3. Check if crawl is due (unless forced)
    if (!args.forceRecrawl && !shouldCrawlNow(rule, strategy)) {
      console.log(`⏭️ Skipping crawl - not due yet for ${args.ruleId}`);
      return { skipped: true, reason: "not_due", nextCrawlDue: calculateNextCrawlTime(rule, strategy) };
    }
    
    // 4. Perform intelligent scraping with compliance context
    const crawlResult: any = await performComplianceCrawl(ctx, rule, strategy);
    
    return crawlResult;
  },
});

// Batch crawl compliance rules with intelligent scheduling
export const batchCrawlComplianceRules = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    priorityFilter: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
    jurisdictionFilter: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const batchSize = args.batchSize || 50;
    
    console.log(`🚀 Starting batch compliance crawl (batch size: ${batchSize})`);
    
    // Get rules that need crawling based on priority and schedule
    const rulesDue: any[] = await ctx.runQuery(api.complianceCrawler.getRulesDueForCrawling, {
      limit: batchSize,
      priorityFilter: args.priorityFilter,
      jurisdictionFilter: args.jurisdictionFilter,
    });
    
    console.log(`📋 Found ${rulesDue.length} rules due for crawling`);
    
    let crawled = 0;
    let failed = 0;
    let changesDetected = 0;
    
    // Process each rule
    for (const rule of rulesDue) {
      try {
        const result = await ctx.runAction(api.complianceCrawler.crawlComplianceRule, {
          ruleId: rule.ruleId
        });
        
        if (result.success) {
          crawled++;
          if (result.changesDetected) {
            changesDetected++;
          }
        }
        
        // Rate limiting between crawls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Failed to crawl rule ${rule.ruleId}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ Batch crawl completed: ${crawled} crawled, ${failed} failed, ${changesDetected} changes detected`);
    
    return {
      success: true,
      crawled,
      failed,
      changesDetected,
      total: rulesDue.length,
    };
  },
});

// Get rules that are due for crawling (public for testing)
export const getRulesDueForCrawling = query({
  args: {
    limit: v.optional(v.number()),
    priorityFilter: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
    jurisdictionFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("complianceRules");
    
    // Filter by monitoring status
    query = query.filter((q) => q.eq(q.field("monitoringStatus"), "active"));
    
    // Filter by priority if specified
    if (args.priorityFilter) {
      query = query.filter((q) => q.eq(q.field("priority"), args.priorityFilter));
    }
    
    // Filter by jurisdiction if specified
    if (args.jurisdictionFilter) {
      query = query.filter((q) => q.eq(q.field("jurisdiction"), args.jurisdictionFilter));
    }
    
    const allRules = await query.collect();
    
    // Filter rules that are due for crawling based on their check intervals
    const now = Date.now();
    const rulesDue = allRules.filter(rule => {
      const lastChecked = rule.lastSignificantChange || rule.createdAt;
      const checkIntervalMs = rule.crawlSettings.checkInterval * 60 * 1000; // Convert minutes to ms
      return (now - lastChecked) >= checkIntervalMs;
    });
    
    // Sort by priority and last checked time
    const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    rulesDue.sort((a, b) => {
      const aPriority = priorityOrder[(a as any).priority as string] ?? 0;
      const bPriority = priorityOrder[(b as any).priority as string] ?? 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Same priority, sort by last checked (oldest first)
      const aLastChecked = a.lastSignificantChange || a.createdAt;
      const bLastChecked = b.lastSignificantChange || b.createdAt;
      return aLastChecked - bLastChecked;
    });
    
    return rulesDue.slice(0, args.limit || 100);
  },
});

// PHASE 2.1: Update crawling schedules based on smart strategy (public for testing)
export const updateCrawlingSchedules: any = action({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("🔄 Updating crawling schedules based on smart strategy...");
    
    const rules = await ctx.runQuery(api.csvImport.getAllRules);
    let updated = 0;
    
    for (const rule of rules) {
      const strategy = getCrawlingStrategy(rule.jurisdiction, rule.topicKey);
      
      // Find corresponding website
      const websites = await ctx.runQuery(api.websites.getUserWebsites);
      const ruleWebsite = websites.find((w: any) => 
        w.complianceMetadata?.ruleId === rule.ruleId ||
        w.url === rule.sourceUrl
      );
      
      if (ruleWebsite && !args.dryRun) {
        // Update website check interval based on strategy
        await ctx.runMutation(api.websites.updateWebsite, {
          websiteId: ruleWebsite._id,
          checkInterval: strategy.checkInterval / 60, // Convert minutes to website format
          // Note: priority is stored in complianceMetadata, not directly on website
        });
        updated++;
      } else if (ruleWebsite && args.dryRun) {
        console.log(`Would update ${rule.ruleId}: ${strategy.frequency} (${strategy.checkInterval}min)`);
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} crawling schedules`);
    return { updated, total: rules.length, dryRun: args.dryRun || false };
  },
});

// Enhanced crawling strategy using jurisdiction and topic intelligence
function getCrawlingStrategy(jurisdiction: string, topicKey: string) {
  // Get base strategy by jurisdiction type
  let baseStrategy;
  
  if (jurisdiction === "Federal") {
    baseStrategy = crawlingStrategies.federal;
  } else if (jurisdiction.includes("City") || jurisdiction.includes("County")) {
    baseStrategy = crawlingStrategies.municipal;
  } else {
    // State-level jurisdiction
    baseStrategy = crawlingStrategies.state_labor_dept;
  }
  
  // Override priority based on topic criticality
  const topicPriority = topicPriorities[topicKey as keyof typeof topicPriorities] || topicPriorities.default;
  
  // Adjust frequency based on topic priority
  let adjustedInterval = baseStrategy.checkIntervalMinutes;
  if (topicPriority === "critical") {
    adjustedInterval = Math.floor(adjustedInterval * 0.5); // 2x more frequent
  } else if (topicPriority === "high") {
    adjustedInterval = Math.floor(adjustedInterval * 0.75); // 1.33x more frequent
  } else if (topicPriority === "low") {
    adjustedInterval = Math.floor(adjustedInterval * 1.5); // Less frequent
  }
  
  return {
    frequency: baseStrategy.frequency,
    depth: baseStrategy.depth,
    priority: topicPriority,
    domains: baseStrategy.domains || [],
    selectors: baseStrategy.selectors || [".content", ".main"],
    checkInterval: adjustedInterval,
    checkIntervalMinutes: adjustedInterval, // Add this for compatibility
    // Additional metadata for intelligent crawling
    topicKey,
    jurisdiction,
    lastUpdated: Date.now(),
  };
}

function shouldCrawlNow(rule: any, strategy: any): boolean {
  const now = Date.now();
  const lastChecked = rule.lastSignificantChange || rule.createdAt;
  const checkIntervalMs = strategy.checkInterval * 60 * 1000;
  
  return (now - lastChecked) >= checkIntervalMs;
}

function calculateNextCrawlTime(rule: any, strategy: any): number {
  const lastChecked = rule.lastSignificantChange || rule.createdAt;
  const checkIntervalMs = strategy.checkInterval * 60 * 1000;
  return lastChecked + checkIntervalMs;
}

// Perform compliance-specific crawl using existing FireCrawl infrastructure
// PHASE 2.1 & 2.3: Enhanced compliance crawling with strategy-based intelligence
async function performComplianceCrawl(ctx: any, rule: any, strategy: any) {
  const startTime = Date.now();
  
  try {
    console.log(`🕷️ Crawling ${rule.sourceUrl} with ${strategy.frequency} strategy (${strategy.priority} priority)`);
    
    // Find the website for this rule
    const websites = await ctx.runQuery(api.websites.getUserWebsites);
    const ruleWebsite = websites.find((w: any) => 
      w.complianceMetadata?.ruleId === rule.ruleId ||
      w.url === rule.sourceUrl
    );
    
    if (!ruleWebsite) {
      throw new Error(`No website found for rule ${rule.ruleId}`);
    }
    
    // Get previous content for change detection
    let previousContent = "";
    try {
      const latestReport = await ctx.db
        .query("complianceReports")
        .withIndex("by_rule", (q: any) => q.eq("ruleId", rule.ruleId))
        .order("desc")
        .first();
      previousContent = latestReport?.reportContent || "";
    } catch (e) {
      console.log("No previous content found for comparison");
    }
    
    // Enhanced FireCrawl scraping (only pass valid arguments)
    const scrapeConfig = {
      websiteId: ruleWebsite._id,
      url: rule.sourceUrl,
      userId: undefined, // Single-user mode
    };
    
    const scrapeResult = await ctx.runAction(internal.firecrawl.scrapeUrl, scrapeConfig);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`📊 Crawl completed in ${responseTime}ms: ${scrapeResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    return {
      success: scrapeResult.success,
      content: scrapeResult.markdown || "",
      previousContent, // Include for change detection
      responseTime,
      metadata: scrapeResult.firecrawlMetadata,
      strategy, // Include strategy used
      crawlDepth: strategy.depth,
      selectors: strategy.selectors,
    };
    
  } catch (error) {
    console.error(`❌ Failed to crawl ${rule.sourceUrl}:`, error);
    return {
      success: false,
      content: "",
      previousContent: "",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Parse content using compliance template structure
async function parseComplianceContent(content: string, rule: any) {
  // Extract sections based on compliance template
  const sections = {
    overview: extractSection(content, "Overview"),
    coveredEmployers: extractSection(content, "Covered Employers"),
    coveredEmployees: extractSection(content, "Covered Employees"),
    employerResponsibilities: extractSection(content, "What Should Employers Do?"),
    trainingRequirements: extractSection(content, "Training Requirements"),
    postingRequirements: extractSection(content, "Posting Requirements"),
    penalties: extractSection(content, "Penalties for Non-Compliance"),
    sources: extractSection(content, "Sources"),
  };
  
  // Extract key compliance data
  const complianceData = {
    effectiveDates: extractDates(content),
    penaltyAmounts: extractPenalties(content),
    deadlines: extractDeadlines(content),
    coverageThresholds: extractThresholds(content),
  };
  
  return {
    rawContent: content,
    sections,
    complianceData,
    contentHash: await calculateContentHash(content),
    parsedAt: Date.now(),
  };
}

// Detect and analyze changes with AI
async function detectAndAnalyzeChanges(ctx: any, parsedContent: any, rule: any) {
  // Get previous version for comparison (use existing function)
  const previousReport = await ctx.runQuery(internal.complianceQueries.getLatestReport, {
    ruleId: rule.ruleId
  });
  
  if (!previousReport) {
    // No previous version, this is new content
    return {
      hasSignificantChanges: true,
      severity: "medium",
      changeType: "new_content",
      changes: ["Initial content detected"],
      confidence: 1.0,
    };
  }
  
  // Compare content hashes first (quick check)
  if (parsedContent.contentHash === previousReport.contentHash) {
    return {
      hasSignificantChanges: false,
      severity: "none",
      changeType: "no_change",
      changes: [],
      confidence: 1.0,
    };
  }
  
  // Detailed section-by-section comparison
  const sectionChanges = compareSections(
    parsedContent.sections, 
    previousReport.extractedSections
  );
  
  // AI-powered significance analysis
  const aiAnalysis = await analyzeChangesWithAI(ctx, {
    oldContent: previousReport.reportContent,
    newContent: parsedContent.rawContent,
    sectionChanges,
    rule,
  });
  
  return {
    hasSignificantChanges: aiAnalysis.isSignificant,
    severity: aiAnalysis.severity,
    changeType: aiAnalysis.changeType,
    changes: sectionChanges,
    aiConfidence: aiAnalysis.confidence || 0.8,
    impactAreas: aiAnalysis.impactAreas || [],
    recommendations: aiAnalysis.recommendations || [],
  };
}

// Generate compliance alert for significant changes
async function generateComplianceAlert(ctx: any, rule: any, changeAnalysis: any) {
  const alertId = `${rule.ruleId}_${Date.now()}`;
  
  // Create change record
  await ctx.runMutation(internal.complianceChanges.createChange, {
    changeId: alertId,
    ruleId: rule.ruleId,
    changeType: mapChangeType(changeAnalysis.changeType),
    severity: changeAnalysis.severity,
    detectedAt: Date.now(),
    affectedSections: changeAnalysis.changes
      .map((c: any) => c.section)
      .filter((section: any) => section && section !== "undefined"),
    changeDescription: generateChangeDescription(changeAnalysis),
    aiConfidence: changeAnalysis.aiConfidence || 0.8,
    humanVerified: false,
    notificationsSent: [],
  });
  
  // Send notifications based on severity
  if (changeAnalysis.severity === "critical") {
    await sendImmediateAlert(ctx, rule, changeAnalysis);
  }
  
  console.log(`🚨 Alert generated for ${rule.ruleId}: ${changeAnalysis.severity} severity`);
}

// Utility functions
function extractSection(content: string, sectionName: string): string | undefined {
  const lines = content.split('\n');
  let inSection = false;
  let sectionContent = '';
  
  for (const line of lines) {
    if (line.trim() === sectionName) {
      inSection = true;
      continue;
    }
    
    // Stop at next section header
    if (inSection && line.match(/^[A-Z][^a-z]*$/) && line.trim() !== sectionName) {
      break;
    }
    
    if (inSection) {
      sectionContent += line + '\n';
    }
  }
  
  return sectionContent.trim() || undefined;
}

function extractDates(content: string): string[] {
  // Extract dates in various formats
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
    /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }
  
  return [...new Set(dates)]; // Remove duplicates
}

function extractPenalties(content: string): string[] {
  // Extract penalty amounts and descriptions
  const penaltyPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g, // Dollar amounts
    /fine[sd]?\s+(?:of\s+)?(?:up\s+to\s+)?\$[\d,]+/gi,
    /penalty[ies]*\s+(?:of\s+)?(?:up\s+to\s+)?\$[\d,]+/gi,
  ];
  
  const penalties: string[] = [];
  for (const pattern of penaltyPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      penalties.push(...matches);
    }
  }
  
  return [...new Set(penalties)];
}

function extractDeadlines(content: string): string[] {
  // Extract deadline-related text
  const deadlinePatterns = [
    /deadline[s]?\s+(?:is|are|of)\s+[^.]+/gi,
    /due\s+(?:by|on|before)\s+[^.]+/gi,
    /must\s+be\s+(?:completed|submitted|filed)\s+(?:by|on|before)\s+[^.]+/gi,
  ];
  
  const deadlines: string[] = [];
  for (const pattern of deadlinePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      deadlines.push(...matches);
    }
  }
  
  return deadlines;
}

function extractThresholds(content: string): string[] {
  // Extract employee count thresholds and coverage criteria
  const thresholdPatterns = [
    /\b\d+\s+or\s+more\s+employees\b/gi,
    /employers?\s+with\s+\d+\s+or\s+more/gi,
    /businesses?\s+with\s+\d+\s+or\s+more/gi,
  ];
  
  const thresholds: string[] = [];
  for (const pattern of thresholdPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      thresholds.push(...matches);
    }
  }
  
  return thresholds;
}

function compareSections(newSections: any, oldSections: any) {
  const changes = [];
  
  for (const [sectionName, newContent] of Object.entries(newSections)) {
    const oldContent = oldSections[sectionName];
    
    if (!oldContent && newContent) {
      changes.push({
        section: sectionName,
        type: "added",
        description: `New ${sectionName} section added`,
      });
    } else if (oldContent && !newContent) {
      changes.push({
        section: sectionName,
        type: "removed",
        description: `${sectionName} section removed`,
      });
    } else if (oldContent !== newContent) {
      changes.push({
        section: sectionName,
        type: "modified",
        description: `${sectionName} section modified`,
        oldContent: oldContent?.substring(0, 200),
        newContent: (newContent as string)?.substring(0, 200),
      });
    }
  }
  
  return changes;
}

async function analyzeChangesWithAI(ctx: any, data: any) {
  // Placeholder for AI analysis - would integrate with Gemini
  const hasSignificantChanges = data.sectionChanges.length > 0;
  
  return {
    isSignificant: hasSignificantChanges,
    severity: hasSignificantChanges ? "medium" : "low",
    changeType: hasSignificantChanges ? "content_update" : "no_change",
    confidence: 0.8,
    impactAreas: data.sectionChanges.map((c: any) => c.section),
    recommendations: hasSignificantChanges ? ["Review updated requirements"] : [],
  };
}

function mapChangeType(aiChangeType: string): "new_law" | "amendment" | "deadline_change" | "penalty_change" | "coverage_change" | "procedural_change" {
  const mapping: Record<string, any> = {
    "content_update": "amendment",
    "new_content": "new_law",
    "penalty_change": "penalty_change",
    "deadline_update": "deadline_change",
    "coverage_update": "coverage_change",
  };
  
  return mapping[aiChangeType] || "procedural_change";
}

function generateChangeDescription(changeAnalysis: any): string {
  if (!changeAnalysis.changes || changeAnalysis.changes.length === 0) {
    return "No significant changes detected";
  }
  
  const changedSections = changeAnalysis.changes
    .map((c: any) => c.section)
    .filter((section: any) => section && section !== "undefined")
    .join(", ");
    
  return changedSections ? `Changes detected in: ${changedSections}` : "Content changes detected";
}

async function sendImmediateAlert(ctx: any, rule: any, changeAnalysis: any) {
  // Placeholder for immediate alert system
  console.log(`🚨 CRITICAL ALERT: ${rule.jurisdiction} ${rule.topicLabel} has critical changes`);
}

async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
