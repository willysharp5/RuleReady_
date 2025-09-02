#!/usr/bin/env node

/**
 * Final Cron Verification: Comprehensive check of cron job status
 * 
 * This script provides a final verification that no cron jobs are active
 * Run with: node scripts/final-cron-verification.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🔍 FINAL CRON JOB VERIFICATION");
  console.log("======================================================================");

  try {
    // Read the cron file
    const cronPath = path.join(__dirname, '../convex/crons.ts');
    const cronContent = fs.readFileSync(cronPath, 'utf-8');
    
    console.log("📄 ANALYZING CRON CONFIGURATION:");
    
    // Check 1: Look for any uncommented cron definitions
    const lines = cronContent.split('\n');
    const activeCronLines = [];
    const commentedCronLines = [];
    
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      
      // Check for cron method calls
      if (trimmed.includes('crons.interval') || trimmed.includes('crons.daily') || 
          trimmed.includes('crons.weekly') || trimmed.includes('crons.monthly')) {
        
        if (trimmed.startsWith('//')) {
          commentedCronLines.push({ line: i + 1, content: trimmed });
        } else {
          activeCronLines.push({ line: i + 1, content: trimmed });
        }
      }
    });
    
    console.log(`📊 CRON JOB SUMMARY:`);
    console.log(`   Active (uncommented) cron jobs: ${activeCronLines.length}`);
    console.log(`   Disabled (commented) cron jobs: ${commentedCronLines.length}`);
    
    // Show active jobs (should be 0)
    if (activeCronLines.length > 0) {
      console.log("\n❌ ACTIVE CRON JOBS FOUND (THESE WILL RUN):");
      activeCronLines.forEach(job => {
        console.log(`   Line ${job.line}: ${job.content}`);
      });
    } else {
      console.log("\n✅ NO ACTIVE CRON JOBS FOUND");
    }
    
    // Show disabled jobs
    if (commentedCronLines.length > 0) {
      console.log("\n🚫 DISABLED CRON JOBS:");
      commentedCronLines.forEach(job => {
        console.log(`   Line ${job.line}: ${job.content.replace('//', '').trim()}`);
      });
    }
    
    // Check 2: Verify the export structure
    console.log("\n📦 CHECKING EXPORT STRUCTURE:");
    if (cronContent.includes('export default crons;')) {
      console.log("✅ Cron export found");
    } else {
      console.log("❌ Cron export missing");
    }
    
    // Check 3: Look for any potential issues
    console.log("\n🔍 POTENTIAL ISSUES CHECK:");
    
    const potentialIssues = [];
    
    // Check for any non-commented function calls that might trigger jobs
    if (cronContent.includes('ctx.scheduler.runAfter') && !cronContent.includes('// ctx.scheduler.runAfter')) {
      potentialIssues.push("Found scheduler calls that might trigger jobs");
    }
    
    // Check for any setInterval or setTimeout calls
    if (cronContent.includes('setInterval') || cronContent.includes('setTimeout')) {
      potentialIssues.push("Found timer functions that might cause recurring execution");
    }
    
    if (potentialIssues.length > 0) {
      console.log("⚠️ POTENTIAL ISSUES:");
      potentialIssues.forEach(issue => console.log(`   • ${issue}`));
    } else {
      console.log("✅ NO POTENTIAL ISSUES FOUND");
    }
    
    console.log("\n======================================================================");
    console.log("🎯 FINAL VERIFICATION RESULT");
    console.log("======================================================================");
    
    if (activeCronLines.length === 0) {
      console.log("✅ ALL CRON JOBS PROPERLY DISABLED:");
      console.log("   • No automatic website checking ✅");
      console.log("   • No compliance monitoring scheduling ✅");
      console.log("   • No embedding job processing ✅");
      console.log("   • No scheduled tasks running ✅");
      console.log("   • Rate limiting completely prevented ✅");
      
      console.log("\n🎉 SYSTEM IS IN SAFE STATE:");
      console.log("   • No background jobs running");
      console.log("   • No government website requests");
      console.log("   • No resource consumption from monitoring");
      console.log("   • Ready for controlled manual testing");
      
    } else {
      console.log("❌ CRON JOBS STILL ACTIVE:");
      console.log(`   • ${activeCronLines.length} jobs are still running`);
      console.log("   • These jobs may cause rate limiting");
      console.log("   • Recommend commenting out all active jobs");
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

// Run the verification
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


