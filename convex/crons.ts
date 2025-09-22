import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Enable pilot compliance checks (testing mode): every 15 minutes, only critical/high rules
// DEV ONLY - reduce scope; replace with production scheduler later
crons.interval(
  "pilot: crawl critical/high rules",
  { minutes: 15 },
  internal.complianceCrawler.batchCrawlComplianceRules,
  {}
);

// ALL OTHER CRON JOBS DISABLED TO STOP MULTIPLE SCRAPES AND RATE LIMITING

// Check all active websites every 5 minutes (rate limit compliant) - DISABLED
// crons.interval(
//   "check active websites",
//   { minutes: 5 },
//   internal.monitoring.checkActiveWebsites
// );

// COMPLIANCE WORKPOOL JOBS - DISABLED TO STOP MULTIPLE SCRAPES

// Process embedding jobs every 10 minutes (dev-safe)
crons.interval(
  "process embedding jobs",
  { minutes: 10 },
  internal.embeddingJobs.processEmbeddingJobs,
  {}
);

// Schedule embedding updates daily at 2 AM UTC - DISABLED
// crons.daily(
//   "schedule embedding updates",
//   { hourUTC: 2, minuteUTC: 0 },
//   internal.embeddingJobs.scheduleEmbeddingUpdates
// );

// Clean up old embedding jobs weekly - DISABLED
// crons.weekly(
//   "cleanup old embedding jobs",
//   { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
//   internal.embeddingJobs.cleanupOldJobs
// );

export default crons;