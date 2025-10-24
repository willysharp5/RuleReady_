#!/usr/bin/env node

/**
 * Check Embeddings Exist
 * 
 * Simple check to see if embeddings are actually in the database
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function checkEmbeddingsExist() {
  console.log('🔍 Checking if embeddings exist in database...\n');
  
  try {
    // Create a simple test action to check embeddings
    console.log('📊 Attempting to call getEmbeddingsLimited directly...');
    
    // Test with a very simple call
    const testResult = await client.action("embeddingManager:embeddingTopKSources", {
      question: "test",
      k: 1,
      threshold: 0.0, // Accept any similarity
    });
    
    console.log(`📋 Result: ${JSON.stringify(testResult, null, 2)}`);
    
  } catch (error) {
    console.error('❌ Failed to check embeddings:', error);
    
    // Let's try to see if we can access the monitoring data
    console.log('\n📊 Trying to check via monitoring...');
    try {
      const monitoringData = await client.query("monitoring:getEmbeddingJobMetrics");
      console.log(`✅ Monitoring says: ${monitoringData.totalEmbeddings} embeddings exist`);
    } catch (e) {
      console.error('❌ Monitoring check failed:', e);
    }
  }
}

checkEmbeddingsExist().catch(console.error);

