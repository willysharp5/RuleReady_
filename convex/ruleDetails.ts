import { v } from "convex/values";
import { query } from "./_generated/server";

// Get detailed rule data including generated compliance reports
export const getRuleDetails = query({
  args: {
    ruleId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the rule
    const rule = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();
    
    if (!rule) {
      throw new Error(`Rule not found: ${args.ruleId}`);
    }
    
    // Get AI reports for this rule (structured data)
    const aiReports = await ctx.db
      .query("complianceAIReports")
      .filter(q => q.eq(q.field("ruleId"), args.ruleId))
      .order("desc")
      .take(10);
    
    // Get the most recent AI report with structured data
    const latestAIReport = aiReports.length > 0 ? aiReports[0] : null;
    
    // Get related rules from the same jurisdiction and topic
    const relatedRules = await ctx.db
      .query("complianceRules")
      .withIndex("by_jurisdiction", (q) => q.eq("jurisdiction", rule.jurisdiction))
      .filter(q => q.and(
        q.eq(q.field("topicKey"), rule.topicKey),
        q.neq(q.field("ruleId"), rule.ruleId)
      ))
      .take(5);
    
    return {
      rule: {
        ruleId: rule.ruleId,
        jurisdiction: rule.jurisdiction,
        topicKey: rule.topicKey,
        topicLabel: rule.topicLabel,
        priority: rule.priority,
        sourceUrl: rule.sourceUrl,
        notes: rule.notes,
        metadata: rule.metadata,
        updatedAt: rule.updatedAt,
        createdAt: rule.createdAt,
      },
      latestReport: latestAIReport ? {
        reportId: latestAIReport.reportId,
        content: latestAIReport.rawContent,
        contentLength: latestAIReport.rawContent?.length || 0,
        generatedAt: latestAIReport.processedAt,
        structuredData: latestAIReport.structuredData,
      } : null,
      reportHistory: aiReports.map(report => ({
        reportId: report.reportId,
        generatedAt: report.processedAt,
        contentLength: report.rawContent?.length || 0,
        structuredData: report.structuredData,
      })),
      relatedRules: relatedRules.map(r => ({
        ruleId: r.ruleId,
        topicLabel: r.topicLabel,
        priority: r.priority,
      })),
      stats: {
        totalReports: aiReports.length,
        hasContent: !!(latestAIReport?.structuredData?.overview || latestAIReport?.rawContent),
        lastGenerated: latestAIReport?.processedAt,
      }
    };
  }
});
