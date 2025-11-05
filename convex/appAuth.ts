import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Verify password and return role if valid
export const verifyPassword = query({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const authRecords = await ctx.db.query("appAuth").collect();
    
    // Check if password matches any role
    for (const record of authRecords) {
      if (record.password === args.password) {
        return { valid: true, role: record.role };
      }
    }
    
    return { valid: false, role: null };
  },
});

// Get all auth records (admin only - for management UI)
export const getAllAuth = query({
  handler: async (ctx) => {
    return await ctx.db.query("appAuth").collect();
  },
});

// Update password for a role
export const updatePassword = mutation({
  args: {
    role: v.union(v.literal("admin"), v.literal("user")),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appAuth")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        password: args.password,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appAuth", {
        role: args.role,
        password: args.password,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return { success: true };
  },
});

// Initialize default passwords (run once)
export const seedPasswords = mutation({
  handler: async (ctx) => {
    const existingRecords = await ctx.db.query("appAuth").collect();
    
    // Only seed if no passwords exist
    if (existingRecords.length === 0) {
      const now = Date.now();
      
      await ctx.db.insert("appAuth", {
        role: "admin",
        password: "gustoadmin",
        createdAt: now,
        updatedAt: now,
      });
      
      await ctx.db.insert("appAuth", {
        role: "user",
        password: "gusto",
        createdAt: now,
        updatedAt: now,
      });
      
      return { success: true, message: "Passwords seeded successfully" };
    }
    
    return { success: false, message: "Passwords already exist" };
  },
});

