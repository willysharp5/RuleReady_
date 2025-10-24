import { query } from "./_generated/server";

// Simple test query to check if embeddings exist
export const testEmbeddingsExist = query({
  handler: async (ctx) => {
    console.log("🔍 Testing if embeddings exist...");
    
    // Try to get just one embedding
    const oneEmbedding = await ctx.db.query("complianceEmbeddings").take(1);
    console.log(`📊 Found ${oneEmbedding.length} embeddings`);
    
    if (oneEmbedding.length > 0) {
      const sample = oneEmbedding[0];
      console.log(`📝 Sample embedding:`);
      console.log(`   Entity ID: ${sample.entityId}`);
      console.log(`   Entity Type: ${sample.entityType}`);
      console.log(`   Content Length: ${sample.content?.length || 0}`);
      console.log(`   Embedding Dimensions: ${sample.embedding?.length || 0}`);
      console.log(`   Metadata: ${JSON.stringify(sample.metadata)}`);
      
      return {
        exists: true,
        count: 1,
        sample: {
          entityId: sample.entityId,
          entityType: sample.entityType,
          contentLength: sample.content?.length || 0,
          embeddingDimensions: sample.embedding?.length || 0,
          metadata: sample.metadata,
        }
      };
    }
    
    return { exists: false, count: 0 };
  }
});
