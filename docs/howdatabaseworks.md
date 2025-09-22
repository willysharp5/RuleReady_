### How the database works (Convex data model)

This document explains the Convex data model powering RuleReady, with an ERD and key data flows. The schema lives in `convex/schema.ts` and includes core monitoring tables plus compliance, embeddings, and user configuration.

### Overview

- **Database**: Convex
- **Identity**: `users` from `authTables` (via `@convex-dev/auth`)
- **Domains**:
  - **Monitoring**: `websites`, `scrapeResults`, `changeAlerts`, `crawlSessions`
  - **Notifications**: `emailConfig`, `userSettings`, webhook/email actions
  - **Compliance**: `complianceRules`, `complianceReports`, `complianceAIReports`, `complianceChanges`, `jurisdictions`, `complianceTopics`, `generatedReports`, `reportJobs`, `complianceMonitoringLogs`
  - **Embeddings (RAG)**: `complianceEmbeddings`, `embeddingJobs`
  - **Keys**: `apiKeys`, `firecrawlApiKeys`

### Entity relationship diagram (ERD)

```
Entities (boxes) and relationships (1 to many as 1--<):

[USERS] 1 --< [WEBSITES]
[USERS] 1 --< [APIKEYS]
[USERS] 1 --< [FIRECRAWLAPIKEYS]
[USERS] 1 --| [USERSETTINGS]
[USERS] 1 --< [EMAILCONFIG]

[WEBSITES] 1 --< [SCRAPERESULTS]
[WEBSITES] 1 --< [CHANGEALERTS]
[WEBSITES] 1 --< [CRAWLSESSIONS]

[SCRAPERESULTS] 1 --| [CHANGEALERTS]

[COMPLIANCERULES] 1 --< [COMPLIANCEREPORTS]
[COMPLIANCERULES] 1 --< [COMPLIANCECHANGES]
[COMPLIANCERULES] 1 --< [COMPLIANCEAIREPORTS]

[COMPLIANCERULES] 1 --| [WEBSITES]  (via websites.complianceMetadata.ruleId)

[COMPLIANCETOPICS] 1 --< [COMPLIANCERULES]
[JURISDICTIONS] 1 --< [COMPLIANCERULES]

[COMPLIANCEEMBEDDINGS] >-- 1 [COMPLIANCERULES]   (embeddings of rules)
[COMPLIANCEEMBEDDINGS] >-- 1 [COMPLIANCEREPORTS]  (embeddings of reports)
[EMBEDDINGJOBS] 1 --< [COMPLIANCEEMBEDDINGS]

[GENERATEDREPORTS] >--< [COMPLIANCERULES]  (many-to-many via filters)
[REPORTJOBS] 1 --< [GENERATEDREPORTS]

[COMPLIANCEMONITORINGLOGS] >-- 1 [WEBSITES]
[COMPLIANCEMONITORINGLOGS] >-- 1 [COMPLIANCERULES]

[COMPLIANCECHATSESSIONS] >-- 1 [USERS]
```

Notes:
- Convex assigns `_id` to every row; references use `v.id("table")` or string keys where noted (e.g., `ruleId`).
- Compliance websites are standard `websites` rows with `complianceMetadata` linking a `ruleId`.

### Key tables and relationships

- **users**: From `authTables`. Referenced by many tables via `userId`.
- **apiKeys**: Per-user app API keys; indexes `by_user`, `by_key`.
- **firecrawlApiKeys**: Encrypted Firecrawl keys per user; index `by_user`.
- **websites**:
  - Fields: `url`, `name`, `userId?`, `isActive`, `isPaused?`, `checkInterval`, `lastChecked?`, `notificationPreference?`, `webhookUrl?`, `monitorType?`, `crawlLimit?`, `crawlDepth?`, `complianceMetadata?`, timestamps
  - Indexes: `by_user`, `by_active`, `by_compliance`
  - Relationship: 1:N with `scrapeResults`, `changeAlerts`, `crawlSessions`
