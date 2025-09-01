import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Import compliance rules from CSV data
export const importComplianceRulesFromCSV = internalAction({
  args: {
    csvData: v.string(),
    userId: v.id("users"),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;
    
    console.log("🚀 Starting compliance rules import from CSV...");
    
    // Parse CSV data
    const lines = args.csvData.trim().split('\n');
    const headers = lines[0].split(',');
    const dataLines = lines.slice(1);
    
    console.log(`📊 Found ${dataLines.length} compliance rules to import`);
    
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process in batches
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dataLines.length / batchSize)}`);
      
      for (const line of batch) {
        try {
          const values = parseCSVLine(line);
          const rule = {
            jurisdiction: values[0] || "",
            topicKey: values[1] || "",
            topicLabel: values[2] || "",
            sourceUrl: values[3] || "",
            notes: values[4] || "",
          };
          
          // Validate required fields
          if (!rule.jurisdiction || !rule.topicKey || !rule.sourceUrl) {
            throw new Error(`Missing required fields: ${JSON.stringify(rule)}`);
          }
          
          // Create rule ID
          const ruleId = `${rule.jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${rule.topicKey}`;
          
          // Determine priority based on topic
          const priority = determinePriority(rule.topicKey);
          
          // Set crawl settings based on jurisdiction and topic
          const crawlSettings = getCrawlSettings(rule.jurisdiction, rule.topicKey);
          
          // Import the rule
          await ctx.runMutation(internal.complianceImport.createComplianceRule, {
            ruleId,
            jurisdiction: rule.jurisdiction,
            topicKey: rule.topicKey,
            topicLabel: rule.topicLabel,
            sourceUrl: rule.sourceUrl,
            notes: rule.notes,
            priority,
            crawlSettings,
          });
          
          imported++;
          
        } catch (error) {
          console.error(`Failed to import rule from line: ${line}`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Line ${i + imported + failed + 2}: ${errorMessage}`);
          failed++;
        }
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Import completed: ${imported} imported, ${failed} failed`);
    
    if (errors.length > 0) {
      console.log("❌ Errors encountered:");
      errors.forEach(error => console.log(`   ${error}`));
    }
    
    return {
      success: true,
      imported,
      failed,
      errors,
      total: dataLines.length
    };
  },
});

// Create a single compliance rule
export const createComplianceRule = internalMutation({
  args: {
    ruleId: v.string(),
    jurisdiction: v.string(),
    topicKey: v.string(),
    topicLabel: v.string(),
    sourceUrl: v.string(),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    crawlSettings: v.object({
      checkInterval: v.number(),
      depth: v.number(),
      selectors: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    // Check if rule already exists
    const existing = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();
    
    if (existing) {
      // Update existing rule
      await ctx.db.patch(existing._id, {
        jurisdiction: args.jurisdiction,
        topicKey: args.topicKey,
        topicLabel: args.topicLabel,
        sourceUrl: args.sourceUrl,
        notes: args.notes,
        priority: args.priority,
        crawlSettings: args.crawlSettings,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new rule
      return await ctx.db.insert("complianceRules", {
        ruleId: args.ruleId,
        jurisdiction: args.jurisdiction,
        topicKey: args.topicKey,
        topicLabel: args.topicLabel,
        sourceUrl: args.sourceUrl,
        notes: args.notes,
        priority: args.priority,
        monitoringStatus: "active",
        crawlSettings: args.crawlSettings,
        metadata: {
          coveredEmployers: undefined,
          effectiveDate: undefined,
          lastAmended: undefined,
          penalties: undefined,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Import compliance reports from file system
export const importComplianceReports = internalAction({
  args: {
    userId: v.id("users"),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;
    
    console.log("🚀 Starting compliance reports import...");
    
    // Get list of report files (this would need to be adapted based on your file structure)
    const reportFiles = await getReportFileList();
    
    console.log(`📊 Found ${reportFiles.length} compliance reports to import`);
    
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process in batches
    for (let i = 0; i < reportFiles.length; i += batchSize) {
      const batch = reportFiles.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(reportFiles.length / batchSize)}`);
      
      for (const reportFile of batch) {
        try {
          // Read report content (this would need to be adapted)
          const content = await readReportFile(reportFile);
          
          // Parse report ID and rule ID from filename
          const { reportId, ruleId } = parseReportFilename(reportFile);
          
          // Extract sections from content using template structure
          const extractedSections = extractTemplateSections(content);
          
          // Calculate content hash
          const contentHash = await calculateContentHash(content);
          
          // Import the report
          await ctx.runMutation(internal.complianceImport.createComplianceReport, {
            reportId,
            ruleId,
            reportContent: content,
            contentHash,
            contentLength: content.length,
            extractedSections,
            processingMethod: "template_extraction",
          });
          
          imported++;
          
        } catch (error) {
          console.error(`Failed to import report ${reportFile}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${reportFile}: ${errorMessage}`);
          failed++;
        }
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Reports import completed: ${imported} imported, ${failed} failed`);
    
    return {
      success: true,
      imported,
      failed,
      errors,
      total: reportFiles.length
    };
  },
});

// Create a single compliance report
export const createComplianceReport = internalMutation({
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

// Get import statistics (public query)
export const getImportStats = query({
  handler: async (ctx) => {
    const [rulesCount, reportsCount, embeddingsCount] = await Promise.all([
      ctx.db.query("complianceRules").collect().then(rules => rules.length),
      ctx.db.query("complianceReports").collect().then(reports => reports.length),
      ctx.db.query("complianceEmbeddings").collect().then(embeddings => embeddings.length),
    ]);
    
    return {
      rules: rulesCount,
      reports: reportsCount,
      embeddings: embeddingsCount,
      lastUpdated: Date.now(),
    };
  },
});

// Utility functions
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function determinePriority(topicKey: string): "critical" | "high" | "medium" | "low" {
  const criticalTopics = ["minimum_wage", "overtime", "harassment_training"];
  const highTopics = ["paid_sick_leave", "family_medical_leave", "workers_comp"];
  const mediumTopics = ["posting_requirements", "jury_duty_leave", "voting_leave"];
  
  if (criticalTopics.includes(topicKey)) return "critical";
  if (highTopics.includes(topicKey)) return "high";
  if (mediumTopics.includes(topicKey)) return "medium";
  return "low";
}

function getCrawlSettings(jurisdiction: string, topicKey: string) {
  // Federal rules change more frequently and need closer monitoring
  if (jurisdiction === "Federal") {
    return {
      checkInterval: 1440, // Daily for federal rules
      depth: 3,
      selectors: [".content", ".law-text", ".regulation", "main"],
    };
  }
  
  // State rules vary by topic priority
  const criticalTopics = ["minimum_wage", "overtime"];
  if (criticalTopics.includes(topicKey)) {
    return {
      checkInterval: 2880, // Every 2 days for critical state topics
      depth: 2,
      selectors: [".content", ".main-content", ".law-section"],
    };
  }
  
  // Default for other state rules
  return {
    checkInterval: 10080, // Weekly for other topics
    depth: 2,
    selectors: [".content", ".main"],
  };
}

function extractTemplateSections(content: string) {
  // Extract sections based on your compliance template structure
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
  
  for (const line of lines) {
    if (line.trim() === sectionName) {
      inSection = true;
      continue;
    }
    
    // Stop at next section header or end of content
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

// Placeholder functions that would need to be implemented based on your file system
async function getReportFileList(): Promise<string[]> {
  // This would need to be implemented to read your compliance_reports directory
  // For now, return empty array - we'll implement this next
  return [];
}

async function readReportFile(filename: string): Promise<string> {
  // This would read the actual report file content
  // For now, return empty string - we'll implement this next
  return "";
}

function parseReportFilename(filename: string): { reportId: string; ruleId: string } {
  // Parse filename like "Alabama_background_checks.txt"
  const basename = filename.replace('.txt', '');
  const parts = basename.split('_');
  const jurisdiction = parts[0];
  const topicKey = parts.slice(1).join('_');
  
  return {
    reportId: basename,
    ruleId: `${jurisdiction.toLowerCase()}_${topicKey}`
  };
}
