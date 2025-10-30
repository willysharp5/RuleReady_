import { v } from "convex/values";
import { query } from "./_generated/server";

// Get detailed compliance rules for a jurisdiction
export const getJurisdictionDetails = query({
  args: {
    jurisdiction: v.string(),
    topicFilter: v.optional(v.string()),
    priorityFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get rules for this jurisdiction (limited to avoid memory issues)
    let rules = await ctx.db
      .query("complianceRules")
      .withIndex("by_jurisdiction", (q) => q.eq("jurisdiction", args.jurisdiction))
      .take(50); // Limit to 50 rules to prevent memory issues
    
    // Apply topic filter if specified
    if (args.topicFilter) {
      rules = rules.filter(rule => rule.topicSlug === args.topicFilter);
    }
    
    // Apply priority filter if specified
    if (args.priorityFilter) {
      rules = rules.filter(rule => rule.priority === args.priorityFilter);
    }
    
    // Get recent reports for these rules (limited to avoid memory issues)
    const limitedRuleIds = rules.slice(0, 5).map(r => r.ruleId); // Only check first 5 rules
    let recentReports: any[] = [];
    
    if (limitedRuleIds.length > 0) {
      try {
        recentReports = await ctx.db
          .query("complianceReports")
          .filter(q => q.or(...limitedRuleIds.map(ruleId => q.eq(q.field("ruleId"), ruleId))))
          .order("desc")
          .take(5); // Further limit to 5 reports
      } catch (error) {
        console.log("Could not load reports, skipping:", error);
        recentReports = [];
      }
    }
    
    // Group rules by topic for better organization
    const rulesByTopic = rules.reduce((acc, rule) => {
      if (!acc[rule.topicSlug]) {
        acc[rule.topicSlug] = [];
      }
      acc[rule.topicSlug].push(rule);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Calculate summary statistics
    const priorityCount = rules.reduce((acc, rule) => {
      acc[rule.priority] = (acc[rule.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      jurisdiction: args.jurisdiction,
      totalRules: rules.length,
      rules: rules.slice(0, 10), // Limit to prevent large responses
      rulesByTopic,
      recentReports: recentReports.map(report => ({
        reportId: report.reportId,
        ruleId: report.ruleId,
        contentLength: report.contentLength,
        generatedAt: report.generatedAt,
      })),
      summary: {
        priorityBreakdown: priorityCount,
        topicCount: Object.keys(rulesByTopic).length,
        hasRecentReports: recentReports.length > 0,
      }
    };
  }
});
