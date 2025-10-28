import { v } from "convex/values";
import { query } from "./_generated/server";

// Get all jurisdictions
export const getJurisdictions = query({
  handler: async (ctx) => {
    return await ctx.db.query("jurisdictions").collect();
  },
});

// Get all topics
export const getTopics = query({
  handler: async (ctx) => {
    return await ctx.db.query("complianceTopics").collect();
  },
});
