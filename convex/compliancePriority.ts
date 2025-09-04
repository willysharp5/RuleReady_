import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireCurrentUser } from "./helpers";

// Update compliance priority for a website
export const updateWebsiteCompliancePriority = mutation({
  args: {
    websiteId: v.id("websites"),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"), v.literal("testing")),
    overrideInterval: v.optional(v.boolean()),
    customInterval: v.optional(v.number()),
    changeReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    
    // Get the website
    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== user._id) {
      throw new Error("Website not found or access denied");
    }
    
    // Ensure it's a compliance website
    if (!website.complianceMetadata?.isComplianceWebsite) {
      throw new Error("Priority can only be changed for compliance websites");
    }
    
    // Calculate new check interval based on priority
    const priorityIntervals = {
      testing: 0.25,    // 15 seconds (for testing)
      critical: 1440,   // Daily
      high: 2880,       // Every 2 days
      medium: 10080,    // Weekly
      low: 43200        // Monthly
    };
    
    const newInterval = args.overrideInterval && args.customInterval ? 
      args.customInterval : 
      priorityIntervals[args.priority];
    
    // Validate interval for critical rules
    if (args.priority === "critical" && newInterval > 1440) {
      throw new Error("Critical compliance rules should be checked at least daily");
    }
    
    // Warning for testing priority in production
    if (args.priority === "testing") {
      console.warn(`⚠️ Testing priority (15 seconds) set for compliance rule: ${website.complianceMetadata.ruleId}`);
    }
    
    // Update the website
    await ctx.db.patch(args.websiteId, {
      checkInterval: newInterval,
      complianceMetadata: {
        ...website.complianceMetadata,
        priority: args.priority,
        hasManualOverride: args.overrideInterval || false,
        originalPriority: website.complianceMetadata.originalPriority || website.complianceMetadata.priority,
        lastPriorityChange: Date.now(),
        priorityChangeReason: args.changeReason || "User updated priority",
      },
      updatedAt: Date.now(),
    });
    
    // Update the corresponding compliance rule
    if (website.complianceMetadata.ruleId) {
      await ctx.runMutation(internal.compliancePriority.updateRulePriority, {
        ruleId: website.complianceMetadata.ruleId,
        priority: args.priority,
        hasManualOverride: args.overrideInterval || false,
        newInterval: newInterval,
      });
    }
    
    return {
      success: true,
      newInterval,
      priority: args.priority,
      hasOverride: args.overrideInterval || false,
    };
  },
});

// Update compliance rule priority (internal)
export const updateRulePriority = internalMutation({
  args: {
    ruleId: v.string(),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"), v.literal("testing")),
    hasManualOverride: v.boolean(),
    newInterval: v.number(),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_id", (q) => q.eq("ruleId", args.ruleId))
      .first();
    
    if (rule) {
      await ctx.db.patch(rule._id, {
        priority: args.priority,
        crawlSettings: {
          ...rule.crawlSettings,
          checkInterval: args.newInterval,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

// Get compliance priority recommendations
export const getCompliancePriorityRecommendations = internalQuery({
  args: {
    jurisdiction: v.string(),
    topicKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get recommended priority based on jurisdiction and topic
    const recommendations = {
      // Federal rules are generally higher priority
      federal: {
        minimum_wage: "critical",
        overtime: "critical", 
        harassment_training: "critical",
        workplace_safety: "critical",
        paid_sick_leave: "high",
        family_medical_leave: "high",
        // ... other federal priorities
      },
      // State rules vary by topic
      state: {
        minimum_wage: "high", // State minimum wages change frequently
        harassment_training: "high",
        paid_sick_leave: "medium",
        posting_requirements: "medium",
        jury_duty_leave: "low",
        // ... other state priorities
      }
    };
    
    const jurisdictionType = args.jurisdiction === "Federal" ? "federal" : "state";
    const recommended = recommendations[jurisdictionType][args.topicKey as keyof typeof recommendations.federal] || "medium";
    
    return {
      recommendedPriority: recommended,
      reasoning: getPriorityReasoning(args.jurisdiction, args.topicKey, recommended),
      alternativePriorities: getAlternativePriorities(recommended),
    };
  },
});

// Get priority reasoning
function getPriorityReasoning(jurisdiction: string, topicKey: string, priority: string): string {
  const reasons = {
    critical: `${jurisdiction} ${topicKey} rules change frequently and have severe penalties for non-compliance`,
    high: `${jurisdiction} ${topicKey} rules have significant business impact and moderate change frequency`,
    medium: `${jurisdiction} ${topicKey} rules are standard compliance requirements with periodic updates`,
    low: `${jurisdiction} ${topicKey} rules are generally stable with minimal immediate business impact`,
  };
  
  return reasons[priority as keyof typeof reasons] || "Standard compliance monitoring recommended";
}

// Get alternative priority suggestions
function getAlternativePriorities(currentPriority: string) {
  const alternatives = {
    critical: ["high", "medium"],
    high: ["critical", "medium"], 
    medium: ["high", "low"],
    low: ["medium"],
  };
  
  return alternatives[currentPriority as keyof typeof alternatives] || [];
}

// Validate compliance priority configuration
export const validateCompliancePriority = internalQuery({
  args: {
    websiteId: v.id("websites"),
    newPriority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    newInterval: v.number(),
  },
  handler: async (ctx, args) => {
    const website = await ctx.db.get(args.websiteId);
    if (!website?.complianceMetadata?.isComplianceWebsite) {
      return { valid: true, warnings: [] };
    }
    
    const warnings = [];
    
    // Check for inappropriate configurations
    if (args.newPriority === "critical" && args.newInterval > 1440) {
      warnings.push("Critical compliance rules should be checked at least daily");
    }
    
    if (args.newPriority === "low" && args.newInterval < 10080) {
      warnings.push("Low priority rules don't typically need frequent checking");
    }
    
    // Check for significant priority downgrades
    const currentPriority = website.complianceMetadata.priority;
    const priorityLevels = { critical: 4, high: 3, medium: 2, low: 1 };
    const currentLevel = priorityLevels[currentPriority as keyof typeof priorityLevels] || 1;
    const newLevel = priorityLevels[args.newPriority];
    
    if (newLevel < currentLevel - 1) {
      warnings.push(`Downgrading from ${currentPriority} to ${args.newPriority} may reduce compliance monitoring effectiveness`);
    }
    
    return {
      valid: warnings.length === 0,
      warnings,
      recommendations: warnings.length > 0 ? getRecommendations(website, args.newPriority) : [],
    };
  },
});

function getRecommendations(website: any, newPriority: string): string[] {
  const recommendations = [];
  
  if (newPriority === "critical") {
    recommendations.push("Consider daily monitoring for critical compliance rules");
    recommendations.push("Enable immediate notifications for changes");
  }
  
  if (website.complianceMetadata.topicKey === "minimum_wage" && newPriority !== "critical") {
    recommendations.push("Minimum wage rules typically require critical priority due to frequent changes");
  }
  
  if (website.complianceMetadata.topicKey === "harassment_training" && newPriority !== "critical") {
    recommendations.push("Harassment training requirements often have strict deadlines and should be monitored closely");
  }
  
  return recommendations;
}
