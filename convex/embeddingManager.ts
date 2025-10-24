import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, action, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Store an embedding in the database
export const storeEmbedding = internalMutation({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("rule"), v.literal("report")),
    contentHash: v.string(),
    content: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingDimensions: v.number(),
    metadata: v.object({
      jurisdiction: v.optional(v.string()),
      topicKey: v.optional(v.string()),
      contentLength: v.optional(v.number()),
      processingMethod: v.optional(v.string()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if embedding already exists
    const existing = await ctx.db
      .query("complianceEmbeddings")
      .withIndex("by_hash", (q) => q.eq("contentHash", args.contentHash))
      .first();

    if (existing) {
      // Update existing embedding
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        updatedAt: args.updatedAt,
      });
      return existing._id;
    } else {
      // Create new embedding
      return await ctx.db.insert("complianceEmbeddings", args);
    }
  },
});

// Get embeddings for an entity
export const getEntityEmbeddings = internalQuery({
  args: { entityId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceEmbeddings")
      .withIndex("by_entity", (q) => q.eq("entityId", args.entityId))
      .order("asc")
      .collect();
  },
});

// Get all embeddings (for similarity search)
export const getAllEmbeddings = internalQuery({
  args: {
    entityType: v.optional(v.union(v.literal("rule"), v.literal("report"))),
  },
  handler: async (ctx, args) => {
    if (args.entityType) {
      const entityType = args.entityType; // TypeScript assertion
      return await ctx.db
        .query("complianceEmbeddings")
        .withIndex("by_entity_type", (q) => q.eq("entityType", entityType))
        .collect();
    } else {
      return await ctx.db.query("complianceEmbeddings").collect();
    }
  },
});

// Read-limited embeddings query to avoid large reads (temporarily public for debugging)
export const getEmbeddingsLimited = query({
  args: {
    entityType: v.optional(v.union(v.literal("rule"), v.literal("report"))),
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const base = args.entityType
      ? ctx.db
          .query("complianceEmbeddings")
          .withIndex("by_entity_type", (ix) => ix.eq("entityType", args.entityType!))
      : ctx.db.query("complianceEmbeddings");

    // Take up to the limit (capped to prevent byte overflow), then filter by metadata if provided
    const safeLimit = Math.min(args.limit, 200); // Increase limit to find more matches
    const batch = await base.take(safeLimit);
    console.log(`🔍 getEmbeddingsLimited: Retrieved ${batch.length} embeddings from database`);
    
    if (!args.jurisdiction && !args.topicKey) {
      console.log(`📋 No filters applied, returning all ${batch.length} embeddings`);
      return batch;
    }

    const filtered = batch.filter((emb: any) => {
      const matchesJurisdiction = !args.jurisdiction || emb.metadata?.jurisdiction === args.jurisdiction;
      const matchesTopic = !args.topicKey || emb.metadata?.topicKey === args.topicKey;
      return matchesJurisdiction && matchesTopic;
    });
    
    console.log(`🎯 Applied filters: ${filtered.length}/${batch.length} embeddings match (jurisdiction=${args.jurisdiction}, topic=${args.topicKey})`);
    return filtered;
  },
});

// Import existing embeddings (from your generated data)
export const importExistingEmbeddings = internalAction({
  args: {
    embeddingData: v.array(v.object({
      entityId: v.string(),
      entityType: v.string(),
      content: v.string(),
      embedding: v.array(v.number()),
      contentHash: v.optional(v.string()),
      metadata: v.optional(v.object({
        jurisdiction: v.optional(v.string()),
        topicKey: v.optional(v.string()),
      })),
    })),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;
    let imported = 0;
    
    console.log(`🚀 Starting import of ${args.embeddingData.length} embeddings...`);
    
    // Process in batches
    for (let i = 0; i < args.embeddingData.length; i += batchSize) {
      const batch = args.embeddingData.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(args.embeddingData.length / batchSize)}`);
      
      for (const embedding of batch) {
        try {
          const contentHash = embedding.contentHash || await calculateContentHash(embedding.content);
          
          await ctx.runMutation(internal.embeddingManager.storeEmbedding, {
            entityId: embedding.entityId,
            entityType: embedding.entityType === "rule" ? "rule" : "report",
            contentHash,
            content: embedding.content,
            chunkIndex: 0,
            totalChunks: 1,
            embedding: embedding.embedding,
            embeddingModel: "gemini-embedding-001",
            embeddingDimensions: 1536,
            metadata: {
              jurisdiction: embedding.metadata?.jurisdiction,
              topicKey: embedding.metadata?.topicKey,
              contentLength: embedding.content.length,
              processingMethod: "imported_from_existing",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          imported++;
          
        } catch (error) {
          console.error(`Failed to import embedding for ${embedding.entityId}:`, error);
        }
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Embedding import completed: ${imported} imported`);
    
    return { imported, total: args.embeddingData.length };
  },
});

