import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Create a compliance change record
export const createChange = internalMutation({
  args: {
    changeId: v.string(),
    ruleId: v.string(),
    changeType: v.union(
      v.literal("new_law"),
      v.literal("amendment"), 
      v.literal("deadline_change"),
      v.literal("penalty_change"),
      v.literal("coverage_change"),
      v.literal("procedural_change")
    ),
    severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    detectedAt: v.number(),
    affectedSections: v.array(v.string()),
    changeDescription: v.string(),
    aiConfidence: v.number(),
    humanVerified: v.optional(v.boolean()),
    notificationsSent: v.array(v.string()),
    effectiveDate: v.optional(v.number()),
    oldContent: v.optional(v.string()),
    newContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("complianceChanges", args);
  },
});

// Get changes by jurisdiction
export const getChangesByJurisdiction = internalQuery({
  args: {
    jurisdiction: v.string(),
    dateRange: v.optional(v.object({
      startDate: v.number(),
      endDate: v.number(),
    })),
    severity: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
  },
  handler: async (ctx, args) => {
    // Get all rules for this jurisdiction first
    const jurisdictionRules = await ctx.db
      .query("complianceRules")
      .withIndex("by_jurisdiction", (q) => q.eq("jurisdiction", args.jurisdiction))
      .collect();
    
    const ruleIds = jurisdictionRules.map(rule => rule.ruleId);
    
    // Get changes for these rules
    let changes = await ctx.db.query("complianceChanges").collect();
    
    // Filter by rule IDs (jurisdiction)
    changes = changes.filter(change => ruleIds.includes(change.ruleId));
    
    // Filter by date range if specified
    if (args.dateRange) {
      changes = changes.filter(change => 
        change.detectedAt >= args.dateRange!.startDate && 
        change.detectedAt <= args.dateRange!.endDate
      );
    }
    
    // Filter by severity if specified
    if (args.severity) {
      changes = changes.filter(change => change.severity === args.severity);
    }
    
    // Sort by detection date (newest first)
    return changes.sort((a, b) => b.detectedAt - a.detectedAt);
  },
});

// Get compliance changes for a specific rule (public for UI)
export const getComplianceChangeLog = query({
  args: {
    ruleId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const changes = await ctx.db
      .query("complianceChanges")
      .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .take(args.limit || 50);

    // Get the rule details for context
    const rule = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();

    // Get associated reports for each change
    const changesWithReports = await Promise.all(
      changes.map(async (change) => {
        // Find reports around this change time
        const reports = await ctx.db
          .query("complianceReports")
          .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId))
          .filter((q) => q.lte(q.field("generatedAt"), change.detectedAt + 86400000)) // Within 1 day
          .order("desc")
          .take(2); // Get current and previous

        return {
          ...change,
          rule: rule ? {
            jurisdiction: rule.jurisdiction,
            topicLabel: rule.topicLabel,
            sourceUrl: rule.sourceUrl,
          } : null,
          reports: reports,
        };
      })
    );

    return {
      changes: changesWithReports,
      rule,
      totalChanges: changes.length,
    };
  },
});

// Get recent changes across all jurisdictions
export const getRecentChanges = query({
  args: {
    limit: v.optional(v.number()),
    severity: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
    topicKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    let changes = await ctx.db
      .query("complianceChanges")
      .withIndex("by_date", (q) => q.gte("detectedAt", Date.now() - (30 * 24 * 60 * 60 * 1000))) // Last 30 days
      .order("desc")
      .take(args.limit || 50);
    
    // Filter by severity if specified
    if (args.severity) {
      changes = changes.filter(change => change.severity === args.severity);
    }
    
    // Filter by topic if specified
    if (args.topicKey) {
      const topicKey = args.topicKey; // Type assertion
      // Get rules for this topic
      const topicRules = await ctx.db
        .query("complianceRules")
        .withIndex("by_topic", (q) => q.eq("topicKey", topicKey))
        .collect();
      
      const topicRuleIds = topicRules.map(rule => rule.ruleId);
      changes = changes.filter(change => topicRuleIds.includes(change.ruleId));
    }
    
    return changes;
  },
});

// Internal version for use by other functions
export const getRecentChangesInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
    severity: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
    topicKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    let changes = await ctx.db
      .query("complianceChanges")
      .withIndex("by_date", (q) => q.gte("detectedAt", Date.now() - (30 * 24 * 60 * 60 * 1000))) // Last 30 days
      .order("desc")
      .take(args.limit || 50);

    // Apply severity filter if specified
    if (args.severity) {
      changes = changes.filter(change => change.severity === args.severity);
    }

    // Apply topic filter if specified
    if (args.topicKey) {
      // Get rules for this topic and filter changes by matching ruleIds
      const topicRules = await ctx.db
        .query("complianceRules")
        .withIndex("by_topic", (q) => q.eq("topicKey", args.topicKey!))
        .collect();
      const topicRuleIds = topicRules.map(rule => rule.ruleId);
      changes = changes.filter(change => topicRuleIds.includes(change.ruleId));
    }

    return changes;
  },
});

// Analyze change impact using AI
export const analyzeChangeImpact = internalAction({
  args: {
    changeId: v.string(),
    includeRecommendations: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get the change record
    const change: any = await ctx.runQuery(internal.complianceChanges.getChange, {
      changeId: args.changeId
    });
    
    if (!change) {
      throw new Error(`Change ${args.changeId} not found`);
    }
    
    // Get the associated rule
    const rule: any = await ctx.runQuery(internal.complianceCrawler.getRule, {
      ruleId: change.ruleId
    });
    
    if (!rule) {
      throw new Error(`Rule ${change.ruleId} not found`);
    }
    
    // AI analysis of change impact
    const impactAnalysis = await analyzeChangeWithAI(ctx, {
      change,
      rule,
      includeRecommendations: args.includeRecommendations || false,
    });
    
    return {
      changeId: args.changeId,
      ruleId: change.ruleId,
      jurisdiction: rule.jurisdiction,
      topicKey: rule.topicKey,
      impact: impactAnalysis,
      analyzedAt: Date.now(),
    };
  },
});

