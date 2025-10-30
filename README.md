# RuleReady Compliance

A comprehensive AI-powered compliance management system for employment law. Built with Next.js, Convex, Firecrawl, and Google Gemini.

## 🎯 Overview

RuleReady helps businesses navigate complex employment law compliance requirements across federal, state, and local jurisdictions. The platform combines AI-powered chat, web research capabilities, and structured templates to deliver actionable compliance guidance.

## ✨ Features

### 🤖 AI Chat Assistant
- Ask questions about employment law in natural language
- Powered by Google Gemini 2.0 Flash
- Filter by jurisdiction and topic for focused answers
- Configurable system prompts and model settings
- Real-time responses with structured formatting

### 🔬 Compliance Research
- Deep research mode combining multiple data sources:
  - Web search results (Firecrawl Search API)
  - User-provided URL scraping (supports PDFs)
  - News articles integration
- AI synthesizes comprehensive answers from all sources
- Template-driven structured output
- Save research results for later reference
- Proper attribution with clickable source links

### 📚 Saved Research
- View and manage saved research results
- Search across all saved content
- Filter by jurisdiction, topic, and template
- Edit research content with TipTap rich text editor
- Edit research metadata (title, jurisdiction, topic)
- Create new research entries manually
- Colorful topic breakdown in side panel

### 📋 Template Management
- **Topic-specific templates** created by legal compliance experts
- **1 general template** for cross-cutting issues
- Each template includes:
  - Quick Overview
  - Covered Employers/Employees
  - Detailed Requirements
  - Action Steps
  - Common Violations
  - Penalties
  - Best Practices
  - Recordkeeping
  - Sources
- Multiple templates per topic supported
- Beautiful Tiptap editor for rich text editing
- Topic association with visual badges
- Searchable dropdown grouped by topic
- Full CRUD (Create, Read, Update, Delete, Activate/Deactivate)

### 🏛️ Jurisdictions Management
- Federal, State, and City level coverage
- All 50 US states + DC
- Hierarchical organization (Federal → States → Cities)
- Active/Inactive status management
- Cascading inactive logic (inactive states hide their cities)
- Employment law coverage flags

### 🏷️ Topics Management (Complete Redesign)
- Employment law topics across categories:
  - **Wages & Hours** 
  - **Leave & Benefits** 
  - **Safety & Training**
  - **Employment Practices**
  - **Emerging Issues**
  - **Regulatory Compliance**
- Category management (Rename, Merge, Create)
- Searchable dropdown with category grouping
- Active/Inactive status with visual indicators


### Reusable Components
- **JurisdictionSelect** - Searchable jurisdiction dropdown with hierarchy
- **TopicSelect** - Searchable topic dropdown grouped by category
- **TemplateSelect** - Searchable template dropdown grouped by topic
- **TiptapEditorModal** - Rich text editor with markdown conversion
- **ComplianceTemplateEditor** - Full template editing with Tiptap integration

### Color Themes
- **Chat**: Default purple
- **Research**: Purple accents
- **Templates**: Amber/orange theme
- **Jurisdictions**: Blue theme
- **Topics**: Purple theme

## 🗄️ Database Schema

### Core Tables

#### `complianceTopics`
```typescript
{
  name: string          // "Minimum Wage"
  slug: string          // "minimum-wage" (auto-generated)
  category: string      // "Wages & Hours"
  description: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}
```

#### `complianceTemplates`
```typescript
{
  templateId: string
  title: string
  description?: string
  markdownContent: string    // Full template content
  topicSlug?: string         // Optional topic association
  isActive: boolean
  createdAt: number
  updatedAt: number
}
```

#### `complianceRules`
```typescript
{
  ruleId: string
  jurisdiction: string
  topicSlug: string         // Links to complianceTopics
  topicName: string
  sourceUrl: string
  priority: "critical" | "high" | "medium" | "low"
  monitoringStatus: "active" | "paused" | "error"
  metadata: { ... }
  createdAt: number
  updatedAt: number
}
```

#### `complianceEmbeddings`
```typescript
{
  entityId: string
  entityType: "rule" | "report"
  content: string
  embedding: number[]       // 1536-dimensional vector
  metadata: {
    jurisdiction?: string
    topicSlug?: string     
    contentLength?: number
  }
  createdAt: number
  updatedAt: number
}
```

#### `jurisdictions`
```typescript
{
  code: string              // "US", "CA", "CA-SF"
  name: string              // "Federal", "California", "San Francisco"
  level: "federal" | "state" | "city"
  parentCode?: string       // Hierarchical relationship
  stateCode?: string        // For cities
  displayName?: string      // "San Francisco, CA"
  isActive: boolean
  hasEmploymentLaws: boolean
  lastUpdated: number
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- [Convex](https://convex.dev) account 
- [Firecrawl](https://firecrawl.dev) API key
- [Google AI Studio](https://aistudio.google.com) API key

### Installation

```bash
# Clone repository
git clone https://github.com/willysharp5/RuleReady_.git
cd RuleReady_

