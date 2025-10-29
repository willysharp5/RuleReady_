import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all jurisdictions
export const getJurisdictions = query({
  handler: async (ctx) => {
    return await ctx.db.query("jurisdictions").collect();
  },
});

// Get all topics
export const getTopics = query({
  handler: async (ctx) => {
    return await ctx.db.query("complianceTopics").collect();
  },
});

// Create or update jurisdiction
export const upsertJurisdiction = mutation({
  args: {
    id: v.optional(v.id("jurisdictions")),
    code: v.string(),
    name: v.string(),
    level: v.union(v.literal("federal"), v.literal("state"), v.literal("city")),
    parentCode: v.optional(v.string()),
    stateCode: v.optional(v.string()),
    displayName: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    hasEmploymentLaws: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    
    if (id) {
      // Update existing
      await ctx.db.patch(id, {
        ...data,
        lastUpdated: Date.now(),
      });
      return { success: true, id };
    } else {
      // Create new
      const newId = await ctx.db.insert("jurisdictions", {
        ...data,
        lastUpdated: Date.now(),
      });
      return { success: true, id: newId };
    }
  },
});

// Delete jurisdiction
export const deleteJurisdiction = mutation({
  args: { id: v.id("jurisdictions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Seed topics data
export const seedTopics = mutation({
  handler: async (ctx) => {
    const topics = [
      {
        topicKey: "minimum_wage",
        name: "Minimum Wage",
        category: "Wages & Hours",
        description: "Employment law topic: Minimum Wage",
        keywords: ["minimum wage", "hourly rate", "wage floor", "pay rate"],
      },
      {
        topicKey: "overtime",
        name: "Overtime & Hours",
        category: "Wages & Hours",
        description: "Employment law topic: Overtime & Hours",
        keywords: ["overtime", "time and a half", "40 hours", "overtime pay"],
      },
      {
        topicKey: "paid_sick_leave",
        name: "Paid Sick Leave",
        category: "Leave & Benefits",
        description: "Employment law topic: Paid Sick Leave",
        keywords: ["paid sick leave"],
      },
      {
        topicKey: "family_medical_leave",
        name: "Paid Family / Medical Leave (PFML)",
        category: "Leave & Benefits",
        description: "Employment law topic: Paid Family / Medical Leave (PFML)",
        keywords: ["family medical leave"],
      },
      {
        topicKey: "final_pay",
        name: "Final Pay / Vacation Payout",
        category: "Wages & Hours",
        description: "Employment law topic: Final Pay / Vacation Payout",
        keywords: ["final pay"],
      },
      {
        topicKey: "pay_frequency",
        name: "Pay Frequency & Payday Timing",
        category: "Wages & Hours",
        description: "Employment law topic: Pay Frequency & Payday Timing",
        keywords: ["pay frequency"],
      },
      {
        topicKey: "harassment_training",
        name: "Harassment Training",
        category: "Safety & Training",
        description: "Employment law topic: Harassment Training",
        keywords: ["sexual harassment", "workplace harassment", "training", "prevention"],
      },
      {
        topicKey: "posting_requirements",
        name: "Posting Requirements",
        category: "Employment Practices",
        description: "Employment law topic: Posting Requirements",
        keywords: ["workplace poster", "notice", "employee rights", "posting"],
      },
      {
        topicKey: "pregnancy_accommodation",
        name: "Pregnancy / Disability / ADA Accommodations",
        category: "Emerging Issues",
        description: "Employment law topic: Pregnancy / Disability / ADA Accommodations",
        keywords: ["pregnancy accommodation"],
      },
      {
        topicKey: "meal_rest_breaks",
        name: "Meal & Rest Breaks",
        category: "Wages & Hours",
        description: "Employment law topic: Meal & Rest Breaks",
        keywords: ["meal rest breaks"],
      },
      {
        topicKey: "workers_comp",
        name: "Workers' Compensation",
        category: "Safety & Training",
        description: "Employment law topic: Workers' Compensation",
        keywords: ["workers compensation", "workplace injury", "insurance"],
      },
      {
        topicKey: "child_labor",
        name: "Child Labor",
        category: "Employment Practices",
        description: "Employment law topic: Child Labor",
        keywords: ["child labor", "minors", "youth employment"],
      },
      {
        topicKey: "background_checks",
        name: "Background Checks",
        category: "Employment Practices",
        description: "Employment law topic: Background Checks",
        keywords: ["background check", "screening", "criminal history"],
      },
      {
        topicKey: "tip_credit",
        name: "Tip Credit / Tipped Employees",
        category: "Wages & Hours",
        description: "Employment law topic: Tip Credit / Tipped Employees",
        keywords: ["tip credit", "tipped employees"],
      },
      {
        topicKey: "jury_duty_leave",
        name: "Jury Duty Leave",
        category: "Leave & Benefits",
        description: "Employment law topic: Jury Duty Leave",
        keywords: ["jury duty"],
      },
      {
        topicKey: "voting_leave",
        name: "Voting Leave",
        category: "Leave & Benefits",
        description: "Employment law topic: Voting Leave",
        keywords: ["voting leave", "time off to vote"],
      },
      {
        topicKey: "e_verify",
        name: "E-Verify",
        category: "Employment Practices",
        description: "Employment law topic: E-Verify",
        keywords: ["e-verify", "employment verification"],
      },
      {
        topicKey: "drug_testing",
        name: "Drug Testing",
        category: "Safety & Training",
        description: "Employment law topic: Drug Testing",
        keywords: ["drug testing", "substance abuse"],
      },
      {
        topicKey: "predictive_scheduling",
        name: "Predictive Scheduling",
        category: "Emerging Issues",
        description: "Employment law topic: Predictive Scheduling",
        keywords: ["predictive scheduling", "fair workweek"],
      },
      {
        topicKey: "pay_equity",
        name: "Pay Equity / Salary History Bans",
        category: "Emerging Issues",
        description: "Employment law topic: Pay Equity / Salary History Bans",
        keywords: ["pay equity", "salary history ban"],
      },
      {
        topicKey: "independent_contractor",
        name: "Independent Contractor Classification",
        category: "Employment Practices",
        description: "Employment law topic: Independent Contractor Classification",
        keywords: ["independent contractor", "1099", "classification"],
      },
      {
        topicKey: "apprenticeship",
        name: "Apprenticeship Programs",
        category: "Employment Practices",
        description: "Employment law topic: Apprenticeship Programs",
        keywords: ["apprenticeship", "training program"],
      },
      {
        topicKey: "prevailing_wage",
        name: "Prevailing Wage Laws (public contracts)",
        category: "Regulatory Compliance",
        description: "Employment law topic: Prevailing Wage Laws (public contracts)",
        keywords: ["prevailing wage"],
      },
      {
        topicKey: "record_retention",
        name: "Record Retention Requirements",
        category: "Regulatory Compliance",
        description: "Employment law topic: Record Retention Requirements",
        keywords: ["record retention", "recordkeeping"],
      },
      {
        topicKey: "unemployment_insurance",
        name: "Unemployment Insurance",
        category: "Regulatory Compliance",
        description: "Employment law topic: Unemployment Insurance",
        keywords: ["unemployment insurance", "UI"],
      },
    ];

    let count = 0;
    for (const topic of topics) {
      await ctx.db.insert("complianceTopics", topic);
      count++;
    }

    return { inserted: count };
  },
});
