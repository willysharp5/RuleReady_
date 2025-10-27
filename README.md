# RuleReady Compliance

An AI-powered compliance intelligence platform that monitors employment law changes across all US jurisdictions. Built with Next.js, Convex, Firecrawl, and Gemini AI.

## Features

- **Comprehensive Coverage**: Monitor 1,305 employment law rules across all 50 US states and federal regulations
- **AI-Powered RAG Chat**: Ask compliance questions and get answers with source citations from 2,759+ pre-computed embeddings
- **Intelligent Change Detection**: Gemini AI analyzes compliance updates using structured templates (16 sections per rule)
- **Automated Monitoring**: Priority-based crawling (weekly for federal, bi-weekly for state, monthly for municipal)
- **Source Attribution**: Every answer includes jurisdiction, topic, similarity scores, and clickable source URLs
- **Secure & Encrypted**: AES-256-GCM encryption for API keys and sensitive data
- **Real-time Updates**: Intelligent scheduling based on rule priority and change frequency

## Prerequisites

- Node.js 18+ and npm/pnpm
- A [Convex](https://convex.dev) account (free tier available)
- A [Firecrawl](https://firecrawl.dev) API key (required for compliance monitoring)
- A [Google AI Studio](https://aistudio.google.com) API key (for Gemini - powers chat and analysis)

## Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/willysharp5/RuleReady_.git
cd RuleReady_
```

### Step 2: Install Dependencies

```bash
npm install
# or
pnpm install
```

### Step 3: Initialize Convex

```bash
npx convex dev
```

This will:
- Open your browser to authenticate with Convex
- Create a new project (or link to an existing one)
- Set up your database schema and generate API files

Keep this terminal running.

### Step 4: Set Environment Variables

```bash
# Required: Encryption key for secure API key storage
npx convex env set ENCRYPTION_KEY "$(openssl rand -base64 32)"

# Required: Firecrawl API key for compliance monitoring
npx convex env set FIRECRAWL_API_KEY "your_firecrawl_api_key"

# Required: Gemini API key for AI chat and analysis
npx convex env set GEMINI_API_KEY "your_gemini_api_key"
```

### Step 5: Start the Development Server

In a new terminal:

```bash
npm run dev
# or
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Configuration

### Environment Variables

The Next.js app needs minimal configuration. Create a `.env.local` file with:

```env
# Convex (automatically set by npx convex dev)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Convex Environment Variables

Set these in your Convex dashboard or via CLI:

**Required:**
- `ENCRYPTION_KEY` - Secures API keys in database (generate with `openssl rand -base64 32`)
- `FIRECRAWL_API_KEY` - Powers compliance monitoring and web scraping
- `GEMINI_API_KEY` - Powers AI chat (RAG) and compliance analysis

## Usage

### Compliance Chat Assistant

The main feature is the AI-powered compliance chat:

1. Navigate to the **Settings** page
2. Scroll to the **AI Chat Assistant** section
3. Optionally filter by:
   - **Jurisdiction** (e.g., California, Federal, New York)
   - **Topic** (e.g., Minimum Wage, Harassment Training, Paid Sick Leave)
4. Ask compliance questions in natural language
5. Get AI-generated answers with:
   - Source citations showing jurisdiction and topic
   - Similarity scores for relevance
   - Clickable URLs to official sources

**Example questions:**
- "What are California's minimum wage requirements for 2025?"
- "What harassment training is required for New York employers?"
- "Tell me about federal overtime exemptions"

### Compliance Monitoring

The system automatically monitors 1,305+ compliance rules:

- **Federal regulations**: Checked weekly (DOL, EEOC, NLRB sources)
- **State labor departments**: Checked bi-weekly
- **Municipal ordinances**: Checked monthly

All changes are analyzed using Gemini AI with a 16-section structured template covering:
- Overview, Covered Employers, Training Requirements
- Deadlines, Penalties, Recordkeeping
- And more...

## Development

### Project Structure

```
RuleReady_/
├── convex/                      # Convex backend
│   ├── schema.ts                # Database schema (compliance-focused)
│   ├── complianceCrawler.ts     # Automated compliance monitoring
│   ├── complianceQueries.ts     # Data queries for jurisdictions/topics
│   ├── embeddingManager.ts      # RAG embedding search
│   ├── firecrawl.ts             # Firecrawl integration
│   └── geminiFlashLite.ts       # Gemini AI processing
├── src/
│   ├── app/                     # Next.js app router
│   │   ├── page.tsx             # Dashboard
│   │   ├── settings/            # Settings & Chat UI
│   │   └── api/                 # API routes
│   ├── components/              # React components
│   └── lib/                     # Utilities
├── data/                        # Compliance data
│   ├── compliance_reports/      # 1,175+ compliance reports
│   └── compliance_template.txt  # 16-section template
└── docs/                        # Documentation
```

### Key Technologies

- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Backend**: Convex (serverless functions + database)
- **AI**: Gemini 2.0 Flash for RAG chat and compliance analysis
- **Scraping**: Firecrawl for automated compliance monitoring
- **Embeddings**: 2,759 pre-computed vectors for semantic search

### Available Scripts

- `npm run dev` / `pnpm dev` - Start development servers
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npx convex dev` - Start Convex backend with hot reload
- `npx convex deploy` - Deploy Convex functions to production

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variable:
   - `NEXT_PUBLIC_CONVEX_URL` (from Convex dashboard)
4. Deploy

### Deploy Convex Backend

```bash
npx convex deploy
```

Then set your production environment variables:

```bash
npx convex env set ENCRYPTION_KEY "$(openssl rand -base64 32)" --prod
npx convex env set FIRECRAWL_API_KEY "your_key" --prod
npx convex env set GEMINI_API_KEY "your_key" --prod
```

## Data & Embeddings

The repository includes:

- **1,305 compliance rules** across all US jurisdictions and topics
- **1,175 compliance reports** (pre-scraped government sources)
- **2,759 pre-computed embeddings** for fast RAG search

To regenerate embeddings (if needed):

```bash
# Via Convex dashboard, call the action:
generateEmbeddings:generateEmbeddingsForReports
```

## Architecture

- **RAG (Retrieval-Augmented Generation)**: Uses cosine similarity search on pre-computed embeddings
- **Query-time efficiency**: Only generates embeddings for user questions, not content
- **16-section template**: Standardized extraction for all compliance rules
- **Priority-based crawling**: Federal (weekly) → State (bi-weekly) → Municipal (monthly)

## Security

- All API keys encrypted using AES-256-GCM
- Secure Convex authentication
- Environment-based configuration
- No hardcoded credentials

## Support

- [GitHub Issues](https://github.com/willysharp5/RuleReady_/issues)
- [Firecrawl Documentation](https://docs.firecrawl.dev)
- [Convex Documentation](https://docs.convex.dev)
- [Gemini AI Documentation](https://ai.google.dev/docs)