# Install dependencies
npm install

# Initialize Convex (opens browser for authentication)
npx convex dev
```

### Environment Setup

```bash
# Set API keys in Convex
npx convex env set FIRECRAWL_API_KEY "your_firecrawl_api_key"
npx convex env set GEMINI_API_KEY "your_gemini_api_key"

# Seed initial data
npx convex run complianceQueries:seedTopics          # 25 topics
npx convex run seedAllTemplates:seedAllComplianceTemplates  # 26 templates
```

### Run Development Server

```bash
# Terminal 1: Convex backend (keep running)
npx convex dev

# Terminal 2: Next.js frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Default Password:** `gusto`

## 📚 Usage Guide

### Managing Topics

**Topics Tab Features:**
- **Add Topic**: Create new compliance topics
- **Edit Topic**: Update name, category, description
- **Activate/Deactivate**: Soft delete without removing
- **Delete**: Remove topics (validates no dependencies)
- **Filter**: By category and active status
- **Search**: Across name, slug, category, description

**Category Management:**
- **Rename**: Update category name across all topics
- **Merge**: Consolidate categories
- **Create**: Add new category with first topic
- Auto-removal when category becomes empty

### Managing Templates

**Templates Tab Features:**
- **Comprehensive Templates** (topic-specific + 1 general)
- **Add Template**: Rich text editor with Tiptap
- **Edit Template**: Full markdown editing with toolbar
- **Associate to Topic**: Link templates to specific topics (multiple allowed)
- **Activate/Deactivate**: Control template availability
- **Delete**: Remove any template
- **Filter**: By topic and active status
- **Search**: Across title, description, topic

**Template Benefits:**
- Multiple templates per topic (Basic, Advanced, Industry-specific)
- General template for cross-cutting issues
- AI structures responses using template format
- Professionally crafted by legal compliance perspective

### Managing Jurisdictions

**Jurisdictions Tab Features:**
- **Add Jurisdiction**: Federal, State, or City
- **Edit**: Update details and settings
- **Delete**: Remove jurisdictions
- **Active/Inactive**: Control visibility
- **Cascading Logic**: Inactive states hide their cities
- **Has Laws**: Flag jurisdictions with employment regulations
- **Filter**: By level, status, and law coverage

### Using AI Chat

1. Select filters (optional):
   - **Jurisdiction**: Focus on specific location
   - **Topic**: Focus on specific compliance area
2. Ask questions in natural language
3. Get answers with:
   - Source citations [1], [2], [3]
   - Jurisdiction and topic badges
   - Similarity scores
   - Clickable source URLs

### Using Research

1. Enter research question
2. Select filters (all optional):
   - **Template**: Structure output format
   - **Jurisdiction**: Geographic focus
   - **Topic**: Subject matter focus
   - **URLs**: Additional sources to scrape
   - **Context**: Extra instructions for AI
3. Get comprehensive research with all sources cited

## 🛠️ Advanced Features

### Tiptap Rich Text Editor
- **Full WYSIWYG editing** for template content
- **Toolbar**: Bold, Italic, Headings, Lists, Links, Code
- **Smart Link Editing**:
  - Click link → Popup with Open/Edit/Delete options
  - Inline editing without separate dialog
  - Update button changes from Edit → Update
- **Markdown conversion**: Auto-converts to/from markdown
- **Copy functions**: Copy for Docs, Copy Markdown
- **Undo/Redo**: Full history with proper configuration

### Interactive Dropdowns
All selector components feature:
- **Search functionality**: Find items quickly
- **Hierarchical grouping**: Organized by category/topic
- **Visual indicators**: Active/Inactive badges
- **Clear buttons**: Easy to reset selection
- **Keyboard navigation**: Enter, Escape support
- **Auto-close**: Click outside to dismiss

### Filtering System
Consistent across all tabs:
- **Topic filter**: Beautiful TopicSelect component
- **Status filter**: Active/Inactive dropdown
- **Additional filters**: Tab-specific (level, has laws, default, etc.)
- **Clear Filters button**: Reset all filters at once
- **Pagination reset**: Filters automatically reset to page 1


## 🔧 Technical Architecture

### Frontend Stack
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety throughout
- **TailwindCSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Tiptap**: Rich text editing
- **Lucide Icons**: Modern icon system

### Backend Stack
- **Convex**: Serverless functions + real-time database
- **Semantic Search**: Cosine similarity on embeddings
- **RAG System**: Retrieval-augmented generation
- **Firecrawl**: Web scraping and search
- **Gemini 2.0 Flash**: AI model for chat and research


## 📖 Template Topics Covered

