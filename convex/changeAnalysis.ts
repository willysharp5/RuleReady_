import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Analyze website changes using Google Gemini (compliance-focused)
export const analyzeComplianceChange = internalAction({
  args: {
    scrapeResultId: v.id("scrapeResults"),
    websiteName: v.string(),
    websiteUrl: v.string(),
    diff: v.object({
      text: v.string(),
      json: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🔍 Analyzing change for compliance website: ${args.websiteName}`);
      
      // Get Gemini API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.log("GEMINI_API_KEY not set - skipping AI analysis");
        return;
      }

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.3, // Lower temperature for more focused analysis
          maxOutputTokens: 1000,
        },
      });

      const systemPrompt = `You are an AI assistant specialized in analyzing website changes for compliance monitoring.

Focus on detecting:
- Legal requirement changes
- Deadline modifications  
- Rate or threshold updates
- Policy changes
- New regulations or amendments
- Enforcement updates
- Training requirements changes
- Posting requirement updates

Ignore:
- Minor formatting changes
- Navigation updates
- Cosmetic modifications
- Temporary notices
- Marketing content changes
- Cookie banners
- Social media updates

Analyze the provided diff and return a JSON response with:
{
  "score": 0-100 (how meaningful the change is for compliance),
  "isMeaningful": true/false,
  "reasoning": "Brief explanation focusing on compliance impact"
}`;

      const prompt = `${systemPrompt}

Website: ${args.websiteName}
URL: ${args.websiteUrl}

Change diff:
${args.diff.text}

Please analyze this change for compliance significance:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Try to parse JSON response
      let aiResponse;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
        aiResponse = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", responseText);
        // Fallback: create a basic response
        aiResponse = {
          score: 50,
          isMeaningful: true,
          reasoning: "AI response parsing failed, marking as potentially meaningful for manual review"
        };
      }

      // Validate response structure
      if (typeof aiResponse.score !== "number" || 
          typeof aiResponse.isMeaningful !== "boolean" ||
          typeof aiResponse.reasoning !== "string") {
        console.error("Invalid AI response format:", aiResponse);
        return;
      }

      // Apply threshold (default 70% for compliance)
      const threshold = 70;
      const isMeaningful = aiResponse.score >= threshold;

      // Update scrape result with AI analysis
      await ctx.runMutation(api.websites.updateScrapeResultAIAnalysis, {
        scrapeResultId: args.scrapeResultId,
        analysis: {
          meaningfulChangeScore: aiResponse.score,
          isMeaningfulChange: isMeaningful,
          reasoning: aiResponse.reasoning,
          analyzedAt: Date.now(),
          model: "gemini-2.0-flash-exp",
        },
      });

      console.log(`✅ AI analysis complete for ${args.websiteName}: Score ${aiResponse.score}, Meaningful: ${isMeaningful}`);

      return {
        success: true,
        score: aiResponse.score,
        isMeaningful,
        reasoning: aiResponse.reasoning,
      };

    } catch (error) {
      console.error("Error in AI change analysis:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
