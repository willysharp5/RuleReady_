#!/usr/bin/env node

/**
 * Test Import Script: Test compliance rules CSV import
 * 
 * This script tests the CSV import functionality
 * Run with: node scripts/test-import.js
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
  console.log("🧪 Testing compliance data import...");
  console.log("======================================================================");

  try {
    // Initialize Convex client
    const convex = new ConvexHttpClient(CONVEX_URL);
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '../data/compliance_rules_enriched.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log(`📖 Read CSV file: ${csvPath}`);
    
    // Test with just the first 10 rules for initial testing
    const lines = csvContent.trim().split('\n');
    const header = lines[0];
    const testData = lines.slice(1, 11); // First 10 data lines
    const testCSV = [header, ...testData].join('\n');
    
    console.log(`📊 Testing with ${testData.length} compliance rules`);
    
    // Call the import function
    console.log("🚀 Calling importCSVData...");
    const result = await convex.action("csvImport:importCSVData", { 
      csvContent: testCSV 
    });
    
    console.log("✅ Import test completed!");
    console.log("======================================================================");
    console.log("📊 RESULTS:");
    console.log(`   Imported: ${result.imported}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Total: ${result.total}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    // Get current stats
    console.log("\n📈 Getting database stats...");
    const stats = await convex.query("complianceImport:getImportStats");
    console.log("📊 DATABASE STATS:");
    console.log(`   Rules: ${stats.rules}`);
    console.log(`   Reports: ${stats.reports}`);
    console.log(`   Embeddings: ${stats.embeddings}`);
    
    console.log("\n🎉 Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
