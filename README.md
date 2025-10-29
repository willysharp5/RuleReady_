# RuleReady Compliance

An AI-powered compliance research assistant for employment law. Built with Next.js, Convex, Firecrawl, and Gemini AI.

## Features

- **AI Chat Assistant**: Ask questions about employment law and get answers with source citations from 1,298+ pre-loaded compliance rules
- **Compliance Research**: Deep research mode with web search, URL scraping, and AI-powered synthesis
- **Semantic Search**: 2,759+ pre-computed embeddings enable intelligent similarity-based search
- **Multi-Jurisdictional**: Coverage across all 50 US states, DC, and federal regulations
- **Topic-Focused**: Organized by 15+ employment law categories (wages, leave, harassment, etc.)
- **Template System**: Structured compliance templates for consistent research output
- **Source Attribution**: Every answer includes clickable source links with jurisdiction and topic badges

## Prerequisites

- Node.js 18+ and npm
- A [Convex](https://convex.dev) account (free tier available)
- A [Firecrawl](https://firecrawl.dev) API key (for web scraping in research mode)
- A [Google AI Studio](https://aistudio.google.com) API key (for Gemini - powers chat and research)

## Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/willysharp5/RuleReady_.git
cd RuleReady_
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Initialize Convex

```bash
npx convex dev
```

This will:
- Open your browser to authenticate with Convex
- Create a new project (or link to an existing one)
- Set up your database schema and generate API files
- Start the Convex development server

Keep this terminal running.

### Step 4: Set Environment Variables

```bash
# Required: Firecrawl API key for web scraping in research
npx convex env set FIRECRAWL_API_KEY "your_firecrawl_api_key"

# Required: Gemini API key for AI chat and research
npx convex env set GEMINI_API_KEY "your_gemini_api_key"
```

### Step 5: Import Compliance Data

```bash
# Import 1,298+ employment law rules
node scripts/import-compliance-data.js

# Generate embeddings for semantic search
node scripts/generate-embeddings.js
```

### Step 6: Start the Development Server

In a new terminal:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) - you'll see a password screen.

**Default Password:** `gusto`

## Usage

### Password Protection

The landing page requires a simple password to access:
- Default: **gusto**
- After entering the password, you'll be redirected to `/home`

### AI Chat Assistant

1. Navigate to the **Chat** tab
2. Optionally filter by:
   - **Jurisdiction** (e.g., California, Federal, New York)
   - **Topic** (e.g., Minimum Wage, Harassment Training, Paid Sick Leave)
3. Ask compliance questions in natural language
4. Get AI-generated answers with:
   - Source citations showing jurisdiction and topic
   - Similarity scores for relevance
   - Clickable URLs to official sources

**Example questions:**
- "What are California's minimum wage requirements for 2025?"
- "What harassment training is required for New York employers?"
- "Tell me about federal overtime exemptions"
- "Compare paid sick leave across California, New York, and Massachusetts"

### Compliance Research

1. Navigate to the **Research** tab
2. Enter your research question
3. Optionally:
   - Select a compliance template for structured output
   - Choose jurisdiction and topic filters
   - Add specific URLs to scrape (supports PDFs)
   - Provide additional context
4. Get comprehensive research with:
   - Web search results
   - Scraped content from provided URLs
   - Internal database matches
   - News articles (if relevant)
   - All sources properly cited with clickable links

### Templates Management

- View and edit compliance templates
- Create custom templates for different topics
- Templates structure AI responses for consistency

### Jurisdictions & Topics

- Manage jurisdiction data (Federal, States, Cities)
- Organize topics and categories
- Link research to specific jurisdictions

## Project Structure

```
RuleReady_/
├── convex/                      # Convex backend
│   ├── schema.ts                # Database schema
│   ├── complianceQueries.ts     # Data queries for jurisdictions/topics
│   ├── complianceRAG.ts         # RAG embedding search
│   ├── chatSettings.ts          # Chat configuration
│   ├── savedResearch.ts         # Research library
│   ├── geminiFlashLite.ts       # Gemini AI integration
│   └── generateEmbeddings.ts    # Embedding generation
├── src/
│   ├── app/
│   │   ├── page.tsx             # Password protection landing page
│   │   ├── home/                # Main app (Chat, Research, etc.)
│   │   └── api/                 # API routes
│   │       ├── compliance-chat/
│   │       └── compliance-research/
│   ├── components/
│   │   ├── features/            # Main feature components
│   │   │   ├── ChatFeature.tsx
│   │   │   ├── ResearchFeature.tsx
│   │   │   ├── TemplatesFeature.tsx
│   │   │   ├── JurisdictionsFeature.tsx
│   │   │   └── TopicsFeature.tsx
│   │   ├── home/                # Properties panels
│   │   └── ui/                  # shadcn/ui components
│   └── lib/                     # Utilities
├── data/                        # Compliance data
│   ├── compliance_reports/      # 1,175+ compliance reports
│   ├── compliance_rules_enriched.csv
│   ├── compliance_embeddings_versioned_rows.csv
│   └── compliance_template.txt
├── docs/                        # Documentation
│   ├── howitworks.md
│   ├── howdatabaseworks.md
│   └── JURISDICTION_DESIGN_PLAN.md
└── scripts/                     # Utility scripts
    ├── import-compliance-data.js
    ├── generate-embeddings.js
    └── import-embeddings-from-csv.js
```

## Key Technologies

- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend**: Convex (serverless functions + database)
- **AI**: Gemini 2.0 Flash for chat and research
- **Scraping**: Firecrawl for web content extraction
- **Embeddings**: 2,759+ pre-computed vectors for semantic search
- **Editor**: TipTap for rich text editing

## Database Schema

### Core Tables

- **`complianceReports`** - 1,298+ employment law rules across all jurisdictions
- **`complianceEmbeddings`** - Pre-computed vectors for semantic search
- **`savedResearch`** - User's saved research results with sources
- **`researchConversations`** - Multi-tab research chat sessions
- **`complianceTemplates`** - Structured templates for research output
- **`jurisdictions`** - Federal, state, and city jurisdictions
- **`complianceTopics`** - Employment law topic categories
- **`app`** - Simple password authentication
- **`appSettings`** - User chat and research preferences

## Deployment

### Deploy to Vercel

The app includes Vercel configuration. To deploy:

```bash
# Using Vercel CLI
vercel deploy --prod

# Or push to GitHub with Vercel git integration
git push origin main
```

### Deploy Convex Backend

```bash
# Deploy functions to production
npx convex deploy

# Set production environment variables
npx convex env set FIRECRAWL_API_KEY "your_key" --prod
npx convex env set GEMINI_API_KEY "your_key" --prod
```

## Data & Embeddings

The repository includes pre-processed data:

- **1,298 compliance rules** across all US jurisdictions and topics
- **1,175 compliance reports** from government sources
- **2,759 pre-computed embeddings** for fast semantic search

### Regenerate Embeddings (if needed)

```bash
node scripts/generate-embeddings.js
```

Or use the Convex dashboard to call:
```
generateEmbeddings:generateEmbeddingsForReports
```

## Architecture

### RAG (Retrieval-Augmented Generation)
- Uses cosine similarity search on pre-computed embeddings
- Query-time: Only embeds user questions, not content (faster)
- Returns top-k most relevant rules based on semantic similarity
- Cites sources with jurisdiction, topic, and similarity scores

### Research Mode
- Combines multiple data sources:
  - Internal compliance database (semantic search)
  - Web search results (Firecrawl Search API)
  - User-provided URLs (Firecrawl Scrape API)
  - News articles (when relevant)
- AI synthesizes comprehensive answers from all sources
- Proper attribution with clickable links

### Template System
- 16-section compliance template structure
- Ensures consistent, comprehensive coverage
- Templates can be customized per topic
- Auto-populates system prompts

## Configuration Files

- `.env.local` - Next.js environment (NEXT_PUBLIC_CONVEX_URL)
- `convex.json` - Convex project configuration
- Environment variables in Convex dashboard:
  - `FIRECRAWL_API_KEY`
  - `GEMINI_API_KEY`

## Security

- Simple password authentication (default: "gusto")
- Secure API key storage in Convex environment
- Client-side password check (no encryption needed)
- All sensitive keys stored in Convex backend

## Development Workflow

1. `npx convex dev` - Start Convex backend
2. `npm run dev` - Start Next.js frontend
3. Visit `http://localhost:3000` - Enter password "gusto"
4. Access `/home` for full app interface

## Support & Resources

- [GitHub Issues](https://github.com/willysharp5/RuleReady_/issues)
- [Firecrawl Documentation](https://docs.firecrawl.dev)
- [Convex Documentation](https://docs.convex.dev)
- [Gemini AI Documentation](https://ai.google.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Next.js](https://nextjs.org) - React framework
- [Convex](https://convex.dev) - Backend platform
- [Firecrawl](https://firecrawl.dev) - Web scraping
- [Google Gemini](https://ai.google.dev) - AI capabilities
- [shadcn/ui](https://ui.shadcn.com) - UI components
