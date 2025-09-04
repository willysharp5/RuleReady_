import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// This action will migrate embeddings from Supabase to Convex
export const migrateEmbeddingsFromSupabase = action({
  args: {
    embeddings: v.array(v.object({
      entity_type: v.string(),
      entity_id: v.string(), 
      content: v.string(),
      content_hash: v.string(),
      chunk_index: v.number(),
      total_chunks: v.number(),
      metadata: v.any(),
      embedding: v.array(v.number()),
      created_at: v.string()
    })),
    batch_size: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const batchSize = args.batch_size || 50; // Process in smaller batches
    const embeddings = args.embeddings;
    let processed = 0;
    let errors = 0;
    
    console.log(`Starting migration of ${embeddings.length} embeddings in batches of ${batchSize}`);
    
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize);
      
      try {
        for (const embedding of batch) {
          try {
            await ctx.runMutation(internal.migrateEmbeddings.insertEmbedding, {
              entityType: embedding.entity_type,
              entityId: embedding.entity_id,
              content: embedding.content,
              contentHash: embedding.content_hash,
              chunkIndex: embedding.chunk_index,
              totalChunks: embedding.total_chunks,
              metadata: embedding.metadata,
              embedding: embedding.embedding,
              createdAt: embedding.created_at
            });
            processed++;
          } catch (error) {
            console.error(`Failed to insert embedding ${embedding.entity_id}:`, error);
            errors++;
          }
        }
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}, total processed: ${processed}, errors: ${errors}`);
        
        // Small delay between batches to avoid overwhelming Convex
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Batch processing error:`, error);
        errors += batch.length;
      }
    }
    
    return {
      total_embeddings: embeddings.length,
      processed,
      errors,
      success_rate: processed / embeddings.length
    };
  }
});

export const insertEmbedding = action({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    content: v.string(), 
    contentHash: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    metadata: v.any(),
    embedding: v.array(v.number()),
    createdAt: v.string()
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runMutation(internal.migrateEmbeddings.storeEmbedding, args);
  }
});

export const storeEmbedding = action({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    content: v.string(),
    contentHash: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    metadata: v.any(),
    embedding: v.array(v.number()),
    createdAt: v.string()
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runMutation(internal.embeddingManager.storeEmbedding, {
      entityType: args.entityType as "rule" | "report",
      entityId: args.entityId,
      content: args.content,
      contentHash: args.contentHash,
      chunkIndex: args.chunkIndex,
      totalChunks: args.totalChunks,
      metadata: args.metadata,
      embedding: args.embedding
    });
  }
});