- **scrapeResults**:
  - Fields: `websiteId`, `userId?`, `markdown`, `changeStatus`, `visibility`, `scrapedAt`, optional `diff`, `aiAnalysis` etc.
  - Indexes: `by_website`, `by_website_time`, `by_user_time`
- **changeAlerts**: Alerts per scrape; indexes `by_user`, `by_website`, `by_read_status`.
- **emailConfig**: Per-user verified email info; indexes `by_user`, `by_email`, `by_token`.
- **userSettings**: Defaults and AI/notification settings; index `by_user`.
- **crawlSessions**: Full-site crawl sessions; indexes `by_website`, `by_user_time`.

Compliance domain:
- **complianceRules**: Canonical rules; key `ruleId` with `jurisdiction`, `topicKey`, `topicLabel`, priority, crawl settings; indexes by jurisdiction/topic/priority/status/rule_id.
- **complianceReports**: Structured rule content snapshots; `ruleId`, `reportContent`, `contentHash`; indexes by rule/hash/report_id.
- **complianceEmbeddings**: Vector store for rules/reports; `entityId`, `entityType` (rule|report), `embedding`, metadata; indexes by entity, type, hash, (entity,chunk).
- **embeddingJobs**: Background jobs to generate/update embeddings; indexes by status/type/scheduled/job_id.
- **complianceChanges**: Detected changes for rules; `ruleId`, `changeType`, `severity`, dates, description; indexes by rule/severity/date/effective/change_id.
- **jurisdictions** and **complianceTopics**: Lookup/config; indexes by type/code/category/priority/topic_key.
- **generatedReports** and **reportJobs**: Periodic analytical outputs and their schedules; multiple indexes for retrieval.
- **complianceAIReports**: AI-extracted structured sections per rule/report; indexes by rule/processed_at/processed_by.
- **complianceMonitoringLogs**: Execution logs for monitoring runs keyed by `websiteId` and `ruleId`.
- **complianceChatSessions**: Lightweight chat context per user/session for RAG.

### Monitoring flow (website checks → AI → notifications)

```
User
  |
  v
createWebsite (mutation)
  |
  v
[websites]

Cron: monitoring.checkActiveWebsites
  |
  v
getWebsitesToCheck
  |
  v
schedule scrape/crawl --> firecrawl.scrapeUrl | crawl.performCrawl
                                      |
                                      v
storeScrapeResult --> [scrapeResults]
          |
          +--> createChangeAlert --> [changeAlerts]
          |
          +--> aiAnalysis.analyzeChange
                       |
                       v
               updateScrapeResultAIAnalysis
                       |
                       v
               handleAIBasedNotifications
                   |                 |
                   v                 v
   sendWebhookNotification     sendEmailNotification
```

Behavioral details:
- `checkInterval` gates eligibility in `getWebsitesToCheck` using `lastChecked`.
- AI analysis is optional and governed by `userSettings` (API key, model, threshold, send-if-meaningful toggles).
- Notifications respect `websites.notificationPreference` and AI-based filters.
- Delete operations schedule async cleanup of related data (`scrapeResults`, `changeAlerts`, `crawlSessions`).

### Compliance/RAG flow

```
Data/import scripts --> [complianceRules]
[complianceRules] --(createWebsitesFromComplianceRules)--> [websites with complianceMetadata]

Cron: monitoring.checkComplianceRules --> complianceCrawler.crawlComplianceRuleInternal
  |--> [complianceReports]
  |--> [complianceChanges]
  |--> [complianceMonitoringLogs]
  |--> [complianceAIReports]

[complianceReports] --(embeddingJobs.createEmbeddingJob)--> embeddingJobs.processEmbeddingJobs
  --> embeddingManager.generateEmbedding --> embeddingManager.storeEmbedding --> [complianceEmbeddings]

[reportJobs] --> [generatedReports]
```

Notes:
- Compliance websites are auto-created from rules with priority-derived `checkInterval` and notification defaults.
- Embedding jobs aggregate `complianceReports`/`complianceRules` text into `complianceEmbeddings` for similarity search.

### Querying and indexes (practical)

