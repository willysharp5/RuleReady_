### How RuleReady Works

This document explains the architecture, data model, and the end-to-end flows that power monitoring, change detection, AI analysis, notifications, and compliance reporting in this app.

## System Architecture

- **Frontend (Next.js + React)**
  - Dashboard (`/`) shows Currently Tracked Websites and Change Tracking Log
  - Settings (`/settings`) manages email/AI preferences and keys
  - API routes under `src/app/api/*` for REST integrations (optional; main backend is Convex)

- **Backend (Convex)**
  - Database and serverless functions live under `convex/*`
  - Queries/Mutations/Actions coordinate scraping, storage, notifications, and AI
  - Scheduler orchestrates background tasks with `ctx.scheduler.runAfter(...)`

- **External Services**
  - Firecrawl: scraping and change tracking
  - Email (Resend): templated alert delivery
  - AI (OpenAI-compatible/Gemini): change significance analysis and embeddings

### Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js App   │────▶│   Convex DB     │◀────│  Scheduled      │
│   (Frontend)    │     │   (Backend)     │     │  Functions      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                        │
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│     Resend      │     │   Firecrawl     │     │    OpenAI/      │
│  (Email API)    │     │  (Scraping)     │     │    AI APIs      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### High-level Data Flow

1. User adds website → stored in Convex DB (legacy mode) or uses compliance rules (compliance mode)
2. Scheduled/manual check runs → calls Firecrawl (legacy) or `complianceCrawler` (compliance)
3. Content processed → legacy saves `scrapeResults`; compliance saves `complianceReports` + `complianceChanges`
4. AI Analysis (optional) → determines significance; updates `aiAnalysis` (legacy) or feeds `complianceChanges`
5. Embeddings → vectors in `complianceEmbeddings` and job orchestration in `embeddingJobs`
6. Notifications → Email/Webhook via `notifications.*` (including compliance-native notifications)

## Data Model (Convex Tables)

Defined in `convex/schema.ts`. Key entities:

- `websites`
  - Monitored targets with schedule and notification prefs
  - Optional `complianceMetadata` links a site to a compliance rule (jurisdiction/topic/priority)

- `scrapeResults` (legacy)
  - Versioned page snapshots for general websites
  - In compliance mode, legacy writes are frozen and read paths are shimmed from compliance data

- `changeAlerts` (legacy)
  - In compliance mode, dashboard ‘unread alerts’ are derived from `complianceChanges`

- `emailConfig`, `userSettings`
  - Delivery settings (email verification, template), AI settings (model, base URL, threshold)

- `crawlSessions`
  - Full-site crawl tracking (start/completion, pagesFound, status, errors)

- Compliance data
  - `complianceRules`: jurisdiction/topic rules, priority, crawl cadence
  - `complianceReports`: versioned, structured reports
  - `complianceAIReports`: AI-extracted structured details from raw content
  - `complianceChanges`: normalized change records (type, severity, description)
  - `complianceEmbeddings` + `embeddingJobs`: RAG vectors and job pipeline
  - `complianceMonitoringLogs`: workpool/job activity and metrics

## Core Backend Modules (selected)

- `convex/websites.ts`
  - CRUD and core flows for websites and scrape history (legacy)
  - Compliance-mode changes:
    - Freeze non-compliance writes (feature flags: `features.complianceMode`, `features.freezeLegacyWrites`)
    - Read-only shims map legacy queries to compliance tables:
      - `getUnreadAlerts` → derives from `complianceChanges`
      - `getAllScrapeHistory` → derives from `complianceReports`
      - `getLatestScrapeForWebsites` → latest `complianceReports` per rule

- `convex/firecrawl.ts`
  - `scrapeUrl` action calls Firecrawl with formats [markdown, changeTracking]
  - Saves data via `websites.storeScrapeResult` and triggers alerts/notifications
  - `triggerScrape` for manual checks; `crawlWebsite` for ad-hoc crawls

- `convex/crawl.ts`
  - Full-site crawling pipeline
  - `performCrawl` creates `crawlSessions`, calls Firecrawl crawl, stores each page, completes or fails session
  - `checkCrawledPages` and `checkCrawlJobStatus` handle async job polling

- `convex/complianceCrawler.ts`
  - High-level compliance rule crawl: strategy, parse, compare, persist `complianceReports`, generate `complianceChanges`, schedule embeddings

- `convex/aiAnalysis.ts`
  - AI significance scoring for page diffs, updates `scrapeResults.aiAnalysis`
  - AI-based notification gating (email/webhook) via user settings

- `convex/notifications.ts`
  - Webhook and email delivery (templated + sanitized)
  - Handles proxied webhooks for localhost via `/api/webhook-proxy`
  - Compliance-mode additions:
    - `sendComplianceChangeWebhook` for `complianceChanges`
    - `sendComplianceChangeEmail` for compliance-native alerts

- `convex/generateEmbeddings.ts`
  - Generates and stores embeddings for `complianceReports` (Gemini)

