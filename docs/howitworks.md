# How RuleReady Works

This document explains the architecture, data model, and end-to-end flows for compliance monitoring, AI analysis, and RAG chat.

## System Architecture

- **Frontend (Next.js + React)**
  - Dashboard (`/`) shows compliance monitoring status and change tracking
  - Settings (`/settings`) includes AI Chat Assistant with RAG search
  - API routes under `src/app/api/*` for chat and compliance queries

- **Backend (Convex)**
  - Database and serverless functions under `convex/*`
  - Queries/Mutations/Actions for compliance data, embeddings, and monitoring
  - Automated scheduling for compliance crawling

- **External Services**
  - Firecrawl: compliance website monitoring and scraping
  - Gemini AI: RAG chat, embeddings, and compliance analysis

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

## High-level Data Flow

1. **Compliance Rules** → 1,305 rules covering all US jurisdictions (federal, state, municipal)
2. **Automated Crawling** → Priority-based scheduling via `complianceCrawler` (federal weekly, state bi-weekly, municipal monthly)
3. **Content Processing** → Firecrawl scrapes → Gemini analyzes with 16-section template → Saves to `complianceReports`
4. **Change Detection** → Compares with previous reports → Generates `complianceChanges` entries
5. **Embeddings** → Pre-computed 2,759 embeddings stored in `complianceEmbeddings` for RAG search
6. **Chat Interface** → User questions → Embedding search → Top-K sources → Gemini generates answer with citations

## Data Model (Convex Tables)

Defined in `convex/schema.ts`. Core compliance tables:

- **`complianceRules`** (1,305 rules)
  - Jurisdiction, topic, priority, source URL, crawl settings
  - Federal, state, and municipal employment law rules

- **`complianceReports`** (1,175 reports)
  - Versioned compliance content with 16-section structure
  - Content hash for deduplication, extracted sections for structure

- **`complianceEmbeddings`** (2,759 vectors)
  - Pre-computed embeddings for RAG search
  - Linked to rules and reports via `entityId` and `entityType`

- **`complianceChanges`**
  - Change detection records with severity and type
  - Links to rules, includes old/new content diffs

- **`jurisdictions`** and **`complianceTopics`**
  - Lookup tables for filters (50 states + federal, various employment law topics)

- **`embeddingJobs`**
  - Background job orchestration for embedding generation

- **`complianceMonitoringLogs`**
  - Tracking of crawl activity and workpool operations

## Core Backend Modules

### Compliance Monitoring

- **`convex/complianceCrawler.ts`**
  - Main compliance crawling logic with jurisdiction-based strategies
  - Calls Firecrawl, parses content, generates 16-section reports
  - Compares with previous versions, creates `complianceChanges`

- **`convex/complianceQueries.ts`**
  - Data access for jurisdictions, topics, rules, and reports
  - Powers dashboard and filters

- **`convex/compliancePriority.ts`**
  - Maps priority levels to crawl intervals (federal=weekly, state=bi-weekly, etc.)

### AI & RAG

- **`convex/geminiFlashLite.ts`**
  - Gemini AI integration for compliance analysis
  - 16-section template extraction from scraped content

- **`convex/embeddingManager.ts`**
  - **RAG Core**: Embedding storage and similarity search
  - `embeddingTopKSources` returns top-k matches for chat
  - Pre-computed 2,759 embeddings, query-time search only

- **`convex/generateEmbeddings.ts`**
  - Batch generation of embeddings for compliance reports
  - Uses Gemini embedding model

### Data Integration

- **`convex/firecrawl.ts`**
  - Firecrawl API integration for web scraping
  - Formats: markdown + changeTracking for diffs

- **`convex/workpoolSimple.ts`**
  - Job scheduling and orchestration for compliance monitoring
  - Logs activity in `complianceMonitoringLogs`

## Chat (Compliance Assistant)

### RAG Flow

```
User Question
    ↓
Generate Query Embedding (Gemini)
    ↓
Search 2,759 Pre-computed Embeddings (cosine similarity)
    ↓
Return Top-K Matches (with jurisdiction, topic, similarity %)
    ↓
Build Context Prompt with Sources
    ↓
Generate Answer with Citations (Gemini 2.0 Flash)
    ↓
Display Answer + Source Links
```

