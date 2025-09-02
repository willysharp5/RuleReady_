import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini 2.5 Flash Lite
export const initGeminiFlashLite = async (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY || "AIzaSyAhrzBihKERZknz5Y3O6hpvlge1o2EZU4U";
  const genAI = new GoogleGenerativeAI(key);
  
  return genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp", // Using latest available model
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent compliance analysis
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });
};

// Process FireCrawl data with compliance template
export const processComplianceDataWithGemini = action({
  args: {
    rawContent: v.string(),
    sourceUrl: v.string(),
    jurisdiction: v.string(),
    topicKey: v.string(),
    useTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(`🤖 Processing compliance data with Gemini for ${args.jurisdiction} - ${args.topicKey}`);
    
    try {
      const model = await initGeminiFlashLite();
      
      // Create compliance analysis prompt using your template
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

Return the response as a valid JSON object with the structure:
{
  "overview": "...",
  "coveredEmployers": "...",
  "coveredEmployees": "...",
  "employerResponsibilities": "...",
  "trainingRequirements": "...",
  "trainingDeadlines": "...",
  "qualifiedTrainers": "...",
  "specialRequirements": "...",
  "coverageElection": "...",
  "reciprocity": "...",
  "employerDeadlines": "...",
  "notificationRequirements": "...",
  "postingRequirements": "...",
  "recordkeepingRequirements": "...",
  "penalties": "...",
  "sources": "..."
}
`;

      const startTime = Date.now();
      const result = await model.generateContent(prompt);
      const processingTime = Date.now() - startTime;
      
      const response = result.response.text();
      
      // Parse the JSON response
      let structuredData;
      try {
        // Clean the response and extract JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError);
        // Fallback: create structured data from text response
        structuredData = {
          overview: response.substring(0, 500),
          coveredEmployers: "Not specified in available documentation",
          coveredEmployees: "Not specified in available documentation",
          employerResponsibilities: "Not specified in available documentation",
          trainingRequirements: "Not specified in available documentation",
          trainingDeadlines: "Not specified in available documentation",
          qualifiedTrainers: "Not specified in available documentation",
          specialRequirements: "Not specified in available documentation",
          coverageElection: "Not specified in available documentation",
          reciprocity: "Not specified in available documentation",
          employerDeadlines: "Not specified in available documentation",
          notificationRequirements: "Not specified in available documentation",
          postingRequirements: "Not specified in available documentation",
          recordkeepingRequirements: "Not specified in available documentation",
          penalties: "Not specified in available documentation",
          sources: args.sourceUrl,
        };
      }
      
      // Store in database
      const reportId = `${args.jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${args.topicKey}_${Date.now()}`;
      
      await ctx.runMutation(internal.geminiFlashLite.storeAIProcessedReport, {
        reportId,
        ruleId: `${args.jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${args.topicKey}`,
        rawContent: args.rawContent,
        structuredData,
        sourceUrl: args.sourceUrl,
        processedBy: "gemini-2.0-flash-exp",
        processedAt: Date.now(),
        aiMetadata: {
          tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
          processingTime,
          confidence: 0.85,
          sectionsExtracted: Object.keys(structuredData).filter(key => 
            structuredData[key] && structuredData[key] !== "Not specified in available documentation"
          ).length,
        },
      });
      
      console.log(`✅ Processed ${args.jurisdiction} - ${args.topicKey} in ${processingTime}ms`);
      
      return {
        success: true,
        reportId,
        structuredData,
        sectionsExtracted: Object.keys(structuredData).length,
        processingTime,
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
      };
      
    } catch (error) {
      console.error(`❌ Failed to process ${args.jurisdiction} - ${args.topicKey}:`, error);
      throw new Error(`Gemini processing failed: ${error.message}`);
    }
  },
});

// Store AI-processed report
export const storeAIProcessedReport = internalMutation({
  args: {
    reportId: v.string(),
    ruleId: v.string(),
    rawContent: v.string(),
    structuredData: v.any(),
    sourceUrl: v.string(),
    processedBy: v.string(),
    processedAt: v.number(),
    aiMetadata: v.object({
      tokensUsed: v.number(),
      processingTime: v.number(),
      confidence: v.number(),
      sectionsExtracted: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("complianceAIReports", {
      reportId: args.reportId,
      ruleId: args.ruleId,
      rawContent: args.rawContent,
      structuredData: args.structuredData,
      sourceUrl: args.sourceUrl,
      processedBy: args.processedBy,
      processedAt: args.processedAt,
      aiMetadata: args.aiMetadata,
    });
  },
});

// Get AI-processed reports for chat context
export const getAIReportsForChat = action({
  args: {
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    let reports = await ctx.db.query("complianceAIReports").collect();
    
    // Filter by jurisdiction if specified
    if (args.jurisdiction) {
      reports = reports.filter(report => 
        report.ruleId.includes(args.jurisdiction.toLowerCase().replace(/\s+/g, '_'))
      );
    }
    
    // Filter by topic if specified
    if (args.topicKey) {
      reports = reports.filter(report => 
        report.ruleId.includes(args.topicKey)
      );
    }
    
    // Sort by processing date (newest first) and limit
    const sortedReports = reports
      .sort((a, b) => b.processedAt - a.processedAt)
      .slice(0, limit);
    
    return sortedReports.map(report => ({
      reportId: report.reportId,
      ruleId: report.ruleId,
      structuredData: report.structuredData,
      sourceUrl: report.sourceUrl,
      processedBy: report.processedBy,
      sectionsExtracted: report.aiMetadata?.sectionsExtracted || 0,
    }));
  },
});

// Test Gemini integration
export const testGeminiIntegration = action({
  args: {
    testContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const testContent = args.testContent || "California minimum wage is $16.00 per hour as of January 1, 2024. Employers with 26 or more employees must pay this rate.";
    
    try {
      const result = await ctx.runAction(api.geminiFlashLite.processComplianceDataWithGemini, {
        rawContent: testContent,
        sourceUrl: "https://test.example.com",
        jurisdiction: "California",
        topicKey: "minimum_wage",
        useTemplate: true,
      });
      
      return {
        success: true,
        testResult: result,
        message: "Gemini integration working correctly",
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Gemini integration test failed",
      };
    }
  },
});

