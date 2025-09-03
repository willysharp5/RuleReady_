import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Enable pilot compliance checks (testing mode): every 10 minutes, only critical/high rules
// DEV ONLY - comment out before deploying to production
// DISABLED FOR NOW
// crons.interval(
//   "pilot: check compliance rules",
//   { minutes: 10 },
//   internal.monitoring.checkComplianceRules
// );

// ALL OTHER CRON JOBS DISABLED TO STOP MULTIPLE SCRAPES AND RATE LIMITING

// Check all active websites every 5 minutes (rate limit compliant) - DISABLED
// crons.interval(
//   "check active websites",
//   { minutes: 5 },
//   internal.monitoring.checkActiveWebsites
// );

// COMPLIANCE WORKPOOL JOBS - DISABLED TO STOP MULTIPLE SCRAPES

// Process embedding jobs every 5 minutes - DISABLED
// crons.interval(
//   "process embedding jobs",
//   { minutes: 5 },
//   internal.embeddingJobs.processEmbeddingJobs
// );

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