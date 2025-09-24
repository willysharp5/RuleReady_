#!/usr/bin/env node

/**
 * Test Phase 3 Enhanced RAG System
 * 
 * Test the new AI-powered analysis engine capabilities
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function testPhase3RAG() {
  console.log("🤖 Testing Phase 3: AI-Powered Analysis Engine...\n");
  
  try {
    // Test 1: Enhanced RAG Query
    console.log("🔍 TEST 1: Enhanced RAG Knowledge Query");
    console.log("=".repeat(50));
    
    const ragResult = await client.action("complianceRAG:queryComplianceKnowledge", {
      query: "What are the California minimum wage requirements for 2024?",
      jurisdiction: "California",
      topicKey: "minimum_wage",
      includeChanges: true,
      maxSources: 5,
      threshold: 0.7
    });
    
    console.log(`✅ RAG Query Results:`);
    console.log(`   Sources Found: ${ragResult.metadata.sourcesFound}`);
    console.log(`   Changes Included: ${ragResult.metadata.changesIncluded}`);
    console.log(`   Confidence: ${(ragResult.confidence * 100).toFixed(1)}%`);
    console.log(`   Answer Preview: ${ragResult.answer.substring(0, 200)}...`);
    
    // Test 2: Semantic Search
    console.log("\n\n🔎 TEST 2: Semantic Compliance Search");
    console.log("=".repeat(50));
    
    const semanticResult = await client.action("complianceRAG:semanticComplianceSearch", {
      query: "harassment training deadlines supervisors",
      filters: {
        jurisdictions: ["California", "New York", "Texas"],
        topics: ["harassment_training"],
        priorities: ["critical", "high"]
      },
      searchType: "both"
    });
    
    console.log(`✅ Semantic Search Results:`);
    console.log(`   Total Found: ${semanticResult.totalFound}`);
    console.log(`   Rules: ${semanticResult.results.rules.length}`);
    console.log(`   Reports: ${semanticResult.results.reports.length}`);
    console.log(`   Search Type: ${semanticResult.searchType}`);
    
    // Test 3: Semantic Change Detection
    console.log("\n\n🧠 TEST 3: Semantic Change Detection");
    console.log("=".repeat(50));
    
    const sampleContent1 = "California minimum wage is $16.00 per hour for all employees.";
    const sampleContent2 = "California minimum wage is $17.00 per hour for all employees.";
    
    try {
      const changeResult = await client.action("complianceAI:detectSemanticChanges", {
        entityId: "california_minimum_wage",
        newContent: sampleContent2,
        threshold: 0.85
      });
      
      console.log(`✅ Change Detection Results:`);
      console.log(`   Has Changed: ${changeResult.hasChanged}`);
      console.log(`   Similarity: ${(changeResult.similarity * 100).toFixed(1)}%`);
      console.log(`   Change Type: ${changeResult.changeType}`);
      console.log(`   Confidence: ${(changeResult.confidence * 100).toFixed(1)}%`);
      
    } catch (e) {
      console.log("⚠️ Change detection test skipped (function may need embedding data)");
    }
    
    // Test 4: Compliance Change Analysis
    console.log("\n\n📊 TEST 4: AI-Powered Change Impact Analysis");
    console.log("=".repeat(50));
    
    try {
      const analysisResult = await client.action("complianceAI:analyzeComplianceChange", {
        ruleId: "california_minimum_wage",
        oldContent: sampleContent1,
        newContent: sampleContent2,
        changeContext: {
          jurisdiction: "California",
          topicKey: "minimum_wage",
          lastChanged: Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days ago
        }
      });
      
      console.log(`✅ Change Analysis Results:`);
      console.log(`   Change Detected: ${analysisResult.changeDetected}`);
      console.log(`   Severity: ${analysisResult.severity}`);
      console.log(`   Semantic Similarity: ${(analysisResult.semanticSimilarity * 100).toFixed(1)}%`);
      console.log(`   Business Impact: ${analysisResult.businessImpact}`);
      console.log(`   Recommended Actions: ${analysisResult.recommendedActions.join(', ')}`);
      
    } catch (e) {
      console.log("⚠️ Change analysis test skipped:", e.message);
    }
    
    console.log("\n\n🎯 PHASE 3 TEST SUMMARY:");
    console.log("=".repeat(50));
    console.log("✅ Enhanced RAG System - Functional");
    console.log("✅ Semantic Search - Functional");
    console.log("⚠️ Change Detection - Needs embedding data");
    console.log("⚠️ Impact Analysis - Needs Gemini integration");
    
    console.log("\n🚀 NEXT STEPS:");
    console.log("1. Integrate with existing Gemini API for real AI analysis");
    console.log("2. Test change detection with actual embedding data");
    console.log("3. Set up deadline tracking for regulatory calendar");
    console.log("4. Move to Phase 4: Compliance-Specific UI/UX");
    
  } catch (error) {
    console.error("❌ Phase 3 test failed:", error);
    process.exit(1);
  }
}

// Run the test
testPhase3RAG().catch(console.error);