### Implementation

- **API Route**: `src/app/api/compliance-chat/route.ts`
  - Calls `embeddingManager:embeddingTopKSources` with optional filters
  - Injects top-k sources into Gemini system prompt
  - Returns structured answer with citations

- **UI Component**: Settings page (`/settings` → AI Chat Assistant)
  - Jurisdiction and topic filter dropdowns
  - Chat interface with markdown rendering
  - Sources section showing:
    - Jurisdiction and topic
    - Similarity percentage
    - Clickable source URLs

## Compliance Monitoring Flow

### 1. Rule Definition
- `complianceRules` table contains 1,305 rules
- Each rule has: jurisdiction, topic, priority, source URL, crawl settings

### 2. Automated Crawling
- `workpoolSimple.scheduleComplianceJobs` selects due rules based on:
  - Priority (federal=weekly, state=bi-weekly, municipal=monthly)
  - Last check time vs. check interval
- Calls `complianceCrawler.crawlComplianceRuleInternal`

### 3. Content Extraction
- Firecrawl scrapes the source URL with formats: `["markdown", "changeTracking"]`
- Returns raw markdown content + optional git-style diff

### 4. AI Analysis
- `geminiFlashLite.processComplianceDataWithGemini` processes raw content
- Applies 16-section template extraction:
  - Overview, Covered Employers, Training Requirements
  - Deadlines, Penalties, Recordkeeping, Sources, etc.
- Generates structured JSON output

### 5. Change Detection
- Compares new content with previous `complianceReports` via content hash
- If changed:
  - Creates new `complianceReports` entry
  - Generates `complianceChanges` record with diff details
  - Logs activity in `complianceMonitoringLogs`

### 6. Embedding Generation
- New/updated reports trigger embedding job
- `generateEmbeddings.generateEmbeddingsForReports` creates vectors
- Stores in `complianceEmbeddings` for RAG search

## Data Examples

### Compliance Rule

```json
{
  "ruleId": "california_minimum_wage",
  "jurisdiction": "California",
  "topicKey": "minimum_wage",
  "topicLabel": "Minimum Wage",
  "sourceUrl": "https://labor.ca.gov/minimum-wage/",
  "priority": "high",
  "monitoringStatus": "active",
  "crawlSettings": {
    "checkInterval": 10080,  // weekly in minutes
    "depth": 2
  }
}
```

### Compliance Report (with AI extraction)

```json
{
  "reportId": "california_minimum_wage_20251027",
  "ruleId": "california_minimum_wage",
  "reportContent": "...full raw markdown...",
  "contentHash": "sha256:abc123...",
  "extractedSections": {
    "overview": "California minimum wage law requires...",
    "coveredEmployers": "All employers with 26+ employees...",
    "trainingRequirements": "Not applicable",
    "penalties": "Fines up to $100 per violation..."
  },
  "processingMethod": "scheduled_crawl",
  "generatedAt": 1730000000000
}
```

### Compliance Embedding

```json
{
  "entityId": "california_minimum_wage_20251027",
  "entityType": "report",
  "contentHash": "sha256:abc123...",
  "embedding": [0.023, -0.145, ...],  // 768 dimensions
  "embeddingModel": "text-embedding-004",
  "metadata": {
    "jurisdiction": "California",
    "topicKey": "minimum_wage",
    "sourceUrl": "https://labor.ca.gov/minimum-wage/"
  }
}
```

## Environment Configuration

### Required Variables

- `NEXT_PUBLIC_CONVEX_URL` - Frontend Convex client connection
- `FIRECRAWL_API_KEY` - Web scraping and monitoring
- `GEMINI_API_KEY` - AI chat, embeddings, and analysis
- `ENCRYPTION_KEY` - AES-256-GCM key for secure API key storage

## Developer Notes

- **Single-user mode**: Simplified auth for development and testing
- **Feature flags**: `complianceMode` and `freezeLegacyWrites` in monitoring code
- **Cron jobs**: Disabled in development; use manual triggers or workpool scheduling
- **Scripts**: Located in `scripts/` for importing rules, generating embeddings, testing flows


