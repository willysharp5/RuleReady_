import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  // Single user table for simplified auth
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.optional(v.number()), // Make optional for existing data
  }),

  // Website monitoring tables
  websites: defineTable({
    url: v.string(),
    name: v.string(),
    userId: v.optional(v.id("users")), // Keep for existing data compatibility
    isActive: v.boolean(),
    isPaused: v.optional(v.boolean()),
    checkInterval: v.number(), // in minutes
    lastChecked: v.optional(v.number()),
    notificationPreference: v.optional(v.union(
      v.literal("none"),
      v.literal("email"),
      v.literal("webhook"),
      v.literal("both")
    )),
    monitorType: v.optional(v.union(
      v.literal("single_page"),
      v.literal("full_site")
    )),
    crawlLimit: v.optional(v.number()),
    crawlDepth: v.optional(v.number()),
    lastCrawlAt: v.optional(v.number()), // Keep for existing data
    totalPages: v.optional(v.number()), // Keep for existing data
    complianceMetadata: v.optional(v.object({
      ruleId: v.string(),
      jurisdiction: v.string(),
      topicKey: v.string(),
      priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"), v.literal("testing")),
      isComplianceWebsite: v.boolean(),
      hasManualOverride: v.optional(v.boolean()), // Keep for existing data
      originalPriority: v.optional(v.string()), // Keep for existing data
      lastPriorityChange: v.optional(v.number()), // Keep for existing data
      priorityChangeReason: v.optional(v.string()), // Keep for existing data
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"]),

  // Scrape results for website monitoring
  scrapeResults: defineTable({
    websiteId: v.id("websites"),
    userId: v.optional(v.id("users")), // Keep for existing data compatibility
    markdown: v.string(),
    changeStatus: v.union(
      v.literal("new"),
      v.literal("same"),
      v.literal("changed"),
      v.literal("removed"),
      v.literal("checking")
    ),
    visibility: v.union(v.literal("visible"), v.literal("hidden")),
    previousScrapeAt: v.optional(v.number()),
    scrapedAt: v.number(),
    firecrawlMetadata: v.optional(v.any()),
    ogImage: v.optional(v.string()), // Keep for existing data compatibility
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    diff: v.optional(v.object({
      text: v.string(),
      json: v.any(),
    })),
    aiAnalysis: v.optional(v.object({
      meaningfulChangeScore: v.number(),
      isMeaningfulChange: v.boolean(),
      reasoning: v.string(),
      analyzedAt: v.number(),
      model: v.string(),
    })),
  })
    .index("by_website", ["websiteId"])
    .index("by_website_time", ["websiteId", "scrapedAt"])
    .index("by_user_time", ["userId", "scrapedAt"]),

  // Legacy tables - keeping for compatibility with existing features
  changeAlerts: defineTable({
    websiteId: v.id("websites"),
    userId: v.optional(v.id("users")),
    scrapeResultId: v.id("scrapeResults"),
    changeType: v.string(),
    summary: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_website", ["websiteId"])
    .index("by_read_status", ["userId", "isRead"]),

  crawlSessions: defineTable({
    websiteId: v.id("websites"),
    userId: v.optional(v.id("users")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    pagesFound: v.number(),
    pagesChanged: v.optional(v.number()),
    error: v.optional(v.string()),
    jobId: v.optional(v.string()),
  })
    .index("by_website", ["websiteId"]),

  // User settings (keeping existing fields for compatibility)
  userSettings: defineTable({
    userId: v.optional(v.id("users")), // Keep for existing data compatibility
    emailNotificationsEnabled: v.boolean(),
    emailTemplate: v.optional(v.string()),
    // AI Analysis settings (keep for existing data)
    aiAnalysisEnabled: v.optional(v.boolean()),
    aiModel: v.optional(v.string()),
    aiBaseUrl: v.optional(v.string()),
    aiSystemPrompt: v.optional(v.string()),
    aiMeaningfulChangeThreshold: v.optional(v.number()),
    aiApiKey: v.optional(v.string()),
    emailOnlyIfMeaningful: v.optional(v.boolean()),
    webhookOnlyIfMeaningful: v.optional(v.boolean()),
    // Chat settings
    chatSystemPrompt: v.optional(v.string()),
    chatModel: v.optional(v.string()),
    enableComplianceContext: v.optional(v.boolean()),
    maxContextReports: v.optional(v.number()),
    enableSemanticSearch: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

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

  embeddingJobs: defineTable({
    jobId: v.string(),
    jobType: v.union(
      v.literal("import_existing"),
      v.literal("generate_new"),
      v.literal("update_existing"),
      v.literal("batch_process")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("retrying")
    ),
    entityIds: v.array(v.string()), // Entities to process in this job
    progress: v.object({
      total: v.number(),
      completed: v.number(),
      failed: v.number(),
      errors: v.array(v.string()),
    }),
    config: v.object({
      batchSize: v.number(),
      retryCount: v.number(),
      priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    }),
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_type", ["jobType"])
    .index("by_scheduled", ["scheduledAt"])
    .index("by_job_id", ["jobId"]),

  complianceChanges: defineTable({
    changeId: v.string(),
    ruleId: v.string(),
    changeType: v.union(
      v.literal("new_law"),
      v.literal("amendment"), 
      v.literal("deadline_change"),
      v.literal("penalty_change"),
      v.literal("coverage_change"),
      v.literal("procedural_change")
    ),
    severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    detectedAt: v.number(),
    effectiveDate: v.optional(v.number()),
    affectedSections: v.array(v.string()),
    changeDescription: v.string(),
    oldContent: v.optional(v.string()),
    newContent: v.optional(v.string()),
    aiConfidence: v.number(),
    humanVerified: v.optional(v.boolean()),
    notificationsSent: v.array(v.string()), // Track notification delivery
  })
    .index("by_rule", ["ruleId"])
    .index("by_severity", ["severity"])
    .index("by_date", ["detectedAt"])
    .index("by_effective_date", ["effectiveDate"])
    .index("by_change_id", ["changeId"]),

  // Compliance deadlines tracking
  complianceDeadlines: defineTable({
    deadlineId: v.string(),
    ruleId: v.string(),
    title: v.string(),
    description: v.string(),
    deadlineDate: v.number(),
    deadlineType: v.union(
      v.literal("training_deadline"),
      v.literal("posting_deadline"),
      v.literal("compliance_deadline"),
      v.literal("renewal_deadline")
    ),
    recurringPattern: v.optional(v.string()),
    remindersSent: v.array(v.number()),
    status: v.union(v.literal("upcoming"), v.literal("overdue"), v.literal("completed")),
  })
    .index("by_rule", ["ruleId"])
    .index("by_date", ["deadlineDate"])
    .index("by_status", ["status"]),

  jurisdictions: defineTable({
    code: v.string(), // "CA", "TX", "FED"
    name: v.string(), // "California", "Texas", "Federal"
    type: v.union(v.literal("federal"), v.literal("state"), v.literal("local")),
    parentJurisdiction: v.optional(v.string()),
    ruleCount: v.number(),
    lastUpdated: v.number(),
    crawlSettings: v.object({
      primaryDomains: v.array(v.string()),
      updateFrequency: v.string(),
      priority: v.string(),
    }),
  })
    .index("by_type", ["type"])
    .index("by_code", ["code"]),

  complianceTopics: defineTable({
    topicKey: v.string(), // "minimum_wage", "overtime"
    name: v.string(), // "Minimum Wage", "Overtime & Hours"
    category: v.string(), // "Wages & Hours", "Leave & Benefits"
    description: v.string(),
    priority: v.string(),
    ruleCount: v.number(),
    changeFrequency: v.string(), // How often this topic typically changes
    keywords: v.array(v.string()), // For AI-powered change detection
  })
    .index("by_category", ["category"])
    .index("by_priority", ["priority"])
    .index("by_topic_key", ["topicKey"]),

  // Compliance monitoring logs for workpool tracking
  complianceMonitoringLogs: defineTable({
    websiteId: v.id("websites"),
    ruleId: v.string(),
    success: v.boolean(),
    changesDetected: v.boolean(),
    severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"), v.literal("none")),
    processingTime: v.number(), // milliseconds
    mode: v.union(v.literal("testing"), v.literal("production")),
    processedAt: v.number(),
    error: v.optional(v.string()),
    metadata: v.optional(v.object({
      jurisdiction: v.optional(v.string()),
      topicKey: v.optional(v.string()),
      priority: v.optional(v.string()),
      contentLength: v.optional(v.number()),
      responseTime: v.optional(v.number()),
    })),
  })
    .index("by_website", ["websiteId"])
    .index("by_rule", ["ruleId"])
    .index("by_processed_at", ["processedAt"])
    .index("by_mode", ["mode"])
    .index("by_success", ["success"]),

  // AI-processed compliance reports
  complianceAIReports: defineTable({
    reportId: v.string(),
    ruleId: v.string(),
    rawContent: v.string(),
    structuredData: v.object({
      overview: v.optional(v.string()),
      coveredEmployers: v.optional(v.string()),
      coveredEmployees: v.optional(v.string()),
      employerResponsibilities: v.optional(v.string()),
      whatShouldEmployersDo: v.optional(v.string()),
      trainingRequirements: v.optional(v.string()),
      trainingDeadlines: v.optional(v.string()),
      qualifiedTrainers: v.optional(v.string()),
      specialRequirements: v.optional(v.string()),
      coverageElection: v.optional(v.string()),
      reciprocity: v.optional(v.string()),
      employerDeadlines: v.optional(v.string()),
      notificationRequirements: v.optional(v.string()),
      postingRequirements: v.optional(v.string()),
      recordkeepingRequirements: v.optional(v.string()),
      penalties: v.optional(v.string()),
      sources: v.optional(v.string()),
    }),
    sourceUrl: v.string(),
    processedBy: v.string(),
    processedAt: v.number(),
    aiMetadata: v.optional(v.object({
      tokensUsed: v.number(),
      processingTime: v.number(),
      confidence: v.number(),
      sectionsExtracted: v.number(),
    })),
  })
    .index("by_rule", ["ruleId"])
    .index("by_processed_at", ["processedAt"])
    .index("by_processed_by", ["processedBy"]),

  reportSources: defineTable({
    reportId: v.string(),
    sourceId: v.string(),
    section: v.optional(v.string()),
    citation: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_source", ["sourceId"]),

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
});

export default schema;