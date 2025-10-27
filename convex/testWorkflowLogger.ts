import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Test workflow logging table (temporary for testing)
const testLogs = "testWorkflowLogs";

// Log workflow steps for testing
export const logWorkflowStep = mutation({
  args: {
    step: v.string(),
    action: v.string(),
    data: v.any(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`🧪 TEST LOG [${args.step}]: ${args.action} - ${args.success ? 'SUCCESS' : 'FAILED'}`);
    if (args.data) {
      console.log(`📊 Data:`, JSON.stringify(args.data, null, 2));
    }
    if (args.error) {
      console.log(`❌ Error:`, args.error);
    }
    
    // Store in a simple format for now (would create proper table in real implementation)
    return {
      timestamp: Date.now(),
      step: args.step,
      action: args.action,
      success: args.success,
      data: args.data,
      error: args.error,
    };
  },
});

// Get all test logs
export const getTestLogs = query({
  args: {},
  handler: async (ctx) => {
    // For now, just return a message since we don't have the table
    // In real implementation, would query the testWorkflowLogs table
    return {
      message: "Test logs are being output to console. Check server logs for detailed workflow tracking.",
      timestamp: Date.now(),
    };
  },
});

// Clear test logs (for cleanup after testing)
export const clearTestLogs = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 Clearing test workflow logs...");
    // In real implementation, would delete from testWorkflowLogs table
    return { message: "Test logs cleared", timestamp: Date.now() };
  },
});
