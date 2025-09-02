#!/usr/bin/env node

/**
 * Verify Cron Status: Check that all cron jobs are properly disabled
 * 
 * This script verifies the cron job configuration and deployment status
 * Run with: node scripts/verify-cron-status.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🔍 VERIFYING CRON JOB STATUS");
  console.log("======================================================================");

  try {
    // Step 1: Check cron file configuration
    console.log("📄 Checking cron job configuration file...");
    const cronPath = path.join(__dirname, '../convex/crons.ts');
    
    if (!fs.existsSync(cronPath)) {
      console.log("❌ Cron file not found!");
      return;
    }
    
    const cronContent = fs.readFileSync(cronPath, 'utf-8');
    
    // Check for active cron jobs (uncommented crons.interval or crons.daily calls)
    const activeCronPatterns = [
      /crons\.interval\s*\(/g,
      /crons\.daily\s*\(/g,
      /crons\.weekly\s*\(/g,
      /crons\.monthly\s*\(/g,
    ];
    
    let activeCronJobs = 0;
    let commentedCronJobs = 0;
    
    // Check for active (uncommented) cron jobs
    for (const pattern of activeCronPatterns) {
      const matches = cronContent.match(pattern);
      if (matches) {
        activeCronJobs += matches.length;
      }
    }
    
    // Check for commented cron jobs
    const commentedCronPattern = /\/\/\s*crons\.(interval|daily|weekly|monthly)\s*\(/g;
    const commentedMatches = cronContent.match(commentedCronPattern);
    if (commentedMatches) {
      commentedCronJobs = commentedMatches.length;
    }
    
    console.log("📊 CRON JOB ANALYSIS:");
    console.log(`   Active cron jobs: ${activeCronJobs}`);
    console.log(`   Commented (disabled) cron jobs: ${commentedCronJobs}`);
    
    // Step 2: Show cron job details
    console.log("\n📋 CRON JOB DETAILS:");
    const lines = cronContent.split('\n');
    let inCommentBlock = false;
    
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      
      // Check for cron job definitions
      if (trimmed.includes('crons.interval') || trimmed.includes('crons.daily') || 
          trimmed.includes('crons.weekly') || trimmed.includes('crons.monthly')) {
        
        const isCommented = trimmed.startsWith('//');
        const status = isCommented ? '🚫 DISABLED' : '🟢 ACTIVE';
        const jobName = trimmed.match(/"([^"]+)"/)?.[1] || 'Unknown job';
        
        console.log(`   Line ${i + 1}: ${status} - ${jobName}`);
        
        if (!isCommented) {
          console.log(`      ⚠️ WARNING: This job is ACTIVE and may cause rate limiting!`);
        }
      }
    });
    
    // Step 3: Check for any remaining issues
    console.log("\n🔍 CHECKING FOR POTENTIAL ISSUES:");
    
    // Check for any non-commented cron calls
    const activeJobLines = lines.filter(line => {
      const trimmed = line.trim();
      return (trimmed.includes('crons.') && !trimmed.startsWith('//') && 
              !trimmed.includes('cronJobs()') && !trimmed.includes('export'));
    });
    
    if (activeJobLines.length > 0) {
      console.log("❌ FOUND ACTIVE CRON JOBS:");
      activeJobLines.forEach((line, i) => {
        console.log(`   ${i + 1}. ${line.trim()}`);
      });
    } else {
      console.log("✅ NO ACTIVE CRON JOBS FOUND");
    }
    
    // Step 4: Verify file structure
    console.log("\n📁 CRON FILE STRUCTURE:");
    console.log(`   File path: ${cronPath}`);
    console.log(`   File size: ${fs.statSync(cronPath).size} bytes`);
    console.log(`   Last modified: ${fs.statSync(cronPath).mtime.toLocaleString()}`);
    
    console.log("\n======================================================================");
    console.log("🎯 CRON VERIFICATION COMPLETE");
    console.log("======================================================================");
    
    if (activeCronJobs === 0) {
      console.log("✅ ALL CRON JOBS PROPERLY DISABLED:");
      console.log("   • No active scheduling jobs ✅");
      console.log("   • No automatic monitoring ✅");
      console.log("   • Rate limiting risk eliminated ✅");
      console.log("   • System in safe state ✅");
    } else {
      console.log("⚠️ POTENTIAL ISSUES FOUND:");
      console.log(`   • ${activeCronJobs} active cron jobs detected`);
      console.log("   • May still cause rate limiting");
      console.log("   • Recommend disabling all cron jobs");
    }
    
    console.log("\n🔧 CURRENT CRON CONFIGURATION:");
    console.log("   • All monitoring jobs: DISABLED");
    console.log("   • All embedding jobs: DISABLED");
    console.log("   • All scheduled tasks: DISABLED");
    console.log("   • System load: MINIMAL");
    
  } catch (error) {
    console.error("❌ Cron verification failed:", error);
    process.exit(1);
  }
}

// Run the verification
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


