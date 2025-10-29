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
    enableComplianceContext: v.optional(v.boolean()),
    maxContextReports: v.optional(v.number()),
    enableSemanticSearch: v.optional(v.boolean()),
    // Research settings
    researchSystemPrompt: v.optional(v.string()),
    researchModel: v.optional(v.string()),
    researchFirecrawlConfig: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // COMPLIANCE-FOCUSED TABLES
  complianceRules: defineTable({
    ruleId: v.string(), // Composite key: jurisdiction_topickey
    jurisdiction: v.string(), // "Federal", "California", etc.
    topicKey: v.string(), // "minimum_wage", "overtime", etc.
    topicLabel: v.string(), // "Minimum Wage", "Overtime & Hours"
    sourceUrl: v.string(),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"), v.literal("testing")),
    changeFrequency: v.optional(v.string()), // "weekly", "monthly", "quarterly"
    lastSignificantChange: v.optional(v.number()),
    monitoringStatus: v.union(v.literal("active"), v.literal("paused"), v.literal("error")),
    crawlSettings: v.object({
      checkInterval: v.number(), // minutes
      depth: v.number(),
      selectors: v.optional(v.array(v.string())), // CSS selectors for key content
    }),
    metadata: v.object({
      coveredEmployers: v.optional(v.string()),
      effectiveDate: v.optional(v.string()),
      lastAmended: v.optional(v.string()),
      penalties: v.optional(v.string()),
    }),
    // New fields for compliance generation
    composedFromCount: v.optional(v.number()), // Number of sources used to generate this rule
    lastSynthesizedAt: v.optional(v.number()), // When this rule was last generated from sources
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_jurisdiction", ["jurisdiction"])
    .index("by_topic", ["topicKey"])
    .index("by_priority", ["priority"])
    .index("by_status", ["monitoringStatus"])
    .index("by_rule_id", ["ruleId"]),

  complianceReports: defineTable({
    reportId: v.string(),
    ruleId: v.string(), // Links to complianceRules
    reportContent: v.string(), // Full structured template content
    contentHash: v.string(), // For change detection
    contentLength: v.number(),
    extractedSections: v.object({
      overview: v.optional(v.string()),
      coveredEmployers: v.optional(v.string()),
      coveredEmployees: v.optional(v.string()),
      employerResponsibilities: v.optional(v.string()),
      trainingRequirements: v.optional(v.string()),
      postingRequirements: v.optional(v.string()),
      penalties: v.optional(v.string()),
      sources: v.optional(v.string()),
    }),
    processingMethod: v.string(),
    aiAnalysis: v.optional(v.object({
      severity: v.string(),
      impactAreas: v.array(v.string()),
      changeType: v.string(),
      confidence: v.number(),
    })),
    generatedAt: v.number(),
  })
    .index("by_rule", ["ruleId"])
    .index("by_hash", ["contentHash"])
    .index("by_report_id", ["reportId"]),

  // Embedding tables for RAG system
  complianceEmbeddings: defineTable({
    entityId: v.string(), // Links to complianceRules or complianceReports
    entityType: v.union(v.literal("rule"), v.literal("report")),
    contentHash: v.string(), // SHA-256 hash for change detection
    content: v.string(), // The actual text content that was embedded
    chunkIndex: v.number(), // For multi-chunk content (0-based)
    totalChunks: v.number(), // Total number of chunks for this entity
    embedding: v.array(v.number()), // 1536-dimensional Gemini embedding
    embeddingModel: v.string(), // "gemini-embedding-001"
    embeddingDimensions: v.number(), // 1536
    metadata: v.object({
      jurisdiction: v.optional(v.string()),
      topicKey: v.optional(v.string()),
      contentLength: v.optional(v.number()),
      processingMethod: v.optional(v.string()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_entity", ["entityId"])
    .index("by_entity_type", ["entityType"])
    .index("by_hash", ["contentHash"])
    .index("by_entity_chunk", ["entityId", "chunkIndex"]),

  jurisdictions: defineTable({
    code: v.string(), // "US" | "CA" | "CA-SF"
    name: v.string(), // "Federal" | "California" | "San Francisco"
    type: v.union(v.literal("federal"), v.literal("state"), v.literal("local")),
    
    // New hierarchical fields (optional for backward compatibility)
    level: v.optional(v.union(v.literal("federal"), v.literal("state"), v.literal("city"))),
    parentCode: v.optional(v.string()), // "US" for states, "CA" for CA cities
    stateCode: v.optional(v.string()),  // "CA" for cities in California
    displayName: v.optional(v.string()), // "San Francisco, CA"
    
    // Legacy fields (keep for compatibility)
    parentJurisdiction: v.optional(v.string()),
    
    // Metadata
    isActive: v.optional(v.boolean()),
    hasEmploymentLaws: v.optional(v.boolean()),
    lastUpdated: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_code", ["code"])
    .index("by_level", ["level"])
    .index("by_state", ["stateCode"])
    .index("by_parent", ["parentCode"]),

  complianceTopics: defineTable({
    topicKey: v.string(), // "minimum_wage", "overtime"
    name: v.string(), // "Minimum Wage", "Overtime & Hours"
    category: v.string(), // "Wages & Hours", "Leave & Benefits"
    description: v.string(),
    keywords: v.array(v.string()), // For AI-powered change detection
  })
    .index("by_category", ["category"])
    .index("by_topic_key", ["topicKey"]),

  // Compliance templates
  complianceTemplates: defineTable({
    templateId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    markdownContent: v.string(),
    topicKey: v.optional(v.string()),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_id", ["templateId"])
    .index("by_topic", ["topicKey"])
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
});

export default schema;