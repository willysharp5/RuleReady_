# Firecrawl Observer Reference

## Overview
This document references the [firecrawl-observer](https://github.com/firecrawl/firecrawl-observer) repository, which has been cloned to `/reference/firecrawl-observer/` for code reference when developing RuleReady.

## Why This Reference?
Firecrawl Observer is an official example application built by the Firecrawl team that demonstrates best practices for:
- Website monitoring and change detection
- Firecrawl API integration
- Convex database patterns
- AI-powered change analysis
- Secure API key management
- Real-time notifications

## Key Learnings for RuleReady

### 1. **Firecrawl Integration Patterns**
Location: `reference/firecrawl-observer/convex/firecrawl.ts`
- How to structure Firecrawl API calls in Convex actions
- Error handling for scraping operations
- Rate limiting and retry logic
- Single page vs. full site crawling patterns

### 2. **Change Detection & Tracking**
Location: `reference/firecrawl-observer/convex/`
- Using Firecrawl's `changeTracking` format for monitoring content changes
- Storing and comparing versions over time
- Detecting meaningful changes vs. noise

### 3. **AI-Powered Analysis**
Location: `reference/firecrawl-observer/convex/aiAnalysis.ts`
- Using AI to filter out irrelevant changes
- Prompting strategies for change analysis
- Integration with multiple AI providers (OpenAI, Anthropic, Google)

### 4. **Secure API Key Management**
Location: `reference/firecrawl-observer/convex/` and encryption utilities
- AES-256-GCM encryption for storing API keys
- Per-user API key management
- Fallback to system-wide keys

### 5. **Scheduled Monitoring**
Location: `reference/firecrawl-observer/convex/` (cron patterns)
- Configurable check intervals
- Background job patterns with Convex
- Handling long-running scraping operations

### 6. **Notification System**
- Email notifications (via Resend)
- Webhook integrations
- AI-filtered notification thresholds

### 7. **UI/UX Patterns**
Location: `reference/firecrawl-observer/src/components/`
- Website monitoring dashboard
- Real-time status updates
- Change visualization
- Settings management

## Relevant Patterns for RuleReady

### Change Tracking Format
```typescript
// Use Firecrawl's changeTracking format
const result = await firecrawl.scrape({
  url: websiteUrl,
  formats: ['changeTracking', 'markdown'],
  // ...
});
```

### Convex + Firecrawl Actions
```typescript
// Pattern for long-running scraping operations
export const monitorWebsite = internalAction({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    // Fetch config from DB
    const website = await ctx.runQuery(/* ... */);
    
    // Perform scraping
    const result = await firecrawl.scrape(/* ... */);
    
    // Store results back to DB
    await ctx.runMutation(/* ... */);
  },
});
```

### Cron Job Patterns
```typescript
// Dynamic scheduling based on user configuration
crons.interval(
  "check websites",
  { minutes: 60 },
  internal.firecrawl.checkDueWebsites
);
```

## Applying to RuleReady

1. **Compliance Website Monitoring**: Use similar patterns to monitor regulatory websites for updates
2. **Change Analysis**: Apply AI analysis to detect meaningful regulatory changes
3. **Notification System**: Alert users when relevant compliance changes are detected
4. **API Key Management**: Secure storage of user-provided Firecrawl keys
5. **Scheduled Crawling**: Automated monitoring of compliance sources

## Reference Location
The full source code is available at:
```
/Users/edo.williams/Desktop/RuleReady_/reference/firecrawl-observer/
```

## Key Files to Study

1. **Convex Backend**:
   - `convex/firecrawl.ts` - Firecrawl integration
   - `convex/schema.ts` - Data model design
   - `convex/aiAnalysis.ts` - AI integration patterns
   - `convex/crons.ts` - Scheduled job patterns

2. **Frontend**:
   - `src/app/` - Next.js app structure
   - `src/components/` - React components
   - `src/config/` - Configuration management

3. **Documentation**:
   - `README.md` - Setup and architecture overview
   - `docs/` - Additional documentation

## Notes
- This is a reference implementation, not a dependency
- Adapt patterns to RuleReady's specific compliance monitoring needs
- Focus on the architectural patterns and best practices
- Don't copy code directly - understand and adapt

---
*Last Updated: October 27, 2025*

