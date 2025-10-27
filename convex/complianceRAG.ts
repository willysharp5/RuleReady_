import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

// PHASE 3.1: Enhanced RAG System for compliance knowledge queries
export const queryComplianceKnowledge = action({
  args: {
    query: v.string(),
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    includeChanges: v.optional(v.boolean()),
    maxSources: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    answer: string;
    sources: unknown[];
    confidence: number;
    relatedTopics: string[];
    recentChanges: unknown[];
    metadata: {
      sourcesFound: number;
      changesIncluded: number;
      queryTime: number;
      threshold: number;
    };
  }> => {
    console.log(`🔍 RAG Query: "${args.query}" (${args.jurisdiction || 'all jurisdictions'}, ${args.topicKey || 'all topics'})`);
    
    // 1. Use existing embedding search to find relevant content
    const embeddingSources = await ctx.runAction(api.embeddingManager.embeddingTopKSources, {
      question: args.query,
      k: args.maxSources || 10,
      threshold: args.threshold || 0.7,
      jurisdiction: args.jurisdiction,
      topicKey: args.topicKey,
    });
    
    const relevantRules = embeddingSources.sources || [];
    console.log(`📊 Found ${relevantRules.length} relevant sources via embeddings`);
    
    // 2. Include recent changes if requested
    let recentChanges: any[] = [];
    if (args.includeChanges && relevantRules.length > 0) {
      try {
        const ruleIds = relevantRules.map((r: any) => r.ruleId).filter(Boolean);
        recentChanges = await getRecentChanges(ctx, ruleIds);
        console.log(`📈 Found ${recentChanges.length} recent changes`);
      } catch (e) {
        console.log("Could not fetch recent changes:", e);
      }
    }
    
    // 3. Generate comprehensive response with Gemini
    const response = await generateComplianceResponse(ctx, {
      query: args.query,
      relevantRules,
      recentChanges,
      context: "compliance_professional",
      jurisdiction: args.jurisdiction,
      topicKey: args.topicKey,
    });
    
    return {
      answer: response.answer,
      sources: relevantRules,
      confidence: response.confidence,
      relatedTopics: response.relatedTopics,
      recentChanges: recentChanges,
      metadata: {
        sourcesFound: relevantRules.length,
        changesIncluded: recentChanges.length,
        queryTime: Date.now(),
        threshold: args.threshold || 0.7,
      }
    };
  }
});

// Enhanced compliance query with semantic filtering
export const semanticComplianceSearch = action({
  args: {
    query: v.string(),
    filters: v.optional(v.object({
      jurisdictions: v.optional(v.array(v.string())),
      topics: v.optional(v.array(v.string())),
      priorities: v.optional(v.array(v.string())),
      dateRange: v.optional(v.object({
        start: v.number(),
        end: v.number(),
      })),
    })),
    searchType: v.optional(v.union(
      v.literal("rules_only"),
      v.literal("reports_only"), 
      v.literal("both")
    )),
  },
  handler: async (ctx, args): Promise<{
    query: string;
    results: { rules: unknown[]; reports: unknown[]; embeddings: unknown[] };
    totalFound: number;
    searchType: string;
    filters: unknown;
  }> => {
    console.log(`🔎 Semantic search: "${args.query}"`);
    
    const searchType = args.searchType || "both";
    const results: any = { rules: [], reports: [], embeddings: [] };
    
    // Search rules if requested
    if (searchType === "rules_only" || searchType === "both") {
      const ruleResults = await ctx.runAction(api.embeddingManager.embeddingTopKSources, {
        question: args.query,
        k: 20,
        threshold: 0.6,
        entityType: "rule",
        jurisdiction: args.filters?.jurisdictions?.[0],
        topicKey: args.filters?.topics?.[0],
      });
      results.rules = ruleResults.sources || [];
    }
    
    // Search reports if requested
    if (searchType === "reports_only" || searchType === "both") {
      const reportResults = await ctx.runAction(api.embeddingManager.embeddingTopKSources, {
        question: args.query,
        k: 20,
        threshold: 0.6,
        entityType: "report",
        jurisdiction: args.filters?.jurisdictions?.[0],
        topicKey: args.filters?.topics?.[0],
      });
      results.reports = reportResults.sources || [];
    }
    
    // Apply additional filters
    if (args.filters) {
      results.rules = applyFilters(results.rules, args.filters);
      results.reports = applyFilters(results.reports, args.filters);
    }
    
    console.log(`📊 Semantic search results: ${results.rules.length} rules, ${results.reports.length} reports`);
    
    return {
      query: args.query,
      results,
      totalFound: results.rules.length + results.reports.length,
      searchType,
      filters: args.filters,
    };
  }
});

