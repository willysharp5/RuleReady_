# RuleReady Documentation

This directory contains technical documentation for the RuleReady compliance intelligence platform.

## Documents

### System Architecture

- **[howitworks.md](./howitworks.md)** - Complete system architecture, data flows, and backend modules
- **[howdatabaseworks.md](./howdatabaseworks.md)** - Convex data model, ERD, and database relationships
- **[howuiworks.md](./howuiworks.md)** - UI components, data flows, and frontend architecture

### Firecrawl Integration

- **[FIRECRAWL_SCRAPING_PROCESS.md](./FIRECRAWL_SCRAPING_PROCESS.md)** - Firecrawl configuration, AI prompts, and scraping workflows

## Quick Reference

### Key Features

1. **RAG Chat System**: 2,759 pre-computed embeddings with Gemini 2.0 Flash
2. **Compliance Monitoring**: 1,305 rules across all US jurisdictions
3. **Automated Crawling**: Priority-based (federal weekly, state bi-weekly, municipal monthly)
4. **16-Section Template**: Standardized compliance extraction

### Core Technologies

- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Backend**: Convex (serverless functions + database)
- **AI**: Gemini 2.0 Flash (chat and analysis)
- **Scraping**: Firecrawl
- **Embeddings**: Cosine similarity on pre-computed vectors

### Data Model Overview

```
Main Tables:
- complianceRules (1,305 rules)
- complianceReports (1,175 reports)
- complianceEmbeddings (2,759 vectors)
- complianceChanges (change tracking)
- jurisdictions (50 states + federal)
- complianceTopics (employment law topics)
```

### RAG Architecture

```
User Question
    ↓
Generate Query Embedding (Gemini)
    ↓
Search 2,759 Existing Embeddings (cosine similarity)
    ↓
Return Top-K Matches with Sources
    ↓
Generate Answer with Citations (Gemini)
```

## Development Notes

- **Single-user mode**: Reduced auth checks for development
- **Feature flags**: `complianceMode` and `freezeLegacyWrites` in `convex/websites.ts`
- **Embedding generation**: Via `generateEmbeddings:generateEmbeddingsForReports`
- **Priority mapping**: `convex/compliancePriority.ts`

## See Also

- [Main README](../README.md) - Quick start and setup
- [Convex Schema](../convex/schema.ts) - Complete database schema
- [Happy Path Tests](../HAPPY_PATH_TEST_GUIDE.md) - Testing guide

