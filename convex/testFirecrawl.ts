import { action } from "./_generated/server";
import FirecrawlApp from "@mendable/firecrawl-js";

// Test different Firecrawl configurations to see what works
export const testFirecrawlConfigs = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { error: "FIRECRAWL_API_KEY not set" };
    }

    const firecrawl = new FirecrawlApp({ apiKey });
    const testUrl = "https://www.eeoc.gov/sexual-harassment";
    
    const results = [];
    
    // Test 1: Basic configuration
    try {
      console.log("🧪 Testing basic configuration...");
      const result1 = await firecrawl.scrapeUrl(testUrl, {
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 2000,
      });
      results.push({
        config: "basic",
        success: result1.success,
        contentLength: (result1.success && 'markdown' in result1) ? (result1.markdown?.length || 0) : 0,
      });
    } catch (error) {
      results.push({
        config: "basic",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    
    // Test 2: With PDF parsing using v1 parsePDF
    try {
      console.log("🧪 Testing with parsePDF (v1 API)...");
      const result2 = await firecrawl.scrapeUrl(testUrl, {
        formats: ["markdown", "links", "changeTracking"],
        onlyMainContent: false,
        waitFor: 2000,
        maxAge: 172800000,
        removeBase64Images: true,
      });
      results.push({
        config: "parsePDF_v1",
        success: result2.success,
        contentLength: (result2.success && 'markdown' in result2) ? (result2.markdown?.length || 0) : 0,
      });
    } catch (error) {
      results.push({
        config: "parsePDF_v1",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    
    // Test 3: With screenshot format
    try {
      console.log("🧪 Testing with screenshot format...");
      const result3 = await firecrawl.scrapeUrl(testUrl, {
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 2000,
      });
      results.push({
        config: "screenshot_format",
        success: result3.success,
        contentLength: (result3.success && 'markdown' in result3) ? (result3.markdown?.length || 0) : 0,
      });
    } catch (error) {
      results.push({
        config: "screenshot_format",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return {
      testUrl,
      results,
      timestamp: new Date().toISOString(),
    };
  },
});
