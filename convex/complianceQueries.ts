import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";

// Get compliance rules by jurisdiction
export const getRulesByJurisdiction = internalQuery({
  args: { jurisdiction: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceRules")
      .withIndex("by_jurisdiction", (q) => q.eq("jurisdiction", args.jurisdiction))
      .collect();
  },
});

// Get compliance rules by topic
export const getRulesByTopic = internalQuery({
  args: { topicKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceRules")
      .withIndex("by_topic", (q) => q.eq("topicKey", args.topicKey))
      .collect();
  },
});

// Get latest compliance report for a rule
export const getLatestReport = internalQuery({
  args: { ruleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceReports")
      .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .first();
  },
});

// Get all reports for a rule
export const getReportsByRuleId = internalQuery({
  args: { ruleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceReports")
      .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .collect();
  },
});

// Public query: Get compliance dashboard data
export const getComplianceDashboard = query({
  args: {
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
  },
  handler: async (ctx, args) => {
    // Get rules with optional filtering
    let rules;
    
    if (args.jurisdiction) {
      rules = await ctx.db
        .query("complianceRules")
        .withIndex("by_jurisdiction", (q) => q.eq("jurisdiction", args.jurisdiction))
        .collect();
    } else if (args.topicKey) {
      rules = await ctx.db
        .query("complianceRules")
        .withIndex("by_topic", (q) => q.eq("topicKey", args.topicKey))
        .collect();
    } else if (args.priority) {
      rules = await ctx.db
        .query("complianceRules")
        .withIndex("by_priority", (q) => q.eq("priority", args.priority))
        .collect();
    } else {
      rules = await ctx.db.query("complianceRules").collect();
    }
    
    // Get recent changes
    const recentChanges = await ctx.db
      .query("complianceChanges")
      .withIndex("by_date", (q) => q.gte("detectedAt", Date.now() - (7 * 24 * 60 * 60 * 1000)))
      .order("desc")
      .take(10);
    
    // Get statistics
    const stats = {
      totalRules: rules.length,
      byPriority: {
        critical: rules.filter(r => r.priority === "critical").length,
        high: rules.filter(r => r.priority === "high").length,
        medium: rules.filter(r => r.priority === "medium").length,
        low: rules.filter(r => r.priority === "low").length,
      },
      byStatus: {
        active: rules.filter(r => r.monitoringStatus === "active").length,
        paused: rules.filter(r => r.monitoringStatus === "paused").length,
        error: rules.filter(r => r.monitoringStatus === "error").length,
      },
      recentChanges: recentChanges.length,
    };
    
    return {
      rules: rules.slice(0, 50), // Limit for performance
      recentChanges,
      stats,
      filters: {
        jurisdiction: args.jurisdiction,
        topicKey: args.topicKey,
        priority: args.priority,
      },
    };
  },
});

// Public query: Get jurisdictions with rule counts
export const getJurisdictions = query({
  handler: async (ctx) => {
    return await ctx.db.query("jurisdictions").collect();
  },
});

// Public query: Get topics with rule counts  
export const getTopics = query({
  handler: async (ctx) => {
    return await ctx.db.query("complianceTopics").collect();
  },
});

// Public query: Search compliance rules
export const searchRules = query({
  args: {
    searchTerm: v.string(),
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let rules = await ctx.db.query("complianceRules").collect();
    
    // Filter by jurisdiction if specified
    if (args.jurisdiction) {
      rules = rules.filter(rule => rule.jurisdiction === args.jurisdiction);
    }
    
    // Filter by topic if specified
    if (args.topicKey) {
      rules = rules.filter(rule => rule.topicKey === args.topicKey);
    }
    
    // Simple text search in topic labels and notes
    const searchTerm = args.searchTerm.toLowerCase();
    const filteredRules = rules.filter(rule => 
      rule.topicLabel.toLowerCase().includes(searchTerm) ||
      rule.notes?.toLowerCase().includes(searchTerm) ||
      rule.jurisdiction.toLowerCase().includes(searchTerm)
    );
    
    return filteredRules.slice(0, args.limit || 20);
  },
});
