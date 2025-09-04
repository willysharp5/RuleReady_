import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Generate embeddings for compliance reports using Gemini
export const generateEmbeddingsForReports = action({
  args: {
    batchSize: v.optional(v.number()),
    startFrom: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 20; // Smaller batches for embedding generation
    const startFrom = args.startFrom || 0;
    
    console.log(`🚀 Generating embeddings for compliance reports (starting from ${startFrom})`);
    
    // Get all compliance reports
    const allReports: any = await ctx.runQuery(internal.generateEmbeddings.getAllReports);
    const reportsToProcess = allReports.slice(startFrom, startFrom + batchSize);
    
    console.log(`📊 Processing ${reportsToProcess.length} reports (${startFrom + 1}-${startFrom + reportsToProcess.length} of ${allReports.length})`);
    
    if (reportsToProcess.length === 0) {
      return {
        success: true,
        processed: 0,
        message: "No reports to process in this range",
      };
    }
    
    let processed = 0;
    let failed = 0;
    const errors = [];
    
    // Initialize Gemini for embeddings
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAhrzBihKERZknz5Y3O6hpvlge1o2EZU4U";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    // Process each report
    for (const report of reportsToProcess) {
      try {
        // Create content for embedding (combine key sections)
        const embeddingContent = createEmbeddingContent(report);
        
        // Generate embedding
        const result = await model.embedContent(embeddingContent);
        const embedding = result.embedding.values;
        
        // Store embedding
        await ctx.runMutation(internal.generateEmbeddings.storeEmbedding, {
          entityId: report.reportId,
          entityType: "report",
          contentHash: report.contentHash,
          content: embeddingContent,
          chunkIndex: 0,
          totalChunks: 1,
          embedding: embedding,
          embeddingModel: "text-embedding-004",
          embeddingDimensions: embedding.length,
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
    
    console.log(`🎉 Embedding generation completed: ${processed} processed, ${failed} failed`);
    
    return {
      success: true,
      processed,
      failed,
      errors: errors.slice(0, 5), // Return first 5 errors
      totalReports: allReports.length,
      nextStartFrom: startFrom + batchSize,
      hasMore: startFrom + batchSize < allReports.length,
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
  args: {
    totalBatches: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = 20;
    const maxBatches = args.totalBatches || 10; // Limit for testing
    
    console.log(`🚀 Starting batch embedding generation (${maxBatches} batches of ${batchSize})`);
    
    let totalProcessed = 0;
    let totalFailed = 0;
    
    for (let batch = 0; batch < maxBatches; batch++) {
      const startFrom = batch * batchSize;
      
      console.log(`📦 Processing batch ${batch + 1}/${maxBatches}...`);
      
      try {
        const result = await ctx.runAction(internal.generateEmbeddings.generateEmbeddingsForReports, {
          batchSize,
          startFrom,
        });
        
        totalProcessed += result.processed;
        totalFailed += result.failed;
        
        console.log(`✅ Batch ${batch + 1} completed: ${result.processed} processed, ${result.failed} failed`);
        
        if (!result.hasMore) {
          console.log("🎉 All reports processed!");
          break;
        }
        
      } catch (error) {
        console.error(`❌ Batch ${batch + 1} failed:`, error);
        totalFailed += batchSize;
      }
      
      // Pause between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return {
      success: true,
      totalProcessed,
      totalFailed,
      batchesCompleted: Math.min(maxBatches, Math.ceil(totalProcessed / batchSize)),
    };
  },
});

// Utility functions
function createEmbeddingContent(report: any): string {
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
export const getAllReports = internalQuery({
  handler: async (ctx): Promise<any> => {
    return await ctx.db.query("complianceReports").collect();
  },
});