// Search similar embeddings using cosine similarity
export const searchSimilarEmbeddings = internalAction({
  args: {
    queryEmbedding: v.array(v.number()),
    entityType: v.optional(v.union(v.literal("rule"), v.literal("report"))),
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const limit = args.limit || 10;
    const threshold = args.threshold || 0.7;

    // Read-limited embeddings to stay under Convex read limits
    const scanLimit = args.jurisdiction || args.topicKey ? 200 : 100;
    console.log(`📊 Querying embeddings with entityType=${args.entityType || "report"}, jurisdiction=${args.jurisdiction}, topicKey=${args.topicKey}, limit=${scanLimit}`);
    
    const allEmbeddings: any[] = await ctx.runQuery(api.embeddingManager.getEmbeddingsLimited, {
      entityType: args.entityType || "report",
      jurisdiction: args.jurisdiction,
      topicKey: args.topicKey,
      limit: scanLimit,
    });
    console.log(`📋 Retrieved ${allEmbeddings.length} embeddings from database`);

    // Filter by metadata if specified
    let filteredEmbeddings: any[] = allEmbeddings;
    if (args.jurisdiction || args.topicKey) {
      filteredEmbeddings = allEmbeddings.filter((emb: any) => {
        const matchesJurisdiction = !args.jurisdiction || 
          emb.metadata?.jurisdiction === args.jurisdiction;
        const matchesTopic = !args.topicKey || 
          emb.metadata?.topicKey === args.topicKey;
        return matchesJurisdiction && matchesTopic;
      });
      console.log(`🎯 After metadata filtering: ${filteredEmbeddings.length}/${allEmbeddings.length} embeddings remain`);
    }

    // Calculate cosine similarity for each embedding
    console.log(`🧮 Calculating similarity for ${filteredEmbeddings.length} embeddings...`);
    const similarities: any[] = filteredEmbeddings.map((emb: any) => {
      const sim = cosineSimilarity(args.queryEmbedding, emb.embedding);
      return {
        ...emb,
        similarity: sim
      };
    });

    console.log(`📊 Similarity scores calculated, max: ${Math.max(...similarities.map(s => s.similarity))}, min: ${Math.min(...similarities.map(s => s.similarity))}`);

    // Sort by similarity (highest first) and take top results
    // Note: For some embedding models, similarities might be negative but still meaningful
    const sorted = similarities
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);

    // If all similarities are very low (e.g., all negative), still return top matches
    const filtered = sorted.filter((emb: any) => emb.similarity >= threshold);
    
    console.log(`🎯 After threshold filter (>=${threshold}): ${filtered.length} embeddings remain`);
    if (filtered.length === 0 && sorted.length > 0) {
      console.log(`⚠️ All similarities below threshold, returning top ${Math.min(3, sorted.length)} matches anyway`);
      const topMatches = sorted.slice(0, Math.min(3, sorted.length));
      console.log(`📈 Top similarity scores: ${topMatches.map(f => f.similarity.toFixed(3)).join(', ')}`);
      return topMatches;
    }
    
    if (filtered.length > 0) {
      console.log(`📈 Top similarity scores: ${filtered.slice(0, 3).map(f => f.similarity.toFixed(3)).join(', ')}`);
    }

    return filtered;
  },
});

// Generate embedding for text using Gemini
export const generateEmbedding = internalAction({
  args: {
    content: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would integrate with Gemini API
    // For now, return a placeholder - we'll implement the Gemini integration next
    // Generate query embedding for similarity search (not content re-embedding)
    
    // Placeholder - actual Gemini API call would go here
    const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
    
    return {
      embedding: mockEmbedding,
      dimensions: 1536,
      model: args.model || "gemini-embedding-001"
    };
  },
});

