import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Helper function to generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get all compliance topics (active by default)
 */
export const getTopics = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const topics = await ctx.db.query("complianceTopics").collect();
    
    if (args.includeInactive) {
      return topics;
    }
    
    // Filter to only active topics (or topics without isActive field, for backwards compatibility)
    return topics.filter(t => t.isActive !== false);
  },
});

/**
 * Get a single topic by slug
 */
export const getTopicBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db
      .query("complianceTopics")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    return topic;
  },
});

/**
 * Get topics by category
 */
export const getTopicsByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const topics = await ctx.db
      .query("complianceTopics")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
    
    return topics;
  },
});

/**
 * Search topics by name, category, or description
 */
export const searchTopics = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const allTopics = await ctx.db.query("complianceTopics").collect();
    const searchLower = args.searchTerm.toLowerCase();
    
    return allTopics.filter(topic => 
      topic.name.toLowerCase().includes(searchLower) ||
      topic.slug.toLowerCase().includes(searchLower) ||
      topic.category.toLowerCase().includes(searchLower) ||
      topic.description.toLowerCase().includes(searchLower)
    );
  },
});

/**
 * Create a new compliance topic
 */
export const createTopic = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = generateSlug(args.name);
    
    // Check if slug already exists
    const existing = await ctx.db
      .query("complianceTopics")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    
    if (existing) {
      throw new Error(`A topic with the slug "${slug}" already exists. Please choose a different name.`);
    }
    
    const now = Date.now();
    const topicId = await ctx.db.insert("complianceTopics", {
      name: args.name,
      slug,
      category: args.category,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    
    return topicId;
  },
});

/**
 * Update an existing compliance topic
 */
export const updateTopic = mutation({
  args: {
    id: v.id("complianceTopics"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // If name is being updated, regenerate slug
    let slug: string | undefined;
    if (updates.name) {
      slug = generateSlug(updates.name);
      
      // Check if new slug conflicts with another topic
      const existing = await ctx.db
        .query("complianceTopics")
        .withIndex("by_slug", (q) => q.eq("slug", slug!))
        .first();
      
      if (existing && existing._id !== id) {
        throw new Error(`A topic with the slug "${slug}" already exists. Please choose a different name.`);
      }
    }
    
    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    if (slug) {
      updateData.slug = slug;
    }
    
    await ctx.db.patch(id, updateData);
    
    return id;
  },
});

/**
 * Delete a compliance topic
 */
export const deleteTopic = mutation({
  args: {
    id: v.id("complianceTopics"),
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.id);
    
    if (!topic) {
      throw new Error("Topic not found");
    }
    
    // Check if topic is referenced by any templates
    const templatesUsingTopic = await ctx.db.query("complianceTemplates").collect();
    const referencedTemplates = templatesUsingTopic.filter(t => t.topicSlug === topic.slug);
    
    if (referencedTemplates.length > 0) {
      throw new Error(`Cannot delete topic "${topic.name}" because it is referenced by ${referencedTemplates.length} template(s). Please reassign or delete those templates first.`);
    }
    
    await ctx.db.delete(args.id);
    
    return { success: true };
  },
});

/**
 * Toggle topic active status (soft delete)
 */
export const toggleTopicActive = mutation({
  args: {
    id: v.id("complianceTopics"),
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.id);
    
    if (!topic) {
      throw new Error("Topic not found");
    }
    
    await ctx.db.patch(args.id, {
      isActive: topic.isActive === false ? true : false,
      updatedAt: Date.now(),
    });
    
    return { success: true, newStatus: topic.isActive === false ? true : false };
  },
});

/**
 * Get unique categories from all topics
 */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const topics = await ctx.db.query("complianceTopics").collect();
    const categories = [...new Set(topics.map(t => t.category))];
    
    return categories.sort();
  },
});

/**
 * Rename a category across all topics
 * This is database-safe: updates all topics using the old category name
 */
export const renameCategory = mutation({
  args: {
    oldCategoryName: v.string(),
    newCategoryName: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.oldCategoryName === args.newCategoryName) {
      return { success: true, updated: 0, message: "No change needed" };
    }
    
    // Check if new category name already exists
    const allTopics = await ctx.db.query("complianceTopics").collect();
    const existingCategories = [...new Set(allTopics.map(t => t.category))];
    
    if (existingCategories.includes(args.newCategoryName) && args.newCategoryName !== args.oldCategoryName) {
      throw new Error(`Category "${args.newCategoryName}" already exists. Use merge instead if you want to combine categories.`);
    }
    
    // Find all topics with the old category
    const topicsToUpdate = allTopics.filter(t => t.category === args.oldCategoryName);
    
    // Update each topic
    const now = Date.now();
    for (const topic of topicsToUpdate) {
      await ctx.db.patch(topic._id, {
        category: args.newCategoryName,
        updatedAt: now,
      });
    }
    
    return { 
      success: true, 
      updated: topicsToUpdate.length,
      message: `Renamed "${args.oldCategoryName}" to "${args.newCategoryName}" for ${topicsToUpdate.length} topic(s)`
    };
  },
});

/**
 * Merge one category into another
 * This moves all topics from sourceCategory to targetCategory
 */
export const mergeCategories = mutation({
  args: {
    sourceCategory: v.string(),
    targetCategory: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.sourceCategory === args.targetCategory) {
      throw new Error("Source and target categories must be different");
    }
    
    // Find all topics with the source category
    const allTopics = await ctx.db.query("complianceTopics").collect();
    const topicsToMove = allTopics.filter(t => t.category === args.sourceCategory);
    
    // Move all topics to target category
    const now = Date.now();
    for (const topic of topicsToMove) {
      await ctx.db.patch(topic._id, {
        category: args.targetCategory,
        updatedAt: now,
      });
    }
    
    return { 
      success: true, 
      moved: topicsToMove.length,
      message: `Moved ${topicsToMove.length} topic(s) from "${args.sourceCategory}" to "${args.targetCategory}"`
    };
  },
});

/**
 * CLEAR ALL TOPICS - Use this to completely reset the topics table
 * Warning: This will delete all topics!
 */
export const clearAllTopics = mutation({
  handler: async (ctx) => {
    const allTopics = await ctx.db.query("complianceTopics").collect();
    
    for (const topic of allTopics) {
      await ctx.db.delete(topic._id);
    }
    
    return { 
      success: true, 
      deleted: allTopics.length 
    };
  },
});

