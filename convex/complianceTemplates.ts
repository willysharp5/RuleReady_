import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { internal, api } from "./_generated/api";

// Get all compliance templates
export const getAllTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("complianceTemplates").collect();
  },
});

// Get active templates only
export const getActiveTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("complianceTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get template by ID
export const getTemplateById = query({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceTemplates")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .first();
  },
});

// Get template by topic key
export const getTemplateByTopic = query({
  args: { topicKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceTemplates")
      .withIndex("by_topic", (q) => q.eq("topicKey", args.topicKey))
      .first();
  },
});

// Create or update a compliance template
export const upsertTemplate = mutation({
  args: {
    templateId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    markdownContent: v.string(),
    topicKey: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const templateId = args.templateId || `template_${now}`;

    // Check if template already exists
    const existing = await ctx.db
      .query("complianceTemplates")
      .withIndex("by_template_id", (q) => q.eq("templateId", templateId))
      .first();

    if (existing) {
      // Update existing template
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        markdownContent: args.markdownContent,
        topicKey: args.topicKey,
        isDefault: args.isDefault ?? existing.isDefault,
        isActive: args.isActive ?? existing.isActive,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new template
      return await ctx.db.insert("complianceTemplates", {
        templateId,
        title: args.title,
        description: args.description,
        markdownContent: args.markdownContent,
        topicKey: args.topicKey,
        isDefault: args.isDefault ?? false,
        isActive: args.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Delete a template
export const deleteTemplate = mutation({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("complianceTemplates")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .first();

    if (template) {
      await ctx.db.delete(template._id);
      return { success: true };
    }
    return { success: false, error: "Template not found" };
  },
});

// Initialize default markdown templates
export const initializeDefaultTemplates = action({
  args: {},
  handler: async (ctx) => {
    console.log("🏗️ Initializing default compliance markdown templates...");
    
    const defaultTemplates = [
      {
        templateId: "minimum_wage_template",
        title: "Minimum Wage Compliance Template",
        description: "Template for monitoring minimum wage law changes and requirements",
        topicKey: "minimum_wage",
        markdownContent: `# Minimum Wage Compliance Template

## Overview
Brief description of the minimum wage law/requirement, including key legislation and purpose

## Covered Employers
Who must comply with this requirement - employee thresholds, business types, etc.

## Covered Employees
Which employees are covered/protected - employment types, locations, exemptions

## What Should Employers Do?
Specific actions employers must take to comply with minimum wage requirements

## Rate Information
Current minimum wage rates, including:
- Standard minimum wage
- Tipped employee minimum wage
- Youth/training wages
- Overtime rates

## Effective Dates
When rate changes take effect and any transition periods

## Posting Requirements
Required workplace postings of minimum wage rates and employee rights

## Recordkeeping Requirements
What records must be maintained, retention periods, required documentation

## Penalties for Non-Compliance
Fines, penalties, consequences, and enforcement actions for violations

## Sources
Relevant statutes, regulations, agency websites, and official resources

---
*This template guides AI parsing of minimum wage compliance information*`
      },
      
      {
        templateId: "harassment_training_template", 
        title: "Harassment Training Compliance Template",
        description: "Template for monitoring harassment training requirements and deadlines",
        topicKey: "harassment_training",
        markdownContent: `# Harassment Training Compliance Template

## Overview
Brief description of harassment training requirements, including applicable laws and purpose

## Covered Employers
Who must provide harassment training - employee thresholds, business types, locations

## Covered Employees
Which employees must receive training - regular employees, supervisors, managers

## Training Requirements
Specific content requirements including:
- Harassment definitions and examples
- Complaint procedures and reporting
- Supervisor responsibilities
- Bystander intervention
- Legal remedies and protections

## Training Deadlines
Timing requirements for different employee types:
- New employee training deadlines
- Periodic refresher training schedules
- Supervisor training requirements

## Qualified Trainers
Requirements for trainer qualifications, certification, or approval

## Training Format
Acceptable training delivery methods:
- In-person training requirements
- Online training acceptability
- Interactive training elements
- Language requirements

## Recordkeeping Requirements
What training records must be maintained and retention periods

## Penalties for Non-Compliance
Fines, penalties, and enhanced liability for non-compliance

## Sources
Relevant statutes, regulations, approved training providers, and official resources

---
*This template guides AI parsing of harassment training compliance information*`
      },

      {
        templateId: "workplace_safety_template",
        title: "Workplace Safety Requirements Template", 
        description: "Template for monitoring OSHA and state workplace safety requirements",
        topicKey: "workplace_safety",
        markdownContent: `# Workplace Safety Requirements Template

## Overview
Brief description of workplace safety requirements, including OSHA and state-level regulations

## Covered Employers
Who must comply with safety requirements - business types, employee thresholds, industry classifications

## Covered Employees
Which employees are protected - full-time, part-time, temporary, contractors

## Safety Standards
Specific safety requirements including:
- General duty clause obligations
- Industry-specific standards
- Hazard communication requirements
- Personal protective equipment (PPE)
- Machine guarding requirements

## Training Requirements
Required safety training including:
- General safety orientation
- Hazard-specific training
- Emergency procedures
- Equipment operation training

## Reporting Requirements
Incident and injury reporting obligations:
- Reporting deadlines
- Required forms and documentation
- Agency notification requirements

## Inspection Requirements
Workplace inspection obligations and procedures

## Posting Requirements
Required safety postings and notices

## Recordkeeping Requirements
Safety records that must be maintained and retention periods

## Penalties for Non-Compliance
OSHA penalties, state fines, and enforcement actions

## Sources
OSHA standards, state safety agencies, industry guidelines, and official resources

---
*This template guides AI parsing of workplace safety compliance information*`
      },

      {
        templateId: "paid_sick_leave_template",
        title: "Paid Sick Leave Compliance Template",
        description: "Template for monitoring paid sick leave laws and requirements", 
        topicKey: "paid_sick_leave",
        markdownContent: `# Paid Sick Leave Compliance Template

## Overview
Brief description of paid sick leave requirements and applicable laws

## Covered Employers
Who must provide paid sick leave - employee thresholds, business locations, industry types

## Covered Employees
Which employees are entitled to paid sick leave - employment types, exemptions

## Accrual Requirements
How sick leave is earned:
- Accrual rates and methods
- Maximum accrual limits
- Carryover provisions
- Front-loading options

## Usage Requirements
How sick leave can be used:
- Qualifying reasons for use
- Notice requirements
- Documentation requirements
- Minimum usage increments

## Rate of Pay
How much employees are paid during sick leave

## Employer Responsibilities
Specific obligations including:
- Policy development and distribution
- Notice requirements
- Record maintenance
- Anti-retaliation compliance

## Employee Rights
Employee protections and rights under the law

## Posting Requirements
Required workplace postings about sick leave rights

## Recordkeeping Requirements
Records that must be maintained and retention periods

## Penalties for Non-Compliance
Fines, back pay obligations, and enforcement actions

## Sources
Relevant statutes, regulations, enforcement agencies, and official resources

---
*This template guides AI parsing of paid sick leave compliance information*`
      },

      {
        templateId: "general_compliance_template",
        title: "General Compliance Template",
        description: "Default template for general compliance monitoring",
        markdownContent: `# General Compliance Template

## Overview
Brief description of the law/requirement, including key legislation and purpose

## Covered Employers
Who must comply with this requirement - employee thresholds, business types, etc.

## Covered Employees
Which employees are covered/protected - employment types, locations, exemptions

## What Should Employers Do?
Specific actions employers must take to comply

## Training Requirements
If applicable - training content, duration, format requirements

## Training Deadlines
If applicable - timing requirements for different employee types

## Qualified Trainers
If applicable - who can provide the training/services

## Special Requirements
Any special cases, exceptions, industry-specific requirements, or additional obligations

## Coverage Election
If applicable - optional coverage choices or rejection options

## Reciprocity/Extraterritorial Coverage
If applicable - cross-state/jurisdiction coverage rules

## Employer Responsibilities & Deadlines
Ongoing obligations, verification processes, renewal requirements, key deadlines

## Employer Notification Requirements
Required notifications to employees about rights, processes, or programs

## Posting Requirements
Required workplace postings, notices, and display requirements

## Recordkeeping Requirements
What records must be maintained, retention periods, required documentation

## Penalties for Non-Compliance
Fines, penalties, consequences, and enforcement actions

## Sources
Relevant statutes, regulations, agency websites, and official resources

---
*This template guides AI parsing of compliance information*`
      }
    ];

    let createdCount = 0;
    
    for (const template of defaultTemplates) {
      // Check if template already exists
      const existing = await ctx.runQuery(api.complianceTemplates.getTemplateById, {
        templateId: template.templateId
      });

      if (!existing) {
        await ctx.runMutation(api.complianceTemplates.upsertTemplate, {
          templateId: template.templateId,
          title: template.title,
          description: template.description,
          markdownContent: template.markdownContent,
          topicKey: template.topicKey,
          isDefault: true,
          isActive: true,
        });
        
        createdCount++;
        console.log(`✅ Created template: ${template.title}`);
      }
    }

    console.log(`🎉 Template initialization complete. Created ${createdCount} new templates.`);
    return { success: true, templatesCreated: createdCount };
  },
});