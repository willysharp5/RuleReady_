import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check all active websites every 15 seconds (for testing)
// Note: In production, this should be set to a more reasonable interval like 5 minutes
crons.interval(
  "check active websites",
  { seconds: 15 },
  internal.monitoring.checkActiveWebsites
);

// COMPLIANCE-SPECIFIC CRON JOBS

// Process embedding jobs every 5 minutes
crons.interval(
  "process embedding jobs",
  { minutes: 5 },
  internal.embeddingJobs.processEmbeddingJobs
);

// Schedule embedding updates daily at 2 AM UTC
crons.daily(
  "schedule embedding updates",
  { hourUTC: 2, minuteUTC: 0 },
  internal.embeddingJobs.scheduleEmbeddingUpdates
);

// Clean up old embedding jobs weekly
crons.weekly(
  "cleanup old embedding jobs",
  { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
  internal.embeddingJobs.cleanupOldJobs
);

export default crons;