- Time-based reads use composite indexes like `scrapeResults.by_website_time` or `crawlSessions.by_user_time`.
- Filtering compliance data uses `complianceRules` indexes (`by_priority`, `by_status`, `by_rule_id`), and logs use `complianceMonitoringLogs.by_processed_at`.
- Embedding workflows fetch by `embeddingJobs.by_status` and write to `complianceEmbeddings.by_hash` to upsert idempotently.

### Data lifecycle

- Creation: Users create `websites`; compliance rules can materialize into websites.
- Updates: Monitoring sets `lastChecked`; scrapes append `scrapeResults`; AI annotates results.
- Notifications: Emitted post-AI based on preferences and thresholds.
- Deletion: Website deletion schedules batched cleanup of dependent records.

### Where to look in code

- Schema: `convex/schema.ts`
- Monitoring: `convex/monitoring.ts`, `convex/websites.ts`, `convex/crawl.ts`, `convex/firecrawl.ts`
- AI analysis: `convex/aiAnalysis.ts`
- Notifications: `convex/notifications.ts`, `convex/emailManager.ts`
- Compliance: `convex/complianceCrawler.ts`, `convex/complianceQueries.ts`, `convex/compliancePriority.ts`
- Embeddings: `convex/embeddingJobs.ts`, `convex/embeddingManager.ts`

### Data dictionary (key tables)

- **websites**
  - Keys: `_id`
  - Important fields: `url`, `name`, `userId?`, `isActive`, `isPaused?`, `checkInterval`, `lastChecked?`, `notificationPreference?`, `webhookUrl?`, `monitorType?`, `crawlLimit?`, `crawlDepth?`, `complianceMetadata?`, `createdAt`, `updatedAt`
  - Indexes: `by_user(userId)`, `by_active(isActive)`, `by_compliance(complianceMetadata.isComplianceWebsite)`

- **scrapeResults**
  - Keys: `_id`
  - Important fields: `websiteId`, `userId?`, `markdown`, `changeStatus`, `visibility`, `previousScrapeAt?`, `scrapedAt`, `firecrawlMetadata?`, `title?`, `description?`, `url?`, `diff?`, `aiAnalysis?`
  - Indexes: `by_website(websiteId)`, `by_website_time(websiteId, scrapedAt)`, `by_user_time(userId, scrapedAt)`

- **changeAlerts**
  - Keys: `_id`
  - Important fields: `websiteId`, `userId?`, `scrapeResultId`, `changeType`, `summary`, `isRead`, `createdAt`
  - Indexes: `by_user(userId)`, `by_website(websiteId)`, `by_read_status(userId, isRead)`

- **userSettings**
  - Keys: `_id`
  - Important fields: `userId`, `defaultWebhookUrl?`, `emailNotificationsEnabled`, AI settings: `aiAnalysisEnabled?`, `aiModel?`, `aiBaseUrl?`, `aiSystemPrompt?`, `aiMeaningfulChangeThreshold?`, `aiApiKey?`, filters: `emailOnlyIfMeaningful?`, `webhookOnlyIfMeaningful?`, timestamps
  - Indexes: `by_user(userId)`

- **emailConfig**
  - Keys: `_id`
  - Important fields: `userId`, `email`, `isVerified`, `verificationToken?`, `verificationExpiry?`, timestamps
  - Indexes: `by_user(userId)`, `by_email(email)`, `by_token(verificationToken)`

- **crawlSessions**
  - Keys: `_id`
  - Important fields: `websiteId`, `userId`, `startedAt`, `completedAt?`, `status`, `pagesFound`, `pagesChanged?`, `pagesAdded?`, `pagesRemoved?`, `error?`, `jobId?`
  - Indexes: `by_website(websiteId)`, `by_user_time(userId, startedAt)`

- **complianceRules**
  - Keys: `_id`, domain key: `ruleId`
  - Important fields: `jurisdiction`, `topicKey`, `topicLabel`, `sourceUrl`, `priority`, `changeFrequency?`, `lastSignificantChange?`, `monitoringStatus`, `crawlSettings{checkInterval, depth, selectors?}`, metadata, timestamps
  - Indexes: `by_jurisdiction`, `by_topic`, `by_priority`, `by_status`, `by_rule_id`

