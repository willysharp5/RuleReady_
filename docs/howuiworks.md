### RuleReady UI & System: How It Works

This document explains how the main UIs interact with the backend and how data is persisted in Convex. It covers the Chat, Settings, Monitoring, and API surfaces, along with key tables and request flows.

## Overview
- **Frontend**: Next.js App Router (client components) with Convex React client (`ConvexProvider` in `src/app/providers.tsx`).
- **Backend**:
  - Next.js API routes for AI chat and API proxies.
  - Convex functions (queries, mutations, internal actions) for data access and side effects.
- **Database**: Convex tables defined in `convex/schema.ts` (websites, scrapeResults, changeAlerts, userSettings, apiKeys, firecrawlApiKeys, compliance* tables, etc.).

## UI Surfaces
- **Home**: Overview and components (not central to persistence).
- **Chat** (`/chat`): AI compliance assistant UI.
- **Settings** (`/settings`): Email settings, webhooks, Firecrawl key, Observer API keys, AI analysis, AI Chat settings.
- **Monitoring Status** (component): Shows testing mode, workpool status, websites, recent activity, cron status.
- **API Docs & Webhook Playground**: Helper pages and test endpoints (e.g., `/api/test-webhook`).

## Data Flow by Feature

### 1) Compliance Chat (`src/app/chat/page.tsx` → `/api/compliance-chat`)
- UI uses `useQuery(api.complianceQueries.getJurisdictions)` and `useQuery(api.complianceQueries.getTopics)` to populate filters from Convex tables `jurisdictions` and `complianceTopics`.
- Messages are sent via Vercel AI SDK `useChat` to the Next.js route `POST /api/compliance-chat` with body `{ messages, jurisdiction, topic }`.
- Backend (`src/app/api/compliance-chat/route.ts`):
  - Builds a structured system prompt and calls Gemini (`gemini-2.0-flash-exp`) using `GEMINI_API_KEY`.
  - Returns `{ role: 'assistant', content }` as JSON to the UI.
- Persistence: The current implementation does not store chat messages. Compliance datasets (jurisdictions/topics) are read from Convex. RAG/embeddings tables exist in schema for future augmentation but are not wired in this route yet.

### 2) Settings
Settings page is a client component that calls Convex to read/write settings and keys, and uses a Next route for email verification.

- Email Config & Verification
  - Read: `useQuery(api.emailManager.getEmailConfig)` and `useQuery(api.userSettings.getUserSettings)`.
  - Update template and defaults: `api.userSettings.updateEmailTemplate`, `api.userSettings.updateDefaultWebhook`, `api.userSettings.toggleEmailNotifications`.
  - Send/test: `api.testActions.testEmailSending`, `api.emailManager.resendVerificationEmail` (action).
  - Verify: `GET /api/verify-email?token=...` calls `convex.mutation(api.emailManager.verifyEmail)` and redirects with status. On success, `emailConfig` row is marked verified.
  - Storage: `emailConfig` table (email, verification token/expiry, verified flag) and `userSettings.emailTemplate`.

- Webhooks (Default)
  - Update default webhook URL via `api.userSettings.updateDefaultWebhook`.
  - Storage: `userSettings.defaultWebhookUrl`.

- Firecrawl Key
  - Read: `api.firecrawlKeys.getUserFirecrawlKey`.
  - Write/Delete: `api.firecrawlKeys.setFirecrawlKey`, `api.firecrawlKeys.deleteFirecrawlKey`.
  - Token usage check: `api.firecrawlKeys.getTokenUsage` (action).
  - Storage: `firecrawlApiKeys` table (key stored server-side; UI shows a masked value).

- Observer API Keys
  - List: `api.apiKeys.getUserApiKeys`.
  - Create: `api.apiKeys.createApiKey` (returns the new key once to the client).
  - Delete: `api.apiKeys.deleteApiKey`.
  - Storage: `apiKeys` table (`key`, `name`, `userId`, timestamps). Use the `Authorization` header with this key for server-to-server endpoints.

- AI Analysis (Website Change Meaningfulness)
  - Update: `api.userSettings.updateAISettings` stores model/baseUrl/systemPrompt/threshold and encrypted `aiApiKey` (via `convex/lib/encryption`).
  - Optional filtering: `api.userSettings.updateNotificationFiltering` (email/webhook only if meaningful).
  - Storage: `userSettings.ai*` fields. When enabled, analysis results are written into `scrapeResults.aiAnalysis` via internal mutations.

- AI Chat Settings
  - Client-side controls for chat model/system prompt and context toggles are stored via `api.userSettings.updateAISettings`.

### 3) Monitoring Status (`src/components/MonitoringStatus.tsx`)
- Reads:
  - `api.testingMode.getTestingModeStatus`
  - `api.workpoolSimple.getSimpleWorkpoolStatus`
  - `api.websites.getUserWebsites` (combines user and compliance websites, sorted by priority)
- Controls:
  - Enable/disable testing mode: `api.testingMode.enableTestingMode`, `api.testingMode.disableTestingMode`.
  - Pause all compliance websites: `api.testingMode.pauseAllComplianceWebsites`.