- `convex/embeddingManager.ts`
  - Stores/imports embeddings and performs similarity search
  - `embeddingTopKSources` action returns top‑k matches hydrated with rule/report sources for chat
  - **RAG Architecture**: 
    - 2,759 pre-computed Gemini embeddings stored in `complianceEmbeddings`
    - Query embedding generated only for user questions (not content re-embedding)
    - Cosine similarity search against existing vectors for efficient retrieval

- `convex/workpoolSimple.ts`
  - Schedules compliance jobs and logs workpool activity in `complianceMonitoringLogs`

Note: `convex/crons.ts` has cron entries disabled in this repo to avoid multiple concurrent scrapes during development. Scheduling commonly uses `ctx.scheduler.runAfter` in function flows.

## Frontend Data Flow (Dashboard & Chat)

- Hooks call Convex queries such as:
  - `websites.getUserWebsites` → list of sites with latest status
  - `websites.getAllScrapeHistory` → Change Tracking Log data
  - Compliance taxonomies (jurisdictions/topics) for filters

- UI supports:
### Chat (Compliance Assistant)

- API: `src/app/api/compliance-chat/route.ts`
  - **RAG Flow**: User Question → Generate Query Embedding → Search 2,759 Existing Embeddings → Return Top-K Matches
  - Calls `embeddingManager:embeddingTopKSources` with jurisdiction/topic filters
  - Injects top‑k sources (jurisdiction, topic, similarity%, URL) into Gemini system context
  - Returns structured answer with citations and source attribution

- UI: Embedded in Settings page (`/settings` → AI Chat Assistant)
  - Renders assistant messages with ReactMarkdown formatting and sources
  - "Sources (embedding matches)" section shows jurisdiction, topic, similarity%, and URLs
  - Jurisdiction/topic filters guide retrieval and context for focused answers
  - Search and filter by name, jurisdiction, topic, priority
  - Trigger manual checks (scrape/crawl) via buttons connected to actions
  - View recent diffs and status badges

## End-to-End Monitoring Flows

### A) Single Page Monitoring (legacy)

1) Create a website (user action or API)
   - Mutation: `websites.createWebsite`
   - Row inserted in `websites` with `monitorType: "single_page"`, `checkInterval` (minutes), and `notificationPreference`

2) Trigger a check
   - Manual: `firecrawl.triggerScrape({ websiteId })`
   - Scheduled: a coordinator (workpool/cron) calls `firecrawl.scrapeUrl` after verifying `checkInterval` vs. `lastChecked`

3) Scrape and compare
   - `firecrawl.scrapeUrl` calls Firecrawl with `{ formats: ["markdown", "changeTracking"] }`
   - If success, it calls `websites.storeScrapeResult` with:
     - `markdown`, `changeStatus` (new/same/changed/removed/checking), `diff` (git-like), `metadata`, `scrapedAt`
   - `websites.storeScrapeResult` updates `websites.lastChecked`

4) Alerts and AI
   - If `changeStatus === "changed"` or a non-empty diff exists, `websites.createChangeAlert` inserts a `changeAlerts` row
   - If AI is enabled in `userSettings`, `aiAnalysis.analyzeChange` computes significance and saves `scrapeResults.aiAnalysis`

5) Notifications
   - Without AI gating: `notifications.sendWebhookNotification` and/or `sendEmailNotification` fire immediately
   - With AI gating: `aiAnalysis.handleAIBasedNotifications` checks thresholds and user prefs before sending

6) Dashboard
   - `websites.getAllScrapeHistory` and `getUserWebsites` power the UI lists and diffs

Data written in this flow:

- `websites` (updated: `lastChecked`, sometimes `updatedAt`)
- `scrapeResults` (inserted: content, changeStatus, diff, page URL, metadata)
- `changeAlerts` (inserted when change/diff found)
- `scrapeResults.aiAnalysis` (optional, when AI enabled)

### B) Full Site Monitoring (crawl)

1) Create website with `monitorType: "full_site"` → initial `performCrawl` is scheduled

2) `crawl.performCrawl`
   - Creates `crawlSessions` row with `status: "running"`
   - Calls Firecrawl `crawlUrl` (may return async jobId)
   - For sync results: stores each page via `websites.storeScrapeResult`
   - For async: saves `jobId`, schedules `crawl.checkCrawlJobStatus` polls; on completion, stores each page

3) Completes or fails session
   - `crawl.completeCrawlSession` patches `crawlSessions` + website `totalPages`, `lastCrawlAt`
   - Optional crawl summary webhook via `notifications.sendCrawlWebhook`

Data written in this flow:

- `crawlSessions` (inserted → patched)
- `scrapeResults` (one row per page with change tracking)
- `changeAlerts` (for changed pages)

### C) Compliance Rule Monitoring

1) Rules
   - `complianceRules` contains jurisdiction/topic/priority and crawl settings
   - Optional auto-website creation: `websites.createWebsitesFromComplianceRules`

