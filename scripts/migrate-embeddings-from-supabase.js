import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Mock Supabase MCP functions for this script
// In practice, we'll get the data from the MCP tools

async function fetchAllEmbeddingsFromSupabase() {
  console.log("🔍 Fetching all embeddings from Supabase...");
  
  // We'll collect all embeddings in batches to avoid memory issues
  const allEmbeddings = [];
  const batchSize = 100;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`📥 Fetching batch starting at offset ${offset}...`);
    
    // This would be replaced with actual Supabase MCP calls
    // For now, we'll simulate the structure based on what we saw
    const batch = await fetchEmbeddingBatch(offset, batchSize);
    
    if (batch.length === 0) {
      hasMore = false;
      break;
    }
    
    allEmbeddings.push(...batch);
    offset += batchSize;
    
    console.log(`✅ Fetched ${batch.length} embeddings, total so far: ${allEmbeddings.length}`);
    
    // Stop at a reasonable number for testing
    if (allEmbeddings.length >= 2759) {
      hasMore = false;
    }
  }
  
  return allEmbeddings;
}

async function fetchEmbeddingBatch(offset, limit) {
  // This is a placeholder - in the actual implementation,
  // we'll use the Supabase MCP to execute SQL queries
  return [];
}

async function migrateEmbeddings() {
  try {
    console.log("🚀 Starting embedding migration from Supabase to Convex...");
    
    const embeddings = await fetchAllEmbeddingsFromSupabase();
    
    if (embeddings.length === 0) {
      console.log("⚠️  No embeddings found to migrate");
      return;
    }
    
    console.log(`📊 Found ${embeddings.length} embeddings to migrate`);
    
    // Process embeddings to match Convex schema
    const processedEmbeddings = embeddings.map(embedding => {
      // Parse the embedding array from string if needed
      let embeddingVector = embedding.embedding;
      if (typeof embeddingVector === 'string') {
        // Remove brackets and parse as array of numbers
        embeddingVector = JSON.parse(embeddingVector);
      }
      
      return {
        entity_type: embedding.entity_type,
        entity_id: embedding.entity_id,
        content: embedding.content,
        content_hash: embedding.content_hash,
        chunk_index: embedding.chunk_index,
        total_chunks: embedding.total_chunks,
        metadata: embedding.metadata,
        embedding: embeddingVector,
        created_at: embedding.created_at
      };
    });
    
    // Transfer to Convex in batches
    const result = await client.action("migrateEmbeddings:migrateEmbeddingsFromSupabase", {
      embeddings: processedEmbeddings,
      batch_size: 25 // Smaller batches for Convex
    });
    
    console.log("🎉 Migration completed!");
    console.log(`📈 Results:`, result);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEmbeddings();
}