// Get a specific change record
export const getChange = internalQuery({
  args: { changeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceChanges")
      .withIndex("by_change_id", (q) => q.eq("changeId", args.changeId))
      .first();
  },
});

// Mark change as human verified
export const verifyChange = internalMutation({
  args: {
    changeId: v.string(),
    verified: v.boolean(),
    verifierNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const change = await ctx.db
      .query("complianceChanges")
      .withIndex("by_change_id", (q) => q.eq("changeId", args.changeId))
      .first();
    
    if (!change) {
      throw new Error(`Change ${args.changeId} not found`);
    }
    
    await ctx.db.patch(change._id, {
      humanVerified: args.verified,
      // Could add verifier notes to metadata if needed
    });
    
    return { success: true };
  },
});

// Generate compliance change digest
export const generateChangeDigest = internalAction({
  args: {
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    severity: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
    dateRange: v.optional(v.object({
      startDate: v.number(),
      endDate: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get changes based on filters
    const changes: any = await getFilteredChanges(ctx, args);
    
    if (changes.length === 0) {
      return {
        digest: "No significant compliance changes detected in the specified period.",
        changeCount: 0,
        summary: "All monitored compliance rules remain stable.",
      };
    }
    
    // Group changes by severity and jurisdiction
    const changesByJurisdiction = groupChangesByJurisdiction(changes);
    const changesBySeverity = groupChangesBySeverity(changes);
    
    // Generate AI-powered digest
    const digest = await generateDigestWithAI(ctx, {
      changes,
      changesByJurisdiction,
      changesBySeverity,
      filters: args,
    });
    
    return {
      digest: digest.content,
      changeCount: changes.length,
      summary: digest.summary,
      keyHighlights: digest.highlights,
      recommendedActions: digest.actions,
      generatedAt: Date.now(),
    };
  },
});

// Utility functions
async function getFilteredChanges(ctx: any, filters: any): Promise<any> {
  const dateRange = filters.dateRange || {
    startDate: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: Date.now(),
  };
  
  if (filters.jurisdiction) {
    return await ctx.runQuery(internal.complianceChanges.getChangesByJurisdiction, {
      jurisdiction: filters.jurisdiction,
      dateRange,
      severity: filters.severity,
    });
  } else {
    return await ctx.runQuery(internal.complianceChanges.getRecentChangesInternal, {
      limit: 100,
      severity: filters.severity,
      topicKey: filters.topicKey,
    });
  }
}

function groupChangesByJurisdiction(changes: any[]) {
  return changes.reduce((acc, change) => {
    // We'd need to get jurisdiction from rule - simplified for now
    const jurisdiction = "Unknown"; // Would be populated from rule lookup
    if (!acc[jurisdiction]) acc[jurisdiction] = [];
    acc[jurisdiction].push(change);
    return acc;
  }, {} as Record<string, any[]>);
}

function groupChangesBySeverity(changes: any[]) {
  return changes.reduce((acc, change) => {
    if (!acc[change.severity]) acc[change.severity] = [];
    acc[change.severity].push(change);
    return acc;
  }, {} as Record<string, any[]>);
}

async function analyzeChangeWithAI(ctx: any, data: any) {
  // Placeholder for AI analysis using Gemini
  const prompt = `Analyze the compliance change impact:
  
Rule: ${data.rule.jurisdiction} - ${data.rule.topicLabel}
Change Type: ${data.change.changeType}
Severity: ${data.change.severity}
Description: ${data.change.changeDescription}

Please assess:
1. Business impact and affected employers
2. Implementation timeline and requirements
3. Compliance risks if not addressed
4. Recommended immediate actions
5. Long-term strategic implications`;

  // For now, return structured placeholder
  return {
    businessImpact: assessBusinessImpact(data.change),
    affectedEmployers: ["Small businesses", "Large enterprises"], // Would be AI-generated
    implementationTimeline: "30-60 days", // Would be AI-analyzed
    complianceRisks: ["Potential penalties", "Legal exposure"], // Would be AI-identified
    recommendedActions: ["Review current policies", "Update procedures"], // Would be AI-generated
    confidence: 0.85,
  };
}

async function generateDigestWithAI(ctx: any, data: any) {
  // AI-powered digest generation using Gemini
  const prompt = `Generate a compliance change digest for the following changes:

${data.changes.map((change: any) => 
  `- ${change.changeType} (${change.severity}): ${change.changeDescription}`
).join('\n')}

Provide:
1. Executive summary of key changes
2. Priority actions required
3. Jurisdictions most affected
4. Timeline for compliance
5. Risk assessment`;

  // Placeholder implementation
  return {
    content: `Compliance Change Digest\n\nDetected ${data.changes.length} changes across monitored jurisdictions...`,
    summary: `${data.changes.length} compliance changes detected`,
    highlights: data.changes.slice(0, 5).map((c: any) => c.changeDescription),
    actions: ["Review high-priority changes", "Update compliance procedures"],
  };
}

function assessBusinessImpact(change: any): "high" | "medium" | "low" {
  if (change.severity === "critical") return "high";
  if (change.severity === "high") return "high";
  if (change.severity === "medium") return "medium";
  return "low";
}
