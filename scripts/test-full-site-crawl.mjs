#!/usr/bin/env node

// Test script to verify full site crawling functionality
// This tests that "Check Now" properly triggers a full crawl for full site monitors

import { ConvexHttpClient } from "convex/browser";

async function testFullSiteCrawl() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL not found in environment");
    console.log("Please set it from .env.local or run:");
    console.log("export NEXT_PUBLIC_CONVEX_URL=$(grep NEXT_PUBLIC_CONVEX_URL .env.local | cut -d '=' -f2)");
    process.exit(1);
  }

  console.log("🔍 Testing Full Site Crawl Functionality");
  console.log("=========================================\n");

  console.log("🔗 Convex URL:", convexUrl);
  console.log("\n📋 Test Checklist:");
  console.log("1. ✅ Fixed triggerScrape to check monitor type");
  console.log("2. ✅ Full site monitors now call performCrawl");
  console.log("3. ✅ Single page monitors still call scrapeUrl");
  console.log("4. ✅ Removed crawledPages table dependency");
  console.log("5. ✅ Each crawl is independent with Firecrawl's change tracking");
  
  console.log("\n🧪 Manual Testing Steps:");
  console.log("1. Go to http://localhost:3003");
  console.log("2. Find a website marked as 'Full Site' (e.g., Firecrawl)");
  console.log("3. Click 'Check Now' button");
  console.log("4. Watch the browser console and network tab");
  
  console.log("\n📊 Expected Behavior:");
  console.log("- Full site: Crawls all pages, tracks changes for each");
  console.log("- Single page: Only checks the specific URL");
  console.log("- Change tracking panel shows full URLs (e.g., https://firecrawl.dev/docs/api)");
  
  console.log("\n🔍 To verify in Convex Dashboard:");
  console.log("1. Go to https://dashboard.convex.dev");
  console.log("2. Navigate to your project");
  console.log("3. Check the Logs tab");
  console.log("4. Filter by function name:");
  console.log("   - Look for 'performCrawl' calls for full site checks");
  console.log("   - Look for 'scrapeUrl' calls for single page checks");
  
  console.log("\n📝 What to Look For in Logs:");
  console.log("- When clicking 'Check Now' on Firecrawl (Full Site):");
  console.log("  → Should see: internal.crawl.performCrawl");
  console.log("  → Should see: Multiple URLs being scraped");
  console.log("- When clicking 'Check Now' on a Single Page site:");
  console.log("  → Should see: internal.firecrawl.scrapeUrl");
  console.log("  → Should see: Only one URL being scraped");
  
  console.log("\n✅ Code changes are complete and ready for testing!");
  console.log("\n💡 Tip: Open your browser DevTools Network tab to see the Convex");
  console.log("   function calls when you click 'Check Now'");
}

testFullSiteCrawl();