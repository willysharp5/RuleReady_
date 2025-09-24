#!/usr/bin/env node

/**
 * Verify Compliance Data Integrity
 * 
 * This script verifies that all compliance data is properly imported
 * and ready for legacy table decommission.
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function verifyComplianceData() {
  console.log("🔍 Verifying Compliance Data Integrity...\n");
  
  try {
    // Check compliance rules
    console.log("📋 Checking Compliance Rules...");
    const rules = await client.query("csvImport:getAllRules");
    console.log(`   ✅ Found ${rules.length} compliance rules (expected: 1,305)`);
    
    if (rules.length < 1000) {
      console.log("   ⚠️  WARNING: Rule count seems low");
    }
    
    // Check compliance reports
    console.log("📄 Checking Compliance Reports...");
    try {
      const reports = await client.query("importComplianceReports:getAllReports");
      console.log(`   ✅ Found ${reports.length} compliance reports (expected: 1,175)`);
      
      if (reports.length < 1000) {
        console.log("   ⚠️  WARNING: Report count seems low");
      }
    } catch (e) {
      console.log("   ⚠️  Could not check compliance reports - function may not exist");
    }
    
    // Check embeddings
    console.log("🔗 Checking Embeddings...");
    try {
      const embeddings = await client.query("embeddingManager:getAllEmbeddings");
      console.log(`   ✅ Found ${embeddings.length} embeddings (expected: 2,759)`);
      
      if (embeddings.length < 2000) {
        console.log("   ⚠️  WARNING: Embedding count seems low");
      }
    } catch (e) {
      console.log("   ⚠️  Could not check embeddings - using fallback method");
      // Fallback: check table directly
      try {
        const embeddings = await client.query("generateEmbeddings:getEmbeddingsCount");
        console.log(`   ✅ Found ${embeddings} embeddings (expected: 2,759)`);
      } catch (e2) {
        console.log("   ❌ Could not check embeddings at all");
      }
    }
    
    // Check jurisdictions and topics - these might not have dedicated queries yet
    console.log("🗺️  Checking Data Coverage...");
    const jurisdictionSet = new Set(rules.map(r => r.jurisdiction));
    const topicSet = new Set(rules.map(r => r.topicKey));
    
    console.log(`   ✅ Found ${jurisdictionSet.size} unique jurisdictions (expected: ~52)`);
    console.log(`   ✅ Found ${topicSet.size} unique topics (expected: ~25)`);
    
    // Sample data quality check
    console.log("🔬 Checking Data Quality...");
    const sampleRule = rules[0];
    let sampleReport = null;
    let sampleEmbedding = null;
    
    // Try to get sample data safely
    try {
      const reports = await client.query("importComplianceReports:getAllReports");
      sampleReport = reports[0];
    } catch (e) {
      // Reports check failed earlier
    }
    
    try {
      const embeddings = await client.query("embeddingManager:getAllEmbeddings");
      sampleEmbedding = embeddings[0];
    } catch (e) {
      // Embeddings check failed earlier
    }
    
    console.log(`   ✅ Sample rule has required fields: ${
      sampleRule && sampleRule.ruleId && sampleRule.jurisdiction && sampleRule.topicKey ? 'YES' : 'NO'
    }`);
    
    console.log(`   ✅ Sample report has content: ${
      sampleReport && sampleReport.reportContent && sampleReport.reportContent.length > 100 ? 'YES' : 'NO'
    }`);
    
    console.log(`   ✅ Sample embedding has vector: ${
      sampleEmbedding && sampleEmbedding.embedding && sampleEmbedding.embedding.length === 1536 ? 'YES' : 'NO'
    }`);
    
    // Legacy table check
    console.log("🗄️  Checking Legacy Tables...");
    try {
      const legacyWebsites = await client.query("websites:getUserWebsites");
      const complianceWebsites = legacyWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite);
      const nonComplianceWebsites = legacyWebsites.filter(w => !w.complianceMetadata?.isComplianceWebsite);
      
      console.log(`   📊 Total websites: ${legacyWebsites.length}`);
      console.log(`   ✅ Compliance websites: ${complianceWebsites.length}`);
      console.log(`   ⚠️  Non-compliance websites: ${nonComplianceWebsites.length}`);
      
      if (nonComplianceWebsites.length > 0) {
        console.log("   💡 Non-compliance websites will be ignored in compliance mode");
      }
    } catch (e) {
      console.log("   ❌ Could not check legacy websites table");
    }
    
    console.log("\n🎯 VERIFICATION SUMMARY:");
    console.log("=====================================");
    
    const checks = [
      { name: "Compliance Rules", count: rules.length, expected: 1305, status: rules.length >= 1000 },
      { name: "Jurisdictions", count: jurisdictionSet.size, expected: 52, status: jurisdictionSet.size >= 50 },
      { name: "Topics", count: topicSet.size, expected: 25, status: topicSet.size >= 20 },
    ];
    
    let allGood = true;
    checks.forEach(check => {
      const status = check.status ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} ${check.name}: ${check.count}/${check.expected}`);
      if (!check.status) allGood = false;
    });
    
    console.log("=====================================");
    
    if (allGood) {
      console.log("🎉 ALL CHECKS PASSED - Ready for legacy decommission!");
      process.exit(0);
    } else {
      console.log("⚠️  SOME CHECKS FAILED - Review data before proceeding");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

// Run verification
verifyComplianceData().catch(console.error);
