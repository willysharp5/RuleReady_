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
    needsClarification?: {
      type: "jurisdiction" | "topic" | "both";
      message: string;
      suggestions: string[];
    };
  }> => {
    console.log(`🔍 RAG Query: "${args.query}" (${args.jurisdiction || 'all jurisdictions'}, ${args.topicKey || 'all topics'})`);
    
    // 1. FIRST: Search for relevant content in database
    const embeddingSources = await ctx.runAction(api.embeddingManager.embeddingTopKSources, {
      question: args.query,
      k: args.maxSources || 10,
      threshold: args.threshold || 0.7,
      jurisdiction: args.jurisdiction,
      topicKey: args.topicKey,
    });
    
    const relevantRules = embeddingSources.sources || [];
    console.log(`📊 Found ${relevantRules.length} relevant sources via embeddings`);
    
    // 2. Get user's chat system prompt from database - NO DEFAULT FALLBACK
    const chatSettings = await ctx.runQuery(api.chatSettings.getChatSettings);
    const userSystemPrompt = chatSettings.chatSystemPrompt;
    
    if (!userSystemPrompt) {
      throw new Error("Chat system prompt not configured. Please set it in Settings.");
    }
    
    console.log(`💬 Using chat system prompt from database: ${userSystemPrompt.substring(0, 50)}...`);
    
    // 3. If NO sources found, return clear message - DO NOT HALLUCINATE
    if (relevantRules.length === 0) {
      const jurisdictionMsg = args.jurisdiction && args.jurisdiction !== "All" 
        ? ` for ${args.jurisdiction}` 
        : "";
      const topicMsg = args.topicKey && args.topicKey !== "All"
        ? ` about ${args.topicKey}`
        : "";
      
      return {
        answer: `I don't have any compliance information in my database${jurisdictionMsg}${topicMsg} that matches your query: "${args.query}"\n\nThis could mean:\n- This jurisdiction/topic combination hasn't been added to the system yet\n- The search threshold (${args.threshold || 0.7}) is too strict - try lowering it to 0.5\n- Try selecting different filters or rephrasing your question\n\nAvailable data covers: ${await getAvailableJurisdictionsAndTopics(ctx)}`,
        sources: [],
        confidence: 0.0,
        relatedTopics: [],
        recentChanges: [],
        metadata: {
          sourcesFound: 0,
          changesIncluded: 0,
          queryTime: Date.now(),
          threshold: args.threshold || 0.7,
        },
      };
    }
    
    // 4. Include recent changes if requested
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
    
    // 5. Generate comprehensive response using user's chat system prompt
    const response = await generateComplianceResponse(ctx, {
      query: args.query,
      relevantRules,
      recentChanges,
      userSystemPrompt, // Use user's configurable prompt
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

// Get what data is actually available in the database
async function getAvailableJurisdictionsAndTopics(ctx: any): Promise<string> {
  try {
    const jurisdictions = await ctx.runQuery(api.complianceQueries.getJurisdictions);
    const topics = await ctx.runQuery(api.complianceQueries.getTopics);
    
    const jurisdictionList = jurisdictions?.slice(0, 5).map((j: any) => j.name || j.code).join(', ') || "Loading...";
    const topicList = topics?.slice(0, 5).map((t: any) => t.name || t.topicKey).join(', ') || "Loading...";
    
    return `Jurisdictions: ${jurisdictionList}, Topics: ${topicList}`;
  } catch (e) {
    return "Check database for available data";
  }
}

// Generate comprehensive compliance response using user's configurable system prompt
async function generateComplianceResponse(ctx: any, params: {
  query: string;
  relevantRules: any[];
  recentChanges: any[];
  userSystemPrompt: string; // User-configurable from chat settings
  jurisdiction?: string;
  topicKey?: string;
}) {
  try {
    // Build source list for citation
    const sourcesList = params.relevantRules.map((rule: any, i: number) => 
      `[${i+1}] ${rule.jurisdiction || 'Unknown'} - ${rule.topicLabel || rule.topicKey || 'Unknown Topic'}\n` +
      `    URL: ${rule.sourceUrl || 'No URL'}\n` +
      `    ${(rule.snippet || rule.content || 'No content').substring(0, 200)}...`
    ).join('\n\n');
    
    const changesContext = params.recentChanges.length > 0 ? 
      `\nRECENT CHANGES:\n${params.recentChanges.map((c: any) => 
        `- ${c.changeDescription} (${c.severity})`
      ).join('\n')}` : '';
    
    // Build comprehensive multi-jurisdiction context
    const jurisdictionsInSources = [...new Set(params.relevantRules.map((r: any) => r.jurisdiction).filter(Boolean))];
    
    // FILTERING INSTRUCTIONS: Injected based on user's filter selections
    const filterContext = params.jurisdiction && params.jurisdiction !== "All"
      ? `\n🎯 USER SELECTED FILTER: ${params.jurisdiction} jurisdiction ONLY. Do NOT include other jurisdictions.`
      : `\n🌍 USER SELECTED: ALL JURISDICTIONS. You have sources from ${jurisdictionsInSources.length} jurisdiction(s): ${jurisdictionsInSources.join(', ')}. Include information from ALL of them, not just one.`;
    
    const topicContext = params.topicKey && params.topicKey !== "All"
      ? `\n🎯 USER SELECTED FILTER: ${params.topicKey} topic ONLY. Do NOT discuss other topics.`
      : `\n📋 USER SELECTED: ALL TOPICS. Cover all relevant topics found in the sources.`;
    
    // USER'S CUSTOM SYSTEM PROMPT (editable in settings) + STRICT SOURCE-ONLY RULES
    const prompt = `${params.userSystemPrompt}

CRITICAL RULES (ALWAYS FOLLOW):
1. Use ONLY information from the sources provided below
2. DO NOT make up information or mention jurisdictions/topics not in sources
3. DO NOT arbitrarily pick one jurisdiction when multiple are available
4. Cite sources as [1], [2], [3] with clickable URLs
5. If sources don't fully answer the question, say so clearly
${filterContext}
${topicContext}

QUERY: ${params.query}

AVAILABLE SOURCES (${params.relevantRules.length} total from ${jurisdictionsInSources.join(', ')}):
${sourcesList}

YOUR TASK:
${params.jurisdiction && params.jurisdiction !== "All" 
  ? `✅ Filter is ON: Answer ONLY for ${params.jurisdiction}. Ignore other jurisdictions in the sources.`
  : `✅ Filter is OFF: Give COMPREHENSIVE answer covering ALL ${jurisdictionsInSources.length} jurisdiction(s): ${jurisdictionsInSources.join(', ')}. DO NOT just pick the first state - include information from ALL of them.`}

${params.topicKey && params.topicKey !== "All"
  ? `✅ Topic filter is ON: Discuss ONLY ${params.topicKey}. Ignore other topics.`
  : `✅ Topic filter is OFF: Address all relevant topics found in the sources.`}

FORMAT:
- Start with summary answering the question
- Group information by jurisdiction (e.g., "In Connecticut...", "In Georgia...")
- Cite each source as [1], [2], [3] with clickable URLs
- If covering multiple jurisdictions, compare/contrast them
- End with key takeaways

EXAMPLE (for multi-jurisdiction):
"Overtime requirements vary by jurisdiction:

**Connecticut** [1]
- Requires 1.5x pay after 40 hours
- Source: [link]

**Georgia** [2]  
- Similar to Connecticut with additional provisions
- Source: [link]

**Key Takeaway**: Most jurisdictions require 1.5x pay after 40 hours, but check your specific state for details."

Answer the query now:`;

    // Use existing Gemini infrastructure (placeholder for now)  
    const response = await callGeminiForAnalysis(prompt);
    
    // Extract actual jurisdictions and topics from sources (not hallucinated)
    const actualJurisdictions = [...new Set(params.relevantRules.map((r: any) => r.jurisdiction).filter(Boolean))];
    const actualTopics = [...new Set(params.relevantRules.map((r: any) => r.topicKey || r.topicLabel).filter(Boolean))];
    
    // Build a proper answer from the actual sources
    const answer = buildAnswerFromSources(params.relevantRules, params.query);
    
    return {
      answer: response.answer || answer,
      confidence: response.confidence || 0.7,
      relatedTopics: actualTopics.slice(0, 5), // Only topics from actual sources
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

// Build a clear answer from actual sources (no hallucination)
function buildAnswerFromSources(sources: any[], query: string): string {
  if (sources.length === 0) {
    return "No relevant sources found in the database.";
  }
  
  const jurisdictions = [...new Set(sources.map((s: any) => s.jurisdiction).filter(Boolean))];
  const topics = [...new Set(sources.map((s: any) => s.topicLabel || s.topicKey).filter(Boolean))];
  
  // Build comprehensive answer covering ALL jurisdictions
  let answer = `## Answer for: "${query}"\n\n`;
  answer += `I found information from **${jurisdictions.length} jurisdiction(s)**: ${jurisdictions.join(', ')}\n\n`;
  
  // Group by jurisdiction for clarity
  const byJurisdiction: Record<string, any[]> = {};
  sources.forEach(source => {
    const j = source.jurisdiction || 'Unknown';
    if (!byJurisdiction[j]) byJurisdiction[j] = [];
    byJurisdiction[j].push(source);
  });
  
  // Present each jurisdiction's information
  Object.entries(byJurisdiction).forEach(([jurisdiction, jurisdictionSources]) => {
    answer += `### ${jurisdiction}\n\n`;
    
    jurisdictionSources.forEach((source: any, idx: number) => {
      const sourceNum = sources.indexOf(source) + 1;
      const snippet = source.snippet || source.content || '';
      const url = source.sourceUrl || 'No URL available';
      
      answer += `**[${sourceNum}] ${source.topicLabel || source.topicKey}**\n`;
      answer += `${snippet.substring(0, 250)}...\n`;
      answer += `📎 [View Source](${url})\n`;
      answer += `Relevance: ${((source.similarity || 0) * 100).toFixed(1)}%\n\n`;
    });
  });
  
  answer += `\n---\n`;
  answer += `💡 **Note**: This answer covers ${jurisdictions.length} jurisdiction(s) and uses ONLY the ${sources.length} source(s) listed above with clickable URLs for verification.\n`;
  
  if (jurisdictions.length > 1) {
    answer += `\n💬 **Tip**: To focus on a specific jurisdiction, select it from the filter dropdown before asking your question.`;
  }
  
  return answer;
}

// Placeholder for Gemini API call - returns structured response
async function callGeminiForAnalysis(prompt: string) {
  // TODO: Integrate with actual Gemini API via aiService
  // For now, return placeholder to use fallback
  console.log("📝 Gemini prompt prepared (integration pending)");
  return {
    answer: null, // Will use fallback built from sources
    confidence: null,
    relatedTopics: null,
    keyPoints: null,
    actionItems: null,
    warnings: null,
  };
}

// Get what data is actually available in the database
async function getAvailableJurisdictionsAndTopics(ctx: any): Promise<string> {
  try {
    const jurisdictions = await ctx.runQuery(api.complianceQueries.getJurisdictions);
    const topics = await ctx.runQuery(api.complianceQueries.getTopics);
    
    const jurisdictionList = jurisdictions?.slice(0, 5).map((j: any) => j.name || j.code).join(', ') || "Loading...";
    const topicList = topics?.slice(0, 5).map((t: any) => t.name || t.topicKey).join(', ') || "Loading...";
    
    return `Jurisdictions: ${jurisdictionList}, Topics: ${topicList}`;
  } catch (e) {
    return "Check database for available data";
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
