#!/usr/bin/env node

/**
 * Test Embeddings Direct Access
 * 
 * Test if we can access embeddings directly from the database
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function testEmbeddingsDirect() {
  console.log('🔍 Testing direct embeddings access...\n');
  
  try {
    // Test the monitoring function that should show embeddings count
    console.log('📊 Checking monitoring data...');
    const monitoringData = await client.query("monitoring:getEmbeddingJobMetrics");
    console.log(`✅ Monitoring reports: ${monitoringData.totalEmbeddings} embeddings`);
    
    // Test system status
    console.log('\n📋 Checking system status...');
    const systemStatus = await client.query("monitoring:getSystemStatus");
    console.log(`✅ System status reports: ${systemStatus.overview.totalEmbeddings} embeddings`);
    
    console.log('\n🎯 Test complete - embeddings should be accessible now!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmbeddingsDirect().catch(console.error);

