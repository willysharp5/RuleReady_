#!/usr/bin/env node

/**
 * Database Cleanup Instructions
 * Shows which tables to remove manually from Convex dashboard
 */

console.log("🧹 DATABASE CLEANUP INSTRUCTIONS");
console.log("================================");
console.log("");
console.log("⚠️  WARNING: This will permanently delete old tables and their data!");
console.log("");

// Tables to remove (no longer in schema)
const tablesToRemove = [
  'authAccounts',
  'authSessions', 
  'authVerifiers',
  'authVerificationCodes',
  'authRefreshTokens',
  'authRateLimits',
  'apiKeys',
  'emailConfig',
  'firecrawlApiKeys',
  'webhookPlayground'
];

console.log("❌ TABLES TO REMOVE (no longer needed):");
tablesToRemove.forEach(table => {
  console.log(`   - ${table}`);
});

console.log("");
console.log("📋 MANUAL STEPS:");
console.log("1. Open Convex Dashboard: https://dashboard.convex.dev/d/friendly-octopus-467");
console.log("2. Go to 'Data' tab");
console.log("3. For each table listed above:");
console.log("   - Click on the table name");
console.log("   - Look for delete/remove option (usually ⋯ menu or trash icon)");
console.log("   - Confirm deletion");
console.log("");

console.log("✅ TABLES TO KEEP (these are in your current schema):");
const tablesToKeep = [
  'users',
  'websites', 
  'scrapeResults',
  'changeAlerts',
  'crawlSessions',
  'userSettings',
  'complianceRules',
  'complianceReports',
  'complianceEmbeddings',
  'embeddingJobs',
  'complianceChanges',
  'complianceDeadlines',
  'jurisdictions',
  'complianceTopics',
  'complianceMonitoringLogs',
  'generatedReports',
  'reportJobs',
  'complianceAIReports',
  'complianceChatSessions',
  'complianceTemplates'
];

tablesToKeep.forEach(table => {
  console.log(`   ✓ ${table}`);
});

console.log("");
console.log("🔄 After removing old tables, your database will be in sync with your simplified code!");
console.log("🎯 Your app will then work purely in single-user mode without auth complexity.");