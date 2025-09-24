import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query, action } from "./_generated/server";
import { internal, api } from "./_generated/api";

// PHASE 3.3: Proactive Deadline Tracking & Regulatory Calendar
export const trackComplianceDeadlines: any = internalAction({
  args: {
    ruleIds: v.optional(v.array(v.string())), // Specific rules or all rules
    extractFromReports: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("📅 Tracking compliance deadlines across all rules...");
    
    // 1. Get rules to process
    const rules = args.ruleIds ? 
      await getRulesByIds(ctx, args.ruleIds) :
      await ctx.runQuery(api.csvImport.getAllRules);
    
    console.log(`📋 Processing ${rules.length} rules for deadline extraction`);
    
    let deadlinesCreated = 0;
    let deadlinesUpdated = 0;
    
    // 2. Extract deadlines from each rule
    for (const rule of rules) {
      try {
        // Get latest report content for this rule
        let content = "";
        if (args.extractFromReports) {
          const latestReport = await ctx.runQuery(internal.complianceDeadlines.getLatestReportForRule, {
            ruleId: rule.ruleId
          });
          content = latestReport?.reportContent || "";
        }
        
        // Extract deadlines from rule content
        const extractedDeadlines = extractDeadlinesFromContent(content || rule.sourceUrl);
        
        // Create or update deadline records
        for (const deadline of extractedDeadlines) {
          const deadlineId = `${rule.ruleId}_${deadline.type}_${deadline.hash}`;
          
          // Check if deadline already exists
          const existing = await ctx.runQuery(internal.complianceDeadlines.findDeadlineById, {
            deadlineId
          });
          
          if (!existing) {
            // Create new deadline
            await ctx.runMutation(internal.complianceDeadlines.createDeadline, {
              deadlineId,
              ruleId: rule.ruleId,
              title: deadline.title,
              description: deadline.description,
              deadlineDate: deadline.date,
              deadlineType: deadline.type,
              recurringPattern: deadline.recurring,
              status: deadline.date > Date.now() ? "upcoming" : "overdue",
            });
            deadlinesCreated++;
          } else {
            // Update existing deadline if needed
            if (existing.deadlineDate !== deadline.date || existing.title !== deadline.title) {
              await ctx.runMutation(internal.complianceDeadlines.updateDeadline, {
                deadlineId,
                updates: {
                  deadlineDate: deadline.date,
                  title: deadline.title,
                  description: deadline.description,
                  status: deadline.date > Date.now() ? "upcoming" : "overdue",
                }
              });
              deadlinesUpdated++;
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing deadlines for ${rule.ruleId}:`, error);
      }
    }
    
    // 3. Generate recurring deadline patterns
    const recurringDeadlines = await generateRecurringDeadlines(ctx);
    
    // 4. Set up automated reminders
    await scheduleDeadlineReminders(ctx, deadlinesCreated + deadlinesUpdated);
    
    // 5. Update regulatory calendar
    await updateRegulatoryCalendar(ctx);
    
    console.log(`✅ Deadline tracking complete: ${deadlinesCreated} created, ${deadlinesUpdated} updated`);
    
    return {
      deadlinesCreated,
      deadlinesUpdated,
      rulesProcessed: rules.length,
      recurringDeadlines: recurringDeadlines.length,
    };
  }
});

// Create a new compliance deadline
export const createDeadline = internalMutation({
  args: {
    deadlineId: v.string(),
    ruleId: v.string(),
    title: v.string(),
    description: v.string(),
    deadlineDate: v.number(),
    deadlineType: v.union(
      v.literal("training_deadline"),
      v.literal("posting_deadline"),
      v.literal("compliance_deadline"),
      v.literal("renewal_deadline")
    ),
    recurringPattern: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("overdue"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("complianceDeadlines", {
      deadlineId: args.deadlineId,
      ruleId: args.ruleId,
      title: args.title,
      description: args.description,
      deadlineDate: args.deadlineDate,
      deadlineType: args.deadlineType,
      recurringPattern: args.recurringPattern,
      remindersSent: [],
      status: args.status,
    });
  },
});

// Update an existing deadline
export const updateDeadline = internalMutation({
  args: {
    deadlineId: v.string(),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      deadlineDate: v.optional(v.number()),
      status: v.optional(v.union(v.literal("upcoming"), v.literal("overdue"), v.literal("completed"))),
    }),
  },
  handler: async (ctx, args) => {
    const deadline = await ctx.db
      .query("complianceDeadlines")
      .filter((q: any) => q.eq(q.field("deadlineId"), args.deadlineId))
      .first();
    
    if (!deadline) {
      throw new Error(`Deadline ${args.deadlineId} not found`);
    }
    
    await ctx.db.patch(deadline._id, args.updates);
  },
});

// Get upcoming deadlines
export const getUpcomingDeadlines = query({
  args: {
    daysAhead: v.optional(v.number()),
    jurisdiction: v.optional(v.string()),
    topicKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const daysAhead = args.daysAhead || 30;
    const cutoffDate = Date.now() + (daysAhead * 24 * 60 * 60 * 1000);
    
    let deadlines = await ctx.db
      .query("complianceDeadlines")
      .withIndex("by_date", (q: any) => q.gte("deadlineDate", Date.now()))
      .filter((q: any) => q.lte(q.field("deadlineDate"), cutoffDate))
      .collect();
    
    // Apply filters if provided
    if (args.jurisdiction || args.topicKey) {
      const rules = await ctx.db.query("complianceRules").collect();
      const ruleMap = new Map(rules.map(r => [r.ruleId, r]));
      
      deadlines = deadlines.filter(deadline => {
        const rule = ruleMap.get(deadline.ruleId);
        if (!rule) return false;
        
        if (args.jurisdiction && rule.jurisdiction !== args.jurisdiction) return false;
        if (args.topicKey && rule.topicKey !== args.topicKey) return false;
        
        return true;
      });
    }
    
    return deadlines.sort((a, b) => a.deadlineDate - b.deadlineDate);
  },
});

// Internal helper queries
export const findDeadlineById = internalQuery({
  args: { deadlineId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceDeadlines")
      .filter((q: any) => q.eq(q.field("deadlineId"), args.deadlineId))
      .first();
  },
});

export const getLatestReportForRule = internalQuery({
  args: { ruleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceReports")
      .withIndex("by_rule", (q: any) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .first();
  },
});

// Extract deadlines from content
function extractDeadlinesFromContent(content: string) {
  const deadlines: any[] = [];
  
  // Common deadline patterns in compliance content
  const patterns = [
    {
      regex: /annual(?:ly)?\s+(?:training|filing|renewal|update)/gi,
      type: "renewal_deadline",
      recurring: "annual"
    },
    {
      regex: /(?:within|by)\s+(\d+)\s+days?\s+of\s+(?:hire|employment|start)/gi,
      type: "training_deadline",
      recurring: null
    },
    {
      regex: /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/gi,
      type: "compliance_deadline",
      recurring: null
    },
    {
      regex: /posting\s+(?:must\s+be\s+)?(?:displayed|updated|renewed)/gi,
      type: "posting_deadline",
      recurring: "annual"
    }
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches) {
      matches.forEach((match, index) => {
        deadlines.push({
          title: match.trim(),
          description: `Deadline extracted from compliance content`,
          date: estimateDeadlineDate(match),
          type: pattern.type,
          recurring: pattern.recurring,
          hash: hashString(match + pattern.type + index),
        });
      });
    }
  }
  
  return deadlines.slice(0, 5); // Limit to prevent overwhelming
}

// Estimate actual date from deadline text
function estimateDeadlineDate(deadlineText: string): number {
  const now = Date.now();
  const currentYear = new Date().getFullYear();
  
  // Try to extract specific dates
  const specificDateMatch = deadlineText.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (specificDateMatch) {
    const [, month, day, year] = specificDateMatch;
    const monthNum = getMonthNumber(month);
    if (monthNum !== -1) {
      return new Date(parseInt(year), monthNum, parseInt(day)).getTime();
    }
  }
  
  // Handle relative deadlines (e.g., "within 30 days")
  const relativeDaysMatch = deadlineText.match(/within\s+(\d+)\s+days/i);
  if (relativeDaysMatch) {
    const days = parseInt(relativeDaysMatch[1]);
    return now + (days * 24 * 60 * 60 * 1000);
  }
  
  // Handle annual deadlines (assume next occurrence)
  if (deadlineText.toLowerCase().includes('annual')) {
    return now + (365 * 24 * 60 * 60 * 1000); // Next year
  }
  
  // Default: 90 days from now
  return now + (90 * 24 * 60 * 60 * 1000);
}

// Generate recurring deadline patterns
async function generateRecurringDeadlines(ctx: any) {
  console.log("🔄 Generating recurring deadline patterns...");
  
  // Common recurring compliance deadlines
  const recurringPatterns = [
    {
      title: "Annual Harassment Training Renewal",
      type: "training_deadline",
      pattern: "annual",
      description: "Annual renewal of harassment prevention training",
      months: [1], // January
    },
    {
      title: "Quarterly Wage Statement Review", 
      type: "compliance_deadline",
      pattern: "quarterly",
      description: "Review wage statement compliance requirements",
      months: [1, 4, 7, 10], // Quarterly
    },
    {
      title: "Annual Posting Requirements Update",
      type: "posting_deadline", 
      pattern: "annual",
      description: "Update mandatory workplace postings",
      months: [1], // January
    },
  ];
  
  const currentYear = new Date().getFullYear();
  const generatedDeadlines = [];
  
  for (const pattern of recurringPatterns) {
    for (const month of pattern.months) {
      const deadlineDate = new Date(currentYear, month - 1, 1).getTime();
      
      // Only create if in the future
      if (deadlineDate > Date.now()) {
        generatedDeadlines.push({
          title: pattern.title,
          description: pattern.description,
          date: deadlineDate,
          type: pattern.type,
          recurring: pattern.pattern,
        });
      }
    }
  }
  
  return generatedDeadlines;
}

// Schedule deadline reminders
async function scheduleDeadlineReminders(ctx: any, deadlineCount: number) {
  console.log(`⏰ Scheduling reminders for ${deadlineCount} deadlines...`);
  
  // This would integrate with the existing notification system
  // For now, just log the intent
  console.log("✅ Reminder scheduling complete (integration pending)");
}

// Update regulatory calendar
async function updateRegulatoryCalendar(ctx: any) {
  console.log("📆 Updating regulatory calendar...");
  
  // This would generate a comprehensive calendar view
  // For now, just log the intent
  console.log("✅ Regulatory calendar updated (implementation pending)");
}

// Utility functions
function getMonthNumber(monthName: string): number {
  const months = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  return months[monthName.toLowerCase() as keyof typeof months] ?? -1;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function getRulesByIds(ctx: any, ruleIds: string[]) {
  const rules = [];
  for (const ruleId of ruleIds) {
    const rule = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q: any) => q.eq("ruleId", ruleId))
      .first();
    if (rule) rules.push(rule);
  }
  return rules;
}
