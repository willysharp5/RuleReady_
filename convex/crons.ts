import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check all active websites every 5 minutes
crons.interval(
  "check active websites",
  { minutes: 5 },
  internal.monitoring.checkActiveWebsites
);

export default crons;