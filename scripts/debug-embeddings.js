#!/usr/bin/env node

/**
 * Debug Embeddings
 * 
 * Check if embeddings exist and why search might be failing
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function debugEmbeddings() {
  console.log('🔍 Debugging embeddings...\n');
  
  try {
    // Test 1: Check if we have embeddings at all
    console.log('📊 Checking embedding counts...');
    const embeddingMetrics = await client.query("monitoring:getEmbeddingJobMetrics");
    console.log(`✅ Total embeddings reported: ${embeddingMetrics.totalEmbeddings}`);
    
    // Test 2: Try to get a few embeddings directly
    console.log('\n📋 Testing direct embedding access...');
    try {
      const embeddings = await client.query("embeddingManager:getEmbeddingsLimited", {
        entityType: "report",
        limit: 3
      });
      console.log(`✅ Direct query returned ${embeddings?.length || 0} embeddings`);
      
      if (embeddings && embeddings.length > 0) {
        const sample = embeddings[0];
        console.log('📝 Sample embedding:');
        console.log(`   Entity ID: ${sample.entityId}`);
        console.log(`   Entity Type: ${sample.entityType}`);
        console.log(`   Content Length: ${sample.content?.length || 0}`);
        console.log(`   Embedding Dimensions: ${sample.embedding?.length || 0}`);
        console.log(`   Jurisdiction: ${sample.metadata?.jurisdiction || 'N/A'}`);
        console.log(`   Topic: ${sample.metadata?.topicKey || 'N/A'}`);
      }
    } catch (e) {
      console.log('❌ Direct embedding query failed:', e.message);
    }
    
    // Test 3: Try embedding generation
    console.log('\n🤖 Testing embedding generation...');
    try {
      const generated = await client.action("embeddingManager:generateEmbedding", {
        content: "California minimum wage requirements"
      });
      console.log(`✅ Generated embedding with ${generated.embedding?.length || 0} dimensions`);
    } catch (e) {
      console.log('❌ Embedding generation failed:', e.message);
    }
    
    // Test 4: Try with lower threshold
    console.log('\n🎯 Testing with very low threshold...');
    try {
      const lowThresholdResult = await client.action("embeddingManager:embeddingTopKSources", {
        question: "minimum wage",
        k: 3,
        threshold: 0.1, // Very low threshold
      });
      console.log(`📊 Low threshold search returned ${lowThresholdResult.sources?.length || 0} sources`);
    } catch (e) {
      console.log('❌ Low threshold search failed:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugEmbeddings().catch(console.error);

