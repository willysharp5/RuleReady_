import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  // App authentication (single record)
  app: defineTable({
    password: v.string(), // Simple password for access control
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // App settings (single-user mode - global app configuration)
  appSettings: defineTable({
    // Chat settings
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
    chatTemperature: v.optional(v.number()),
    chatMaxTokens: v.optional(v.number()),
    // Research settings
    researchSystemPrompt: v.optional(v.string()),
    researchModel: v.optional(v.string()),
    researchTemperature: v.optional(v.number()),
    researchMaxTokens: v.optional(v.number()),
    researchFirecrawlConfig: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Jurisdictions (US states, federal, cities)
  jurisdictions: defineTable({
    code: v.string(), // "US" | "CA" | "CA-SF"
    name: v.string(), // "Federal" | "California" | "San Francisco"
    level: v.union(v.literal("federal"), v.literal("state"), v.literal("city")),
    
    // Hierarchical fields
    parentCode: v.optional(v.string()), // "US" for states, "CA" for CA cities
    stateCode: v.optional(v.string()),  // "CA" for cities in California
    displayName: v.optional(v.string()), // "San Francisco, CA"
    
    // Metadata
    isActive: v.optional(v.boolean()),
    hasEmploymentLaws: v.optional(v.boolean()),
    lastUpdated: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_level", ["level"])
    .index("by_state", ["stateCode"])
    .index("by_parent", ["parentCode"]),

  complianceTopics: defineTable({
    name: v.string(), // "Minimum Wage", "Overtime & Hours" - Primary display name
    slug: v.string(), // "minimum-wage", "overtime-hours" - Auto-generated URL-friendly version
    category: v.string(), // "Wages & Hours", "Leave & Benefits"
    description: v.string(), // For UI tooltips and AI context
    isActive: v.optional(v.boolean()), // Allow hiding topics without deleting
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"]),

  // Compliance templates
  complianceTemplates: defineTable({
    templateId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    markdownContent: v.string(),
    topicSlug: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_id", ["templateId"])
    .index("by_topic", ["topicSlug"])
    .index("by_active", ["isActive"]),

  // Saved research results (from Compliance Research feature)
  savedResearch: defineTable({
    title: v.string(), // User-editable title
    content: v.string(), // Markdown content (research result)
    jurisdiction: v.optional(v.string()),
    topic: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    sources: v.optional(v.array(v.any())), // All sources combined
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_jurisdiction", ["jurisdiction"])
    .index("by_topic", ["topic"]),

  // Research conversations (full chat sessions)
  researchConversations: defineTable({
    title: v.string(), // Auto-generated or user-editable
    messages: v.array(v.object({
      id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      scrapedUrlSources: v.optional(v.array(v.any())),
      internalSources: v.optional(v.array(v.any())),
      webSources: v.optional(v.array(v.any())),
      newsResults: v.optional(v.array(v.any())),
    })),
    filters: v.object({
      jurisdiction: v.optional(v.string()),
      topic: v.optional(v.string()),
      templateUsed: v.optional(v.string()),
    }),
    settingsSnapshot: v.object({
      systemPrompt: v.optional(v.string()),
      firecrawlConfig: v.optional(v.string()),
      additionalContext: v.optional(v.string()),
    }),
    messageCount: v.number(),
    savedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_saved_at", ["savedAt"])
    .index("by_message_count", ["messageCount"]),

  // Chat conversations (compliance chat sessions)
  chatConversations: defineTable({
    title: v.string(), // Auto-generated or user-editable
    messages: v.array(v.object({
      id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      internalSources: v.optional(v.array(v.any())),
      savedResearchSources: v.optional(v.array(v.any())),
    })),
    filters: v.object({
      jurisdiction: v.optional(v.string()),
      topic: v.optional(v.string()),
    }),
    settingsSnapshot: v.object({
      systemPrompt: v.optional(v.string()),
      model: v.optional(v.string()),
      additionalContext: v.optional(v.string()),
      savedResearchContent: v.optional(v.string()),
    }),
    messageCount: v.number(),
    savedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_saved_at", ["savedAt"])
    .index("by_message_count", ["messageCount"]),
});

export default schema;