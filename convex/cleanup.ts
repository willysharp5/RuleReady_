import { mutation } from "./_generated/server";

// One-time cleanup: Delete old app table records
export const deleteOldAppTable = mutation({
  handler: async (ctx) => {
    // Get all records from the old app table
    const oldRecords = await ctx.db.query("app").collect();
    
    // Delete each record
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }
    
    return { 
      success: true, 
      message: `Deleted ${oldRecords.length} record(s) from old app table`,
      deletedCount: oldRecords.length
    };
  },
});