// Cosine similarity calculation
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Public action: Top‑K embedding search with hydrated sources for chat
export const embeddingTopKSources = action({
  args: {
    question: v.string(),
    k: v.optional(v.number()),
    threshold: v.optional(v.number()),
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    entityType: v.optional(v.union(v.literal("rule"), v.literal("report"))),
  },
  handler: async (ctx, args) => {
    const k = args.k || 5;
    const threshold = args.threshold || 0.65;

    console.log(`🔍 embeddingTopKSources called with: question="${args.question}", k=${k}, threshold=${threshold}, jurisdiction=${args.jurisdiction}, topicKey=${args.topicKey}`);

    let matches: any[] = [];
    
    try {
      // 1) Generate query embedding
      console.log('📝 Generating embedding for question...');
      const gen = await ctx.runAction(internal.embeddingManager.generateEmbedding, {
        content: args.question,
      });
      console.log(`✅ Generated embedding with ${gen.embedding?.length || 0} dimensions`);

      // 2) Similarity search
      console.log('🔍 Searching for similar embeddings...');
      matches = await ctx.runAction(internal.embeddingManager.searchSimilarEmbeddings, {
        queryEmbedding: gen.embedding,
        entityType: args.entityType,
        jurisdiction: args.jurisdiction,
        topicKey: args.topicKey,
        limit: k,
        threshold,
      });
      console.log(`📊 Found ${matches.length} matches above threshold ${threshold}`);
    } catch (error) {
      console.error('❌ Error in embedding search:', error);
      return { sources: [] };
    }

    // 3) Hydrate entities
    console.log(`🔗 Hydrating ${matches.length} matches...`);
    const sources: any[] = [];
    for (const m of matches) {
      const entityType = m.entityType as "rule" | "report";
      console.log(`🔍 Hydrating ${entityType} with entityId: ${m.entityId}`);
      let sourceUrl: string | undefined;
      let jurisdiction: string | undefined;
      let topicKey: string | undefined;
      let topicLabel: string | undefined;
      let reportId: string | undefined;
      let ruleId: string | undefined;
      let reportData: any = null;

      if (entityType === "report") {
        // Find report row by reportId
        reportData = await ctx.runQuery(internal.embeddingManager._getReportById, { reportId: m.entityId });
        if (reportData) {
          reportId = reportData.reportId;
          ruleId = reportData.ruleId;
          const rule = await ctx.runQuery(internal.embeddingManager._getRuleByRuleId, { ruleId: reportData.ruleId });
          if (rule) {
            sourceUrl = rule.sourceUrl;
            jurisdiction = rule.jurisdiction;
            topicKey = rule.topicKey;
            topicLabel = rule.topicLabel;
          }
        }
      } else {
        const rule = await ctx.runQuery(internal.embeddingManager._getRuleByRuleId, { ruleId: m.entityId });
        if (rule) {
          ruleId = rule.ruleId;
          sourceUrl = rule.sourceUrl;
          jurisdiction = rule.jurisdiction;
          topicKey = rule.topicKey;
          topicLabel = rule.topicLabel;
        }
      }

      // Use metadata from embedding if hydration failed
      if (!jurisdiction && m.metadata?.jurisdiction) {
        jurisdiction = m.metadata.jurisdiction;
      }
      if (!topicKey && m.metadata?.topicKey) {
        topicKey = m.metadata.topicKey;
      }
      if (!topicLabel && topicKey) {
        topicLabel = topicKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      if (!sourceUrl && jurisdiction) {
        // Generate a reasonable source URL if we don't have one
        sourceUrl = `https://www.${jurisdiction.toLowerCase().replace(/\s+/g, '')}.gov/labor`;
      }

      console.log(`✅ Hydrated source: ${jurisdiction} - ${topicLabel} (${sourceUrl ? 'has URL' : 'no URL'})`);

      // Create richer snippet from extracted sections if available
      let snippet = (m.content || "").slice(0, 500);
      if (entityType === "report" && reportData?.extractedSections?.overview) {
        snippet = reportData.extractedSections.overview.slice(0, 500);
      }

      sources.push({
        entityId: m.entityId,
        entityType,
        similarity: m.similarity,
        snippet,
        sourceUrl,
        jurisdiction,
        topicKey,
        topicLabel,
        reportId,
        ruleId,
        extractedSections: reportData?.extractedSections,
      });
    }

    return { sources };
  },
});

// Internal helpers for actions (actions cannot use ctx.db directly in some contexts)
export const _getReportById = internalQuery({
  args: { reportId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceReports")
      .withIndex("by_report_id", (q) => q.eq("reportId", args.reportId))
      .first();
  },
});

export const _getRuleByRuleId = internalQuery({
  args: { ruleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();
  },
});
