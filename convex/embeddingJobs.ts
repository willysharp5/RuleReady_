import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Create an embedding job
export const createEmbeddingJob = internalMutation({
  args: {
    jobType: v.union(
      v.literal("import_existing"),
      v.literal("generate_new"),
      v.literal("update_existing"),
      v.literal("batch_process")
    ),
    entityIds: v.array(v.string()),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    config: v.optional(v.object({
      batchSize: v.optional(v.number()),
      retryCount: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const jobId = `${args.jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return await ctx.db.insert("embeddingJobs", {
      jobId,
      jobType: args.jobType,
      status: "pending",
      entityIds: args.entityIds,
      progress: {
        total: args.entityIds.length,
        completed: 0,
        failed: 0,
        errors: [],
      },
      config: {
        batchSize: args.config?.batchSize || 50,
        retryCount: args.config?.retryCount || 3,
        priority: args.priority,
      },
      scheduledAt: Date.now(),
    });
  },
});

// Get pending jobs ordered by priority
export const getPendingJobs = internalQuery({
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    
    // Sort by priority: high -> medium -> low, then by scheduled time
    return jobs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.config.priority];
      const bPriority = priorityOrder[b.config.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return a.scheduledAt - b.scheduledAt; // Earlier scheduled first
    });
  },
});

// Start a job (mark as processing)
export const startJob = internalMutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();
    
    if (!job) {
      throw new Error(`Job ${args.jobId} not found`);
    }
    
    await ctx.db.patch(job._id, {
      status: "processing",
      startedAt: Date.now(),
    });
  },
});

// Update job progress
export const updateJobProgress = internalMutation({
  args: {
    jobId: v.string(),
    completed: v.number(),
    failed: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();
    
    if (!job) {
      throw new Error(`Job ${args.jobId} not found`);
    }
    
    await ctx.db.patch(job._id, {
      progress: {
        total: job.progress.total,
        completed: args.completed,
        failed: args.failed || job.progress.failed,
        errors: args.errors || job.progress.errors,
      },
    });
  },
});

// Complete a job
export const completeJob = internalMutation({
  args: {
    jobId: v.string(),
    finalStats: v.optional(v.object({
      totalProcessed: v.optional(v.number()),
      completedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();
    
    if (!job) {
      throw new Error(`Job ${args.jobId} not found`);
    }
    
    await ctx.db.patch(job._id, {
      status: "completed",
      completedAt: args.finalStats?.completedAt || Date.now(),
    });
  },
});

// Fail a job
export const failJob = internalMutation({
  args: {
    jobId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();
    
    if (!job) {
      throw new Error(`Job ${args.jobId} not found`);
    }
    
    await ctx.db.patch(job._id, {
      status: "failed",
      progress: {
        ...job.progress,
        errors: [...job.progress.errors, args.error],
      },
    });
  },
});

// Process embedding jobs (called by cron)
export const processEmbeddingJobs = internalAction({
  handler: async (ctx) => {
    const pendingJobs = await ctx.runQuery(internal.embeddingJobs.getPendingJobs);
    
    console.log(`🔄 Processing ${pendingJobs.length} pending embedding jobs`);
    
    for (const job of pendingJobs.slice(0, 5)) { // Process max 5 jobs at a time
      try {
        console.log(`🚀 Starting job ${job.jobId} (${job.jobType})`);
        
        await ctx.runMutation(internal.embeddingJobs.startJob, { jobId: job.jobId });
        
        switch (job.jobType) {
          case "generate_new":
            await processNewEmbeddingJob(ctx, job);
            break;
          case "update_existing":
            await processUpdateEmbeddingJob(ctx, job);
            break;
          case "batch_process":
            await processBatchEmbeddingJob(ctx, job);
            break;
          case "import_existing":
            // This would be handled separately for bulk imports
            console.log(`Import job ${job.jobId} requires manual processing`);
            break;
        }
        
        await ctx.runMutation(internal.embeddingJobs.completeJob, { 
          jobId: job.jobId,
          finalStats: { completedAt: Date.now() }
        });
        
        console.log(`✅ Completed job ${job.jobId}`);
        
      } catch (error) {
        console.error(`❌ Job ${job.jobId} failed:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await ctx.runMutation(internal.embeddingJobs.failJob, {
          jobId: job.jobId,
          error: errorMessage
        });
      }
    }
  },
});

// Process new embedding job
async function processNewEmbeddingJob(ctx: any, job: any) {
  const batchSize = job.config.batchSize;
  let completed = 0;
  
  for (let i = 0; i < job.entityIds.length; i += batchSize) {
    const batch = job.entityIds.slice(i, i + batchSize);
    
    for (const entityId of batch) {
      try {
        // Get entity content
        const entity = await getEntityContent(ctx, entityId);
        if (!entity) {
          throw new Error(`Entity ${entityId} not found`);
        }
        
        // Generate embedding
        const embeddingResult = await ctx.runAction(internal.embeddingManager.generateEmbedding, {
          content: entity.content
        });
        
        // Store embedding
        await ctx.runMutation(internal.embeddingManager.storeEmbedding, {
          entityId,
          entityType: entity.type,
          contentHash: await calculateContentHash(entity.content),
          content: entity.content,
          chunkIndex: 0,
          totalChunks: 1,
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingDimensions: embeddingResult.dimensions,
          metadata: {
            jurisdiction: entity.jurisdiction,
            topicKey: entity.topicKey,
            contentLength: entity.content.length,
            processingMethod: "auto_generated",
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        completed++;
        
      } catch (error) {
        console.error(`Failed to process entity ${entityId}:`, error);
      }
    }
    
    // Update progress
    await ctx.runMutation(internal.embeddingJobs.updateJobProgress, {
      jobId: job.jobId,
      completed,
    });
  }
}

// Process update embedding job
async function processUpdateEmbeddingJob(ctx: any, job: any) {
  // Similar to processNewEmbeddingJob but updates existing embeddings
  console.log(`Processing update job for ${job.entityIds.length} entities`);
  // Implementation would be similar to processNewEmbeddingJob
}

// Process batch embedding job
async function processBatchEmbeddingJob(ctx: any, job: any) {
  // Batch process multiple entities at once for efficiency
  console.log(`Processing batch job for ${job.entityIds.length} entities`);
  // Implementation would optimize for batch processing
}

// Schedule embedding updates for changed content
export const scheduleEmbeddingUpdates = internalAction({
  handler: async (ctx) => {
    // Find content that has changed and needs embedding updates
    const changedContent = await findChangedContent(ctx);
    
    if (changedContent.length > 0) {
      const jobId = await ctx.runMutation(internal.embeddingJobs.createEmbeddingJob, {
        jobType: "update_existing",
        entityIds: changedContent,
        priority: "medium",
      });
      
      console.log(`📅 Scheduled embedding update job ${jobId} for ${changedContent.length} entities`);
    }
  },
});

// Clean up old completed jobs
export const cleanupOldJobs = internalAction({
  handler: async (ctx) => {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const oldJobs = await ctx.runQuery(internal.embeddingJobs.getOldJobs, { cutoffTime });
    
    for (const job of oldJobs) {
      await ctx.runMutation(internal.embeddingJobs.deleteJob, { jobId: job._id });
    }
    
    console.log(`🧹 Cleaned up ${oldJobs.length} old embedding jobs`);
  },
});

// Get old jobs for cleanup
export const getOldJobs = internalQuery({
  args: { cutoffTime: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddingJobs")
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("status"), "completed"),
            q.eq(q.field("status"), "failed")
          ),
          q.lt(q.field("scheduledAt"), args.cutoffTime)
        )
      )
      .collect();
  },
});

// Delete a job
export const deleteJob = internalMutation({
  args: { jobId: v.id("embeddingJobs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.jobId);
  },
});

// Utility functions
async function getEntityContent(ctx: any, entityId: string) {
  // Placeholder for now - will implement once we have the compliance query functions
  return {
    content: `Placeholder content for ${entityId}`,
    type: "rule" as const,
    jurisdiction: "Unknown",
    topicKey: "unknown",
  };
}

async function findChangedContent(ctx: any): Promise<string[]> {
  // This would implement logic to find content that has changed
  // and needs embedding updates
  // For now, return empty array
  return [];
}

async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
