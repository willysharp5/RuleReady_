import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Feature flags (environment-overridable)
const FEATURES = {
  complianceMode: (process.env.NEXT_PUBLIC_COMPLIANCE_MODE ?? 'true') === 'true',
};


// Create a new crawl session
export const createCrawlSession = internalMutation({
  args: {
    websiteId: v.id("websites"),
    // Removed userId - not needed in single-user mode
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("crawlSessions", {
      websiteId: args.websiteId,
      startedAt: Date.now(),
      status: "running",
      pagesFound: 0,
    });
  },
});

// Removed storeCrawledPage - no longer needed since we re-crawl each time

// Complete a crawl session
export const completeCrawlSession = internalMutation({
  args: {
    sessionId: v.id("crawlSessions"),
    pagesFound: v.number(),
    websiteId: v.id("websites"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
      status: "completed",
      pagesFound: args.pagesFound,
    });

    // Update website with total pages and last crawl time
    await ctx.db.patch(args.websiteId, {
      lastChecked: Date.now(),
    });
  },
});

// Mark crawl session as failed
export const failCrawlSession = internalMutation({
  args: {
    sessionId: v.id("crawlSessions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
      status: "failed",
      error: args.error,
    });
  },
});

// Check all pages in a full site monitor
// moved to crawlActions.ts

// Get crawl session by ID
export const getCrawlSession = internalQuery({
  args: {
    sessionId: v.id("crawlSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Update crawl session with job ID
export const updateCrawlSessionJobId = internalMutation({
  args: {
    sessionId: v.id("crawlSessions"),
    jobId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      jobId: args.jobId,
    });
  },
});

// Check the status of an async crawl job
// LEGACY: Check crawl job status - DISABLED in compliance mode
// moved to crawlActions.ts