# Firecrawl Scraping Process Documentation

## Overview

This document explains how RuleReady uses Firecrawl for web scraping compliance data, the configuration settings, AI processing prompts, and the complete workflow from "Check Now" button to structured compliance reports.

## 🔧 Firecrawl Configuration

### Basic Scraping Configuration

```typescript
// Location: convex/firecrawl.ts - scrapeUrl function
const result = await firecrawl.scrapeUrl(args.url, {
  formats: ["markdown", "changeTracking"],
  changeTrackingOptions: {
    modes: ["git-diff"], // Enable git-diff to see what changed
  },
  onlyMainContent: false, // Include all content, not just main content
  waitFor: 2000, // Wait 2 seconds for content to load
}) as any;
```

### Crawling Configuration (for full site crawls)

```typescript
// Location: convex/firecrawl.ts - crawlWebsite function
const crawlResult = await firecrawl.crawlUrl(args.url, {
  limit: args.limit || 10,
  scrapeOptions: {
    formats: ["markdown", "changeTracking"],
    onlyMainContent: false,
    waitFor: 2000,
  },
}) as any;
```

## 🎯 Compliance Crawler Strategy

### Jurisdiction-Based Crawling Strategies

```typescript
// Location: convex/complianceCrawler.ts
const crawlingStrategies = {
  federal: { 
    frequency: "weekly", 
    depth: 3, 
    priority: "critical",
    domains: ["dol.gov", "eeoc.gov", "nlrb.gov"],
    checkIntervalMinutes: 10080, // 1 week
    selectors: [".content-main", ".law-text", ".regulation", ".guidance"]
  },
  state_labor_dept: { 
    frequency: "bi-weekly", 
    depth: 2, 
    priority: "high",
    domains: ["state.gov", "labor.gov", "employment.gov"],
    checkIntervalMinutes: 20160, // 2 weeks
    selectors: [".content-main", ".law-text", ".regulation", ".statute"]
  },
  municipal: { 
    frequency: "monthly", 
    depth: 1, 
    priority: "medium",
    domains: ["city.gov", "county.gov", "municipal.gov"],
    checkIntervalMinutes: 43200, // 1 month
    selectors: [".ordinance", ".municipal-code", ".city-law"]
  }
};
```

### Topic-Based Priority Mapping

```typescript
// Location: convex/complianceCrawler.ts
const topicPriorities = {
  minimum_wage: "critical", // Changes frequently, high business impact
  overtime: "high",
  paid_sick_leave: "high", // Rapidly evolving area
  harassment_training: "high", // Frequent updates and deadlines
  workers_comp: "medium",
  posting_requirements: "medium",
  background_checks: "medium",
  meal_rest_breaks: "medium",
  family_leave: "low", // Less frequent changes
  // Default for unlisted topics
  default: "medium"
};
```

## 🤖 AI Processing Prompt (Gemini Flash Lite)

### Complete Extraction Prompt

```typescript
// Location: convex/geminiFlashLite.ts - processComplianceDataWithGemini
const prompt = `
Analyze this compliance content and extract information according to the compliance template structure.

CONTENT TO ANALYZE:
${args.rawContent.substring(0, 10000)} // Limit content size

EXTRACTION TEMPLATE:
Please extract and structure the following sections based on the content above:

1. OVERVIEW
   - Brief description of the law/requirement, including key legislation and purpose

2. COVERED EMPLOYERS
   - Who must comply with this requirement - employee thresholds, business types, etc.

3. COVERED EMPLOYEES
   - Which employees are covered/protected - employment types, locations, exemptions

4. WHAT SHOULD EMPLOYERS DO?
   - Specific actions employers must take to comply

5. TRAINING REQUIREMENTS
   - If applicable - training content, duration, format requirements

6. TRAINING DEADLINES
   - If applicable - timing requirements for different employee types

7. QUALIFIED TRAINERS
   - If applicable - who can provide the training/services

8. SPECIAL REQUIREMENTS
   - Any special cases, exceptions, industry-specific requirements, or additional obligations

9. COVERAGE ELECTION
   - If applicable - optional coverage choices or rejection options

10. RECIPROCITY/EXTRATERRITORIAL COVERAGE
    - If applicable - cross-state/jurisdiction coverage rules

11. EMPLOYER RESPONSIBILITIES & DEADLINES
    - Ongoing obligations, verification processes, renewal requirements, key deadlines

12. EMPLOYER NOTIFICATION REQUIREMENTS
    - Required notifications to employees about rights, processes, or programs

13. POSTING REQUIREMENTS
    - Required workplace postings, notices, and display requirements

14. RECORDKEEPING REQUIREMENTS
    - What records must be maintained, retention periods, required documentation

15. PENALTIES FOR NON-COMPLIANCE
    - Fines, penalties, consequences, and enforcement actions

16. SOURCES
    - Relevant statutes, regulations, agency websites, and official resources

Please provide structured output in JSON format with each section clearly labeled.
For sections where information is not available, use "Not specified in available documentation".

JURISDICTION: ${args.jurisdiction}
TOPIC: ${args.topicKey}
SOURCE: ${args.sourceUrl}
`;
```

## 📄 Compliance Template Structure

The template structure is defined in `/data/compliance_template.txt` and contains 16 standardized sections:

