# RuleReady Compliance

A comprehensive AI-powered compliance management system for employment law. Built with Next.js, Convex, Firecrawl, and advanced AI models.

## 🎯 Overview

RuleReady helps businesses navigate complex employment law compliance requirements across federal, state, and local jurisdictions. The platform combines AI-powered chat, web research capabilities, and structured templates to deliver actionable compliance guidance.

## ✨ Features

### 🤖 AI Chat Assistant (Evaluation Tool)
- Evaluate if your saved research is comprehensive enough to answer customer questions
- Uses ONLY your saved research and company context (no AI general knowledge)
- Stateless evaluation - each question is independent
- Select saved research items as knowledge base
- Generate test company data to simulate real scenarios
- Beautifully formatted responses with citations [1], [2], [3]
- Click citations to view full saved research content in TipTap viewer
- Configurable temperature and max tokens for AI models

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
- Central library for all research results
- Grid view with search and multiple filters (jurisdiction, topic, template)
- Each card shows title, metadata, content preview, and source count
- Two edit modes:
  - **Content button**: Edit markdown content with TipTap rich text editor
  - **Info button**: Update title, jurisdiction, topic, template metadata
- Create new research entries manually with full TipTap editor
- Delete with confirmation dialog
- Colorful topic breakdown in side panel shows research distribution
- Used as knowledge base in Chat for evaluation

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

### 🏷️ Topics Management
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
- Colorful topic breakdown

### 🤖 AI Models Management
- Configure and test AI model providers
- Real-time environment variable status checking
- Support for multiple AI models and providers
- Test models with latency tracking and error reporting
- Assign different models to Chat and Research tasks
- Model configuration and settings per use case
- Easy switching between model providers

### Reusable Components
- **JurisdictionSelect** - Searchable jurisdiction dropdown with hierarchy
- **TopicSelect** - Searchable topic dropdown grouped by category
- **TemplateSelect** - Searchable template dropdown grouped by topic
- **TiptapEditorModal** - Rich text editor with markdown conversion
- **ComplianceTemplateEditor** - Full template editing with Tiptap integration

### Color Themes
- **Chat**: Purple theme
- **Research**: Purple accents
- **Saved Research**: Purple theme
- **Templates**: Amber/orange theme
- **Jurisdictions**: Blue theme
- **Topics**: Purple theme
- **AI Models**: Purple theme

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

#### `savedResearch`
```typescript
{
  title: string
  content: string           // Markdown content
  jurisdiction?: string
  topic?: string
  templateUsed?: string
  sources?: array           // Source URLs and metadata
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
3. Get AI-powered answers
4. Configurable system prompts and model settings

### Using Research

1. Enter research question
2. Select filters (all optional):
   - **Template**: Structure output format
   - **Jurisdiction**: Geographic focus
   - **Topic**: Subject matter focus
   - **URLs**: Additional sources to scrape (up to 5)
   - **Context**: Extra instructions for AI
3. Get comprehensive research with:
   - Web search results
   - Scraped content from URLs
   - News articles when relevant
   - All sources properly cited with clickable links
4. Save research results for later reference

### Using Saved Research

1. View all saved research in grid layout
2. Search across titles, content, and metadata
3. Filter by jurisdiction, topic, or template
4. Edit research:
   - **Content button**: Edit markdown content with TipTap editor
   - **Info button**: Update title, jurisdiction, topic, template
5. Create new research manually with "New Research" button
6. Delete unwanted entries

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
- **Firecrawl**: Web scraping and search
- **AI Models**: Support for multiple AI providers
  - Configurable model selection
  - Currently using Google Gemini
  - Extensible to OpenAI, Anthropic, and others


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
│   ├── savedResearch.ts             # Saved research CRUD
│   ├── seedAllTemplates.ts          # 26 comprehensive templates
│   ├── chatSettings.ts              # Chat configuration
│   └── researchSettings.ts          # Research configuration
│
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Password protection
│   │   ├── home/                    # Main application
│   │   │   ├── HomePage.tsx         # Tab navigation
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── compliance-chat/     # Chat API route
│   │       ├── compliance-research/ # Research API route
│   │       ├── env-status/          # Environment variable checking
│   │       ├── test-model/          # AI model testing
│   │       └── validate-url/        # URL validation
│   │
│   ├── components/
│   │   ├── features/                # Main feature tabs
│   │   │   ├── ChatFeature.tsx
│   │   │   ├── ResearchFeature.tsx
│   │   │   ├── SavedResearchFeature.tsx
│   │   │   ├── TemplatesFeature.tsx
│   │   │   ├── JurisdictionsFeature.tsx
│   │   │   ├── TopicsFeature.tsx
│   │   │   └── AIModelsFeature.tsx
│   │   │
│   │   ├── home/                    # Properties panels (right sidebar)
│   │   │   ├── LeftNavigation.tsx
│   │   │   ├── RightPropertiesPanel.tsx
│   │   │   ├── ChatProperties.tsx
│   │   │   ├── ResearchProperties.tsx
│   │   │   ├── SavedResearchProperties.tsx
│   │   │   ├── TemplatesProperties.tsx
│   │   │   ├── JurisdictionsProperties.tsx
│   │   │   ├── TopicsProperties.tsx
│   │   │   ├── AIModelsProperties.tsx
│   │   │   └── AccordionSection.tsx
│   │   │
│   │   ├── ui/                      # Reusable UI components
│   │   │   ├── jurisdiction-select.tsx  # Searchable dropdown
│   │   │   ├── topic-select.tsx         # Searchable dropdown with categories
│   │   │   ├── template-select.tsx      # Searchable dropdown with topics
│   │   │   ├── toast.tsx                # Toast notifications
│   │   │   ├── popover.tsx              # Popover component
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── ComplianceTemplateEditor.tsx # Template editing with Tiptap
│   │   └── TiptapEditorModal.tsx        # Rich text editor modal
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