- Storage: `websites`, `complianceMonitoringLogs` (for activity), and related scrape data in `scrapeResults`.

### 4) Websites (Create, Update, Pause, Delete)
- Core mutations in `convex/websites.ts`:
  - `createWebsite`: Inserts into `websites`; may schedule a crawl for full-site monitors.
  - `updateWebsite`: Updates URL, intervals, notifications, crawl settings; for compliance sites, changing `compliancePriority` updates `checkInterval` and syncs the linked compliance rule via `internal.compliancePriority.updateRulePriority`.
  - `pauseWebsite`: Sets `websites.isPaused` (single-user mode skips auth checks).
  - `deleteWebsite`: Deletes the website and schedules batch deletion of related data (`scrapeResults`, `changeAlerts`, `crawlSessions`).
- Reading websites: `getUserWebsites` merges regular and compliance websites, deduplicates by URL, and sorts by compliance priority.
- Persistence tables: `websites`, `scrapeResults`, `changeAlerts`, `crawlSessions`.

### 5) Notifications (Email/Webhook)
- When a change is detected and a `scrapeResults` entry is written, internal actions in `convex/notifications.ts` deliver notifications depending on user/site settings:
  - Webhook: `sendWebhookNotification` posts a JSON payload to `webhookUrl`. If the URL is local/private, it uses a Convex-hosted webhook proxy (`/api/webhook-proxy`). Payload includes `website`, `change` summary, optional `diff`, `scrapeResult` summary, and optional `aiAnalysis`.
  - Email: `sendEmailNotification` renders either a custom `userSettings.emailTemplate` (with variables like `{{websiteName}}`, `{{changeDate}}`, `{{aiMeaningfulScore}}`) or a default template, then sends via `resend`.
- Optional filters: When AI analysis is enabled with “only if meaningful” flags, notifications can be suppressed unless `aiAnalysis.isMeaningfulChange` is true.

### 6) Webhook Playground (`/api/test-webhook`)
- `POST /api/test-webhook` stores the received payload via `api.webhookPlayground.storeWebhookPayload` and returns a success response. Useful for testing consumers.
- Storage: `webhookPlayground` table.

## Programmatic API (Server-to-Server)
Next.js API routes act as thin proxies to Convex HTTP endpoints. They expect an `Authorization` header (use an Observer API key).

- `POST /api/websites` → Convex `POST /api/create-websites`
  - Body: `{ url, name, checkInterval, notificationPreference?, webhookUrl?, monitorType?, crawlLimit?, crawlDepth? }`
- `POST /api/websites/pause` → Convex `POST /api/pause-websites`
  - Body: `{ websiteId, isPaused }`
- `DELETE /api/websites/delete` → Convex `DELETE /api/delete-websites`
  - Body: `{ websiteId }`

Responses are proxied back verbatim. See `src/app/api/websites/*.ts` for details. The base Convex URL is derived from `NEXT_PUBLIC_CONVEX_URL` (with `.cloud` → `.site` for the HTTP API).

## Storage Model (Key Tables)
- `websites`: monitoring targets, intervals, webhook/email prefs, crawl settings, optional `complianceMetadata` (ruleId, jurisdiction, topicKey, priority, overrides).
- `scrapeResults`: per-scrape markdown, status (`new|same|changed|removed|checking`), optional `diff`, title, description, URL, optional `aiAnalysis`.
- `changeAlerts`: per-change alert rows linked to `scrapeResults`.
- `userSettings`: defaults, email template, AI analysis settings and encrypted AI key, notification filtering.
- `emailConfig`: email address, verification token/expiry, verified flag.
- `apiKeys`: Observer API keys for server-to-server calls.
- `firecrawlApiKeys`: Firecrawl auth per user.
- Compliance datasets: `complianceRules`, `complianceReports`, `complianceEmbeddings`, `complianceTopics`, `jurisdictions`, logs/metrics tables.

## Trigger Points and Saves Summary
- Chat: Reads `jurisdictions/topics` from Convex; AI responses are generated in Next route; no DB writes by default.
- Settings:
  - Writes to `userSettings` (webhook default, email template, AI settings, filters).
  - Writes/reads `emailConfig` (verification flow) and sends emails via `resend` action.
  - Manages keys in `apiKeys` and `firecrawlApiKeys`.
- Websites:
  - Create/update/pause/delete manipulate `websites` and schedule/remove related data.
  - Scrapes write to `scrapeResults`; alerts to `changeAlerts`.
  - Notifications dispatched via internal actions based on settings and AI analysis.

## Environment & Config
- Convex client URL is provided in `src/app/providers.tsx`.
- Chat uses `GEMINI_API_KEY` in the Next API route.
- Webhook proxy uses `CONVEX_SITE_URL` for local/private webhook delivery.
- App base URL for templates: `NEXT_PUBLIC_APP_URL`.

## Notes
- Single-user mode is enabled in several places (reduced auth checks, broad reads) for development/testing.
- Compliance RAG components (embeddings, reports) are scaffolded in schema and can be integrated into the chat flow later.


