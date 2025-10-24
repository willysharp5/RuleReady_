import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Get all compliance templates
export const getAllTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("complianceTemplates").collect();
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

// Get default templates
export const getDefaultTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("complianceTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();
  },
});

// Create or update a compliance template
export const upsertTemplate = mutation({
  args: {
    templateId: v.string(),
    topicKey: v.string(),
    topicName: v.string(),
    templateContent: v.string(),
    sections: v.object({
      overview: v.string(),
      coveredEmployers: v.string(),
      coveredEmployees: v.string(),
      employerResponsibilities: v.string(),
      trainingRequirements: v.optional(v.string()),
      trainingDeadlines: v.optional(v.string()),
      qualifiedTrainers: v.optional(v.string()),
      specialRequirements: v.optional(v.string()),
      coverageElection: v.optional(v.string()),
      reciprocity: v.optional(v.string()),
      employerDeadlines: v.string(),
      notificationRequirements: v.optional(v.string()),
      postingRequirements: v.optional(v.string()),
      recordkeepingRequirements: v.string(),
      penalties: v.string(),
      sources: v.string(),
    }),
    legalCounselNotes: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if template already exists
    const existing = await ctx.db
      .query("complianceTemplates")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing template
      await ctx.db.patch(existing._id, {
        topicName: args.topicName,
        templateContent: args.templateContent,
        sections: args.sections,
        legalCounselNotes: args.legalCounselNotes,
        isDefault: args.isDefault ?? existing.isDefault,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new template
      return await ctx.db.insert("complianceTemplates", {
        templateId: args.templateId,
        topicKey: args.topicKey,
        topicName: args.topicName,
        templateContent: args.templateContent,
        sections: args.sections,
        legalCounselNotes: args.legalCounselNotes,
        isDefault: args.isDefault ?? true,
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

// Initialize default templates for all topics
export const initializeDefaultTemplates = action({
  args: {},
  handler: async (ctx) => {
    console.log("🏗️ Initializing default compliance templates...");
    
    // Get all topics from the system
    const topics = await ctx.runQuery(internal.complianceQueries.getTopics);
    
    if (!topics || topics.length === 0) {
      throw new Error("No topics found in system");
    }

    let createdCount = 0;
    
    for (const topic of topics) {
        // Check if template already exists
        const existing = await ctx.runQuery(internal.complianceTemplates.getTemplateByTopic, {
          topicKey: topic.topicKey
        });

        if (!existing) {
          // Create default template for this topic
          const defaultTemplate = generateDefaultTemplate(topic.topicKey, topic.name);
          
          await ctx.runMutation(internal.complianceTemplates.upsertTemplate, {
            templateId: topic.topicKey,
            topicKey: topic.topicKey,
            topicName: topic.name,
            templateContent: defaultTemplate.content,
            sections: defaultTemplate.sections,
            legalCounselNotes: defaultTemplate.legalNotes,
            isDefault: true,
          });
        
        createdCount++;
        console.log(`✅ Created template for: ${topic.name}`);
      }
    }

    console.log(`🎉 Template initialization complete. Created ${createdCount} new templates.`);
    return { success: true, templatesCreated: createdCount };
  },
});

// Generate comprehensive legal counsel template for each topic
function generateDefaultTemplate(topicKey: string, topicName: string) {
  const templates = {
    minimum_wage: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on minimum wage compliance requirements.`,
      sections: {
        overview: `Minimum wage laws establish the lowest hourly rate that employers must pay to covered employees. These laws vary by jurisdiction and may include different rates for different employee categories (tipped employees, minors, etc.). Legal counsel should monitor changes to wage rates, which typically occur annually, and ensure client compliance with posting, recordkeeping, and payment requirements.`,
        
        coveredEmployers: `Employers subject to minimum wage requirements, including employee count thresholds, business size requirements, annual revenue minimums, and industry-specific coverage. Legal counsel should verify client coverage status and monitor threshold changes that may bring clients into or out of coverage.`,
        
        coveredEmployees: `Employees entitled to minimum wage protection, including full-time, part-time, temporary, and seasonal workers. Exemptions may apply for executive, administrative, professional, and outside sales employees. Special rates may apply for tipped employees, student workers, and employees under 20 years old.`,
        
        employerResponsibilities: `Employers must pay at least the minimum wage for all hours worked, maintain accurate time and payroll records, provide required wage statements, and ensure proper classification of employees. Legal counsel should advise on proper wage calculation methods, overtime integration, and handling of tips and commissions.`,
        
        employerDeadlines: `Regular payroll deadlines, annual wage rate updates (typically January 1), posting requirement updates, and any jurisdiction-specific compliance deadlines. Legal counsel should establish calendar reminders for rate changes and compliance reviews.`,
        
        postingRequirements: `Required workplace postings of current minimum wage rates, employee rights notices, and contact information for wage and hour enforcement agencies. Postings must be in languages spoken by employees and displayed in prominent locations.`,
        
        recordkeepingRequirements: `Maintain payroll records, time records, wage statements, and documentation of any wage deductions or tip reporting. Records typically must be retained for 3-4 years. Legal counsel should advise on record retention policies and audit preparation.`,
        
        penalties: `Violations may result in back wages, liquidated damages, civil penalties, and attorney fees. Repeat violations often carry enhanced penalties. Legal counsel should understand enforcement mechanisms and penalty calculation methods for risk assessment.`,
        
        sources: `Department of Labor websites, state labor department resources, wage and hour division contacts, relevant statutes and regulations, and official rate schedules. Legal counsel should bookmark official sources for rate updates and compliance guidance.`
      },
      legalNotes: `Legal counsel should pay special attention to: (1) Annual rate changes and effective dates, (2) Interaction with overtime laws, (3) Tip credit calculations and requirements, (4) Multi-state employer compliance obligations, (5) Industry-specific exemptions and special rates.`
    },

    overtime: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on overtime compliance requirements.`,
      sections: {
        overview: `Overtime laws require employers to pay premium rates (typically time-and-a-half) for hours worked beyond standard thresholds. Federal FLSA sets the baseline at 40 hours per week, but state laws may provide additional protections including daily overtime, double-time requirements, and different exemption criteria.`,
        
        coveredEmployers: `Employers subject to overtime requirements under federal FLSA and state laws. Coverage may depend on annual revenue thresholds, number of employees, or engagement in interstate commerce. Legal counsel should verify coverage under both federal and state laws.`,
        
        coveredEmployees: `Non-exempt employees entitled to overtime pay. Exemptions include executive, administrative, professional, computer, and outside sales employees who meet specific salary and duties tests. Legal counsel should regularly review employee classifications and salary thresholds.`,
        
        employerResponsibilities: `Properly classify employees as exempt or non-exempt, maintain accurate time records, calculate overtime pay correctly, and ensure timely payment. Legal counsel should advise on classification audits, time tracking systems, and overtime calculation methods including regular rate determination.`,
        
        employerDeadlines: `Regular payroll deadlines for overtime payments, annual salary threshold updates, and periodic classification reviews. Legal counsel should monitor DOL salary threshold changes and state law updates that may affect exemption status.`,
        
        recordkeepingRequirements: `Maintain detailed time and payroll records showing hours worked, overtime hours, regular and overtime rates, and total wages paid. Records must typically be retained for 3 years. Legal counsel should ensure systems capture all compensable time.`,
        
        penalties: `Violations may result in back wages, liquidated damages equal to unpaid wages, civil penalties, and attorney fees. Willful violations carry enhanced penalties and potential criminal liability. Legal counsel should understand enforcement priorities and penalty mitigation strategies.`,
        
        sources: `DOL Wage and Hour Division resources, state labor department guidance, FLSA regulations, state overtime laws, and current salary threshold announcements. Legal counsel should monitor both federal and state developments.`
      },
      legalNotes: `Legal counsel should focus on: (1) Regular review of exemption classifications, (2) Monitoring salary threshold changes, (3) State law variations and daily overtime requirements, (4) Proper regular rate calculations for overtime, (5) Compensable time policies including travel, training, and on-call time.`
    },

    harassment_training: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on harassment training compliance requirements.`,
      sections: {
        overview: `Harassment training laws require employers to provide anti-harassment and discrimination training to employees and supervisors. Requirements vary significantly by jurisdiction in terms of frequency, content, delivery methods, and covered employers. Legal counsel should ensure training programs meet all applicable requirements.`,
        
        coveredEmployers: `Employers required to provide harassment training, often based on employee count thresholds (commonly 5, 15, or 50 employees). Some jurisdictions require training regardless of size. Legal counsel should verify coverage requirements and monitor threshold changes.`,
        
        coveredEmployees: `Employees who must receive training, including regular employees, supervisors, managers, and sometimes independent contractors. Different training requirements may apply to supervisory vs. non-supervisory employees.`,
        
        employerResponsibilities: `Provide compliant training content, ensure proper delivery methods, maintain training records, and provide refresher training as required. Legal counsel should review training content for legal accuracy and completeness.`,
        
        trainingRequirements: `Specific content requirements including harassment definitions, complaint procedures, supervisor responsibilities, bystander intervention, and legal remedies. Training must often be interactive and jurisdiction-specific.`,
        
        trainingDeadlines: `Initial training deadlines for new employees (typically within 6 months of hire), periodic refresher training (annually or biannually), and supervisor training requirements (often within shorter timeframes).`,
        
        qualifiedTrainers: `Requirements for trainer qualifications, certification, or approval. Some jurisdictions require attorney-led training or state-approved training programs. Legal counsel should verify trainer credentials and program approval status.`,
        
        employerDeadlines: `New employee training deadlines, refresher training schedules, supervisor training requirements, and record retention deadlines. Legal counsel should establish tracking systems for compliance monitoring.`,
        
        recordkeepingRequirements: `Maintain records of training completion, dates, attendees, training content, and trainer qualifications. Records typically must be retained for 3-4 years and made available for inspection.`,
        
        penalties: `Violations may result in civil penalties, enhanced liability in harassment claims, and regulatory enforcement actions. Non-compliance may affect employer defenses in harassment litigation.`,
        
        sources: `State civil rights agencies, EEOC resources, approved training provider lists, and current training requirements. Legal counsel should monitor updates to training content requirements and approved provider status.`
      },
      legalNotes: `Legal counsel should emphasize: (1) Training content must be legally current and jurisdiction-specific, (2) Supervisor training often has enhanced requirements, (3) Record-keeping is critical for compliance defense, (4) Training must be provided in appropriate languages, (5) Regular review of training effectiveness and legal developments.`
    },

    paid_sick_leave: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on paid sick leave compliance requirements.`,
      sections: {
        overview: `Paid sick leave laws require employers to provide paid time off for employee illness, medical appointments, and family care. These laws vary significantly in accrual rates, usage requirements, carryover provisions, and covered employers. Legal counsel should monitor the rapidly evolving landscape of paid sick leave legislation.`,
        
        coveredEmployers: `Employers required to provide paid sick leave, often based on employee count, business location, or industry type. Thresholds vary widely by jurisdiction. Legal counsel should verify coverage requirements and monitor expansion of coverage requirements.`,
        
        coveredEmployees: `Employees entitled to paid sick leave, including full-time, part-time, and temporary workers. Exemptions may apply for certain industries, collective bargaining agreements, or employee categories. Legal counsel should review coverage determinations.`,
        
        employerResponsibilities: `Provide paid sick leave accrual, allow appropriate usage, maintain accurate records, provide required notices, and comply with anti-retaliation provisions. Legal counsel should establish compliant policies and procedures.`,
        
        employerDeadlines: `Policy implementation deadlines, notice requirements for new employees, annual carryover calculations, and reporting requirements. Legal counsel should establish compliance calendars and review cycles.`,
        
        notificationRequirements: `Required notices to employees about sick leave rights, accrual rates, usage procedures, and complaint processes. Notices must often be provided at hire, annually, and upon request.`,
        
        postingRequirements: `Workplace postings of sick leave rights, accrual information, and enforcement agency contact information. Postings must be in appropriate languages and prominently displayed.`,
        
        recordkeepingRequirements: `Maintain records of sick leave accrual, usage, balances, and employee requests. Records must typically be retained for 3-4 years and made available for employee inspection and regulatory audits.`,
        
        penalties: `Violations may result in back pay for denied leave, civil penalties, liquidated damages, and attorney fees. Anti-retaliation violations carry additional penalties. Legal counsel should understand enforcement mechanisms and penalty structures.`,
        
        sources: `State and local labor departments, sick leave enforcement agencies, current rate schedules, and model policies. Legal counsel should monitor legislative developments and enforcement guidance.`
      },
      legalNotes: `Legal counsel should monitor: (1) Rapid expansion of paid sick leave laws, (2) Interaction with other leave laws (FMLA, state family leave), (3) Accrual vs. front-loading options, (4) Carryover and payout requirements, (5) Anti-retaliation compliance and documentation.`
    },

    workplace_safety: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on workplace safety compliance requirements.`,
      sections: {
        overview: `Workplace safety laws require employers to provide safe working conditions and comply with occupational safety and health standards. Requirements include federal OSHA standards and state-specific safety regulations, with enhanced requirements for high-risk industries.`,
        
        coveredEmployers: `Employers subject to OSHA and state safety requirements. Most private employers are covered, with some exemptions for small employers or specific industries. Legal counsel should verify coverage under both federal and state programs.`,
        
        coveredEmployees: `All employees in covered workplaces, including full-time, part-time, temporary, and contract workers. Special protections may apply for workers in high-risk occupations or hazardous environments.`,
        
        employerResponsibilities: `Provide safe working conditions, comply with applicable safety standards, conduct required training, maintain safety records, report workplace injuries and illnesses, and investigate safety incidents. Legal counsel should ensure comprehensive safety program implementation.`,
        
        trainingRequirements: `Safety training requirements vary by industry and hazard exposure. May include general safety orientation, hazard-specific training, emergency procedures, and equipment operation training. Training must be provided in understandable languages.`,
        
        employerDeadlines: `Injury and illness reporting deadlines (typically 24-48 hours for serious incidents), annual safety program reviews, periodic training requirements, and inspection response deadlines.`,
        
        postingRequirements: `OSHA workplace safety posters, emergency contact information, safety policy summaries, and industry-specific safety notices. Postings must be current and prominently displayed.`,
        
        recordkeepingRequirements: `Maintain OSHA injury and illness logs, safety training records, incident investigation reports, and safety inspection documentation. Records must be retained for specified periods and made available for inspection.`,
        
        penalties: `OSHA violations can result in significant civil penalties, criminal liability for willful violations causing death, and potential business shutdowns for imminent dangers. Penalties are regularly increased and vary by violation severity.`,
        
        sources: `OSHA standards and guidance, state occupational safety agencies, industry-specific safety requirements, and current penalty schedules. Legal counsel should monitor regulatory updates and enforcement priorities.`
      },
      legalNotes: `Legal counsel should prioritize: (1) Industry-specific safety standards and high-risk activities, (2) Injury reporting and investigation procedures, (3) Employee safety training documentation, (4) Inspection readiness and response procedures, (5) Coordination between federal OSHA and state programs.`
    },

    family_leave: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on family and medical leave compliance requirements.`,
      sections: {
        overview: `Family and medical leave laws provide job-protected leave for qualifying family and medical reasons. Requirements include federal FMLA and state family leave laws, which may provide broader coverage, longer leave periods, or additional qualifying reasons.`,
        
        coveredEmployers: `Employers with 50 or more employees within 75 miles (FMLA) or state-specific thresholds. Some state laws cover smaller employers. Legal counsel should verify coverage under all applicable laws and monitor employee count changes.`,
        
        coveredEmployees: `Employees who have worked for at least 12 months and 1,250 hours (FMLA) or meet state-specific eligibility requirements. Legal counsel should verify eligibility calculations and document determinations.`,
        
        employerResponsibilities: `Provide eligible employees with leave, maintain health benefits during leave, restore employees to equivalent positions, provide required notices, and comply with anti-retaliation provisions. Legal counsel should ensure comprehensive leave administration.`,
        
        employerDeadlines: `Notice response deadlines, benefit continuation requirements, and return-to-work procedures. Legal counsel should establish clear timelines and communication procedures.`,
        
        notificationRequirements: `General FMLA notices, eligibility and rights notices, designation notices, and fitness-for-duty requirements. Legal counsel should ensure all required notices are provided timely and accurately.`,
        
        postingRequirements: `FMLA workplace posters and state family leave notices. Postings must be current and displayed prominently where employees can see them.`,
        
        recordkeepingRequirements: `Maintain leave requests, medical certifications, designation notices, and payroll records. Records must be kept confidentially and retained for at least 3 years.`,
        
        penalties: `Violations may result in back pay, liquidated damages, reinstatement, civil penalties, and attorney fees. Interference and retaliation violations carry additional penalties.`,
        
        sources: `DOL FMLA resources, state family leave agencies, current forms and notices, and regulatory guidance. Legal counsel should monitor both federal and state law developments.`
      },
      legalNotes: `Legal counsel should monitor: (1) Interaction between federal FMLA and state leave laws, (2) Medical certification requirements and procedures, (3) Intermittent leave administration, (4) Return-to-work and accommodation obligations, (5) Coordination with disability and workers' compensation laws.`
    },

    benefits_mandates: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on employee benefits mandate compliance.`,
      sections: {
        overview: `Benefits mandate laws require employers to provide specific employee benefits such as health insurance, retirement contributions, or other mandated benefits. Requirements vary by jurisdiction and may include coverage mandates, contribution requirements, and notice obligations.`,
        
        coveredEmployers: `Employers required to provide mandated benefits, often based on employee count thresholds, business size, or industry type. Legal counsel should verify coverage requirements and monitor threshold changes.`,
        
        coveredEmployees: `Employees entitled to mandated benefits, including eligibility requirements, waiting periods, and coverage levels. Legal counsel should review eligibility determinations and benefit calculations.`,
        
        employerResponsibilities: `Provide required benefits, make mandated contributions, maintain compliant benefit plans, provide required notices, and ensure proper benefit administration. Legal counsel should coordinate with benefit administrators and ensure compliance.`,
        
        employerDeadlines: `Benefit enrollment deadlines, contribution payment schedules, annual reporting requirements, and notice distribution deadlines. Legal counsel should establish compliance monitoring systems.`,
        
        notificationRequirements: `Required notices about benefit availability, enrollment procedures, employee rights, and plan changes. Legal counsel should ensure timely and accurate notice distribution.`,
        
        recordkeepingRequirements: `Maintain benefit enrollment records, contribution documentation, employee communications, and compliance reports. Records must be retained per applicable benefit law requirements.`,
        
        penalties: `Violations may result in benefit payment obligations, civil penalties, plan disqualification, and regulatory enforcement actions. Legal counsel should understand penalty structures and mitigation options.`,
        
        sources: `State insurance departments, benefit mandate agencies, current benefit requirements, and compliance guidance. Legal counsel should monitor legislative and regulatory developments.`
      },
      legalNotes: `Legal counsel should focus on: (1) Coordination with existing benefit plans and ERISA compliance, (2) State-specific mandate variations and requirements, (3) Employee communication and enrollment procedures, (4) Interaction with ACA and other federal benefit laws, (5) Compliance monitoring and reporting obligations.`
    },

    background_checks: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on background check compliance requirements.`,
      sections: {
        overview: `Background check laws regulate employer use of criminal history, credit reports, and other background information in employment decisions. Requirements include federal FCRA compliance, state and local ban-the-box laws, and industry-specific background check requirements.`,
        
        coveredEmployers: `Employers conducting background checks on job applicants or employees. Coverage may depend on employer size, industry type, or geographic location. Legal counsel should verify requirements under federal, state, and local laws.`,
        
        coveredEmployees: `Job applicants and employees subject to background checks. Different requirements may apply based on position type, security clearance needs, or access to sensitive information.`,
        
        employerResponsibilities: `Comply with FCRA requirements, follow ban-the-box procedures, provide required notices and authorizations, conduct individualized assessments, and maintain compliant background check policies. Legal counsel should ensure comprehensive compliance procedures.`,
        
        employerDeadlines: `Pre-adverse action notice requirements, waiting periods before final decisions, and response deadlines for applicant disputes. Legal counsel should establish clear timelines and procedures.`,
        
        notificationRequirements: `FCRA disclosure and authorization forms, pre-adverse action notices, final adverse action notices, and summary of rights documents. All notices must be clear, conspicuous, and provided at appropriate times.`,
        
        recordkeepingRequirements: `Maintain background check authorizations, reports, adverse action notices, and individualized assessment documentation. Records must be retained per FCRA and state law requirements.`,
        
        penalties: `FCRA violations can result in actual damages, statutory damages up to $1,000 per violation, punitive damages, and attorney fees. State and local violations may carry additional civil penalties.`,
        
        sources: `FCRA regulations, EEOC guidance on background checks, state and local ban-the-box laws, and industry-specific requirements. Legal counsel should monitor evolving fair chance legislation.`
      },
      legalNotes: `Legal counsel should focus on: (1) Individualized assessment requirements and documentation, (2) Timing of background check requests under ban-the-box laws, (3) FCRA notice and authorization compliance, (4) State and local law variations, (5) Industry-specific background check requirements.`
    },

    final_pay: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on final pay compliance requirements.`,
      sections: {
        overview: `Final pay laws establish deadlines for providing terminated employees with their final wages and accrued benefits. Requirements vary significantly by jurisdiction in timing, payment methods, and penalties for late payment.`,
        
        coveredEmployers: `All employers who terminate employees, regardless of size. Requirements apply to voluntary resignations, involuntary terminations, and layoffs. Legal counsel should understand jurisdiction-specific requirements.`,
        
        coveredEmployees: `All terminated employees, including full-time, part-time, temporary, and seasonal workers. Different deadlines may apply based on termination type (voluntary vs. involuntary).`,
        
        employerResponsibilities: `Provide final wages within required timeframes, include all earned wages and accrued benefits, use proper payment methods, and provide required wage statements. Legal counsel should establish compliant final pay procedures.`,
        
        employerDeadlines: `Final pay deadlines vary from immediately upon termination to the next regular payday, depending on jurisdiction and termination type. Legal counsel should create jurisdiction-specific deadline matrices.`,
        
        recordkeepingRequirements: `Maintain termination documentation, final pay calculations, benefit accrual records, and payment confirmations. Records should document compliance with timing requirements.`,
        
        penalties: `Late payment penalties often include waiting time penalties (additional wages for each day payment is late), civil penalties, and attorney fees. Some jurisdictions impose automatic daily penalties.`,
        
        sources: `State labor departments, wage and hour divisions, current final pay requirements, and penalty schedules. Legal counsel should monitor changes to payment deadlines and penalty structures.`
      },
      legalNotes: `Legal counsel should emphasize: (1) Jurisdiction-specific timing requirements and variations, (2) Calculation of accrued vacation and PTO, (3) Waiting time penalty exposure and calculation, (4) Payment method requirements and restrictions, (5) Documentation of timely payment compliance.`
    },

    equal_pay: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on equal pay compliance requirements.`,
      sections: {
        overview: `Equal pay laws prohibit wage discrimination based on protected characteristics and require equal pay for equal work or substantially similar work. Requirements include federal Equal Pay Act and state equal pay laws with varying standards and remedies.`,
        
        coveredEmployers: `Most employers are covered under federal and state equal pay laws. Coverage may vary based on employee count or business type. Legal counsel should verify coverage under all applicable laws.`,
        
        coveredEmployees: `All employees performing equal or substantially similar work. Legal counsel should understand job comparison standards and factors that may justify wage differences.`,
        
        employerResponsibilities: `Conduct pay equity audits, eliminate unjustified wage gaps, maintain compliant compensation practices, and provide required notices. Legal counsel should establish proactive pay equity compliance programs.`,
        
        employerDeadlines: `Pay equity audit deadlines, reporting requirements, and correction timelines. Legal counsel should establish regular review cycles and compliance monitoring.`,
        
        recordkeepingRequirements: `Maintain detailed compensation records, job descriptions, performance evaluations, and pay equity analysis documentation. Records must support compensation decisions and demonstrate compliance.`,
        
        penalties: `Violations may result in back pay, liquidated damages, civil penalties, and attorney fees. Some jurisdictions provide enhanced remedies and punitive damages for willful violations.`,
        
        sources: `EEOC equal pay guidance, state civil rights agencies, pay equity legislation, and compliance resources. Legal counsel should monitor evolving equal pay legislation and enforcement priorities.`
      },
      legalNotes: `Legal counsel should prioritize: (1) Regular pay equity audits and gap analysis, (2) Job evaluation and comparison methodologies, (3) Documentation of legitimate pay differentials, (4) Salary history inquiry restrictions, (5) Proactive compliance and risk mitigation strategies.`
    },

    posting_requirements: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on workplace posting compliance requirements.`,
      sections: {
        overview: `Workplace posting laws require employers to display various federal, state, and local notices informing employees of their rights. Posting requirements are numerous, frequently updated, and vary by jurisdiction, industry, and employer size.`,
        
        coveredEmployers: `Most employers must display federal posters, with additional state and local requirements based on location, employee count, and industry. Legal counsel should maintain current posting matrices for all client locations.`,
        
        coveredEmployees: `All employees must have access to required postings. Postings must be in languages spoken by employees and accessible to all workers including remote employees.`,
        
        employerResponsibilities: `Display current versions of all required posters, update postings when laws change, provide postings in appropriate languages, and ensure visibility to all employees. Legal counsel should establish posting update procedures.`,
        
        employerDeadlines: `Immediate posting requirements for new laws, annual updates for rate changes, and replacement deadlines for outdated notices. Legal counsel should monitor posting update requirements.`,
        
        postingRequirements: `Federal posters (FLSA, FMLA, EEO, OSHA, etc.), state-specific posters, local ordinance notices, and industry-specific requirements. Legal counsel should maintain comprehensive posting checklists.`,
        
        recordkeepingRequirements: `Maintain records of posting updates, language translations, and compliance verification. Document posting compliance for audit and enforcement purposes.`,
        
        penalties: `Violations may result in civil penalties for each missing or outdated poster. Penalties can accumulate quickly across multiple posting requirements and locations.`,
        
        sources: `DOL poster requirements, state labor departments, local government posting requirements, and commercial poster services. Legal counsel should establish reliable update notification systems.`
      },
      legalNotes: `Legal counsel should establish: (1) Comprehensive posting matrices for all client locations, (2) Automated update notification systems, (3) Multi-language posting requirements, (4) Remote employee posting obligations, (5) Regular compliance audits and verification procedures.`
    },

    workers_compensation: {
      content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on workers' compensation compliance requirements.`,
      sections: {
        overview: `Workers' compensation laws require employers to provide insurance coverage for work-related injuries and illnesses. Requirements include mandatory coverage, premium payments, claims administration, and return-to-work programs.`,
        
        coveredEmployers: `Most employers are required to carry workers' compensation insurance, with exemptions varying by jurisdiction for small employers, certain industries, or business types. Legal counsel should verify coverage requirements and exemption eligibility.`,
        
        coveredEmployees: `Most employees are covered, with exemptions for independent contractors, certain executives, and some industry-specific workers. Legal counsel should ensure proper worker classification and coverage determinations.`,
        
        employerResponsibilities: `Maintain current workers' compensation coverage, report workplace injuries promptly, cooperate with claims administration, provide required notices, and implement return-to-work programs. Legal counsel should ensure comprehensive compliance procedures.`,
        
        employerDeadlines: `Injury reporting deadlines (typically 24-48 hours), premium payment schedules, and annual coverage renewals. Legal counsel should establish incident reporting and claims management procedures.`,
        
        notificationRequirements: `Post workers' compensation coverage information, provide claim filing procedures, and notify employees of their rights. Legal counsel should ensure all required notices are current and properly displayed.`,
        
        recordkeepingRequirements: `Maintain injury logs, incident reports, claims documentation, and coverage verification. Records must be retained per regulatory requirements and made available for inspection.`,
        
        penalties: `Violations may result in civil penalties, criminal liability for willful non-coverage, and personal liability for benefits. Legal counsel should understand penalty structures and compliance requirements.`,
        
        sources: `State workers' compensation agencies, insurance requirements, current coverage mandates, and penalty schedules. Legal counsel should monitor regulatory changes and coverage requirements.`
      },
      legalNotes: `Legal counsel should focus on: (1) Proper worker classification and coverage requirements, (2) Prompt injury reporting and claims administration, (3) Return-to-work program implementation, (4) Coordination with other leave and disability laws, (5) Premium audit and cost control strategies.`
    }
  };

  // Return the specific template or a generic one
  return templates[topicKey as keyof typeof templates] || {
    content: `${topicName} Compliance Template

This template provides comprehensive guidance for legal counsel on ${topicName.toLowerCase()} compliance requirements.`,
    sections: {
      overview: `Overview of ${topicName.toLowerCase()} requirements and legal framework. Legal counsel should monitor changes to applicable laws and regulations.`,
      coveredEmployers: `Employers subject to ${topicName.toLowerCase()} requirements. Legal counsel should verify client coverage status and monitor threshold changes.`,
      coveredEmployees: `Employees covered by ${topicName.toLowerCase()} protections. Legal counsel should review coverage determinations and exemptions.`,
      employerResponsibilities: `Specific actions employers must take to comply with ${topicName.toLowerCase()} requirements. Legal counsel should ensure comprehensive policy implementation.`,
      employerDeadlines: `Key deadlines and timing requirements for ${topicName.toLowerCase()} compliance. Legal counsel should establish compliance calendars.`,
      recordkeepingRequirements: `Required documentation and record retention for ${topicName.toLowerCase()} compliance. Legal counsel should advise on record retention policies.`,
      penalties: `Potential penalties and enforcement actions for ${topicName.toLowerCase()} violations. Legal counsel should understand risk assessment and mitigation strategies.`,
      sources: `Official resources and regulatory guidance for ${topicName.toLowerCase()} compliance. Legal counsel should monitor regulatory updates.`
    },
    legalNotes: `Legal counsel should monitor developments in ${topicName.toLowerCase()} law and ensure client policies remain current and compliant.`
  };
}
