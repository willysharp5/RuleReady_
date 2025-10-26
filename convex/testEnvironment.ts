import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import FirecrawlApp from "@mendable/firecrawl-js";

// Test environment variables are properly set
export const testEnvironmentKeys = action({
  args: {},
  handler: async () => {
    const results = {
      gemini: { available: false, error: null as string | null },
      firecrawl: { available: false, error: null as string | null },
      openai: { available: false, error: null as string | null },
    };
    
    // Test Gemini API Key
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        results.gemini.error = "GEMINI_API_KEY environment variable not set";
      } else {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent("Test");
        results.gemini.available = true;
      }
    } catch (error) {
      results.gemini.error = error instanceof Error ? error.message : "Unknown error";
    }
    
    // Test Firecrawl API Key
    try {
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlKey) {
        results.firecrawl.error = "FIRECRAWL_API_KEY environment variable not set";
      } else {
        const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
        // Simple test - just check if the client initializes
        results.firecrawl.available = true;
      }
    } catch (error) {
      results.firecrawl.error = error instanceof Error ? error.message : "Unknown error";
    }
    
    // Test OpenAI API Key (optional)
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${openaiKey}` }
        });
        results.openai.available = response.ok;
        if (!response.ok) {
          results.openai.error = `OpenAI API error: ${response.statusText}`;
        }
      } else {
        results.openai.error = "OPENAI_API_KEY not set (optional)";
      }
    } catch (error) {
      results.openai.error = error instanceof Error ? error.message : "Unknown error";
    }
    
    return {
      success: true,
      results,
      timestamp: new Date().toISOString(),
    };
  },
});
