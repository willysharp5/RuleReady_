import { action } from "./_generated/server";
import { v } from "convex/values";

// Test function that returns mock sources to test chat UI
export const getMockSources = action({
  args: {
    question: v.string(),
    k: v.optional(v.number()),
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`🧪 Mock sources test for: "${args.question}" (jurisdiction: ${args.jurisdiction})`);
    
    // Create jurisdiction-specific mock sources
    const jurisdiction = args.jurisdiction || "Federal";
    const topicKey = args.topicKey || "general_requirements";
    
    const mockSources = [
      {
        entityId: `test-${jurisdiction.toLowerCase()}-1`,
        entityType: "rule",
        similarity: 0.85,
        snippet: `${jurisdiction} employment law requirements...`,
        sourceUrl: `https://www.${jurisdiction.toLowerCase()}.gov/labor/employment`,
        jurisdiction: jurisdiction,
        topicKey: topicKey,
        topicLabel: topicKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        reportId: undefined,
        ruleId: `${jurisdiction.toLowerCase()}_${topicKey}`,
      },
      {
        entityId: `test-${jurisdiction.toLowerCase()}-2`, 
        entityType: "report",
        similarity: 0.78,
        snippet: `${jurisdiction} compliance report details...`,
        sourceUrl: `https://www.${jurisdiction.toLowerCase()}.gov/employment/compliance`,
        jurisdiction: jurisdiction,
        topicKey: "compliance_overview",
        topicLabel: "Compliance Overview",
        reportId: `${jurisdiction.toLowerCase()}-compliance-report`,
        ruleId: `${jurisdiction.toLowerCase()}_compliance`,
      }
    ];
    
    return { sources: mockSources.slice(0, args.k || 5) };
  }
});
