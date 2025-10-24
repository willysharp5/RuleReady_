#!/usr/bin/env node

/**
 * Test Chat Sources
 * 
 * Test the chat sources functionality to see if URLs are being returned
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function testChatSources() {
  console.log('🔍 Testing chat sources functionality...\n');
  
  try {
    // Test 1: Check if we have compliance rules with sourceUrl
    console.log('📋 Testing compliance rules data...');
    const rules = await client.query("complianceQueries:searchRules", { 
      searchTerm: "",
      jurisdiction: "California",
      limit: 5
    });
    
    if (rules && rules.length > 0) {
      console.log(`✅ Found ${rules.length} California rules`);
      const rulesWithUrls = rules.filter(rule => rule.sourceUrl);
      console.log(`📊 Rules with sourceUrl: ${rulesWithUrls.length}/${rules.length}`);
      
      if (rulesWithUrls.length > 0) {
        console.log('📝 Sample rule with URL:');
        const sample = rulesWithUrls[0];
        console.log(`   Rule ID: ${sample.ruleId}`);
        console.log(`   Topic: ${sample.topicLabel}`);
        console.log(`   URL: ${sample.sourceUrl}`);
      }
    } else {
      console.log('❌ No California rules found');
    }
    
    console.log('\n🤖 Testing embedding search...');
    
    // Test 2: Test embedding search
    const embeddingResult = await client.action("embeddingManager:embeddingTopKSources", {
      question: "What are California minimum wage requirements?",
      k: 3,
      threshold: 0.5,
      jurisdiction: "California",
    });
    
    console.log(`📊 Embedding search returned ${embeddingResult.sources?.length || 0} sources`);
    
    if (embeddingResult.sources && embeddingResult.sources.length > 0) {
      embeddingResult.sources.forEach((source, i) => {
        console.log(`\n📍 Source ${i + 1}:`);
        console.log(`   Entity ID: ${source.entityId}`);
        console.log(`   Type: ${source.entityType}`);
        console.log(`   Jurisdiction: ${source.jurisdiction || 'N/A'}`);
        console.log(`   Topic: ${source.topicLabel || 'N/A'}`);
        console.log(`   Similarity: ${Math.round((source.similarity || 0) * 100)}%`);
        console.log(`   Source URL: ${source.sourceUrl || 'MISSING!'}`);
      });
    } else {
      console.log('❌ No sources returned from embedding search');
    }
    
    console.log('\n🎯 Testing chat API...');
    
    // Test 3: Test the actual chat API
    const chatResponse = await fetch('http://localhost:3001/api/compliance-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What are California minimum wage requirements?' }],
        jurisdiction: 'California',
        topic: 'minimum_wage'
      })
    });
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log(`✅ Chat API responded successfully`);
      console.log(`📊 Sources in response: ${chatData.sources?.length || 0}`);
      
      if (chatData.sources && chatData.sources.length > 0) {
        chatData.sources.forEach((source, i) => {
          console.log(`\n🔗 Chat Source ${i + 1}:`);
          console.log(`   Jurisdiction: ${source.jurisdiction || 'N/A'}`);
          console.log(`   Topic: ${source.topicLabel || 'N/A'}`);
          console.log(`   URL: ${source.url || 'MISSING!'}`);
          console.log(`   Similarity: ${Math.round((source.similarity || 0) * 100)}%`);
        });
      } else {
        console.log('❌ No sources in chat response');
      }
    } else {
      console.log('❌ Chat API failed:', chatResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChatSources().catch(console.error);
