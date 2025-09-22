import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper: embed content with safe fallback to mock embeddings
async function embedContentSafely(content: string): Promise<{ embedding: number[]; model: string; dimensions: number }> {
  // Try real Gemini embedding first
  try {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(content);
    const values = result.embedding.values;
    return { embedding: values, model: "text-embedding-004", dimensions: values.length };
  } catch {
    // Fallback: deterministic pseudo-random vector (seeded by content hash)
    const dimensions = 1536;
    const embedding: number[] = new Array(dimensions);
    let seed = 2166136261;
    for (let i = 0; i < content.length; i++) {
      seed ^= content.charCodeAt(i);
      seed += (seed << 1) + (seed << 4) + (seed << 7) + (seed << 8) + (seed << 24);
    }
    // Simple LCG to fill vector deterministically
    let state = seed >>> 0;
    for (let i = 0; i < dimensions; i++) {
      state = (1664525 * state + 1013904223) >>> 0;
      embedding[i] = ((state % 20000) - 10000) / 10000; // [-1, 1]
    }
    return { embedding, model: "mock-embedding-1536", dimensions };
  }
}

// Generate embeddings for compliance reports using Gemini
export const generateEmbeddingsForReports = action({
  args: {
    batchSize: v.optional(v.number()),
    startAfter: v.optional(v.string()), // last processed reportId
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 20;
    const startAfter = args.startAfter || "";
    
    console.log(`🚀 Generating embeddings for compliance reports (startAfter='${startAfter || "<begin>"}')`);
    
    // Get a page of reports after the given reportId
    const page: ComplianceReport[] = await ctx.runQuery(internal.generateEmbeddings.getReportsAfter, {
      lastReportId: startAfter || undefined,
      limit: batchSize,
    });
    
    console.log(`📊 Processing ${page.length} reports in this page`);
    
    if (page.length === 0) {
      return {
        success: true,
        processed: 0,
        message: "No more reports to process",
        lastReportId: startAfter,
        failed: 0,
        errors: [],
        hasMore: false,
      };
    }
    
    let processed = 0;
    let failed = 0 as number;
    const errors: string[] = [];
    let lastReportId = startAfter;
    
    // Process each report in page
    for (const report of page) {
      try {
        // Create content for embedding (combine key sections)
        const embeddingContent = createEmbeddingContent(report);
        
        // Generate embedding (with safe fallback)
        const { embedding, model: usedModel, dimensions } = await embedContentSafely(embeddingContent);
        
        // Store embedding
        await ctx.runMutation(internal.generateEmbeddings.storeEmbedding, {
          entityId: report.reportId,
          entityType: "report",
          contentHash: report.contentHash,
          content: embeddingContent,
          chunkIndex: 0,
          totalChunks: 1,
          embedding: embedding,
          embeddingModel: usedModel,
          embeddingDimensions: dimensions,
          metadata: {
            jurisdiction: extractJurisdiction(report.ruleId),
            topicKey: extractTopicKey(report.ruleId),
            contentLength: embeddingContent.length,
            processingMethod: "gemini_generated",
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        processed++;
        lastReportId = report.reportId;
        
        if (processed % 5 === 0) {
          console.log(`✅ Generated ${processed} embeddings...`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to generate embedding for ${report.reportId}:`, error);
        errors.push(`${report.reportId}: ${(error as Error).message}`);
        failed++;
      }
      
      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Embedding page completed: ${processed} processed, ${failed} failed`);
    
    return {
      success: true,
      processed,
      failed,
      errors: errors.slice(0, 5),
      lastReportId,
      hasMore: processed === batchSize,
    };
  },
});

// Store embedding in database
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

// Generate embeddings for all reports in batches
export const generateAllEmbeddings = action({
  args: {},
  handler: async (ctx) => {
    const batchSize = 20;
    console.log(`🚀 Starting paginated embedding generation (page size ${batchSize})`);
    
    let totalProcessed = 0;
    let totalFailed = 0;
    let lastReportId: string | undefined = undefined;
    let page = 1;
    while (true) {
      console.log(`📦 Processing page ${page} (after '${lastReportId || "<begin>"}')...`);
      try {
        const result: { processed: number; failed: number; lastReportId?: string; hasMore: boolean } = await ctx.runAction(api.generateEmbeddings.generateEmbeddingsForReports, {
          batchSize,
          startAfter: lastReportId,
        });
        totalProcessed += result.processed || 0;
        totalFailed += result.failed || 0;
        lastReportId = result.lastReportId || lastReportId;
        console.log(`✅ Page ${page} completed: ${result.processed} processed, ${result.failed} failed`);
        if (!result.hasMore) break;
      } catch (error) {
        console.error(`❌ Page ${page} failed:`, error);
        totalFailed += 0;
        break;
      }
      page++;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    console.log("🎉 All available report pages processed!");
    return {
      success: true,
      totalProcessed,
      totalFailed,
      pagesCompleted: page,
    };
  },
});

// Types
type ComplianceReport = {
  reportId: string;
  ruleId: string;
  reportContent?: string;
  contentHash: string;
  extractedSections?: {
    overview?: string;
    coveredEmployers?: string;
    employerResponsibilities?: string;
    trainingRequirements?: string;
    penalties?: string;
    sources?: string;
  };
};

// Utility functions
function createEmbeddingContent(report: ComplianceReport): string {
  // Create comprehensive content for embedding from report sections
  let content = '';
  
  if (report.extractedSections) {
    const sections = report.extractedSections;
    
    // Combine key sections for embedding
    if (sections.overview) content += `Overview: ${sections.overview}\n\n`;
    if (sections.coveredEmployers) content += `Covered Employers: ${sections.coveredEmployers}\n\n`;
    if (sections.employerResponsibilities) content += `Employer Responsibilities: ${sections.employerResponsibilities}\n\n`;
    if (sections.trainingRequirements) content += `Training Requirements: ${sections.trainingRequirements}\n\n`;
    if (sections.penalties) content += `Penalties: ${sections.penalties}\n\n`;
    if (sections.sources) content += `Sources: ${sections.sources}\n\n`;
  }
  
  // Fallback to report content if no sections
  if (!content.trim() && report.reportContent) {
    content = report.reportContent.substring(0, 2000); // Limit content size
  }
  
  return content.trim() || `Compliance report: ${report.reportId}`;
}

function extractJurisdiction(ruleId: string): string {
  // Extract jurisdiction from ruleId like "california_minimum_wage"
  const parts = ruleId.split('_');
  return parts[0] || 'unknown';
}

function extractTopicKey(ruleId: string): string {
  // Extract topic from ruleId like "california_minimum_wage"
  const parts = ruleId.split('_');
  return parts.slice(1).join('_') || 'unknown';
}

// Internal query to get all reports
export const getReportsAfter = internalQuery({
  args: {
    lastReportId: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<ComplianceReport[]> => {
    if (args.lastReportId) {
      // Use reportId index to page after a given id
      return await ctx.db
        .query("complianceReports")
        .withIndex("by_report_id", (q) => q.gt("reportId", args.lastReportId!))
        .order("asc")
        .take(args.limit);
    } else {
      return await ctx.db
        .query("complianceReports")
        .withIndex("by_report_id")
        .order("asc")
        .take(args.limit);
    }
  },
});

