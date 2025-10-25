## Firecrawl → Source Store → Gemini Synthesis (Compliance Rules) Plan

### Goal
Use Firecrawl to crawl target sites (including PDFs), store normalized source documents with provenance, then synthesize jurisdiction/topic-specific compliance rules using Gemini with our markdown templates and publish them with citations.

### Scope (Initial Focus)
- Topic: Sexual Harassment (pilot). Jurisdictions start with CA; later expand.
- Sources: 2–5 government sites, agencies, and authoritative blogs per jurisdiction/topic.

---

### Architecture Overview
1) Source Collection
   - Define a named collection of seed URLs associated with a jurisdiction/topic.
   - Configure crawl depth/limits and PDF discovery.

2) Ingestion (Firecrawl)
   - Crawl HTML pages and discover/fetch linked PDFs.
   - Normalize to text/markdown and store with metadata and content hashes.
   - Deduplicate by hash; maintain provenance (URL, title, fetchedAt).

3) Synthesis (Gemini)
   - Select top-N recent/authoritative source docs for the topic.
   - Feed source snippets + selected compliance template markdown to Gemini.
   - Generate a unified compliance rule/report with embedded citations.

4) Review & Publish
   - Show rendered output with citations and per-section sources.
   - Approve to publish to compliance tables and make available in UI/Chat.

---

### Data Model Changes (Convex)

New tables (names are suggestions; align with current naming):

- sourceCollections
  - collectionId: string
  - name: string
  - jurisdiction: string
  - topicKey: string
  - seedUrls: string[]
  - crawlConfig: { maxDepth: number; maxPages: number; includePdfLinks: boolean; respectRobots: boolean }
  - createdAt: number; updatedAt: number

- sourceDocuments
  - sourceId: string
  - collectionId: string
  - url: string
  - contentType: "html" | "pdf"
  - title?: string
  - textContent: string  // normalized markdown/text
  - metadata?: any       // {publisher, publishedDate, og, headers}
  - contentHash: string
  - fetchedAt: number
  - status: "ok" | "failed"

- reportSources (provenance mapping)
  - reportId: string
  - sourceId: string
  - section?: string      // optional template section name
  - citation?: string     // excerpt/anchor for traceability

Use existing:
- complianceTemplates (already markdown-based)
- complianceReports (final synthesized content + extractedSections)
- complianceRules (registry/metadata per jurisdiction/topic)
- complianceAIReports can remain for AI output snapshots if desired

Minor extension (optional now):
- complianceRules: add `composedFromCount` and `lastSynthesizedAt`

---

### Backend Changes

1) Ingestion Actions (convex/firecrawl.ts or new convex/ingestion.ts)
- action: createSourceCollection({ name, jurisdiction, topicKey, seedUrls, crawlConfig })
- action: ingestCollection({ collectionId })
  - For each seed URL:
    - firecrawl.crawlUrl(url, { limit, scrapeOptions: { formats:["markdown"], waitFor, onlyMainContent:false } })
    - Discover PDF links (simple href ends-with .pdf and/or Firecrawl metadata) when includePdfLinks = true
    - For each PDF URL: firecrawl.scrapeUrl(pdfUrl, { formats:["markdown"] })
    - Normalize markdown/text, compute contentHash, insert/update sourceDocuments
  - Return counts: {htmlDocs, pdfDocs, deduped}

2) Synthesis (convex/complianceAI.ts)
- action: synthesizeRuleFromSources({ jurisdiction, topicKey, templateId, collectionId, sourceLimit })
  - Select top-N sourceDocuments (by recency and authority – initial: recency)
  - Load template markdown via complianceTemplates
  - Build Gemini prompt: instructions + template + curated excerpts + required citation markers
  - Call Gemini model to produce structured markdown with inline citation markers
  - Insert into complianceReports (reportContent) and extractedSections if parsed
  - Insert provenance rows in reportSources (map sections to sourceIds)
  - Upsert complianceRules metadata (lastSynthesizedAt, composedFromCount)

3) Utilities
- Deduplication via contentHash (e.g., SHA-256 of normalized text)
- PDF link discovery: server-side HTML parse or use Firecrawl output links
- Safe rate limiting/backoff to respect sites

---

### UI Changes

New pages/sections:
1) Sources (Landing or Settings)
   - Create Source Collection
   - Add seed URLs; set crawl config (depth/pages/PDFs)
   - Run Ingestion and view progress (counts)
   - Browse ingested documents (type, title, fetchedAt, hash)

