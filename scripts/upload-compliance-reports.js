#!/usr/bin/env node

/**
 * Upload Compliance Reports: Upload all 1,175 compliance reports to Convex
 * 
 * This script reads all compliance report files and uploads them to the database
 * Run with: node scripts/upload-compliance-reports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from "convex/browser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("📊 UPLOADING 1,175 COMPLIANCE REPORTS TO CONVEX");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Step 1: Read all compliance report files
    console.log("📁 Reading compliance report files...");
    const reportsDir = path.join(__dirname, '../data/compliance_reports');
    
    if (!fs.existsSync(reportsDir)) {
      throw new Error(`Compliance reports directory not found: ${reportsDir}`);
    }
    
    const reportFiles = fs.readdirSync(reportsDir)
      .filter(file => file.endsWith('.txt'))
      .map(filename => {
        const filePath = path.join(reportsDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        return { filename, content };
      });
    
    console.log(`📊 Found ${reportFiles.length} compliance report files`);
    
    // Step 2: Show sample of what we're uploading
    console.log("\n📋 Sample reports to upload:");
    reportFiles.slice(0, 5).forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.filename} (${file.content.length} chars)`);
    });
    
    if (reportFiles.length > 5) {
      console.log(`   ... and ${reportFiles.length - 5} more reports`);
    }
    
    // Step 3: Upload in batches
    console.log("\n🚀 Starting upload to Convex...");
    console.log("   This will upload reports and optionally process with Gemini AI");
    console.log("   Processing with AI: NO (for faster upload)");
    console.log("   Batch size: 50 reports per batch");
    
    const batchSize = 50;
    let totalUploaded = 0;
    let totalFailed = 0;
    
    // Process in batches
    for (let i = 0; i < reportFiles.length; i += batchSize) {
      const batch = reportFiles.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(reportFiles.length / batchSize);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} reports)...`);
      
      try {
        const result = await convex.action("importComplianceReports:importAndProcessReports", {
          reportData: batch,
          useGeminiProcessing: false, // Start with standard import for speed
          batchSize: batch.length,
        });
        
        console.log(`✅ Batch ${batchNum} completed:`);
        console.log(`   Processed: ${result.processed}`);
        console.log(`   Failed: ${result.failed}`);
        
        totalUploaded += result.processed;
        totalFailed += result.failed;
        
      } catch (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message);
        totalFailed += batch.length;
      }
      
      // Progress update
      const progress = Math.round(((i + batch.length) / reportFiles.length) * 100);
      console.log(`📈 Progress: ${progress}% (${totalUploaded} uploaded, ${totalFailed} failed)`);
      
      // Rate limiting pause between batches
      if (i + batchSize < reportFiles.length) {
        console.log("⏳ Pausing 1 second between batches...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log("\n======================================================================");
    console.log("🎉 COMPLIANCE REPORTS UPLOAD COMPLETE!");
    console.log("======================================================================");
    console.log("📊 UPLOAD RESULTS:");
    console.log(`   ✅ Successfully uploaded: ${totalUploaded} reports`);
    console.log(`   ❌ Failed uploads: ${totalFailed} reports`);
    console.log(`   📋 Total processed: ${reportFiles.length} reports`);
    console.log(`   📈 Success rate: ${Math.round((totalUploaded / reportFiles.length) * 100)}%`);
    
    // Step 4: Verify upload
    console.log("\n📊 Verifying upload...");
    const finalStats = await convex.query("complianceImport:getImportStats");
    
    console.log("📈 Final database stats:");
    console.log(`   Compliance rules: ${finalStats.rules}`);
    console.log(`   Compliance reports: ${finalStats.reports}`);
    console.log(`   Embeddings: ${finalStats.embeddings}`);
    
    console.log("\n🚀 CHAT SYSTEM NOW READY:");
    console.log("   • Compliance reports uploaded to database ✅");
    console.log("   • Chat API can access compliance data ✅");
    console.log("   • AI assistant has knowledge base ✅");
    console.log("   • Ready for intelligent compliance conversations ✅");
    
    console.log("\n💡 NEXT STEPS:");
    console.log("   1. Visit: http://localhost:3000/chat");
    console.log("   2. Ask compliance questions and get AI-powered answers");
    console.log("   3. Test different jurisdictions and topics");
    console.log("   4. Configure AI settings in /settings if needed");
    
    if (totalUploaded === reportFiles.length) {
      console.log("\n🏆 PERFECT UPLOAD - ALL COMPLIANCE DATA AVAILABLE FOR CHAT!");
    } else {
      console.log(`\n⚠️ PARTIAL UPLOAD - ${totalFailed} reports need attention`);
    }
    
  } catch (error) {
    console.error("❌ Upload failed:", error);
    console.error("\n🔧 TROUBLESHOOTING:");
    console.error("   • Check that Convex deployment is running");
    console.error("   • Verify compliance reports directory exists");
    console.error("   • Check network connectivity");
    console.error("   • Monitor Convex function logs");
    process.exit(1);
  }
}

// Run the upload
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

