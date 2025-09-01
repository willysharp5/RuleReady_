import { v } from "convex/values";
import { action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./helpers";

// Public action to import CSV data
export const importCSVData = action({
  args: {
    csvContent: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user for website creation
    const user = await getCurrentUser(ctx);
    const userId = user?._id;
    
    console.log("🚀 Starting CSV import process...");
    
    // Parse CSV content
    const lines = args.csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    const dataLines = lines.slice(1);
    
    console.log(`📊 Parsing ${dataLines.length} compliance rules`);
    
    // Expected headers: jurisdiction,topic_key,topic_label,source_url,notes
    if (!headers.includes('jurisdiction') || !headers.includes('topic_key') || !headers.includes('source_url')) {
      throw new Error("CSV must contain headers: jurisdiction, topic_key, topic_label, source_url, notes");
    }
    
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process each line
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        const values = parseCSVLine(line);
        
        if (values.length < 4) {
          throw new Error("Insufficient data in line");
        }
        
        const rule = {
          jurisdiction: values[0]?.trim() || "",
          topicKey: values[1]?.trim() || "",
          topicLabel: values[2]?.trim() || "",
          sourceUrl: values[3]?.trim() || "",
          notes: values[4]?.trim() || "",
        };
        
        // Validate required fields
        if (!rule.jurisdiction || !rule.topicKey || !rule.sourceUrl) {
          throw new Error(`Missing required fields in line ${i + 2}`);
        }
        
        // Create composite rule ID
        const ruleId = `${rule.jurisdiction.toLowerCase().replace(/\s+/g, '_')}_${rule.topicKey}`;
        
        // Determine priority based on topic
        const priority = determinePriority(rule.topicKey);
        
        // Set crawl settings
        const crawlSettings = getCrawlSettings(rule.jurisdiction, rule.topicKey);
        
        // Create the compliance rule
        await ctx.runMutation(internal.csvImport.createRule, {
          ruleId,
          jurisdiction: rule.jurisdiction,
          topicKey: rule.topicKey,
          topicLabel: rule.topicLabel,
          sourceUrl: rule.sourceUrl,
          notes: rule.notes,
          priority,
          crawlSettings,
        });

        // Automatically create website entry for monitoring (if user is authenticated)
        if (userId) {
          await ctx.runMutation(internal.csvImport.createWebsiteForRule, {
            ruleId,
            jurisdiction: rule.jurisdiction,
            topicKey: rule.topicKey,
            topicLabel: rule.topicLabel,
            sourceUrl: rule.sourceUrl,
            priority,
            crawlSettings,
            userId,
          });
        }
        
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} rules so far...`);
        }
        
      } catch (error) {
        console.error(`Failed to import line ${i + 2}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Line ${i + 2}: ${errorMessage}`);
        failed++;
      }
    }
    
    console.log(`🎉 CSV import completed: ${imported} imported, ${failed} failed`);
    
    // Create initial jurisdiction and topic entries
    await ctx.runAction(internal.csvImport.createJurisdictionsAndTopics);
    
    return {
      success: true,
      imported,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors only
      total: dataLines.length
    };
  },
});

// Internal mutation to create a rule
export const createRule = internalMutation({
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

// Create jurisdictions and topics from imported rules
export const createJurisdictionsAndTopics = internalAction({
  handler: async (ctx) => {
    console.log("🏛️ Creating jurisdictions and topics...");
    
    // Get all unique jurisdictions and topics from imported rules
    const rules = await ctx.runQuery(internal.csvImport.getAllRules);
    
    const jurisdictions = new Map<string, { name: string; type: "federal" | "state" | "local"; ruleCount: number }>();
    const topics = new Map<string, { name: string; category: string; ruleCount: number }>();
    
    for (const rule of rules) {
      // Count jurisdictions
      const jCode = rule.jurisdiction.toLowerCase().replace(/\s+/g, '_');
      if (!jurisdictions.has(jCode)) {
        jurisdictions.set(jCode, {
          name: rule.jurisdiction,
          type: rule.jurisdiction === "Federal" ? "federal" : "state",
          ruleCount: 0
        });
      }
      jurisdictions.get(jCode)!.ruleCount++;
      
      // Count topics
      if (!topics.has(rule.topicKey)) {
        topics.set(rule.topicKey, {
          name: rule.topicLabel,
          category: categorizeTopicKey(rule.topicKey),
          ruleCount: 0
        });
      }
      topics.get(rule.topicKey)!.ruleCount++;
    }
    
    // Create jurisdiction entries
    for (const [code, data] of jurisdictions) {
      await ctx.runMutation(internal.csvImport.createJurisdiction, {
        code,
        name: data.name,
        type: data.type,
        ruleCount: data.ruleCount,
      });
    }
    
    // Create topic entries
    for (const [topicKey, data] of topics) {
      await ctx.runMutation(internal.csvImport.createTopic, {
        topicKey,
        name: data.name,
        category: data.category,
        ruleCount: data.ruleCount,
      });
    }
    
    console.log(`✅ Created ${jurisdictions.size} jurisdictions and ${topics.size} topics`);
  },
});

// Create jurisdiction entry
export const createJurisdiction = internalMutation({
  args: {
    code: v.string(),
    name: v.string(),
    type: v.union(v.literal("federal"), v.literal("state"), v.literal("local")),
    ruleCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jurisdictions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ruleCount: args.ruleCount,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("jurisdictions", {
        code: args.code,
        name: args.name,
        type: args.type,
        ruleCount: args.ruleCount,
        lastUpdated: Date.now(),
        crawlSettings: {
          primaryDomains: getPrimaryDomains(args.name),
          updateFrequency: args.type === "federal" ? "weekly" : "monthly",
          priority: args.type === "federal" ? "high" : "medium",
        },
      });
    }
  },
});

// Create topic entry
export const createTopic = internalMutation({
  args: {
    topicKey: v.string(),
    name: v.string(),
    category: v.string(),
    ruleCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("complianceTopics")
      .withIndex("by_topic_key", (q) => q.eq("topicKey", args.topicKey))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ruleCount: args.ruleCount,
      });
    } else {
      await ctx.db.insert("complianceTopics", {
        topicKey: args.topicKey,
        name: args.name,
        category: args.category,
        description: `Employment law topic: ${args.name}`,
        priority: determinePriority(args.topicKey),
        ruleCount: args.ruleCount,
        changeFrequency: getTopicChangeFrequency(args.topicKey),
        keywords: getTopicKeywords(args.topicKey),
      });
    }
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
  const criticalTopics = ["minimum_wage", "overtime", "harassment_training", "workplace_safety"];
  const highTopics = ["paid_sick_leave", "family_medical_leave", "workers_comp", "background_checks"];
  const mediumTopics = ["posting_requirements", "jury_duty_leave", "voting_leave", "final_pay"];
  
  if (criticalTopics.includes(topicKey)) return "critical";
  if (highTopics.includes(topicKey)) return "high";
  if (mediumTopics.includes(topicKey)) return "medium";
  return "low";
}

function getCrawlSettings(jurisdiction: string, topicKey: string) {
  // Federal rules need more frequent monitoring
  if (jurisdiction === "Federal") {
    return {
      checkInterval: 1440, // Daily
      depth: 3,
      selectors: [".content", ".law-text", ".regulation", "main", ".page-content"],
    };
  }
  
  // Critical topics need more frequent monitoring
  const criticalTopics = ["minimum_wage", "overtime", "harassment_training"];
  if (criticalTopics.includes(topicKey)) {
    return {
      checkInterval: 2880, // Every 2 days
      depth: 2,
      selectors: [".content", ".main-content", ".law-section", "main"],
    };
  }
  
  // Default for other rules
  return {
    checkInterval: 10080, // Weekly
    depth: 2,
    selectors: [".content", ".main", "main"],
  };
}

function categorizeTopicKey(topicKey: string): string {
  const categories = {
    "Wages & Hours": ["minimum_wage", "overtime", "pay_frequency", "final_pay", "meal_rest_breaks"],
    "Leave & Benefits": ["paid_sick_leave", "family_medical_leave", "bereavement_leave", "jury_duty_leave", "voting_leave"],
    "Safety & Training": ["workplace_safety", "harassment_training", "workers_comp"],
    "Employment Practices": ["background_checks", "everify", "non_compete", "posting_requirements"],
    "Regulatory Compliance": ["prevailing_wage", "mini_warn", "right_to_work", "benefits_mandates"],
    "Emerging Issues": ["biometric_privacy", "domestic_violence_leave", "pregnancy_accommodation"],
  };
  
  for (const [category, topics] of Object.entries(categories)) {
    if (topics.includes(topicKey)) {
      return category;
    }
  }
  
  return "Other";
}

function getTopicChangeFrequency(topicKey: string): string {
  const frequencies = {
    minimum_wage: "quarterly", // Minimum wage changes often
    overtime: "annually",
    harassment_training: "annually",
    posting_requirements: "bi-annually",
    workers_comp: "annually",
    // Add more as needed
  };
  
  return frequencies[topicKey as keyof typeof frequencies] || "annually";
}

function getTopicKeywords(topicKey: string): string[] {
  const keywords = {
    minimum_wage: ["minimum wage", "hourly rate", "wage floor", "pay rate"],
    overtime: ["overtime", "time and a half", "40 hours", "overtime pay"],
    harassment_training: ["sexual harassment", "workplace harassment", "training", "prevention"],
    posting_requirements: ["workplace poster", "notice", "employee rights", "posting"],
    // Add more as needed
  };
  
  return keywords[topicKey as keyof typeof keywords] || [topicKey.replace(/_/g, ' ')];
}

function getPrimaryDomains(jurisdictionName: string): string[] {
  const domainMap = {
    "Federal": ["dol.gov", "eeoc.gov", "nlrb.gov", "osha.gov"],
    "California": ["dir.ca.gov", "edd.ca.gov", "calhr.ca.gov"],
    "New York": ["dol.ny.gov", "labor.ny.gov"],
    "Texas": ["twc.texas.gov"],
    "Florida": ["floridajobs.org"],
    // Add more as needed
  };
  
  return domainMap[jurisdictionName as keyof typeof domainMap] || [`${jurisdictionName.toLowerCase()}.gov`];
}

// Create website entry for a compliance rule (automatic)
export const createWebsiteForRule = internalMutation({
  args: {
    ruleId: v.string(),
    jurisdiction: v.string(),
    topicKey: v.string(),
    topicLabel: v.string(),
    sourceUrl: v.string(),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    crawlSettings: v.object({
      checkInterval: v.number(),
      depth: v.number(),
      selectors: v.optional(v.array(v.string())),
    }),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if website already exists for this URL
    const existingWebsite = await ctx.db
      .query("websites")
      .filter((q) => q.eq(q.field("url"), args.sourceUrl))
      .first();
    
    if (existingWebsite) {
      // Update existing website with compliance metadata
      await ctx.db.patch(existingWebsite._id, {
        complianceMetadata: {
          ruleId: args.ruleId,
          jurisdiction: args.jurisdiction,
          topicKey: args.topicKey,
          priority: args.priority,
          isComplianceWebsite: true,
        },
        updatedAt: Date.now(),
      });
      return existingWebsite._id;
    }
    
    // Create website name with priority indicator
    const priorityIcon = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡", 
      low: "🟢"
    }[args.priority];
    
    const websiteName = `${priorityIcon} ${args.jurisdiction} - ${args.topicLabel}`;
    
    // Determine notification settings
    const notificationPreference = {
      critical: "both" as const,  // Email and webhook for critical
      high: "email" as const,     // Email for high priority
      medium: "email" as const,   // Email for medium priority
      low: "none" as const        // No notifications for low priority
    }[args.priority];
    
    // Create website entry
    const websiteId = await ctx.db.insert("websites", {
      url: args.sourceUrl,
      name: websiteName,
      userId: args.userId,
      isActive: true,
      isPaused: false,
      checkInterval: args.crawlSettings.checkInterval,
      notificationPreference,
      monitorType: "single_page",
      complianceMetadata: {
        ruleId: args.ruleId,
        jurisdiction: args.jurisdiction,
        topicKey: args.topicKey,
        priority: args.priority,
        isComplianceWebsite: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return websiteId;
  },
});

// Get all rules (internal query)
export const getAllRules = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("complianceRules").collect();
  },
});
