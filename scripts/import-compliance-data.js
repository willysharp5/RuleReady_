#!/usr/bin/env node

/**
 * Import Script: Compliance Rules from CSV
 * 
 * This script imports the 1,305 compliance rules from your CSV file
 * Run with: node scripts/import-compliance-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Starting compliance data import...");
  console.log("======================================================================");

  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, '../data/compliance_rules_enriched.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log(`📖 Read CSV file: ${csvPath}`);
    
    // Count lines
    const lines = csvContent.trim().split('\n');
    console.log(`📊 Found ${lines.length - 1} compliance rules (excluding header)`);
    
    console.log("\n✅ CSV file ready for import!");
    console.log("======================================================================");
    console.log("📋 NEXT STEPS:");
    console.log("1. Deploy your updated Convex schema");
    console.log("2. Call the importCSVData action from your Convex dashboard");
    console.log("3. Or use this content in your frontend import component");
    console.log("======================================================================");
    
    // Show sample of the data
    console.log("\n📄 SAMPLE DATA (first 5 rules):");
    const sampleLines = lines.slice(0, 6); // Header + 5 data lines
    sampleLines.forEach((line, index) => {
      if (index === 0) {
        console.log(`   HEADERS: ${line}`);
      } else {
        const values = line.split(',');
        console.log(`   ${index}. ${values[0]} - ${values[2]} (${values[1]})`);
      }
    });
    
    console.log("\n🎯 Ready to import into Convex!");
    
    return {
      success: true,
      csvPath,
      totalRules: lines.length - 1,
      csvContent: csvContent.substring(0, 1000) + "..." // Show first 1000 chars
    };
    
  } catch (error) {
    console.error("❌ Import preparation failed:", error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
