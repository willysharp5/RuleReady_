import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation, action } from "./_generated/server";
import { requireCurrentUser, getCurrentUser } from "./helpers";
import FirecrawlApp from "@mendable/firecrawl-js";

// Simple obfuscation for API keys (in production, use proper encryption)
// TEMPORARY: Store in plain text to debug the issue
function encryptKey(key: string): string {
  // TODO: In production, use proper encryption with a secure key management service
  return key;
}

function decryptKey(encryptedKey: string): string {
  // TODO: In production, use proper decryption with a secure key management service
  return encryptedKey;
}

// Get the current user's Firecrawl API key (single-user mode compatible)
export const getUserFirecrawlKey = query({
  handler: async (ctx) => {
    // Single-user mode: get any API key or return null
    const user = await getCurrentUser(ctx);
    
    // If no user (single-user mode), get the first API key
    if (!user) {
      const apiKey = await ctx.db.query("firecrawlApiKeys").first();
      if (!apiKey) {
        return null;
      }
      
      return {
        hasKey: true,
        lastUsed: apiKey.lastUsed,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
        maskedKey: decryptKey(apiKey.encryptedKey).slice(0, 8) + '...' + decryptKey(apiKey.encryptedKey).slice(-4),
      };
    }

    const apiKey = await ctx.db
      .query("firecrawlApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!apiKey) {
      return null;
    }

    return {
      hasKey: true,
      lastUsed: apiKey.lastUsed,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      // Don't return the actual key for security
      maskedKey: decryptKey(apiKey.encryptedKey).slice(0, 8) + '...' + decryptKey(apiKey.encryptedKey).slice(-4),
    };
  },
});

// Set or update the Firecrawl API key (single-user mode compatible)
export const setFirecrawlKey = mutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Single-user mode: get current user or create a default user entry
    const user = await getCurrentUser(ctx);
    let userId: any;
    
    if (!user) {
      // Single-user mode: use a default user ID or create one
      const existingKey = await ctx.db.query("firecrawlApiKeys").first();
      if (existingKey) {
        userId = existingKey.userId;
      } else {
        // Create a placeholder user for single-user mode
        userId = "single-user" as any;
      }
    } else {
      userId = user._id;
    }

    // Validate the API key format
    const trimmedKey = args.apiKey.trim();
    if (!trimmedKey || trimmedKey.length < 20) {
      throw new Error("Invalid API key format");
    }
    
    // Firecrawl keys typically start with 'fc-'
    if (!trimmedKey.startsWith('fc-')) {
      throw new Error("Invalid Firecrawl API key format. Keys should start with 'fc-'");
    }

    // Check if user already has a key
    const existingKey = await ctx.db
      .query("firecrawlApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const encryptedKey = encryptKey(trimmedKey);
    const now = Date.now();
    
    // Debug: verify encryption/decryption works
    const testDecrypt = decryptKey(encryptedKey);
    if (testDecrypt !== trimmedKey) {
      console.error("Encryption/decryption mismatch:", { 
        original: trimmedKey.slice(0, 8) + "...", 
        decrypted: testDecrypt.slice(0, 8) + "..." 
      });
      throw new Error("Failed to encrypt API key properly");
    }

    if (existingKey) {
      // Update existing key
      await ctx.db.patch(existingKey._id, {
        encryptedKey,
        updatedAt: now,
      });
    } else {
      // Create new key
      await ctx.db.insert("firecrawlApiKeys", {
        userId: userId,
        encryptedKey,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Delete the Firecrawl API key (single-user mode compatible)
export const deleteFirecrawlKey = mutation({
  handler: async (ctx) => {
    // Single-user mode: get current user or find any key
    const user = await getCurrentUser(ctx);
    
    let apiKey;
    if (!user) {
      // Single-user mode: delete the first API key
      apiKey = await ctx.db.query("firecrawlApiKeys").first();
    } else {
      apiKey = await ctx.db
        .query("firecrawlApiKeys")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
    }

    if (apiKey) {
      await ctx.db.delete(apiKey._id);
    }

    return { success: true };
  },
});

// Internal query to get decrypted API key for backend use
export const getDecryptedFirecrawlKey = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("firecrawlApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!apiKey) {
      return null;
    }

    return {
      key: decryptKey(apiKey.encryptedKey),
      keyId: apiKey._id,
    };
  },
});

// Internal query to get decrypted API key for single-user mode
export const getDecryptedFirecrawlKeyForSingleUser = internalQuery({
  handler: async (ctx) => {
    const apiKey = await ctx.db.query("firecrawlApiKeys").first();

    if (!apiKey) {
      return null;
    }

    return {
      key: decryptKey(apiKey.encryptedKey),
      keyId: apiKey._id,
    };
  },
});

// Internal mutation to update last used timestamp
export const updateLastUsed = internalMutation({
  args: {
    keyId: v.id("firecrawlApiKeys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, {
      lastUsed: Date.now(),
    });
  },
});

// Import internal for the action
import { internal } from "./_generated/api";
import { requireCurrentUserForAction, getCurrentUserForAction } from "./helpers";

// Action to get token usage from Firecrawl API (single-user mode compatible)
export const getTokenUsage = action({
  handler: async (ctx): Promise<{ success: boolean; error?: string; remaining_tokens?: number }> => {
    // Single-user mode: get current user or use fallback
    const user = await getCurrentUserForAction(ctx);
    
    // Get user's API key (or first available key in single-user mode)
    let keyData: any;
    if (user) {
      keyData = await ctx.runQuery(internal.firecrawlKeys.getDecryptedFirecrawlKey, { 
        userId: user 
      });
    } else {
      // Single-user mode: get any available key
      keyData = await ctx.runQuery(internal.firecrawlKeys.getDecryptedFirecrawlKeyForSingleUser);
    }
    
    if (!keyData || !keyData.key) {
      return {
        success: false,
        error: "No API key found"
      };
    }

    try {
      const response: Response = await fetch('https://api.firecrawl.dev/v1/team/credit-usage', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${keyData.key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        return {
          success: false,
          error: errorData.error || `API error: ${response.status}`
        };
      }

      const data: any = await response.json();
      return {
        success: true,
        remaining_tokens: data.data?.remaining_credits
      };
    } catch (error) {
      console.error("Failed to fetch token usage:", error);
      return {
        success: false,
        error: "Failed to fetch token usage"
      };
    }
  },
});