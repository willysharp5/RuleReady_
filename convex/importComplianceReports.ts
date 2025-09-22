import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";

// Import and process existing compliance reports with Gemini
export const importAndProcessReports = action({
  args: {
    reportData: v.array(v.object({
      filename: v.string(),
      content: v.string(),
    })),
    useGeminiProcessing: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const batchSize = args.batchSize || 10; // Smaller batches for AI processing
    const useGemini = args.useGeminiProcessing || false;
    
    console.log(`🚀 Processing ${args.reportData.length} compliance reports${useGemini ? ' with Gemini AI' : ''}`);
    
    let processed = 0;
    let failed = 0;
    const results = [];
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < args.reportData.length; i += batchSize) {
      const batch = args.reportData.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(args.reportData.length / batchSize)}`);
      
      for (const reportFile of batch) {
        try {
          // Parse filename to get jurisdiction and topic
          const { jurisdiction, topicKey } = parseReportFilename(reportFile.filename);
          
          if (useGemini) {
            // Process with Gemini AI
            const result: any = await ctx.runAction(internal.geminiFlashLite.processComplianceDataWithGemini, {
              rawContent: reportFile.content,
              sourceUrl: getSourceUrlForRule(jurisdiction, topicKey),
              jurisdiction,
              topicKey,
              useTemplate: true,
            });
            
            results.push({
              filename: reportFile.filename,
              jurisdiction,
              topicKey,
              success: true,
              sectionsExtracted: result.sectionsExtracted,
              processingTime: result.processingTime,
            });
            
            console.log(`✅ AI processed: ${reportFile.filename} (${result.sectionsExtracted} sections)`);
          } else {
            // Standard import without AI processing
            const reportId = `${jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${topicKey}_${Date.now()}`;
            
            await ctx.runMutation(internal.reportImport.createReport, {
              reportId,
              ruleId: `${jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${topicKey}`,
              reportContent: reportFile.content,
              contentHash: await calculateContentHash(reportFile.content),
              contentLength: reportFile.content.length,
              extractedSections: extractBasicSections(reportFile.content),
              processingMethod: "standard_import",
            });
            
            results.push({
              filename: reportFile.filename,
              jurisdiction,
              topicKey,
              success: true,
              sectionsExtracted: 0,
              processingTime: 0,
            });
            
            console.log(`✅ Standard import: ${reportFile.filename}`);
          }
          
          processed++;
          
        } catch (error) {
          console.error(`❌ Failed to process ${reportFile.filename}:`, error);
          results.push({
            filename: reportFile.filename,
            success: false,
            error: (error as Error).message,
          });
          failed++;
        }
      }
      
      // Rate limiting pause between batches (important for AI processing)
      if (useGemini && i + batchSize < args.reportData.length) {
        console.log("⏳ Pausing 2 seconds between batches for rate limiting...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`🎉 Import completed: ${processed} processed, ${failed} failed`);
    
    return {
      success: true,
      processed,
      failed,
      total: args.reportData.length,
      geminiProcessing: useGemini,
      results: results.slice(0, 20), // Return first 20 results
    };
  },
});

// Get compliance context for chat (using existing reports)
export const getComplianceContextForChat = action({
  args: {
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 3;
    
    // Get relevant AI-processed reports
    let aiReports: any = await ctx.runQuery(internal.importComplianceReports.getAllAIReports);
    
    // Filter by criteria
    if (args.jurisdiction) {
      aiReports = aiReports.filter((report: any) => 
        report.ruleId.includes(args.jurisdiction!.toLowerCase().replace(/\s+/g, '_'))
      );
    }
    
    if (args.topicKey) {
      aiReports = aiReports.filter((report: any) => 
        report.ruleId.includes(args.topicKey)
      );
    }
    
    // Get most relevant reports
    const relevantReports = aiReports
      .sort((a: any, b: any) => b.processedAt - a.processedAt)
      .slice(0, limit);
    
    // Create context string
    let context = "RELEVANT COMPLIANCE DATA:\n\n";
    
    relevantReports.forEach((report: any, i: any) => {
      context += `${i + 1}. ${report.ruleId.replace(/_/g, ' ').toUpperCase()}\n`;
      if (report.structuredData.overview) {
        context += `Overview: ${report.structuredData.overview}\n`;
      }
      if (report.structuredData.employerResponsibilities) {
        context += `Employer Responsibilities: ${report.structuredData.employerResponsibilities}\n`;
      }
      if (report.structuredData.penalties) {
        context += `Penalties: ${report.structuredData.penalties}\n`;
      }
      context += `Source: ${report.sourceUrl}\n\n`;
    });
    
    return {
      context,
      reportsUsed: relevantReports.map((r: any) => r.reportId),
      sectionsAvailable: relevantReports.reduce((sum: any, r: any) => sum + (r.aiMetadata?.sectionsExtracted || 0), 0),
    };
  },
});

// Utility functions
function parseReportFilename(filename: string): { jurisdiction: string; topicKey: string } {
  // Parse filename like "Alabama_background_checks.txt" or "District_of_Columbia_minimum_wage.txt"
  const basename = filename.replace('.txt', '');
  
  // Handle special cases
  if (basename.startsWith('District_of_Columbia_')) {
    return {
      jurisdiction: 'District of Columbia',
      topicKey: basename.replace('District_of_Columbia_', '')
    };
  }
  
  // Standard format: Jurisdiction_topic_key
  const parts = basename.split('_');
  const jurisdiction = parts[0];
  const topicKey = parts.slice(1).join('_');
  
  return { jurisdiction, topicKey };
}

function getSourceUrlForRule(jurisdiction: string, topicKey: string): string {
  // This would map to actual source URLs from your compliance rules
  // For now, return a placeholder
  return `https://example.gov/${jurisdiction.toLowerCase()}/${topicKey}`;
}

function extractBasicSections(content: string) {
  // Basic section extraction for non-AI processing
  return {
    overview: extractSection(content, "Overview"),
    coveredEmployers: extractSection(content, "Covered Employers"),
    employerResponsibilities: extractSection(content, "What Should Employers Do?"),
    penalties: extractSection(content, "Penalties for Non-Compliance"),
    sources: extractSection(content, "Sources"),
  };
}

function extractSection(content: string, sectionName: string): string | undefined {
  const lines = content.split('\n');
  let inSection = false;
  let sectionContent = '';
  
  for (const line of lines) {
    if (line.trim() === sectionName) {
      inSection = true;
      continue;
    }
    
    if (inSection && line.match(/^[A-Z][^a-z]*$/) && line.trim() !== sectionName) {
      break;
    }
    
    if (inSection) {
      sectionContent += line + '\n';
    }
  }
  
  return sectionContent.trim() || undefined;
}

async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Internal query to get all AI reports
export const getAllAIReports = internalQuery({
  handler: async (ctx): Promise<any> => {
    return await ctx.db.query("complianceAIReports").collect();
  },
});