2) Synthesize
   - Pick jurisdiction + topic + template
   - Choose Source Collection and N docs
   - Run Synthesis
   - Review result: rendered template with citations; show sources panel
   - Approve & Publish → writes to complianceReports/complianceRules

Existing pages:
- Change Tracking UI remains; optionally show synthesized reports as ‘Published’ items

---

### Firecrawl Configuration Notes
- HTML
  - formats: ["markdown"] plus changeTracking optional for monitoring, not required for ingestion
  - onlyMainContent:false, waitFor:2000 (tune if needed)
- PDF
  - Use scrapeUrl on PDF links; Firecrawl returns markdown text (or fallback PDF parser later)
- Discovery
  - includePdfLinks:true → discover and queue `a[href$=".pdf"]`
  - cap per site to avoid abuse (maxPages, maxDepth)

---

### Gemini Prompting Strategy
- System: “You are a professional compliance analyst for employment law.”
- Inputs:
  - Template markdown (our structure)
  - Jurisdiction + topic context
  - Curated excerpts/snippets from N sources with sourceIds
  - Instruction: produce structured output, avoid speculation, cite sources per section
- Output:
  - Markdown filling template sections
  - Citation anchors using [n]-style markers or inline labels
  - Optional JSON sidecar (section→sourceIds)

---

### Testing Strategy

Fixtures:
- Seed 2–5 known URLs, include at least 1 PDF
- Store sample PDF in repo (for CI) and local HTML mirror to avoid network flakiness if needed

Automated tests:
- ingestion unit: pdf link discovery, hash dedupe, markdown normalization
- ingestion integration: run ingestCollection on fixtures, assert sourceDocuments count and hashes
- synthesis unit: prompt assembly with template + sources
- synthesis integration: synthesizeRuleFromSources on small set, assert report stored, reportSources populated

E2E script (scripts/test-ingest-synthesize.js):
- create collection → ingest → synthesize → check published report and citations

---

### Rollout Plan
1) Phase 1 (Ingestion only)
   - DB tables, ingestion UI, crawl PDFs, list documents
2) Phase 2 (Synthesis + Review)
   - Gemini action, review UI, publish
3) Phase 3 (Monitoring)
   - Scheduled re-ingestion; delta detection; re-synthesize on material changes

---

### Acceptance Criteria (Pilot – CA Sexual Harassment)
- Able to define a Source Collection with 3–5 seed URLs; ingestion stores HTML + PDF docs
- Synthesis produces a consolidated report matching our template
- Report shows citations per section; provenance saved in reportSources
- Reviewer can approve; published report available under complianceReports and surfaced in UI


### MVP Simplified Path (for fast end-to-end testing)

Focus on the essential flow you outlined: (1) Firecrawl ingests → (2) Gemini combines with template → (3) Chat over the result → (4) Save embeddings.

Minimal scope
- Keep “Add Website to Track” for per-page monitoring (unchanged), but MVP tests focus on “one-time ingest.”
- New quick actions (server):
  - ingestOnce({ urls[], includePdf: true }):
    - Uses Firecrawl Batch Scrape with formats:["markdown"], parsers:["pdf"].
    - Stores each page/PDF as a document in sourceDocuments with provenance and hash.
  - synthesizeOnce({ jurisdiction, topicKey, templateId, sourceIds[] }):
    - Loads template markdown (complianceTemplates), fetches selected sources, calls Gemini, saves to complianceReports.
  - embedReport({ reportId }):
    - Generates embeddings for the new report, saves in complianceEmbeddings.

Minimal UI
- Quick Ingest: textarea for multiple URLs; Run; show counts (HTML/PDF/saved/deduped).
- Quick Synthesize: pick jurisdiction, topic, template, select multiple ingested sources; Generate; preview; Save.
- Chat: reuse existing Chat UI; ensure new reports are embedded so they’re searchable.

Defer/keep as-is (outside MVP)
- Scheduled crawls, cron orchestration, email alerts, and change logs remain intact for regular monitoring, but not required for MVP tests.
- Advanced compliance crawler paths and legacy endpoints remain untouched, but not used in MVP.

Testing (MVP)
- E2E: ingestOnce → synthesizeOnce → embedReport → ask chat about the topic → confirm citations appear and answers reference the synthesized report.
- Unit: pdf link discovery and hash dedupe; prompt assembly; embeddings generation shape.

Implementation Notes
- For Batch Scrape, configure parsers:["pdf"], onlyMainContent:false as needed; see Firecrawl docs for batch params.
- Store source-level provenance (URL, title, fetchedAt, contentHash) to enable transparent citations.


