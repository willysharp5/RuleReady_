# Duplicate Crawl Fix

## Issue
When initiating a full site crawl, it was triggering 3 crawls within seconds of each other (e.g., 02:57:54, 02:57:55, 02:58:06).

## Root Cause
The `lastChecked` timestamp was only being updated when the crawl **completed**, not when it started. Since crawls are async and take time:
1. First crawl starts at 02:57:54
2. Cron runs at 02:57:55, sees website still needs checking (lastChecked not updated), starts another crawl
3. Cron runs again, same issue, starts a third crawl

## Solution
Update `lastChecked` immediately when a crawl/check starts:

1. **In `performCrawl`**: Added call to `updateLastChecked` right after starting the crawl
2. **In `triggerScrape`**: Added call to `updateLastChecked` when manually triggering a check
3. **Created `updateLastChecked` mutation**: Simple function that updates the timestamp

This prevents the cron job from seeing the website as "needs checking" while a crawl is already in progress.

## Note on Cron Interval
While the cron runs every 15 seconds (for testing), this shouldn't cause duplicate crawls because the `getWebsitesToCheck` function properly filters based on the website's check interval (e.g., 1 hour). The issue was specifically that `lastChecked` wasn't being updated until crawl completion.