- **complianceReports**
  - Keys: `_id`, domain key: `reportId`
  - Important fields: `ruleId`, `reportContent`, `contentHash`, `contentLength`, `extractedSections{...}`, `processingMethod`, `aiAnalysis?`, `generatedAt`
  - Indexes: `by_rule`, `by_hash`, `by_report_id`

- **complianceEmbeddings**
  - Keys: `_id`
  - Important fields: `entityId`, `entityType(rule|report)`, `contentHash`, `content`, `chunkIndex`, `totalChunks`, `embedding[1536]`, `embeddingModel`, `embeddingDimensions`, metadata, timestamps
  - Indexes: `by_entity(entityId)`, `by_entity_type(entityType)`, `by_hash(contentHash)`, `by_entity_chunk(entityId, chunkIndex)`

- **embeddingJobs**
  - Keys: `_id`, domain key: `jobId`
  - Important fields: `jobType`, `status`, `entityIds[]`, `progress{total,completed,failed,errors[]}`, `config{batchSize,retryCount,priority}`, `scheduledAt`, `startedAt?`, `completedAt?`, `nextRetryAt?`
  - Indexes: `by_status`, `by_type`, `by_scheduled`, `by_job_id`

- **complianceChanges**
  - Keys: `_id`, domain key: `changeId`
  - Important fields: `ruleId`, `changeType`, `severity`, `detectedAt`, `effectiveDate?`, `affectedSections[]`, `changeDescription`, `oldContent?`, `newContent?`, `aiConfidence`, `humanVerified?`, `notificationsSent[]`
  - Indexes: `by_rule`, `by_severity`, `by_date`, `by_effective_date`, `by_change_id`

- **complianceMonitoringLogs**
  - Keys: `_id`
  - Important fields: `websiteId`, `ruleId`, `success`, `changesDetected`, `severity`, `processingTime`, `mode(testing|production)`, `processedAt`, `error?`, metadata
  - Indexes: `by_website`, `by_rule`, `by_processed_at`, `by_mode`, `by_success`

### Sequence: notifications after AI analysis

```
aiAnalysis.analyzeChange
  -> websites.updateScrapeResultAIAnalysis(scrapeResultId, analysis)
  -> aiAnalysis.handleAIBasedNotifications(...)
  -> websites.getScrapeResult()
  -> websites.getWebsite()
  -> notifications.sendWebhookNotification (if enabled && passes filters)
  -> notifications.sendEmailNotification (if enabled && passes filters)
  -> webhook target receives POST
  -> email provider (Resend) sends email
```

### State: website monitoring

```
Active --pauseWebsite(true)--> Paused
Paused --pauseWebsite(false)--> Active
Active --deleteWebsite()--> Deleted
Paused --deleteWebsite()--> Deleted
```

### Practical examples

Get websites to check (respect intervals):

```ts
// convex/monitoring.ts
const active = await ctx.db.query("websites").withIndex("by_active", q => q.eq("isActive", true)).collect();
const due = active.filter(w => !w.isPaused && (!w.lastChecked || (Date.now() - w.lastChecked) >= w.checkInterval * 60 * 1000));
```

Fetch latest scrapes per website:

```ts
const latest = await ctx.db
  .query("scrapeResults")
  .withIndex("by_website_time", q => q.eq("websiteId", websiteId))
  .order("desc")
  .first();
```

Upsert embeddings by hash:

```ts
const existing = await ctx.db.query("complianceEmbeddings").withIndex("by_hash", q => q.eq("contentHash", hash)).first();
if (existing) {
  await ctx.db.patch(existing._id, { embedding, updatedAt: Date.now() });
} else {
  await ctx.db.insert("complianceEmbeddings", { /* fields... */ });
}
```

### Related docs

- App architecture: `docs/ARCHITECTURE.md`
- System overview: `docs/howitworks.md`
- UI overview: `docs/howuiworks.md`
- Compliance crawler design: `docs/COMPLIANCE_CRAWLER_PLAN.md`


