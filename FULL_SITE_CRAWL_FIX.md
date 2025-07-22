# Full Site Crawl Implementation Fix

## Issue
Full site crawling was not working properly. When clicking "Check Now" or when scheduled checks ran, it only scraped the single URL instead of crawling all pages for sites marked as "Full Site".

## Root Cause
The Firecrawl API returns an async job ID for crawl operations, but the code was falling back to single page scraping instead of properly handling the async job.

## Solution Implemented

### 1. **Async Job Handling**
- Added `jobId` field to `crawlSessions` table to track Firecrawl async crawl jobs
- Implemented `checkCrawlJobStatus` function that polls the job status every 10 seconds
- When a crawl returns a job ID, we now properly track and wait for completion

### 2. **Updated Functions**
- `performCrawl`: Now handles async crawl jobs properly
- `updateCrawlSessionJobId`: Stores the job ID in the crawl session
- `checkCrawlJobStatus`: Polls Firecrawl API for job completion and processes results

### 3. **Flow**
1. User clicks "Check Now" on a full site monitor
2. `triggerScrape` correctly identifies it's a full site and calls `performCrawl`
3. `performCrawl` initiates a Firecrawl crawl operation
4. If Firecrawl returns a job ID (async), we store it and schedule status checks
5. `checkCrawlJobStatus` polls every 10 seconds until the crawl completes
6. Once complete, all crawled pages are processed and stored with change tracking
7. Each page URL is preserved in the `scrapeResults` table

## Testing
The fix ensures that:
- Full site monitors trigger crawl operations (visible in Firecrawl dashboard as `/crawl` calls)
- All pages are discovered and tracked
- Each page's full URL is stored and displayed in the change tracking panel
- Change detection works for each individual page in the crawl

## Verification
Check the Convex logs for:
- `performCrawl called for website: [websiteId]`
- `Crawl started with job ID: [jobId]`
- `Checking crawl job status: [jobId] (attempt X)`
- `Crawl completed! Processing X pages`