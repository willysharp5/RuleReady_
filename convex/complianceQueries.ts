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

// Helper to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Seed topics data (migrated to new schema)
export const seedTopics = mutation({
  handler: async (ctx) => {
    const topics = [
      {
        name: "Minimum Wage",
        category: "Wages & Hours",
        description: "State and federal minimum wage rates for hourly employees, including exemptions and special categories.",
      },
      {
        name: "Overtime & Hours",
        category: "Wages & Hours",
        description: "Overtime pay requirements, maximum working hours, and time-and-a-half calculations for non-exempt employees.",
      },
      {
        name: "Paid Sick Leave",
        category: "Leave & Benefits",
        description: "Employer requirements for providing paid sick leave, accrual rates, and employee usage rights.",
      },
      {
        name: "Paid Family / Medical Leave (PFML)",
        category: "Leave & Benefits",
        description: "State and federal family and medical leave programs, including parental leave and disability coverage.",
      },
      {
        name: "Final Pay / Vacation Payout",
        category: "Wages & Hours",
        description: "Requirements for final paycheck timing and vacation/PTO payout upon employee termination.",
      },
      {
        name: "Pay Frequency & Payday Timing",
        category: "Wages & Hours",
        description: "Legal requirements for how often employees must be paid and acceptable pay period schedules.",
      },
      {
        name: "Harassment Training",
        category: "Safety & Training",
        description: "Mandatory sexual harassment and workplace discrimination prevention training requirements for employers.",
      },
      {
        name: "Posting Requirements",
        category: "Employment Practices",
        description: "Required workplace posters and notices that must be displayed for employee awareness of rights.",
      },
      {
        name: "Pregnancy / Disability / ADA Accommodations",
        category: "Emerging Issues",
        description: "Employer obligations to provide reasonable accommodations for pregnancy, disabilities, and ADA compliance.",
      },
      {
        name: "Meal & Rest Breaks",
        category: "Wages & Hours",
        description: "Required meal periods and rest breaks based on hours worked and state regulations.",
      },
      {
        name: "Workers' Compensation",
        category: "Safety & Training",
        description: "Employer requirements for workers' compensation insurance and reporting workplace injuries.",
      },
      {
        name: "Child Labor",
        category: "Employment Practices",
        description: "Restrictions on employing minors, including permitted hours, occupations, and age requirements.",
      },
      {
        name: "Background Checks",
        category: "Employment Practices",
        description: "Legal requirements and restrictions for conducting criminal background checks on job applicants.",
      },
      {
        name: "Tip Credit / Tipped Employees",
        category: "Wages & Hours",
        description: "Rules for tip credits, minimum cash wages, and tip pooling for restaurant and service workers.",
      },
      {
        name: "Jury Duty Leave",
        category: "Leave & Benefits",
        description: "Employee rights and employer obligations for time off to serve on jury duty.",
      },
      {
        name: "Voting Leave",
        category: "Leave & Benefits",
        description: "State requirements for providing paid or unpaid time off for employees to vote in elections.",
      },
      {
        name: "E-Verify",
        category: "Employment Practices",
        description: "Federal and state requirements for electronic employment eligibility verification through E-Verify.",
      },
      {
        name: "Drug Testing",
        category: "Safety & Training",
        description: "Legal parameters for pre-employment, random, and post-accident drug and alcohol testing programs.",
      },
      {
        name: "Predictive Scheduling",
        category: "Emerging Issues",
        description: "Fair workweek laws requiring advance notice of work schedules and predictability pay for changes.",
      },
      {
        name: "Pay Equity / Salary History Bans",
        category: "Emerging Issues",
        description: "Laws prohibiting salary history inquiries and requiring equal pay for substantially similar work.",
      },
      {
        name: "Independent Contractor Classification",
        category: "Employment Practices",
        description: "Legal tests and requirements for properly classifying workers as independent contractors vs. employees.",
      },
      {
        name: "Apprenticeship Programs",
        category: "Employment Practices",
        description: "Requirements for registered apprenticeship programs and special wage/training provisions.",
      },
      {
        name: "Prevailing Wage Laws (public contracts)",
        category: "Regulatory Compliance",
        description: "Davis-Bacon and state prevailing wage requirements for workers on government-funded projects.",
      },
      {
        name: "Record Retention Requirements",
        category: "Regulatory Compliance",
        description: "Federal and state requirements for maintaining employment records, timesheets, and personnel files.",
      },
      {
        name: "Unemployment Insurance",
        category: "Regulatory Compliance",
        description: "Employer obligations for unemployment insurance taxes, coverage, and responding to claims.",
      },
    ];

    const now = Date.now();
    let count = 0;
    
    for (const topic of topics) {
      const slug = generateSlug(topic.name);
      
      // Check if already exists
      const existing = await ctx.db
        .query("complianceTopics")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      
      if (!existing) {
        await ctx.db.insert("complianceTopics", {
          ...topic,
          slug,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        count++;
      }
    }

    return { inserted: count };
  },
});
