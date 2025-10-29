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
    type: v.union(v.literal("federal"), v.literal("state"), v.literal("local")),
    level: v.optional(v.union(v.literal("federal"), v.literal("state"), v.literal("city"))),
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

// Seed jurisdictions data
export const seedJurisdictions = mutation({
  handler: async (ctx) => {
    const jurisdictions = [
      { code: "federal", name: "Federal", type: "federal" as const },
      { code: "alabama", name: "Alabama", type: "state" as const },
      { code: "alaska", name: "Alaska", type: "state" as const },
      { code: "arizona", name: "Arizona", type: "state" as const },
      { code: "arkansas", name: "Arkansas", type: "state" as const },
      { code: "california", name: "California", type: "state" as const },
      { code: "colorado", name: "Colorado", type: "state" as const },
      { code: "connecticut", name: "Connecticut", type: "state" as const },
      { code: "delaware", name: "Delaware", type: "state" as const },
      { code: "florida", name: "Florida", type: "state" as const },
      { code: "georgia", name: "Georgia", type: "state" as const },
      { code: "hawaii", name: "Hawaii", type: "state" as const },
      { code: "idaho", name: "Idaho", type: "state" as const },
      { code: "illinois", name: "Illinois", type: "state" as const },
      { code: "indiana", name: "Indiana", type: "state" as const },
      { code: "iowa", name: "Iowa", type: "state" as const },
      { code: "kansas", name: "Kansas", type: "state" as const },
      { code: "kentucky", name: "Kentucky", type: "state" as const },
      { code: "louisiana", name: "Louisiana", type: "state" as const },
      { code: "maine", name: "Maine", type: "state" as const },
      { code: "maryland", name: "Maryland", type: "state" as const },
      { code: "massachusetts", name: "Massachusetts", type: "state" as const },
      { code: "michigan", name: "Michigan", type: "state" as const },
      { code: "minnesota", name: "Minnesota", type: "state" as const },
      { code: "mississippi", name: "Mississippi", type: "state" as const },
      { code: "missouri", name: "Missouri", type: "state" as const },
      { code: "montana", name: "Montana", type: "state" as const },
      { code: "nebraska", name: "Nebraska", type: "state" as const },
      { code: "nevada", name: "Nevada", type: "state" as const },
      { code: "new_hampshire", name: "New Hampshire", type: "state" as const },
      { code: "new_jersey", name: "New Jersey", type: "state" as const },
      { code: "new_mexico", name: "New Mexico", type: "state" as const },
      { code: "new_york", name: "New York", type: "state" as const },
      { code: "north_carolina", name: "North Carolina", type: "state" as const },
      { code: "north_dakota", name: "North Dakota", type: "state" as const },
      { code: "ohio", name: "Ohio", type: "state" as const },
      { code: "oklahoma", name: "Oklahoma", type: "state" as const },
      { code: "oregon", name: "Oregon", type: "state" as const },
      { code: "pennsylvania", name: "Pennsylvania", type: "state" as const },
      { code: "rhode_island", name: "Rhode Island", type: "state" as const },
      { code: "south_carolina", name: "South Carolina", type: "state" as const },
      { code: "south_dakota", name: "South Dakota", type: "state" as const },
      { code: "tennessee", name: "Tennessee", type: "state" as const },
      { code: "texas", name: "Texas", type: "state" as const },
      { code: "utah", name: "Utah", type: "state" as const },
      { code: "vermont", name: "Vermont", type: "state" as const },
      { code: "virginia", name: "Virginia", type: "state" as const },
      { code: "washington", name: "Washington", type: "state" as const },
      { code: "west_virginia", name: "West Virginia", type: "state" as const },
      { code: "wisconsin", name: "Wisconsin", type: "state" as const },
      { code: "wyoming", name: "Wyoming", type: "state" as const },
      { code: "district_of_columbia", name: "District of Columbia", type: "state" as const },
    ];

    let count = 0;
    for (const jurisdiction of jurisdictions) {
      await ctx.db.insert("jurisdictions", {
        ...jurisdiction,
        lastUpdated: Date.now(),
      });
      count++;
    }

    return { inserted: count };
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
