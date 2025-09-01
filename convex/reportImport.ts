import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Import compliance reports from provided data
export const importComplianceReports = action({
  args: {
    reportData: v.array(v.object({
      filename: v.string(),
      content: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Note: Removed auth requirement for initial setup
    
    console.log(`🚀 Starting import of ${args.reportData.length} compliance reports...`);
    
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process each report
    for (const report of args.reportData) {
      try {
        // Parse filename to get jurisdiction and topic
        const { jurisdiction, topicKey } = parseReportFilename(report.filename);
        
        // Create report ID and rule ID
        const reportId = report.filename.replace('.txt', '');
        const ruleId = `${jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${topicKey}`;
        
        // Extract sections from content using template structure
        const extractedSections = extractTemplateSections(report.content);
        
        // Calculate content hash
        const contentHash = await calculateContentHash(report.content);
        
        // Create the report
        await ctx.runMutation(internal.reportImport.createReport, {
          reportId,
          ruleId,
          reportContent: report.content,
          contentHash,
          contentLength: report.content.length,
          extractedSections,
          processingMethod: "template_extraction",
        });
        
        imported++;
        
        if (imported % 50 === 0) {
          console.log(`✅ Imported ${imported} reports so far...`);
        }
        
      } catch (error) {
        console.error(`Failed to import report ${report.filename}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${report.filename}: ${errorMessage}`);
        failed++;
      }
    }
    
    console.log(`🎉 Report import completed: ${imported} imported, ${failed} failed`);
    
    return {
      success: true,
      imported,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors only
      total: args.reportData.length
    };
  },
});

// Create a single compliance report
export const createReport = internalMutation({
  args: {
    reportId: v.string(),
    ruleId: v.string(),
    reportContent: v.string(),
    contentHash: v.string(),
    contentLength: v.number(),
    extractedSections: v.object({
      overview: v.optional(v.string()),
      coveredEmployers: v.optional(v.string()),
      coveredEmployees: v.optional(v.string()),
      employerResponsibilities: v.optional(v.string()),
      trainingRequirements: v.optional(v.string()),
      postingRequirements: v.optional(v.string()),
      penalties: v.optional(v.string()),
      sources: v.optional(v.string()),
    }),
    processingMethod: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if report already exists
    const existing = await ctx.db
      .query("complianceReports")
      .withIndex("by_report_id", (q) => q.eq("reportId", args.reportId))
      .first();
    
    if (existing) {
      // Update existing report
      await ctx.db.patch(existing._id, {
        reportContent: args.reportContent,
        contentHash: args.contentHash,
        contentLength: args.contentLength,
        extractedSections: args.extractedSections,
        processingMethod: args.processingMethod,
      });
      return existing._id;
    } else {
      // Create new report
      return await ctx.db.insert("complianceReports", {
        reportId: args.reportId,
        ruleId: args.ruleId,
        reportContent: args.reportContent,
        contentHash: args.contentHash,
        contentLength: args.contentLength,
        extractedSections: args.extractedSections,
        processingMethod: args.processingMethod,
        generatedAt: Date.now(),
      });
    }
  },
});

// Batch import reports from file system (server-side)
export const batchImportReportsFromFiles = internalAction({
  args: {
    reportFiles: v.array(v.object({
      filename: v.string(),
      content: v.string(),
    })),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;
    
    console.log(`🚀 Starting batch import of ${args.reportFiles.length} reports...`);
    
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process in batches
    for (let i = 0; i < args.reportFiles.length; i += batchSize) {
      const batch = args.reportFiles.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(args.reportFiles.length / batchSize)}`);
      
      for (const reportFile of batch) {
        try {
          // Parse filename to get jurisdiction and topic
          const { jurisdiction, topicKey } = parseReportFilename(reportFile.filename);
          
          // Create report ID and rule ID
          const reportId = reportFile.filename.replace('.txt', '');
          const ruleId = `${jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${topicKey}`;
          
          // Extract sections from content
          const extractedSections = extractTemplateSections(reportFile.content);
          
          // Calculate content hash
          const contentHash = await calculateContentHash(reportFile.content);
          
          // Create the report
          await ctx.runMutation(internal.reportImport.createReport, {
            reportId,
            ruleId,
            reportContent: reportFile.content,
            contentHash,
            contentLength: reportFile.content.length,
            extractedSections,
            processingMethod: "batch_import",
          });
          
          imported++;
          
        } catch (error) {
          console.error(`Failed to import report ${reportFile.filename}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${reportFile.filename}: ${errorMessage}`);
          failed++;
        }
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Batch import completed: ${imported} imported, ${failed} failed`);
    
    return {
      success: true,
      imported,
      failed,
      errors,
      total: args.reportFiles.length
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

function extractTemplateSections(content: string) {
  const sections = {
    overview: extractSection(content, "Overview"),
    coveredEmployers: extractSection(content, "Covered Employers"),
    coveredEmployees: extractSection(content, "Covered Employees"),
    employerResponsibilities: extractSection(content, "What Should Employers Do?"),
    trainingRequirements: extractSection(content, "Training Requirements"),
    postingRequirements: extractSection(content, "Posting Requirements"),
    penalties: extractSection(content, "Penalties for Non-Compliance"),
    sources: extractSection(content, "Sources"),
  };
  
  return sections;
}

function extractSection(content: string, sectionName: string): string | undefined {
  const lines = content.split('\n');
  let inSection = false;
  let sectionContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line is the section header we're looking for
    if (line === sectionName) {
      inSection = true;
      continue;
    }
    
    // If we're in a section, check if we've hit the next section
    if (inSection) {
      // Check if this line looks like a section header (title case, no lowercase)
      const isNextSection = line.length > 0 && 
        line[0] === line[0].toUpperCase() && 
        !line.includes(' ') === false && // Has spaces
        line !== line.toLowerCase() && // Not all lowercase
        !line.startsWith('http') && // Not a URL
        !line.startsWith('•') && // Not a bullet point
        !line.startsWith('-') && // Not a dash
        line !== sectionName; // Not the same section name
      
      // Also check for common section headers
      const commonSections = [
        "Overview", "Covered Employers", "Covered Employees", 
        "What Should Employers Do?", "Training Requirements", 
        "Training Deadlines", "Qualified Trainers", "Special Requirements",
        "Coverage Election", "Reciprocity/Extraterritorial Coverage",
        "Employer Responsibilities & Deadlines", "Employer Notification Requirements",
        "Posting Requirements", "Recordkeeping Requirements", 
        "Penalties for Non-Compliance", "Sources"
      ];
      
      if (commonSections.includes(line) && line !== sectionName) {
        break; // Found next section
      }
      
      // Add line to section content
      sectionContent += line + '\n';
    }
  }
  
  const trimmed = sectionContent.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