// Get recent changes for specific rules
async function getRecentChanges(ctx: any, ruleIds: string[], daysBack: number = 30) {
  try {
    const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    
    // This would query complianceChanges table when it's implemented
    // For now, return empty array as placeholder
    console.log(`Looking for changes in last ${daysBack} days for ${ruleIds.length} rules`);
    
    return []; // Placeholder - implement when complianceChanges table is ready
    
  } catch (error) {
    console.error("Error fetching recent changes:", error);
    return [];
  }
}

// Generate comprehensive compliance response using Gemini
async function generateComplianceResponse(ctx: any, params: {
  query: string;
  relevantRules: any[];
  recentChanges: any[];
  context: string;
  jurisdiction?: string;
  topicKey?: string;
}) {
  try {
    // Build context from relevant sources
    const sourcesContext = params.relevantRules
      .slice(0, 5) // Limit to top 5 sources
      .map((rule: any, i: number) => 
        `[${i+1}] ${rule.jurisdiction} - ${rule.topicLabel}\n` +
        `URL: ${rule.sourceUrl}\n` +
        `Similarity: ${((rule.similarity || 0) * 100).toFixed(1)}%\n` +
        `Content: ${(rule.content || '').substring(0, 300)}...`
      ).join('\n\n');
    
    const changesContext = params.recentChanges.length > 0 ? 
      `\nRECENT CHANGES:\n${params.recentChanges.map((c: any) => 
        `- ${c.changeDescription} (${c.severity})`
      ).join('\n')}` : '';
    
    // Create comprehensive prompt
    const prompt = `You are a professional compliance assistant with access to comprehensive employment law data.

QUERY: ${params.query}

RELEVANT SOURCES:
${sourcesContext}
${changesContext}

CONTEXT: ${params.context}
${params.jurisdiction ? `JURISDICTION FOCUS: ${params.jurisdiction}` : ''}
${params.topicKey ? `TOPIC FOCUS: ${params.topicKey}` : ''}

Provide a comprehensive, professional response that:
1. Directly answers the query using the provided sources
2. Cites specific jurisdictions and sources
3. Includes practical implementation guidance
4. Highlights any recent changes that affect the answer
5. Suggests related compliance areas to consider

Format as structured JSON:
{
  "answer": "Comprehensive answer with citations",
  "confidence": 0.0-1.0,
  "relatedTopics": ["topic1", "topic2"],
  "keyPoints": ["point1", "point2"],
  "actionItems": ["action1", "action2"],
  "warnings": ["warning1", "warning2"]
}`;

    // Use existing Gemini infrastructure (placeholder for now)
    const response = await callGeminiForAnalysis(prompt);
    
    return {
      answer: response.answer || "Analysis pending - integrate with existing Gemini API",
      confidence: response.confidence || 0.8,
      relatedTopics: response.relatedTopics || [],
      keyPoints: response.keyPoints || [],
      actionItems: response.actionItems || [],
      warnings: response.warnings || [],
    };
    
  } catch (error) {
    console.error("Error generating compliance response:", error);
    return {
      answer: "Error generating response - please try again",
      confidence: 0.0,
      relatedTopics: [],
      keyPoints: [],
      actionItems: [],
      warnings: ["Response generation failed"],
    };
  }
}

// Apply additional filters to search results
function applyFilters(results: any[], filters: any) {
  let filtered = results;
  
  // Jurisdiction filter
  if (filters.jurisdictions && filters.jurisdictions.length > 0) {
    filtered = filtered.filter((r: any) => 
      filters.jurisdictions.includes(r.jurisdiction)
    );
  }
  
  // Topic filter
  if (filters.topics && filters.topics.length > 0) {
    filtered = filtered.filter((r: any) => 
      filters.topics.includes(r.topicKey)
    );
  }
  
  // Priority filter
  if (filters.priorities && filters.priorities.length > 0) {
    filtered = filtered.filter((r: any) => 
      filters.priorities.includes(r.priority)
    );
  }
  
  // Date range filter (if applicable)
  if (filters.dateRange) {
    filtered = filtered.filter((r: any) => {
      const itemDate = r.lastUpdated || r.createdAt || 0;
      return itemDate >= filters.dateRange.start && itemDate <= filters.dateRange.end;
    });
  }
  
  return filtered;
}

// Placeholder for Gemini integration
async function callGeminiForAnalysis(prompt: string) {
  // This would integrate with existing Gemini API setup
  // For now, return structured placeholder
  return {
    answer: `Analysis for: ${prompt.substring(0, 100)}...`,
    confidence: 0.8,
    relatedTopics: ["compliance", "employment_law"],
    keyPoints: ["Key point 1", "Key point 2"],
    actionItems: ["Review requirements", "Update policies"],
    warnings: [],
  };
}