1. **Overview** - Brief description of law/requirement
2. **Covered Employers** - Who must comply
3. **Covered Employees** - Which employees are covered
4. **What Should Employers Do?** - Specific compliance actions
5. **Training Requirements** - Training content and format
6. **Training Deadlines** - Timing requirements
7. **Qualified Trainers** - Who can provide training
8. **Special Requirements** - Exceptions and special cases
9. **Coverage Election** - Optional coverage choices
10. **Reciprocity/Extraterritorial Coverage** - Cross-jurisdiction rules
11. **Employer Responsibilities & Deadlines** - Ongoing obligations
12. **Employer Notification Requirements** - Required notifications
13. **Posting Requirements** - Workplace postings
14. **Recordkeeping Requirements** - Record maintenance
15. **Penalties for Non-Compliance** - Fines and consequences
16. **Sources** - Official resources and statutes

## 🔄 Complete Process Flow

### Manual "Check Now" Workflow

1. **User clicks "Check Now"** → Triggers `firecrawl:triggerScrape` action
2. **Website validation** → Gets website data regardless of active status
3. **Compliance detection** → Checks if website has `complianceMetadata.ruleId`
4. **Crawler dispatch** → Schedules `complianceCrawler:crawlComplianceRuleInternal`

### Compliance Crawler Process

1. **Rule lookup** → Gets compliance rule details from database
2. **Strategy selection** → Chooses crawling strategy based on jurisdiction/topic
3. **Firecrawl scraping** → Basic markdown extraction from website
4. **Content processing** → AI analysis using Gemini Flash Lite
5. **Change detection** → Compares with previous content
6. **Dual storage** → Stores in both `complianceReports` and `scrapeResults`
7. **Change tracking** → Appears in UI change tracking log

### AI Processing Pipeline

1. **Raw content** → Firecrawl extracts basic markdown
2. **AI prompt** → Gemini Flash Lite processes with compliance template
3. **Structured extraction** → Creates 16 organized sections
4. **JSON output** → Structured data stored in `complianceAIReports`
5. **Template formatting** → Applied to match compliance template structure

## 📊 Data Storage

### Three-Table System

1. **`complianceReports`** → Raw scraped content and basic extraction
2. **`complianceAIReports`** → AI-processed structured data (16 sections)
3. **`scrapeResults`** → Change tracking log entries (for UI display)

### Storage Flow

```
Firecrawl Scraping → complianceReports (raw)
                  ↓
AI Processing → complianceAIReports (structured)
                  ↓
Change Tracking → scrapeResults (UI display)
```

## 🎛️ Configuration Parameters

### Firecrawl Options

- **`formats`**: `["markdown", "changeTracking"]` - Extract markdown and track changes
- **`changeTrackingOptions.modes`**: `["git-diff"]` - Use git-style diff for changes
- **`onlyMainContent`**: `false` - Include all page content, not just main content
- **`waitFor`**: `2000` - Wait 2 seconds for dynamic content to load

### Compliance Crawler Settings

- **Federal sites**: Weekly checks, depth 3, critical priority
- **State labor departments**: Bi-weekly checks, depth 2, high priority  
- **Municipal sites**: Monthly checks, depth 1, medium priority

### AI Processing Limits

- **Content limit**: 10,000 characters for AI processing
- **Output format**: JSON with 16 structured sections
- **Fallback text**: "Not specified in available documentation"

## 🚨 Known Limitations

### PDF Handling
- **Issue**: Firecrawl cannot extract meaningful content from PDF files
- **Affected sites**: Many government compliance documents are PDFs
- **Solution**: System provides informative message explaining limitation

### Content Extraction Failures
- **Common causes**: 
  - PDF format documents
  - Website access restrictions
  - Dynamic content loading
  - Authentication requirements
- **Fallback**: Professional message explaining the limitation with recommendations

### Character Limits
- **Historical issue**: Previous scrapes were truncated at ~1,003 characters
- **Current limit**: Up to 10,000 characters for new scrapes
- **AI processing**: Limited to 10,000 characters for Gemini analysis

## 🔍 Troubleshooting

### If "Check Now" doesn't show results:
1. Check if website is PDF format (common issue)
2. Verify website accessibility (502 errors common)
3. Check compliance crawler logs for errors
4. Ensure website has `complianceMetadata.ruleId`

### If content is truncated:
1. Historical data may be limited to ~1,000 characters
2. New scrapes should capture up to 10,000 characters
3. PDF documents cannot be processed by Firecrawl

### If no changes detected:
1. Content may be identical to previous scrape
2. PDF documents typically show no changes
3. Dynamic content may not be captured properly

## 📈 Recent Improvements

### Enhanced Configuration (October 2025)
- Added `onlyMainContent: false` for more complete content
- Increased `waitFor` to 2000ms for dynamic content
- Enhanced error handling and fallback content
- Dual storage system for change tracking log visibility

### Single-User Mode Support
- Removed authentication requirements for manual checks
- "Check Now" works regardless of website active status
- Proper error handling for PDF and inaccessible sites

### UI Enhancements
- Replaced download buttons with Eye icon popovers
- Large modal display with complete scrape ID
- Professional markdown formatting
- Enhanced content display without toggles

## 📝 File Locations

- **Firecrawl config**: `convex/firecrawl.ts`
- **Compliance crawler**: `convex/complianceCrawler.ts`
- **AI processing**: `convex/geminiFlashLite.ts`
- **Template structure**: `data/compliance_template.txt`
- **Schema definitions**: `convex/schema.ts`
- **Change tracking UI**: `src/app/page.tsx`
- **Popover component**: `src/components/ui/change-tracking-popover.tsx`

---

*Last updated: October 24, 2025*
*Documentation covers the complete Firecrawl scraping and AI processing pipeline for compliance monitoring.*