2) Crawl rule
   - `complianceCrawler.crawlComplianceRule` or `crawlComplianceRuleInternal`
   - Strategy derived from jurisdiction/topic (cadence, depth)
   - Performs crawl of `rule.sourceUrl` (via Firecrawl)

3) Parse/Compare/Persist
   - `parseComplianceContent(...)` extracts structured sections
   - Compares with previous via `complianceQueries.getLatestReport` + section diffs
   - Persists new/changed `complianceReports` and generates `complianceChanges`

4) Embeddings & RAG
   - `generateEmbeddings.generateEmbeddingsForReports` produces vectors for RAG
   - Chat uses `embeddingManager.embeddingTopKSources` to retrieve top‑k sources per question
   - **RAG Process**: Query → Generate Query Embedding → Search 2,759 Existing Embeddings → Return Top-K Matches
   - **Efficiency**: Uses pre-computed embeddings, only generates query vectors for similarity search

5) Workpool logging
   - `workpoolSimple.scheduleComplianceJobs` selects due websites/rules and logs to `complianceMonitoringLogs`

## Example: What Gets Saved (samples)

### New `websites` row (single page)

```json
{
  "url": "https://labor.ca.gov/minimum-wage/",
  "name": "[HIGH] California - Minimum Wage",
  "isActive": true,
  "checkInterval": 2880,
  "notificationPreference": "email",
  "monitorType": "single_page",
  "complianceMetadata": {
    "ruleId": "california_minimum_wage",
    "jurisdiction": "California",
    "topicKey": "minimum_wage",
    "priority": "high",
    "isComplianceWebsite": true
  },
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000
}
```

### A `scrapeResults` row (after scrape)

```json
{
  "websiteId": "...",
  "markdown": "# Title...\n...",
  "changeStatus": "changed",
  "visibility": "visible",
  "scrapedAt": 1730000200000,
  "title": "California Minimum Wage",
  "url": "https://labor.ca.gov/minimum-wage/",
  "diff": { "text": "+ New rate effective 1/1/2026\n- Old rate ...", "json": { /* git-like structure */ } }
}
```

### A `changeAlerts` row

```json
{
  "websiteId": "...",
  "scrapeResultId": "...",
  "changeType": "content_changed",
  "summary": "New rate effective 1/1/2026...",
  "isRead": false,
  "createdAt": 1730000205000
}
```

### A `complianceReports` row (versioned content)

```json
{
  "reportId": "california_minimum_wage_1730000200000",
  "ruleId": "california_minimum_wage",
  "reportContent": "...full normalized report...",
  "contentHash": "sha256:...",
  "extractedSections": {
    "overview": "...",
    "employerResponsibilities": "...",
    "trainingRequirements": "...",
    "penalties": "..."
  },
  "processingMethod": "scheduled_crawl",
  "generatedAt": 1730000200000
}
```

## Scheduling & Workflows

- In this repo, cron entries under `convex/crons.ts` are commented out to prevent duplicate scrapes during development.
- Background work is commonly orchestrated with `ctx.scheduler.runAfter(...)` inside actions/mutations.
- The lightweight workpool (`workpoolSimple.scheduleComplianceJobs`) selects due compliance websites by `checkInterval` and priority and enqueues per-rule crawls.

## Environment & Configuration

- `NEXT_PUBLIC_CONVEX_URL`: required by the frontend Convex client
- `FIRECRAWL_API_KEY`: used by `convex/firecrawl.ts` if no per-user key is present
- `GEMINI_API_KEY`: for embeddings (`generateEmbeddings.ts`)
  - Also used indirectly by chat RAG when generating query embeddings
- Email (Resend) credentials and `FROM_EMAIL` (see `convex/alertEmail.ts` usage)

## Developer Notes

- Single-user mode is enabled in many handlers: userId checks are optional in read paths, and ownership checks apply mainly on mutations.
- Use the provided scripts under `scripts/` for local seeding and testing flows (import rules, create websites, trigger monitoring, etc.).
- When enabling cron jobs for staging/production, verify Firecrawl rate limits and Convex function limits.
- Compliance-mode decommission: legacy tables remain readable via shims; write paths are blocked; plan to drop legacy tables after verification.

## Security

- API keys encrypted with AES-256-GCM
- JWT authentication (via Convex auth)
- Environment-based configuration
- Sanitized HTML in emails

## Quick Start: End-to-End (Dev)

1) Ensure `NEXT_PUBLIC_CONVEX_URL` and `FIRECRAWL_API_KEY` are set
2) Create a website via UI or by calling `websites.createWebsite`
3) Trigger a check via UI or `firecrawl.triggerScrape`
4) Observe `scrapeResults` and `changeAlerts` in Convex dashboard; confirm email/webhook delivery if configured
5) For compliance scenarios, run `websites.createWebsitesFromComplianceRules` and then schedule via `workpoolSimple.scheduleComplianceJobs`