### Wages & Hours
1. Minimum Wage Compliance
2. Overtime & Hours
3. Meal & Rest Breaks
4. Final Pay / Vacation Payout
5. Pay Frequency & Payday Timing
6. Tip Credit / Tipped Employees

### Leave & Benefits
7. Paid Sick Leave
8. Paid Family / Medical Leave (PFML)
9. Jury Duty Leave
10. Voting Leave

### Safety & Training
11. Harassment Training
12. Workers' Compensation
13. Drug Testing

### Employment Practices
14. Posting Requirements
15. Child Labor
16. Background Checks
17. E-Verify
18. Independent Contractor Classification
19. Apprenticeship Programs

### Emerging Issues
20. Pregnancy / Disability / ADA Accommodations
21. Predictive Scheduling
22. Pay Equity / Salary History Bans

### Regulatory Compliance
23. Prevailing Wage Laws
24. Record Retention
25. Unemployment Insurance

### General
26. General Employment Law Compliance (catch-all)

## 🎓 Template Quality

Each template provides:
- ✅ **Legal precision**: Attorney-level compliance guidance
- ✅ **Actionable**: Step-by-step employer obligations
- ✅ **Comprehensive**: Federal, state, and local requirements
- ✅ **Current**: References to recent laws and guidance
- ✅ **Multi-jurisdictional**: Covers state variations
- ✅ **Practical**: Common violations and best practices
- ✅ **Complete**: Penalties, recordkeeping, sources

## 🔐 Security & Access

- Simple password authentication (default: `gusto`)
- API keys securely stored in Convex environment
- No user accounts or personal data collection
- All data stored in Convex secure database

## 📁 Project Structure

```
RuleReady_/
├── convex/                          # Backend (Convex)
│   ├── schema.ts                    # Database schema
│   ├── complianceTopics.ts          # Topics CRUD & category management
│   ├── complianceTemplates.ts       # Templates CRUD
│   ├── complianceQueries.ts         # Jurisdictions & data queries
│   ├── complianceRAG.ts             # RAG & semantic search
│   ├── embeddingManager.ts          # Embedding operations
│   ├── generateEmbeddings.ts        # Embedding generation
│   ├── seedAllTemplates.ts          # 25 comprehensive templates
│   ├── chatSettings.ts              # Chat configuration
│   ├── researchSettings.ts          # Research configuration
│   └── savedResearch.ts             # Research library
│
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Password protection
│   │   ├── home/                    # Main application
│   │   │   ├── HomePage.tsx         # Tab navigation
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── compliance-chat/     # Chat API route
│   │       └── compliance-research/ # Research API route
│   │
│   ├── components/
│   │   ├── features/                # Main feature tabs
│   │   │   ├── ChatFeature.tsx
│   │   │   ├── ResearchFeature.tsx
│   │   │   ├── TemplatesFeature.tsx     # Complete redesign
│   │   │   ├── JurisdictionsFeature.tsx # Enhanced
│   │   │   ├── TopicsFeature.tsx        # Complete redesign
│   │   │   └── AIModelsFeature.tsx
│   │   │
│   │   ├── home/                    # Properties panels (right sidebar)
│   │   │   ├── LeftNavigation.tsx
│   │   │   ├── RightPropertiesPanel.tsx
│   │   │   ├── ChatProperties.tsx
│   │   │   ├── ResearchProperties.tsx   # Enhanced with TemplateSelect
│   │   │   ├── TemplatesProperties.tsx  # New comprehensive panel
│   │   │   ├── JurisdictionsProperties.tsx  # Enhanced stats
│   │   │   ├── TopicsProperties.tsx     # New comprehensive panel
│   │   │   └── AccordionSection.tsx
│   │   │
│   │   ├── ui/                      # Reusable UI components
│   │   │   ├── jurisdiction-select.tsx  # NEW - Searchable dropdown
│   │   │   ├── topic-select.tsx         # NEW - Searchable dropdown
│   │   │   ├── template-select.tsx      # NEW - Searchable dropdown
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── ComplianceTemplateEditor.tsx # Redesigned with Tiptap
│   │   └── TiptapEditorModal.tsx        # Rich text editor
│   │
│   └── lib/
│       └── utils.ts
│
├── data/                            # Pre-processed compliance data
├── docs/                            # Documentation
└── scripts/                         # Utility scripts
```



## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org) - React framework
- [Convex](https://convex.dev) - Backend platform  
- [Firecrawl](https://firecrawl.dev) - Web scraping
- [Google Gemini](https://ai.google.dev) - AI capabilities
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Tiptap](https://tiptap.dev) - Rich text editor
- [TailwindCSS](https://tailwindcss.com) - Styling
- [Lucide Icons](https://lucide.dev) - Icon system


---

**Version**: 2.0.0  
**Last Updated**: October 2025  
**Status**: Production Ready ✅
