import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Comprehensive template generation for all compliance topics
 * Created by legal counsel perspective for small business use
 */
export const seedAllComplianceTemplates = action({
  handler: async (ctx) => {
    console.log("🏗️ Generating comprehensive templates for all topics...");
    
    const templates = [
      // ==================== WAGES & HOURS ====================
      
      // 1. Minimum Wage - Detailed
      {
        templateId: "minimum_wage_detailed",
        title: "Minimum Wage Compliance Guide",
        description: "Comprehensive minimum wage requirements for small businesses",
        topicSlug: "minimum-wages",
        markdownContent: `# Minimum Wage Compliance Guide

## Quick Overview
What is the current minimum wage requirement and who does it apply to?

## Covered Employers
- Business size thresholds (number of employees, annual revenue)
- Industry-specific requirements
- Interstate commerce considerations
- Agricultural vs. non-agricultural distinctions

## Covered Employees
- Full-time, part-time, and temporary workers
- **Exemptions**: Executive, administrative, professional, outside sales
- Special categories: Students, learners, apprentices
- Tipped employees (see separate tip credit rules)

## Current Wage Rates
### Standard Rates
- Federal minimum wage: $X.XX/hour
- State minimum wage: $X.XX/hour (if higher, state prevails)
- City/local minimum wage: $X.XX/hour

### Special Rates
- Tipped employees: Minimum cash wage + tips
- Youth/training wages: Rates for workers under 20
- Subminimum wages: For certain disabled workers (certificate required)

## Employer Action Steps
1. **Determine applicable rate** - Use highest of federal/state/local
2. **Review employee classifications** - Ensure proper exempt/non-exempt status
3. **Adjust payroll** - Before effective date
4. **Update employment contracts** - Reflect new rates
5. **Post required notices** - Display minimum wage posters

## Effective Dates & Increases
- When do rate changes take effect?
- Scheduled future increases
- Cost of living adjustments (COLA) schedules
- Notice requirements before rate changes

## Posting & Notice Requirements
- **Required posters**: State and federal minimum wage notices
- **Location**: Conspicuous location accessible to all employees
- **Languages**: Required translations based on workforce
- **Employee notification**: Individual notice requirements for rate changes

## Recordkeeping Requirements
- **Maintain for X years**:
  - Time and pay records
  - Work schedules
  - Wage rate documentation
  - Employee classification decisions
- **Required format**: Paper or electronic acceptable
- **Access rights**: Employee and government inspection rights

## Penalties for Non-Compliance
### Civil Penalties
- Back wages owed + interest
- Liquidated damages (equal to back wages)
- Civil fines per violation
- Repeat violation penalties (increased amounts)

### Criminal Penalties
- Willful violations may result in criminal charges
- Fines up to $X,XXX
- Potential imprisonment for repeated violations

### Other Consequences
- Class action lawsuit exposure
- FLSA collective actions
- State labor agency enforcement
- Negative publicity and reputational damage

## Sources & Resources
- **Federal**: DOL Wage and Hour Division
- **State**: State Department of Labor
- **Local**: City/county labor standards office
- **Official Posters**: [Link to poster downloads]
- **Fact Sheets**: WHD Fact Sheet #X

---
*Use this template to ensure AI provides comprehensive minimum wage guidance for your jurisdiction*`
      },
      
      // 2. Overtime & Hours
      {
        templateId: "overtime_comprehensive",
        title: "Overtime & Hours Compliance Template",
        description: "Complete guide to overtime pay and working hours requirements",
        topicSlug: "overtime-hours",
        markdownContent: `# Overtime & Hours Compliance Template

## Quick Overview
When must employees be paid overtime, and at what rate?

## Covered Employers
- **FLSA Coverage**: $500,000+ annual revenue OR interstate commerce
- State law coverage (often broader than federal)
- Industry-specific applications
- Small business considerations

## Covered Employees (Non-Exempt)
### Who MUST Receive Overtime
- Hourly employees
- Non-exempt salaried employees (paid less than $X salary threshold)
- Blue-collar workers (regardless of salary)
- First responders, paramedics

### Who is EXEMPT (No Overtime Required)
- **Executive Exemption**: Managers meeting duties + salary test
- **Administrative Exemption**: Office workers with discretion
- **Professional Exemption**: Learned professions, creative professionals
- **Computer Employee Exemption**: IT professionals
- **Outside Sales Exemption**: Sales employees working outside office
- **Highly Compensated Employees**: $X+ annually

## Overtime Rate Requirements
### Federal Standard (FLSA)
- **Trigger**: Hours worked over 40 in a workweek
- **Rate**: Time-and-a-half (1.5x regular rate)
- **Calculation**: Include all compensation (bonuses, commissions)

### State Variations
- **Daily overtime**: Some states require OT after 8 hours/day
- **Double time**: Required after X hours/day or 7th consecutive day
- **Higher thresholds**: State-specific triggers

## Regular Rate Calculation
What must be included:
- Base hourly wage or salary equivalent
- Non-discretionary bonuses
- Shift differentials
- Production bonuses
- Commissions

What can be excluded:
- Discretionary bonuses
- Gifts and special occasion bonuses
- Reimbursed expenses
- Premium pay for weekends/holidays (if 1.5x+ already)

## Maximum Hours Restrictions
- Are there limits on hours worked per day/week?
- Required rest periods between shifts
- Industry-specific restrictions (healthcare, transportation)
- Minor employee restrictions

## Compensable Time
### Must Pay For:
- All hours worked (including unauthorized OT)
- Pre-shift and post-shift duties
- On-call time if restricted
- Training time (if job-related and mandatory)
- Meal breaks if employee works through them

### Need Not Pay For:
- Bona fide meal breaks (30+ minutes, fully relieved)
- Commuting time (with exceptions)
- On-call time if truly free
- Voluntary training outside hours

## Employer Action Steps
1. **Classify employees correctly** - Document exemption analysis
2. **Track all hours worked** - Accurate timekeeping systems
3. **Calculate regular rate properly** - Include all compensation
4. **Pay overtime promptly** - On regular payday
5. **Implement policies** - Unauthorized overtime, approval procedures
6. **Train managers** - On overtime rules and recordkeeping

## Recordkeeping Requirements
**Must maintain for 3 years**:
- Employee identifying information
- Hours worked each day and workweek total
- Regular hourly rate
- Total overtime hours and overtime pay
- Basis for different pay rates

## Common Violations to Avoid
- ❌ Misclassifying employees as exempt
- ❌ Off-the-clock work
- ❌ Failing to pay for all time worked
- ❌ Improper regular rate calculation
- ❌ Comp time instead of overtime pay (private sector)
- ❌ Averaging hours across workweeks

## Penalties for Non-Compliance
- Back wages + liquidated damages (double damages)
- Civil penalties up to $X,XXX per violation
- Willful violations: 2 years → 3 years statute of limitations
- Individual manager liability possible
- Class/collective action exposure

## Sources & Resources
- FLSA Section 7 (Overtime)
- 29 CFR Part 541 (Exemptions)
- State labor code sections
- WHD Fact Sheets #17 (Exemptions), #21 (Regular Rate), #23 (Overtime)

---
*This template helps AI provide accurate overtime guidance for your specific situation*`
      },
      
      // 3. Meal & Rest Breaks
      {
        templateId: "meal_rest_breaks_detailed",
        title: "Meal & Rest Breaks Compliance Template",
        description: "Complete guide to required meal periods and rest breaks",
        topicSlug: "meal-rest-breaks",
        markdownContent: `# Meal & Rest Breaks Compliance Template

## Quick Overview
What meal periods and rest breaks are required based on hours worked?

## Covered Employers
- **Federal**: No federal requirement for breaks (but if provided, rules apply)
- **State Requirements**: Varies by state - some mandate breaks
- Industry considerations (healthcare, manufacturing)
- Size thresholds (some states exempt small businesses)

## Covered Employees
- Generally applies to all non-exempt employees
- Special rules for minors (more protective)
- Industry-specific exceptions (healthcare, emergency personnel)

## Meal Break Requirements
### State-Specific Rules
- **Trigger**: After X hours of work (typically 5-6 hours)
- **Duration**: Minimum 30 minutes unpaid
- **Second meal**: After X hours (typically 10-12 hours)
- **On-duty meals**: When permitted and how to compensate

### Meal Break Must Be:
- At least 30 minutes duration
- **Uninterrupted**: Free from all duties
- **Off premises permitted**: Employee can leave workplace
- Not required to be paid (if truly relieved of duties)

### When Meal Breaks Must Be Paid:
- Employee performs any duties during break
- Employee must remain on premises and on-call
- Break is shorter than 30 minutes
- Employer doesn't relieve employee of all duties

## Rest Break Requirements
### Typical State Requirements
- **Frequency**: One 10-minute break per 4 hours worked
- **Paid**: Rest breaks must be compensated
- **Cannot be waived**: Even by mutual agreement
- **Timing**: Middle of work period when practicable

## Break Timing Requirements
- When during shift must breaks be provided?
- Can breaks be combined or skipped?
- Scheduling requirements (not at start/end of shift)

## Employer Responsibilities
1. **Provide opportunity** - Authorize and permit breaks
2. **Schedule appropriately** - Space breaks throughout shift
3. **Relieve employees** - Completely free from duties (meal breaks)
4. **Keep records** - Document break times
5. **Post notices** - Inform employees of break rights
6. **Train supervisors** - On proper break administration

## Break Waivers
### Meal Break Waivers
- Some states allow waiver if shift ≤ X hours
- Must be mutual agreement in writing
- Revocable by employee
- Limited circumstances

### Rest Breaks
- Generally cannot be waived
- Required by state law where applicable

## Special Situations
### Lactation Breaks
- **Federal requirement**: Reasonable break time for nursing mothers
- Duration: Typically up to 1 year post-childbirth
- Private space required (not bathroom)
- May be unpaid if beyond normal break time

### Minor Employee Breaks
- More frequent breaks required
- Longer duration requirements
- Cannot be waived

## Penalties for Break Violations
### State-Specific Penalties
- **California**: 1 hour of pay at regular rate per violation per day
- **Other states**: Varies - criminal penalties, civil fines
- **FLSA violations**: If breaks are improperly unpaid

### Exposure Risks
- Class action lawsuits (very common for break violations)
- PAGA claims (California)
- State labor agency enforcement
- Private attorney general actions

## Common Violations to Avoid
- ❌ Not providing required breaks
- ❌ Interrupting employee meal breaks
- ❌ Requiring employees to stay on-call during meals
- ❌ Failing to pay for short breaks
- ❌ Not providing lactation breaks
- ❌ Automatic lunch deductions when employees work through meals

## Recordkeeping Requirements
- Document actual break times taken
- Meal break waiver agreements (where permitted)
- Employee acknowledgments of break policies
- Maintain for X years per state requirement

## Best Practices
1. Written break policies clearly stating rights
2. Supervisors trained to ensure breaks provided
3. Time clock systems that track breaks
4. Regular audits of time records
5. Discipline for non-compliance (both directions)

## Sources & Resources
- State labor code break provisions
- State labor commissioner guidance
- Industry-specific regulations
- Poster requirements with break information

---
*This template ensures AI provides break law guidance tailored to your state and industry*`
      },
      
      // 4. Final Pay / Vacation Payout
      {
        templateId: "final_pay_comprehensive",
        title: "Final Pay & Vacation Payout Template",
        description: "Final paycheck timing and vacation/PTO payout requirements",
        topicSlug: "final-pay-vacation-payout",
        markdownContent: `# Final Pay & Vacation Payout Compliance Template

## Quick Overview
When must final paychecks be issued, and must accrued vacation be paid out?

## Covered Employers
- All employers (federal and state requirements)
- State-specific variations in timing
- No minimum size thresholds
- Applies regardless of reason for termination

## Covered Employees
- All employees receiving final paycheck
- Full-time, part-time, temporary, seasonal
- Applies to voluntary quits and involuntary terminations

## Final Paycheck Timing Requirements
### Involuntary Termination (Fired/Laid Off)
- **Federal**: Next regular payday
- **State variations**: 
  - Immediately at termination (some states)
  - Within 24-72 hours (other states)
  - Next regular payday or within X days

### Voluntary Resignation
- **Notice provided**: Payment due on last day or within X days
- **No notice**: Payment due within X days or next regular payday
- State-specific timing varies significantly

### Different Scenarios
- Resignation with 72+ hours notice
- Resignation with less notice
- Termination for cause
- Layoff/reduction in force
- Retirement
- Death of employee (payment to estate)

## What Must Be Included in Final Pay
### Required Payments
- All wages for time worked through separation
- Accrued but unpaid vacation/PTO (where required)
- Earned commissions
- Accrued bonuses earned but not yet paid
- Unreimbursed business expenses

### Permissible Deductions
- Authorized deductions (insurance, 401k, etc.)
- Overpayment recovery (with limits)
- Unreturned property (if authorized)
- Loans/advances (if agreed in writing)

## Vacation/PTO Payout Requirements
### States Requiring Payout ("Use It or Lose It" Prohibited)
- Accrued vacation MUST be paid as wages
- Cannot have forfeiture policies
- Pro-rata accrual through final day
- Payment at final rate of pay

### States Allowing Forfeiture
- May implement "use it or lose it" policies
- Reasonable caps on accrual permitted
- Clear policy required before hire
- Applied uniformly

### Sick Leave vs. Vacation
- Sick leave: Generally not required to be paid out
- PTO (combined bank): May be treated as vacation
- Separate banks: Different rules apply

## Unlimited PTO Policies
- How to handle at termination
- Pro-rata calculation challenges
- Best practices for policy language
- Emerging case law considerations

## Payment Method Requirements
- Must use employee's normal payment method
- Direct deposit (if previously authorized)
- Paycheck delivery vs. mail timing
- Handling unreturned company property

## Penalties for Late Payment
### Waiting Time Penalties (California Example)
- Full day's wages for each day late
- Up to 30 days of continued wages
- Automatic - no need to request

### Other State Penalties
- Statutory penalties per day late
- Attorney fees if employee must sue
- Interest on unpaid wages
- Treble damages for willful violations

## Final Pay Scenarios
### Immediate Termination
- Must issue check on spot or within hours (state-specific)
- Have blank checks available or pay card system
- Cannot delay for property return or forms

### Employee Quits Without Notice
- State deadlines typically longer
- Payment method considerations
- Cannot withhold as punishment

### Mutual Separation Agreement
- Final pay timing still applies
- Severance separate from earned wages
- Release consideration timing

## Common Violations to Avoid
- ❌ Delaying final check beyond state deadline
- ❌ Withholding pay for unreturned property (without authorization)
- ❌ Failing to pay accrued vacation where required
- ❌ Incorrect PTO accrual calculation
- ❌ Improper deductions from final pay
- ❌ Sending final check to wrong address

## Special Situations
- Remote employees (state determination)
- Multi-state employees (which law applies)
- Death of employee (estate claims, timing)
- Disputed amounts (pay undisputed portion timely)

## Recordkeeping
- Documentation of termination date and reason
- Final pay calculation worksheets
- Proof of timely payment delivery
- Employee acknowledgment of receipt
- Accrual balance records

## Sources & Resources
- State wage payment and collection statutes
- Final pay timing requirements by state
- State labor agency guidance on final pay
- Vacation payout requirement charts

---
*This template provides AI with framework for jurisdiction-specific final pay guidance*`
      },
      
      // 5. Pay Frequency
      {
        templateId: "pay_frequency_guide",
        title: "Pay Frequency & Payday Timing Requirements",
        description: "Legal requirements for pay periods and payday schedules",
        topicSlug: "pay-frequency-payday-timing",
        markdownContent: `# Pay Frequency & Payday Timing Requirements

## Quick Overview
How often must employees be paid, and when are paydays required?

## Covered Employers
- All private employers
- State-specific requirements (vary significantly)
- Federal contractors (additional requirements)
- No size exemptions

## Covered Employees
- Different rules by employee type:
  - Executive/administrative/professional
  - Manual laborers
  - Commissioned sales employees
  - Temporary employees

## Minimum Pay Frequency Requirements
### By State (Examples)
- **Weekly**: Employee must be paid at least once per week
- **Bi-weekly**: Every two weeks
- **Semi-monthly**: Twice per month (e.g., 15th and last day)
- **Monthly**: Once per month (typically for exempt employees only)

### By Employee Classification
- Manual laborers: Often weekly requirement
- Non-manual employees: May be semi-monthly or monthly
- Commissioned employees: May be monthly
- Executive/professional: Usually monthly permitted

## Payday Timing Requirements
### Regular Payday Rules
- Must establish regular paydays
- Payday must be within X days of period end
- Cannot change paydays arbitrarily
- Notice required before changing schedule

### What if Payday Falls on Weekend/Holiday?
- Must pay on preceding business day (most states)
- Some states allow following business day
- Cannot delay to next regular payday

## Payment Method Requirements
### Acceptable Methods
- **Cash**: Allowed but not required
- **Check**: Traditional default
- **Direct deposit**: With employee authorization
- **Pay card**: With employee agreement and access

### Direct Deposit Rules
- Must be voluntary (employee authorization)
- Employee choice of financial institution
- Cannot mandate specific bank
- Revocable authorization

### Pay Card Requirements
- Immediate access to full wages without fee
- Free withdrawal method required
- Alternative payment method must be offered
- State-specific restrictions apply

## Employee Notification Requirements
### Required Information
- Designated paydays (in advance)
- Pay period covered
- Pay rate and hours
- Deductions itemized
- Year-to-date totals

### Pay Stub Requirements
- Must provide itemized statement
- Electronic or paper
- Maintained by employee or employer
- Specific data elements required by state

## Changing Pay Frequency
### Requirements
- Advance notice to employees (X days)
- May not reduce frequency below state minimum
- Cannot skip a payday during transition
- Written policy recommended

## Penalties for Violations
### Late Payment Penalties
- Waiting time penalties (some states)
- Interest on late wages
- Attorney fees if employee must sue
- Administrative penalties from labor agency

### Pay Frequency Violations
- Per-employee penalties
- Per-pay-period penalties
- Good faith defense may not apply

## Special Considerations
### Final Paychecks
- Subject to stricter timing (see separate final pay template)
- Often required sooner than regular paydays

### Commission Employees
- Different payment schedules permitted
- Must be paid at least monthly in most states
- Clear commission agreement required

### Remote Employees
- Which state law applies?
- Multi-state considerations
- Payment timing across time zones

## Common Violations to Avoid
- ❌ Paying less frequently than state minimum
- ❌ Delaying payday beyond permitted window
- ❌ Mandating specific bank for direct deposit
- ❌ Charging fees for pay card access
- ❌ Not providing required pay stubs
- ❌ Changing paydays without notice

## Best Practices
1. Choose most generous frequency if multi-state
2. Establish clear written pay schedule
3. Ensure payroll processing meets deadlines
4. Provide pay stubs electronically or on paper
5. Document all pay frequency policies
6. Communicate changes well in advance

## Sources & Resources
- State wage payment statutes
- Pay frequency requirements by state
- DOL guidance on payment methods
- State labor agency FAQs

---
*This template enables AI to provide specific payday and frequency requirements for your jurisdiction*`
      },
      
      // 6. Tip Credit / Tipped Employees
      {
        templateId: "tip_credit_comprehensive",
        title: "Tip Credit & Tipped Employees Compliance",
        description: "Requirements for tip credits, cash wages, and tip pooling",
        topicSlug: "tip-credit-tipped-employees",
        markdownContent: `# Tip Credit & Tipped Employees Compliance

## Quick Overview
When can employers take a tip credit, and what are the requirements?

## Covered Employers
- Restaurant, food service, hospitality businesses
- Any business with tipped employees
- Federal and state requirements both apply
- Use more protective law (higher cash wage requirement)

## Who is a "Tipped Employee"?
- Customarily and regularly receives $30+/month in tips (federal)
- State thresholds may differ
- Dual jobs analysis (server vs. prep cook)
- 80/20 Rule: Tipped duties vs. non-tipped duties

## Tip Credit Basics
### Federal Rules (FLSA)
- Minimum cash wage: $2.13/hour (as of last update)
- Maximum tip credit: $5.12/hour
- Total must equal federal minimum wage ($7.25)
- Tips make up the difference

### State Variations
- Some states prohibit tip credits entirely
- Higher cash wage requirements
- Different tip thresholds
- More restrictive tip pooling rules

## Cash Wage Requirements
- Minimum direct cash wage employer must pay
- Cannot go below state/federal minimum
- Tips must bring total to full minimum wage
- Employer must make up shortfall if tips insufficient

## Tip Credit Notice Requirements
### Must Inform Employees:
- Amount of cash wage paid
- Amount of tip credit claimed
- Tips belong to employee
- Tip pooling arrangements
- Notice must be provided **before** taking tip credit

### Notice Format
- Written or verbal (written recommended)
- At time of hire
- When tip credit policy changes
- Should be acknowledged by employee

## Tip Pooling Rules
### Valid Tip Pools
- Can include: Servers, bussers, bartenders, hosts
- Cannot include: Managers, supervisors, back-of-house (in many states)
- Must be customarily tipped positions
- Reasonable distribution

### Invalid Tip Pools
- Including non-tipped employees
- Managers participating (even if they serve)
- Excessive amounts retained by house
- Tip pools with employees earning full minimum (recent federal changes)

## Service Charges vs. Tips
- **Tips**: Voluntary, belong to employee
- **Service charges**: Mandatory, belong to employer (unless distributed)
- Auto-gratuities: Often treated as service charges
- Must clarify to customers which applies

## Dual Jobs & 80/20 Rule
### When Tip Credit Lost:
- Tipped employee performs non-tipped work
- Exceeds 20% of hours OR 30 consecutive minutes
- Must pay full minimum wage for that time
- Examples: Extensive prep work, cleaning, maintenance

### Recent DOL Guidance
- 80/20 rule updates (December 2021)
- Directly supporting vs. preparatory work
- Tracking requirements

## Credit Card Tips
- Must pay full tip amount to employee
- Cannot deduct credit card processing fees from tips
- Must pay tips by next regular payday
- Electronic tips same rules as cash tips

## Tip Retention and Ownership
- Tips belong exclusively to employees
- Employers cannot keep any portion
- No "tip outs" to the house
- Manager/supervisor prohibition

## Recordkeeping Requirements
**Must Document:**
- Tips received (employee reports)
- Cash wages paid
- Tip credit amount taken
- Tip pool distributions
- Employee acknowledgments of tip credit notice
- Hours worked in tipped vs. non-tipped capacity

**Retention**: 3 years minimum

## Common Violations to Avoid
- ❌ Taking tip credit without proper notice
- ❌ Managers/supervisors in tip pools
- ❌ Deducting credit card fees from tips
- ❌ Keeping any portion of employee tips
- ❌ Failing to make up shortfall when tips < minimum wage
- ❌ Taking tip credit for excessive non-tipped work
- ❌ Misclassifying service charges as tips

## Penalties for Violations
- Back wages for improper tip credit
- Liquidated damages (double back wages)
- Civil penalties per violation
- Criminal penalties for willful violations
- Individual manager liability
- Class action exposure (very common)

## State-Specific Considerations
### States Prohibiting Tip Credits:
- California, Nevada, Oregon, Washington, Montana, Minnesota, Alaska
- Employers must pay full minimum wage + tips

### States Allowing with Restrictions:
- Specific cash wage minimums
- Different tip thresholds
- Stricter tip pooling rules

## Sources & Resources
- FLSA Section 3(m) - Tip Credit Provisions
- 29 CFR 531 - Wage Payments Under FLSA
- State minimum wage and tip credit statutes
- DOL Field Operations Handbook
- WHD Fact Sheet #15 (Tipped Employees)

---
*This template provides AI with comprehensive tip credit guidance for restaurant and service employers*`
      },
      
      // ==================== LEAVE & BENEFITS ====================
      
      // 7. Paid Family / Medical Leave (PFML)
      {
        templateId: "pfml_comprehensive",
        title: "Paid Family & Medical Leave (PFML) Compliance",
        description: "State paid leave programs and employer obligations",
        topicSlug: "paid-family-medical-leave-pfml",
        markdownContent: `# Paid Family & Medical Leave (PFML) Compliance

## Quick Overview
What paid family and medical leave programs exist, and what are employer obligations?

## Covered Employers
- State-specific programs (not all states have PFML)
- Employee threshold requirements (e.g., 1+ employees, 50+ employees)
- Public vs. private sector
- Non-profit organizations
- Self-employed optional coverage

## Covered Employees
- Minimum hours worked or wages earned thresholds
- Length of employment requirements
- Part-time vs. full-time eligibility
- Multiple employer situations

## Types of Leave Covered
### Family Leave
- Bonding with new child (birth, adoption, foster)
- Caring for family member with serious health condition
- Military exigency (family member on active duty)
- Duration: Typically 12 weeks

### Medical Leave
- Employee's own serious health condition
- Pregnancy and childbirth recovery
- Duration: Typically 12-26 weeks depending on state

### Definitions
- "Serious health condition" criteria
- "Family member" - spouse, child, parent (some states include grandparents, siblings, in-laws)

## Benefit Structure
### Employee Benefits
- Percentage of wages replaced (typically 60-90%)
- Maximum weekly benefit caps
- Minimum benefit amounts
- Waiting periods (elimination periods)

### Benefit Calculation
- Based on recent wages (prior 4-8 quarters)
- High quarter method vs. average wages
- Part-time employee calculations

## Employer Contributions
### Payroll Tax
- Employer portion: X% of wages up to cap
- Employee portion: X% of wages
- Wage base limits
- Quarterly filing requirements

### Collection and Remittance
- Withholding from employee paychecks
- Quarterly reporting deadlines
- Annual reconciliation
- Penalties for late payment

## Job Protection
- Same or comparable position upon return
- Health benefits maintained during leave
- Seniority accrual
- Cannot terminate because of leave usage

## Employer Notification Requirements
### To Employees
- Post workplace notices about rights
- Provide written guidance on how to apply
- Notice of payroll deductions
- Annual statements of contributions

### From Employees
- Advance notice requirements (when foreseeable)
- Medical certification (when required)
- Periodic status updates
- Intent to return notification

## Interaction with FMLA
- PFML runs concurrently with FMLA (if applicable)
- Additional time beyond FMLA in some states
- Same qualifying reasons often overlap
- Employer size differences (FMLA: 50+, PFML: varies)

## Employer Action Steps
1. **Determine if state has PFML** - Check state adoption
2. **Register with state agency** - Obtain employer account
3. **Set up payroll deductions** - Withhold employee contributions
4. **Post required notices** - Workplace and online postings
5. **Train HR/managers** - On leave rights and process
6. **Update employee handbook** - Include PFML information
7. **Coordinate with other leave** - FMLA, state disability, sick leave

## Private Plan Option
### States Allowing Private Plans
- Employer can offer equivalent or better benefits
- Must apply for state approval
- Cost neutrality requirements
- Employee vote may be required
- Annual renewal and reporting

### Advantages
- Integrate with existing benefits
- Potentially lower costs
- Simplified administration
- Custom design

## Intermittent Leave
- Taking leave in increments (hours or days)
- Employer can require minimum increment
- Scheduling requirements
- Documentation needed

## Retaliation Prohibition
### Protected Activities
- Applying for benefits
- Taking leave
- Opposing violations
- Testifying in proceedings

### Prohibited Actions
- Termination
- Demotion
- Reduction in hours/pay
- Adverse employment action

## Penalties for Non-Compliance
- Failure to withhold/remit taxes: Penalties + interest
- Failure to provide job protection: Back pay, reinstatement
- Retaliation: Compensatory and punitive damages
- Failure to post notices: Civil penalties

## State Program Examples
- **California**: PFL + SDI programs
- **New York**: Paid Family Leave
- **Massachusetts**: PFML
- **New Jersey**: Family Leave Insurance + TDI
- **Washington**: Paid Family & Medical Leave
- **Connecticut**: Paid Leave (2022+)
- **Colorado, Oregon**: Recently enacted programs

## Sources & Resources
- State PFML program websites
- Employer handbook and posters
- Contribution rate sheets
- Application processes
- State agency contact information

---
*This template enables AI to explain state-specific PFML requirements and employer obligations*`
      },
      
      // 8. Jury Duty Leave
      {
        templateId: "jury_duty_leave",
        title: "Jury Duty Leave Requirements",
        description: "Employee rights and employer obligations for jury service",
        topicSlug: "jury-duty-leave",
        markdownContent: `# Jury Duty Leave Requirements

## Quick Overview
Must employers provide time off for jury duty, and is it paid?

## Covered Employers
- All employers (federal and state law)
- No size exemptions
- Public and private sector

## Covered Employees
- All employees summoned for jury duty
- Full-time, part-time, temporary
- No minimum tenure required

## Leave Requirements
- Must provide time off for jury service
- Cannot discipline or terminate for jury duty
- Must reinstate to same/similar position
- Duration: Length of jury service

## Pay Requirements
### States Requiring Paid Leave
- Full pay continuation (rare)
- Partial pay (difference between jury pay and regular wages)
- Up to X days paid

### States Not Requiring Pay
- Unpaid leave protected
- Employee receives jury duty stipend from court
- May use PTO voluntarily

## Employee Notice Obligations
- Provide summons to employer (advance notice when possible)
- Update employer on duration/schedule
- Return to work when excused

## Employer Prohibitions
- Cannot require employee use PTO
- Cannot threaten adverse action
- Cannot discourage jury service
- Cannot require employee work night shift during jury duty

## Small Business Hardship
- Some states allow temporary postponement request
- Court may excuse if business hardship
- Must file motion with court

## Penalties for Violations
- Terminating employee for jury duty: Wrongful termination
- Civil penalties from state
- Contempt of court possible
- Back pay and reinstatement
- Attorney fees

## Sources
- State jury duty leave statutes
- Federal Jury System Improvement Act
- Court administration websites

---
*Template for AI guidance on jury duty leave rights and obligations*`
      },
      
      // 9. Voting Leave
      {
        templateId: "voting_leave",
        title: "Voting Leave Requirements",
        description: "Time off requirements for employees to vote",
        topicSlug: "voting-leave",
        markdownContent: `# Voting Leave Requirements

## Quick Overview
Must employers provide time off to vote, and is it paid?

## Covered Employers
- Most states have voting leave requirements
- All employer sizes
- No federal requirement (state law only)

## Covered Employees
- All employees registered to vote
- Full-time and part-time
- No tenure requirements

## Time Off Requirements
### Typical State Rules
- 1-3 hours time off to vote
- Only if insufficient non-work hours to vote
- Beginning or end of shift (employer's choice)
- Polls must be open X hours outside work time

## Pay Requirements
- Most states require paid time off
- Some states allow unpaid
- Typically 1-2 hours paid, additional unpaid

## Notice Requirements
### Employee to Employer
- Advance notice: 1-3 days before election (state-specific)
- Oral or written
- Specify time needed

### Employer to Employees
- Post notice of voting rights
- Days before election (state-specific)
- Include time off policy

## Proof of Voting
- Some states allow employer to request proof
- "I Voted" sticker
- Time limits on proof requirement

## Penalties
- Civil penalties for violations
- Employee damages
- Criminal penalties in some states

## Sources
- State election code provisions
- Secretary of State guidance

---
*Template for state-specific voting leave requirements*`
      },
      
      // ==================== SAFETY & TRAINING ====================
      
      // 10. Workers' Compensation
      {
        templateId: "workers_comp_comprehensive",
        title: "Workers' Compensation Insurance Requirements",
        description: "Employer obligations for workers' comp coverage and claims",
        topicSlug: "workers-compensation",
        markdownContent: `# Workers' Compensation Insurance Requirements

## Quick Overview
Who must carry workers' comp insurance, and what injuries are covered?

## Covered Employers
### Mandatory Coverage Thresholds
- **Most states**: 1+ employees (even part-time)
- **Some states**: 3-5+ employees to trigger requirement
- **Industry-specific**: Construction often requires from first employee
- Applies to: Corporations, LLCs, sole proprietors with employees

### Exemptions
- Sole proprietors with no employees
- Some states: Agricultural employers under X employees
- Casual labor (limited duration/scope)
- Independent contractors (if properly classified)

## Covered Employees
- All employees (full-time, part-time, temporary)
- Minors and adult workers
- Part-time and seasonal employees
- **Generally NOT covered**: True independent contractors, volunteers

## Coverage Requirements
### What Injuries/Illnesses Must Be Covered
- Injuries arising out of and in course of employment
- Occupational diseases and illnesses
- Cumulative trauma (repetitive stress)
- Aggravation of pre-existing conditions
- Mental/psychological injuries (in some states)

### Not Covered
- Injuries from horseplay or intoxication
- Self-inflicted injuries
- Injuries during commission of serious crime
- Injuries outside scope of employment

## Benefits Provided to Employees
### Medical Benefits
- All reasonable and necessary medical treatment
- No deductibles or co-pays
- Employee choice of doctor (varies by state)
- Lifetime medical for work injury

### Disability Benefits
- **Temporary Total Disability (TTD)**: Cannot work during recovery
- **Temporary Partial Disability (TPD)**: Can work light duty
- **Permanent Total Disability (PTD)**: Cannot return to workforce
- **Permanent Partial Disability (PPD)**: Residual limitations

### Wage Replacement Rates
- Typically 66.67% of average weekly wage
- Subject to state maximum/minimum amounts
- Tax-free benefits
- Waiting period before benefits begin (typically 3-7 days)

### Death Benefits
- Burial expenses
- Dependency benefits to surviving spouse/children
- Percentage of wages for specified period

## Employer Obligations
### Obtaining Coverage
1. Purchase insurance from authorized carrier
2. OR qualify for self-insurance (if financially able)
3. OR participate in state fund (where available)
4. Post notice of coverage
5. Provide carrier information to employees

### Cost Factors
- Industry classification codes
- Claims history (experience modification)
- Payroll size
- State rates
- Safety programs (potential discounts)

## Injury Reporting Requirements
### Employee Responsibilities
- Report injury to employer promptly (within X days)
- Seek authorized medical treatment
- Cooperate with investigation

### Employer Responsibilities
- Report to insurance carrier immediately
- File claim with state agency within X days
- Provide claim forms to employee
- Do not admit fault or liability
- Preserve evidence

## Posting Requirements
- Workers' comp coverage notice
- Carrier name and policy number
- How to report injuries
- Employee rights poster
- Penalties for fraud

## Retaliation Prohibition
### Protected Activities
- Filing workers' comp claim
- Reporting injury
- Testifying in proceedings
- Opposing unsafe conditions

### Prohibited Actions
- Termination for filing claim
- Demotion or reduction in pay
- Creating hostile work environment
- Threatening immigration consequences

## Exclusive Remedy Rule
- Workers' comp is exclusive remedy for work injuries
- Employee cannot sue employer in court (with exceptions)
- Exceptions: Intentional harm, third-party liability

## Return to Work
- Light duty/modified work programs
- Interactive process for accommodations
- Same position or equivalent
- Cannot discriminate based on injury

## Penalties for Non-Compliance
### No Insurance ("Going Bare")
- **Criminal penalties**: Misdemeanor or felony
- **Fines**: $1,000-$100,000+ per violation
- **Stop work orders**: Business closure until compliant
- **Personal liability**: Pay claims out of pocket
- **Cannot use exclusive remedy defense**: Employees can sue

### Late Reporting
- Fines per day late
- Benefit penalties to employee (employer pays)
- Carrier may deny coverage

## Common Violations
- ❌ Operating without required insurance
- ❌ Misclassifying employees as contractors
- ❌ Underreporting payroll to reduce premiums
- ❌ Failing to report claims timely
- ❌ Retaliating against injured workers
- ❌ Not posting required notices

## Sources
- State workers' compensation act
- State comp board/commission
- Insurance carrier resources
- OSHA recordkeeping if separate requirement

---
*This template guides AI on workers' comp requirements and claim procedures*`
      },
      
      // 11. Drug Testing
      {
        templateId: "drug_testing_comprehensive",
        title: "Drug & Alcohol Testing Program Requirements",
        description: "Legal framework for workplace drug and alcohol testing",
        topicSlug: "drug-testing",
        markdownContent: `# Drug & Alcohol Testing Program Requirements

## Quick Overview
When can employers test for drugs/alcohol, and what procedures must be followed?

## Covered Employers
- **Federal requirements**: DOT-regulated industries (transportation)
- **State laws**: Vary significantly on private employer testing
- **Drug-Free Workplace Act**: Federal contractors $100K+
- **Workers' comp discounts**: Many states offer premium reductions

## Types of Testing Permitted
### Pre-Employment Testing
- **Most states allow** after conditional job offer
- Cannot test before offer in some states
- Must apply uniformly to all candidates for same position
- Disclosure requirements

### Random Testing
- **Safety-sensitive positions**: Usually permitted
- **Non-safety positions**: Restrictions in some states
- Statistical randomness required
- Advance notice prohibited

### Post-Accident Testing
- Permitted for workplace accidents
- Must have reasonable suspicion or objective criteria
- Cannot be used to discourage injury reporting (OSHA concern)
- Timing requirements (as soon as possible)

### Reasonable Suspicion Testing
- Based on specific, articulable observations
- Supervisor training required
- Document observations in writing
- Physical symptoms, behavior changes, performance issues

### Return-to-Duty Testing
- After positive test and rehabilitation
- Before returning to work
- Follow-up testing schedule

## Substances Tested
### Standard Panel (5-panel)
- Marijuana/THC
- Cocaine
- Opiates
- Amphetamines
- PCP

### Extended Panels
- 10-panel: Adds benzodiazepines, barbiturates, etc.
- Alcohol testing (breath, blood)
- Prescription drug misuse

## Legal Requirements
### Testing Procedures
- Use certified laboratories (SAMHSA-certified)
- Chain of custody procedures
- Confirmation testing for positives
- MRO (Medical Review Officer) review

### Marijuana Considerations
- Legal medical/recreational use in many states
- Employers can still test and take action (generally)
- State-specific protections emerging
- Off-duty use vs. impairment at work

## Employee Rights and Protections
### Notice Requirements
- Written drug testing policy
- Provided before testing
- In employee handbook
- Posted in workplace

### Consent
- Written consent for testing
- Voluntary (but can condition employment)
- Right to refuse (but consequences)

### Confidentiality
- Test results kept confidential
- Limited access (HR, medical staff only)
- Cannot disclose to third parties without consent
- Medical records privacy (HIPAA considerations)

## Positive Test Results
### Employer Options
- Refuse to hire (pre-employment)
- Termination (post-hire, if policy allows)
- Required rehabilitation program
- Unpaid leave for treatment

### Employee Rights
- Right to explain/contest results
- Retest at own expense
- List prescription medications to MRO
- ADA accommodation if addiction (recovering)

## ADA and Addiction Considerations
### Protected
- Recovering addicts not currently using
- Alcoholics in recovery
- Prescribed medication use

### Not Protected
- Current illegal drug use
- Positive test for illegal drugs
- Refusal to take test

## State-Specific Restrictions
### States Requiring Reasonable Suspicion
- Cannot test without cause
- Random testing prohibited or restricted

### States with Strict Procedures
- Advance notice required
- Specific testing protocols
- Right to retest
- Compensation during test time

## Workers' Comp Premium Discounts
- Many states offer 5% discount for certified programs
- Must meet state-specific requirements
- Annual certification
- Education component required

## Common Mistakes to Avoid
- ❌ Testing before conditional offer made
- ❌ No written policy or inconsistent application
- ❌ Using non-certified labs
- ❌ Failing to keep results confidential
- ❌ Discriminatory testing (only certain groups)
- ❌ Retaliating against injured workers who test positive
- ❌ Not accommodating recovering addicts

## Best Practices
1. Comprehensive written policy
2. Supervisor training on reasonable suspicion
3. Use certified labs and MRO review
4. Uniform application of policy
5. Proper documentation
6. Confidential recordkeeping
7. Legal review of state-specific requirements

## Sources
- State drug testing statutes
- DOL Drug-Free Workplace guidance
- DOT testing regulations (if applicable)
- SAMHSA testing guidelines
- State workers' comp discount programs

---
*This template enables AI to explain drug testing rights and limitations for your jurisdiction*`
      },
      
      // ==================== EMPLOYMENT PRACTICES ====================
      
      // 12. Background Checks
      {
        templateId: "background_checks_comprehensive",
        title: "Background Check Compliance (FCRA & State Laws)",
        description: "Legal requirements for conducting criminal and credit background checks",
        topicSlug: "background-checks",
        markdownContent: `# Background Check Compliance Guide

## Quick Overview
What are the legal requirements for conducting background checks on job applicants and employees?

## Covered Employers
- All employers conducting background checks
- Third-party screening companies (Consumer Reporting Agencies)
- Federal FCRA applies to all
- State and local "Ban the Box" laws

## Federal Law: Fair Credit Reporting Act (FCRA)
### When FCRA Applies
- Using third-party to conduct background check
- Consumer reporting agency (CRA) involvement
- Does NOT apply if employer conducts check directly

### FCRA Requirements
1. **Disclosure**: Written notice that background check will be conducted
2. **Authorization**: Separate written consent from applicant
3. **Pre-Adverse Action**: If considering denial based on report
   - Provide copy of report
   - FTC "Summary of Rights" document
   - Reasonable time to respond (3-5 business days)
4. **Adverse Action**: If denied based on report
   - Written notice of denial
   - Name/contact of CRA
   - Statement that CRA didn't make decision
   - Right to dispute report
   - Right to free copy of report within 60 days

## State and Local "Ban the Box" Laws
### Restrictions on Criminal History Inquiries
- **Timing**: Cannot ask about criminal history on initial application
- **When permitted**: After conditional offer or first interview
- **Scope**: Some states ban only certain conviction inquiries

### Individualized Assessment Required
- Nature and gravity of offense
- Time passed since conviction
- Nature of job sought
- Relationship between conviction and job duties

### States/Cities with Ban the Box
- Over 35 states and 150+ cities
- Specific to public employers, private employers, or both
- Federal contractors (2024+)

## Types of Background Checks
### Criminal History
- County, state, federal records
- Arrest records vs. convictions
- Time limitations (7-year rule in some states)
- Expunged/sealed records cannot be considered

### Credit History
- **FCRA applies**: Additional restrictions
- **Job-related requirement**: Must be relevant to position
- **State prohibitions**: Some states ban credit checks except for specific roles
- Adverse action process required

### Other Checks
- Education/employment verification
- Professional license verification
- Driving records (for driving positions)
- Social media screening (emerging issues)

## Prohibited Considerations
### Cannot Consider (Many States):
- Arrests without conviction
- Expunged or sealed convictions
- Juvenile records
- Convictions older than 7 years (some states)
- Certain types of convictions (marijuana in some states)

### Protected Activities
- Union membership
- Wage garnishment
- Bankruptcy

## Consent and Disclosure
### Written Disclosure Must:
- Be in standalone document (not buried in application)
- Clear and conspicuous
- Specific to background check purpose
- Separate from other documents

### Authorization Must:
- Be knowing and voluntary
- Include consumer rights notice
- Authorize specific types of checks
- Include liability waiver language (if permitted)

## Continuous Monitoring
- Re-screening current employees
- Requires new authorization
- Limited circumstances (high-security roles)
- State restrictions

## Common Violations
- ❌ Asking about criminal history on application (where banned)
- ❌ Not providing pre-adverse action notice
- ❌ Using arrest records (not convictions)
- ❌ Blanket bans on any criminal record
- ❌ Not conducting individualized assessment
- ❌ Using outdated or inaccurate reports
- ❌ No standalone disclosure document

## Best Practices
1. Use reputable, FCRA-compliant CRA
2. Separate disclosure and authorization forms
3. Follow timing restrictions (ban the box)
4. Conduct individualized assessment
5. Document decision-making process
6. Proper adverse action procedures
7. Train hiring managers on compliance

## Penalties for Violations
### FCRA Violations
- Actual damages
- Statutory damages $100-$1,000 per violation
- Punitive damages for willful violations
- Attorney fees
- Class action exposure

### State Law Violations
- Administrative fines
- Private right of action
- Rescission of adverse action
- Hiring of applicant

## Sources
- Fair Credit Reporting Act (15 USC § 1681)
- EEOC Guidance on Arrest and Conviction Records
- State and local ban the box laws
- FTC FCRA compliance guidance

---
*This template provides comprehensive background check compliance guidance*`
      },
      
      // 13. Child Labor
      {
        templateId: "child_labor_comprehensive",
        title: "Child Labor Laws & Restrictions",
        description: "Requirements for employing minors including hours and prohibited occupations",
        topicSlug: "child-labor",
        markdownContent: `# Child Labor Laws & Restrictions

## Quick Overview
What are the restrictions on employing workers under age 18?

## Covered Employers
- All employers hiring workers under age 18
- Federal and state laws both apply (use most protective)
- No size exemptions
- Family business exceptions (limited)

## Age Categories
### Under 14
- Generally prohibited from most employment
- **Exceptions**: Newspapers, acting, family business

### Ages 14-15
- Limited to specific jobs
- Strict hour restrictions
- Prohibited hazardous occupations

### Ages 16-17
- Broader job opportunities
- Still restricted from hazardous work
- Hour restrictions less stringent (but still apply)

## Hourly Restrictions
### School Days (14-15 year olds)
- Maximum 3 hours per day
- Maximum 18 hours per week
- Work hours: 7am-7pm (9pm summer)

### Non-School Days (14-15 year olds)
- Maximum 8 hours per day
- Maximum 40 hours per week

### Ages 16-17
- No federal hour restrictions (except hazardous occupations)
- State laws may impose limits
- School attendance laws still apply

## Prohibited Occupations
### Hazardous Occupations (Under 18)
- Manufacturing and storing explosives
- Motor vehicle driving and outside helper
- Coal mining
- Logging and saw milling
- Power-driven machinery operation
- Roofing operations
- Excavation operations
- Many more - see HO list

### Additional Restrictions (14-15)
- Manufacturing, mining, processing
- Operating motor vehicles
- Public messenger service
- Construction
- Warehousing (except clerical)

### Permitted Jobs (14-15)
- Retail and food service (with restrictions)
- Intellectual or creative work
- Clerical work
- Cashiering, shelf stocking
- Bagging and cart retrieval

## Work Permits (State-Specific)
- Intent-to-employ certificates
- Age certificates
- Parental consent
- School permission
- Renewal requirements

## Documentation Requirements
- **Proof of age**: Birth certificate, passport, school ID
- **Work permits**: If required by state
- **Parental consent**: May be required
- Keep on file for duration of employment plus X years

## Wage Requirements
- Minimum wage applies to minors
- Cannot pay sub-minimum wage except:
  - Student learners (certificate required)
  - Vocational education programs

## Special Industry Rules
### Agriculture
- Different age thresholds
- Parental exemptions
- Hazardous occupation restrictions still apply

### Entertainment Industry
- Special permits required
- Trust requirements for earnings
- Education requirements
- Work hour restrictions

## Penalties for Violations
### Child Labor Violations
- Civil penalties: Up to $13,227 per employee for non-hazardous violations
- Serious violations: Up to $60,000 per violation
- Death or serious injury: Up to $132,270 per violation
- Criminal penalties for willful violations

### Hot Goods Provision
- Products produced in violation cannot be shipped in interstate commerce
- Shipment blocking

## Common Violations
- ❌ Employing minors during school hours
- ❌ Working minors excessive hours
- ❌ Minors operating prohibited equipment
- ❌ No work permits (where required)
- ❌ Insufficient documentation of age
- ❌ Employing under minimum age

## State vs. Federal Law
- Both apply - use most restrictive
- State laws often more protective
- Industry-specific state rules
- Entertainment and agriculture variations

## Best Practices
1. Verify age before hiring
2. Obtain required work permits
3. Post child labor law posters
4. Train supervisors on restrictions
5. Schedule compliance (don't exceed hours)
6. Keep required documentation
7. Separate dangerous equipment areas

## Sources
- FLSA child labor provisions
- 29 CFR Part 570 - Child Labor Regulations
- State labor code child labor sections
- WHD Fact Sheet #43 (Child Labor)
- Hazardous Occupations Orders (HOs)

---
*This template helps AI provide specific child labor law guidance for your state and industry*`
      },
      
      // 14. E-Verify
      {
        templateId: "e_verify_comprehensive",
        title: "E-Verify Employment Verification Requirements",
        description: "Federal and state requirements for electronic employment eligibility verification",
        topicSlug: "e-verify",
        markdownContent: `# E-Verify Employment Verification Requirements

## Quick Overview
Who must use E-Verify, and what are the requirements?

## Covered Employers
### Federal Contractors
- Federal contracts $150,000+ (FAR E-Verify clause)
- All new hires must be verified
- Existing employees on federal contract

### State Mandates
- Some states require all/certain employers use E-Verify
- Public employers
- Employers above certain size threshold
- Industry-specific (e.g., public works)

### Voluntary Enrollment
- Any employer can voluntarily enroll
- Free system
- MOU (Memorandum of Understanding) required

## What is E-Verify?
- Web-based system comparing I-9 to government databases
- SSA (Social Security Administration) records
- DHS (Department of Homeland Security) immigration records
- Result within seconds to 3 business days

## Timing Requirements
- Must create E-Verify case within 3 business days of hire
- After completing Section 2 of Form I-9
- Cannot pre-screen applicants before hire
- Reverification for work authorization expiration

## Process Steps
1. Employee completes Form I-9
2. Employer reviews documents
3. Employer creates E-Verify case
4. Enter I-9 information into E-Verify
5. Receive result: Employment Authorized or Tentative Non-Confirmation (TNC)

## Tentative Non-Confirmation (TNC)
### Employer Obligations
- Provide TNC notice to employee promptly
- Explain rights and options
- Allow employee to contest
- Cannot take adverse action during contest period
- Give employee 8 federal government work days to contact SSA/DHS

### Employee Options
- Contest TNC (visit SSA/DHS)
- Decline to contest (can terminate)
- Referral to SSA/DHS for resolution

### Final Non-Confirmation
- If not resolved, Final Non-Confirmation issued
- Employer may terminate employment
- No obligation to continue employment

## Anti-Discrimination Requirements
### Prohibited Actions
- Cannot use E-Verify for pre-screening
- Cannot selectively verify only certain employees
- Cannot re-verify current employees (except as required)
- Cannot specify which documents employee must present
- Cannot use E-Verify as reason to delay or deny training/benefits

### Protected Characteristics
- National origin
- Citizenship status
- Immigration status (authorized workers)

## Poster Requirements
- E-Verify and Right to Work posters
- English and Spanish
- Conspicuous location
- Available on E-Verify website

## Recordkeeping
- Keep E-Verify case printouts with I-9
- Retain for 3 years from hire or 1 year from termination
- Privacy requirements for TNC information
- Audit trail documentation

## Common Mistakes
- ❌ Using E-Verify before completing I-9
- ❌ Creating case before employee's start date
- ❌ Selective verification (discrimination)
- ❌ Taking quick adverse action on TNC
- ❌ Not providing TNC notice promptly
- ❌ Using E-Verify to reverify existing employees improperly
- ❌ Requiring specific documents

## Penalties
### E-Verify Program Violations
- Suspension from E-Verify
- Termination of MOU
- Debarment from federal contracts

### I-9 Violations
- $252-$2,507 per I-9 violation (technical)
- $606-$6,067 per violation (substantive/unfair practices)
- Criminal penalties for pattern and practice

### Discrimination
- Back pay
- Civil penalties
- Hiring of individual
- Attorney fees

## State-Specific Requirements
- **Mandatory states**: Arizona, Alabama, Georgia, North Carolina, South Carolina, Tennessee, Utah, etc.
- **Public employer only**: Many more states
- **Penalties for non-use**: Varies by state

## Sources
- E-Verify MOU
- E-Verify User Manual
- USCIS E-Verify resources
- State E-Verify statutes
- OSC anti-discrimination guidance

---
*This template provides E-Verify compliance guidance for federal contractors and state-mandated employers*`
      },
      
      // 15. Independent Contractor Classification
      {
        templateId: "independent_contractor_comprehensive",
        title: "Independent Contractor Classification Compliance",
        description: "Legal tests for properly classifying workers as independent contractors vs. employees",
        topicSlug: "independent-contractor-classification",
        markdownContent: `# Independent Contractor Classification Compliance

## Quick Overview
What is the legal test for classifying workers as independent contractors vs. employees?

## Why Classification Matters
### Employee Classification = Employer Obligations
- Minimum wage and overtime (FLSA)
- Payroll taxes (FICA, FUTA, state)
- Workers' compensation insurance
- Unemployment insurance
- Benefits eligibility
- Employment law protections

### Independent Contractor = Different Rules
- No wage/hour protections
- Self-employment taxes
- No benefits required
- Limited anti-discrimination protections
- Issue 1099 (not W-2)

## Federal Tests for Classification
### IRS Common Law Test (20 Factors)
**Behavioral Control**
- Instructions on how work is performed
- Training provided
- When and where to work

**Financial Control**
- Business expenses (who pays?)
- Investment in equipment
- Opportunity for profit or loss
- Services available to market

**Relationship**
- Written contracts
- Benefits provided
- Permanency of relationship
- Services as key business activity

### DOL Economic Reality Test (FLSA)
1. **Integral to business**: Is work integral to employer's business?
2. **Investment**: Worker's investment relative to employer's?
3. **Profit/Loss**: Opportunity for profit/loss based on managerial skill?
4. **Skill Required**: Does work require special skill/initiative?
5. **Permanency**: Continuous or indefinite relationship?
6. **Control**: Nature and degree of employer's control

### 2024 DOL Final Rule
- Six-factor economic reality test
- No single factor determinative
- Totality of circumstances
- Emphasis on economic dependence

## State-Specific Tests
### ABC Test (Strictest)
Worker is contractor only if ALL three:
- **(A) Control**: Free from control in performance
- **(B) Business**: Work outside usual course of hiring entity's business
- **(C) Trade**: Worker customarily engaged in independent trade/occupation

**States using ABC**: California (for wage orders), Massachusetts, New Jersey, others

### Other State Tests
- Right to control test
- Relative nature of work test
- Hybrid approaches

## Common Misclassification Scenarios
### High Risk for Employee Finding
- Set schedule/hours
- Paid hourly or weekly
- Company provides all tools/equipment
- Works only for one company
- Part of regular business operations
- Detailed instructions/supervision
- No written contract

### More Likely True Contractor
- Own business entity
- Multiple clients
- Sets own hours/rates
- Significant investment in business
- Advertises services publicly
- Can accept or reject work
- Controls how work is done

## Written Contractor Agreement
### Should Include
- Services to be performed
- Payment terms
- Independent contractor status acknowledgment
- No employee benefits
- Tax responsibilities
- Right to work for others
- Insurance requirements
- Termination provisions

### Agreement Alone Not Determinative
- Actual relationship matters more than label
- Cannot contract away employee rights
- Economic reality controls

## Tax Implications
### Employer Responsibilities for Contractors
- Issue Form 1099-NEC if paid $600+
- No withholding required
- No FICA matching
- No unemployment insurance

### Contractor Responsibilities
- Pay self-employment tax
- Quarterly estimated tax payments
- Business license (if required)
- Own insurance

## Consequences of Misclassification
### Back Taxes and Penalties
- FICA taxes (employer and employee portions)
- Federal and state income tax withholding
- FUTA taxes
- Penalties and interest
- IRS Form SS-8 determinations

### Back Wages
- Minimum wage and overtime if misclassified
- Liquidated damages (double back wages)
- FLSA collective action

### Employment Benefits
- Retroactive benefits eligibility
- Workers' comp claims
- Unemployment benefits
- Health insurance mandates (ACA)

### Other Liabilities
- Discrimination claims (if protected class)
- Wrongful termination
- Retaliation claims

## Safe Harbor Provisions
### IRS Section 530 Relief (Limited)
- Reasonable basis for classification
- Substantive consistency
- Reporting consistency (1099s filed)
- **Prospective only** - doesn't apply to wage claims

## Industry-Specific Issues
### Construction
- Stricter scrutiny
- State licensing requirements
- ABC test often applies
- Workers' comp requirements

### Gig Economy/Delivery
- Platform vs. contractor relationship
- State-specific legislation (e.g., CA Prop 22)
- Ongoing litigation

### Professional Services
- More likely true contractors
- License/specialized skill
- Project-based work

## Audits and Enforcement
### Who Investigates
- IRS (tax purposes)
- DOL (wage/hour purposes)
- State employment agencies
- Unemployment insurance audits
- Workers' comp audits

### Audit Triggers
- Unemployment claim by worker
- Workers' comp claim
- Wage complaint
- Routine tax audit

## Best Practices to Minimize Risk
1. Review all contractor relationships
2. Use proper legal test for jurisdiction
3. Written agreements (but not only factor)
4. Allow flexibility and independence
5. Don't provide benefits
6. Multiple clients encouraged
7. Project-based vs. ongoing work
8. Worker uses own tools/equipment
9. Paid by project not hourly
10. Document business relationship

## Common Misclassification Mistakes
- ❌ Calling someone contractor doesn't make them one
- ❌ Having worker sign agreement they're a contractor
- ❌ Treating contractors like employees (set hours, close supervision)
- ❌ Providing employee benefits
- ❌ Making contractor work only for you
- ❌ Providing all tools and training

## Sources
- IRS Publication 15-A (Employer's Supplemental Tax Guide)
- DOL Fact Sheet #13 (Employment Relationship)
- State employment/labor department guidance
- ABC test statutes (where applicable)
- Recent court decisions on classification

---
*This template enables AI to analyze worker classification under applicable legal tests*`
      },
      
      // 16. Posting Requirements
      {
        templateId: "posting_requirements_comprehensive",
        title: "Workplace Posting Requirements Compliance",
        description: "Required federal, state, and local workplace posters and notices",
        topicSlug: "posting-requirements",
        markdownContent: `# Workplace Posting Requirements Compliance

## Quick Overview
What posters and notices must be displayed in the workplace?

## Covered Employers
- All employers (federal posters)
- State-specific posters (all employers in state)
- Industry-specific posters
- Size-based requirements (some posters only for larger employers)

## Federal Posting Requirements
### Mandatory for All Private Employers
1. **FLSA Minimum Wage** - DOL employee rights poster
2. **OSHA Job Safety** - Workplace safety rights
3. **EEO is the Law** - Equal employment opportunity
4. **Employee Polygraph Protection** - Lie detector test restrictions
5. **FMLA** (50+ employees) - Family and Medical Leave Act
6. **EPPA** - Employee Polygraph Protection Act

### Additional Federal (If Applicable)
- **USERRA** - Military service rights
- **Davis-Bacon** - Prevailing wage (federal contractors)
- **Service Contract Act** - Service contractors
- **E-Verify** - If participating in E-Verify

## State Posting Requirements
### Typical State Posters
- State minimum wage
- Paid sick leave rights (if state requires)
- Wage theft prevention
- Workers' compensation coverage
- Unemployment insurance
- Disability insurance (where required)
- Discrimination and harassment prevention
- Safety and health
- Child labor laws
- Whistleblower protections

### Varies by State
- **Number of posters**: 5-15+ required posters per state
- **Language requirements**: English + Spanish (minimum)
- **Update frequency**: When laws change

## Local Posting Requirements
### City/County Requirements
- Local minimum wage (if higher than state)
- Paid sick leave ordinances
- Fair workweek/predictive scheduling
- Commuter benefits
- Industry-specific (hospitality, retail)

## Language Requirements
### Multi-Language Posters Required When:
- Workforce includes non-English speakers
- Specified threshold (e.g., 10%+ speak same language)
- Languages: Spanish most common, others as needed
- Available from state labor agencies

## Posting Location Requirements
### Where to Post
- **Conspicuous locations**: Break rooms, time clock areas, near exits
- **Accessible to all employees**: Each location/facility
- **Visible**: Not behind doors or in offices
- **Multiple locations**: Large facilities need multiple postings

### Electronic Posting
- **Federal**: Not sufficient alone (physical posting required)
- **State variations**: Some allow electronic for remote workers
- **Supplements**: Can provide electronically in addition to physical

## Industry-Specific Posters
### Healthcare
- Bloodborne pathogens
- Patient rights
- Emergency procedures

### Construction
- OSHA construction standards
- Asbestos/lead warnings
- Trench safety

### Agriculture
- Pesticide safety
- Farmworker rights
- Housing standards (if provided)

## Remote Employees
- Must provide posters electronically
- Email PDFs or intranet posting
- Physical mailing if no electronic access
- Same posters as on-site employees

## Posting Updates
### When Updates Required
- Law changes
- Rate increases (minimum wage)
- New programs (paid leave)
- Changes in coverage (number of employees)

### How to Stay Current
- Subscribe to state labor agency updates
- Annual compliance reviews
- Poster service subscriptions
- Legal counsel review

## Penalties for Non-Posting
### Federal Penalties
- OSHA: Up to $15,625 per violation
- FLSA: No specific penalty but evidence of violation
- FMLA: Civil penalties for willful violations

### State Penalties
- Varies by state and poster
- $100-$10,000+ per poster not displayed
- Daily penalties in some states
- Enforcement through audits and complaints

## Obtaining Posters
### Free Sources
- DOL website (federal posters)
- State labor agency websites
- OSHA area offices
- Many states provide combined posters

### Paid Services
- All-in-one poster services
- Automatic updates when laws change
- Multi-state packages
- Multi-language versions

## Common Violations
- ❌ Outdated posters (old minimum wage rates)
- ❌ Missing required posters
- ❌ Posters not in conspicuous location
- ❌ No multi-language posters when required
- ❌ Electronic only (when physical required)
- ❌ Not posting at all locations

## Best Practices
1. Annual poster compliance audit
2. Subscribe to update services
3. Post in multiple locations
4. Multi-language as needed
5. Electronic access for remote workers
6. Document compliance (photos)
7. New hire packet with poster summaries

## Digital Poster Options
- QR codes linking to posters
- Employee portal access
- Email distribution
- Mobile app access
- Supplement to physical posting

## Sources
- DOL poster requirements page
- State labor agency poster pages
- OSHA poster requirements
- Multi-state poster compliance guides

---
*This template helps AI identify all required posters for specific jurisdiction and industry*`
      },
      
      // 17. Pregnancy / Disability / ADA Accommodations
      {
        templateId: "ada_accommodations_comprehensive",
        title: "ADA, Pregnancy & Disability Accommodations Guide",
        description: "Reasonable accommodation requirements for disabilities, pregnancy, and medical conditions",
        topicSlug: "pregnancy-disability-ada-accommodations",
        markdownContent: `# ADA, Pregnancy & Disability Accommodations Guide

## Quick Overview
When must employers provide reasonable accommodations for disabilities and pregnancy?

## Covered Employers
### ADA (Americans with Disabilities Act)
- 15+ employees
- Private employers, state/local governments
- Employment agencies, labor unions

### Pregnancy Discrimination Act (PDA)
- 15+ employees (Title VII coverage)
- Pregnancy treated same as other temporary disabilities

### State Laws
- Often cover smaller employers (1+ employees)
- Broader definitions of disability
- Explicit pregnancy accommodation requirements

## Covered Individuals
### Who Has Disability (ADA)
- Physical or mental impairment
- Substantially limits major life activity
- Record of such impairment
- Regarded as having impairment

### Not Disabilities
- Current illegal drug use
- Temporary, non-chronic impairments (minor injuries)
- Personality traits
- Economic disadvantages

### Pregnancy and Related Conditions
- Pregnancy itself
- Childbirth
- Lactation
- Related medical conditions (gestational diabetes, preeclampsia)

## Reasonable Accommodations
### Types of Accommodations
**Physical Modifications**
- Ergonomic workstation adjustments
- Accessible facilities
- Reserved parking
- Assistive technology/equipment

**Schedule/Policy Modifications**
- Modified work schedule
- Part-time or reduced hours
- Flexible break times
- Temporary light duty
- Telecommuting/remote work

**Job Restructuring**
- Eliminate non-essential functions
- Reassignment to vacant position
- Job sharing arrangements

**Leave as Accommodation**
- Unpaid leave beyond FMLA
- Modified attendance policies
- Phased return to work

### Pregnancy-Specific Accommodations
- More frequent breaks
- Seating
- Lifting restrictions
- Light duty
- Lactation breaks and private space
- Modified dress code

## Interactive Process
### Employer Obligations
1. **Notice**: Employee requests accommodation or employer observes need
2. **Engage**: Discuss limitations and potential accommodations
3. **Obtain information**: Request medical documentation
4. **Identify accommodations**: Consider employee preference
5. **Assess effectiveness**: Will it enable performance of essential functions?
6. **Implement**: Provide accommodation
7. **Monitor**: Ongoing effectiveness

### Employee Obligations
- Request accommodation
- Provide medical documentation
- Participate in interactive process
- Consider reasonable alternatives

## Medical Documentation
### Employer Can Request
- Nature of impairment (general)
- Functional limitations
- Need for accommodation
- Duration of need

### Cannot Request
- Diagnosis or detailed medical records (only what's needed)
- Genetic information
- Unrelated medical history

### Medical Inquiry Restrictions
- Only after disability disclosed or observed
- Job-related and consistent with business necessity
- Sent to healthcare provider (not employee directly)

## Undue Hardship Defense
### When Accommodation Not Required
- Significant difficulty in implementation
- Significant expense relative to:
  - Employer's size and resources
  - Nature and cost of accommodation
  - Impact on operations

### Considerations
- Overall financial resources
- Number of employees
- Type of operation
- Impact on other employees

## Direct Threat
### Cannot Accommodate If:
- Significant risk to health/safety of self or others
- Cannot be eliminated by reasonable accommodation
- Based on objective medical evidence
- Individualized assessment required

## Lactation Accommodation (Federal)
### Break Time for Nursing Mothers Act
- Reasonable break time (unpaid if beyond normal breaks)
- Up to 1 year after child's birth
- Private location (not bathroom)
- Applies to all employers (no size threshold)

## Discrimination Prohibitions
### Prohibited Actions
- Refusing to hire due to disability
- Terminating because of disability
- Denying reasonable accommodation
- Retaliating for requesting accommodation
- Harassing based on disability
- Medical inquiries before job offer

## Common Mistakes
- ❌ Not engaging in interactive process
- ❌ Denying accommodation without considering
- ❌ Requiring "perfect attendance" (blanket policies)
- ❌ Asking about disabilities before job offer
- ❌ Assuming accommodation is undue hardship
- ❌ Not documenting interactive process
- ❌ Refusing light duty for pregnancy if offered for other conditions

## Penalties and Remedies
- Back pay and front pay
- Compensatory damages (emotional distress)
- Punitive damages (for intentional discrimination)
- Reinstatement or hiring
- Attorney fees
- Policy changes
- Federal caps on damages (based on employer size)

## Sources
- ADA (42 USC § 12101 et seq.)
- Pregnancy Discrimination Act
- EEOC ADA regulations and guidance
- State fair employment practice laws
- PWFA (Pregnant Workers Fairness Act) - 2023

---
*This template provides comprehensive accommodation guidance for disabilities and pregnancy*`
      },
      
      // 18. Predictive Scheduling
      {
        templateId: "predictive_scheduling_comprehensive",
        title: "Predictive Scheduling & Fair Workweek Laws",
        description: "Requirements for advance notice of schedules and predictability pay",
        topicSlug: "predictive-scheduling",
        markdownContent: `# Predictive Scheduling & Fair Workweek Laws

## Quick Overview
What are predictive scheduling requirements for posting work schedules and compensating for changes?

## Covered Employers
### Jurisdictions with Laws
- **Cities**: Seattle, San Francisco, New York City, Philadelphia, Chicago, Los Angeles
- **States**: Oregon (statewide)
- **Industry-specific**: Retail, food service, hospitality primarily

### Coverage Thresholds
- Employer size: Typically 100-500+ employees worldwide
- Industry: Retail, hospitality, food service, warehouse
- Location: Physical location in covered jurisdiction

## Covered Employees
- Retail employees
- Food service workers
- Hospitality/hotel workers
- Warehouse workers (some jurisdictions)
- Typically non-exempt, hourly employees

## Advance Notice Requirements
### Schedule Posting
- **Advance notice**: 10-14 days before work period (varies by jurisdiction)
- **Good faith estimate**: At hire, estimated schedule
- **Written schedule**: Posted or electronically distributed
- **Access**: All employees must be able to view

### Right to Request
- Employees can request scheduling preferences
- Limits on clopening (closing then opening shifts)
- Minimum rest between shifts (8-11 hours typically)

## Predictability Pay (Premium Pay for Changes)
### When Required
- Employer changes schedule after posting deadline
- Adds hours, reduces hours, or changes shifts
- Cancels or moves shift
- Calls in employee for unscheduled shift

### Payment Amounts (Typical)
- **Notice 14+ days out**: No premium
- **Notice 7-14 days**: $10-20 predictability pay
- **Notice < 7 days**: 1-4 hours predictability pay
- **Notice < 24 hours**: Higher premium or refusal right

### Exceptions (No Predictability Pay)
- Employee requests change
- Mutually agreed shift swap
- Operations cannot begin/continue (utilities, emergency)
- Employee's voluntary availability changes
- Unforeseen circumstances

## Right to Rest
- Minimum hours between shifts (typically 10-11 hours)
- Employee can decline if less than minimum rest
- Premium pay if employee accepts (time and half)

## Right to Decline
- Can decline hours not on posted schedule
- Can decline on-call shifts
- No retaliation for declining

## Access to Hours
### Offering Additional Hours
- Must offer to existing part-time before hiring new
- Written notice of available hours
- Timeframe for employees to accept (typically 24-48 hours)
- Can hire new only if existing decline or insufficient

## Good Faith Estimate
### At Time of Hire
- Median/expected hours per week
- Good faith schedule or on-call status
- Update if materially changes

## Recordkeeping Requirements
- Posted schedules (2-3 years)
- Schedule change notices
- Predictability pay calculations
- Employee requests and responses
- Good faith estimates

## Penalties for Non-Compliance
- Per employee, per violation fines
- $500-$1,000+ per violation
- Back pay for unpaid predictability pay
- Injunctive relief
- Attorney fees
- Private right of action in some jurisdictions

## Exceptions and Exemptions
### Employer Exemptions
- Employers under size threshold
- Certain industries (professional services)
- Unionized workplaces with CBA provisions

### Situations Not Requiring Predictability Pay
- Natural disasters or emergencies
- Public utility failures
- Employee initiates change
- Threats to property or safety

## Best Practices
1. Implement scheduling software
2. Create schedules 14+ days in advance
3. Minimize schedule changes
4. Document all changes and reasons
5. Train managers on predictability pay rules
6. Track part-time employee hours for offering
7. Written policies and employee handbooks

## Common Violations
- ❌ Not posting schedule 14 days in advance
- ❌ Changing schedules without predictability pay
- ❌ On-call scheduling without compensation
- ❌ Clopening shifts without rest premium
- ❌ Hiring new employees before offering to existing
- ❌ Retaliating against employees who decline shifts

## Sources
- City/county predictive scheduling ordinances
- Oregon's statewide Fair Workweek law
- Labor standards office guidance
- Industry-specific regulations

---
*This template helps AI explain fair workweek and predictive scheduling requirements for covered jurisdictions*`
      },
      
      // 19. Pay Equity / Salary History Bans
      {
        templateId: "pay_equity_comprehensive",
        title: "Pay Equity & Salary History Ban Compliance",
        description: "Equal pay requirements and salary history inquiry prohibitions",
        topicSlug: "pay-equity-salary-history-bans",
        markdownContent: `# Pay Equity & Salary History Ban Compliance

## Quick Overview
What are the requirements for equal pay, and can employers ask about salary history?

## Pay Equity Laws
### Federal: Equal Pay Act (EPA)
- **Coverage**: All employers
- **Requirement**: Equal pay for equal work regardless of sex
- **Equal work**: Substantially equal skill, effort, responsibility, similar working conditions
- **Same establishment**: Physical location

### State Pay Equity Laws
- Often broader than federal (cover more protected classes)
- "Comparable work" vs. "equal work" (lower threshold)
- Proactive pay equity requirements
- Salary range transparency mandates

## Salary History Ban Laws
### Jurisdictions with Bans
- **States**: 20+ states (full or partial bans)
- **Cities**: Many major cities
- **Scope**: Private and public employers

### What's Prohibited
- Asking about salary history on application
- Inquiring during interview process
- Seeking information from prior employers
- Screening applicants based on current/past compensation

### When Information Can Be Used
- **Voluntary disclosure**: If applicant volunteers without prompting
- **Verification**: After offer made (some states allow, others prohibit)
- **Public record**: If salary was public information

## Pay Transparency Requirements
### Salary Range Disclosure
**States/Cities Requiring**:
- New York, California, Colorado, Washington, others
- In job postings
- Upon request
- To current employees for their position

**What Must Be Disclosed**:
- Wage or salary range
- Benefits description (some jurisdictions)
- Application deadline (if applicable)

### Pay Data Reporting
- **EEO-1 Component 2**: Federal contractors (suspended/reinstated cycles)
- **State requirements**: Pay data by gender, race, job category
- **California**: Annual pay data report (100+ employees)

## Equal Pay Analysis
### Four Affirmative Defenses (EPA)
Pay differential permitted if based on:
1. **Seniority system**
2. **Merit system**
3. **System measuring earnings by quantity/quality**
4. **Any factor other than sex**

### Factors Other Than Sex
- Education
- Training
- Experience
- Certifications
- Shift differentials
- Geographic location

### Not Valid Defenses
- Market rates (increasingly rejected)
- Salary history (cannot perpetuate past discrimination)
- Negotiations (if correlates with protected class)

## Proactive Pay Equity Steps
1. **Conduct pay equity audit** (privilege considerations)
2. **Identify comparators**: Same/substantially similar work
3. **Analyze differentials**: Statistically significant gaps
4. **Identify legitimate reasons**: Document non-discriminatory factors
5. **Remediate**: Adjust wages if no legitimate reason
6. **Prevent retaliation**: Cannot reduce anyone's pay

## Pay Discussions and Transparency
### Employee Rights
- Can discuss wages with coworkers (NLRA Section 7)
- Cannot discipline for wage discussions
- Applies to non-union workplaces
- "Pay secrecy" policies are illegal

### Employer Restrictions
- Cannot prohibit salary discussions
- Cannot retaliate for disclosing wages
- Cannot require confidentiality as condition of raise

## Retaliation Prohibition
### Protected Activities
- Filing EPA claim
- Discussing wages with coworkers
- Requesting salary range
- Opposing discriminatory pay practices
- Participating in pay equity investigation

### Prohibited Actions
- Termination
- Demotion
- Reduction in pay/hours
- Negative performance reviews
- Hostile work environment

## Interview Process Compliance
### What to Avoid Asking
- "What is your current salary?"
- "What were you making at your last job?"
- "What are your salary expectations?" (if based on history)

### Permissible Questions
- "What are your salary expectations for this role?"
- "Our range is $X-Y, does this work for you?"
- Discuss job requirements and qualifications

## Job Posting Requirements
### Must Include (Where Required)
- Position title
- Salary or wage range (actual range, not "$15/hr and up")
- Benefits summary
- Application deadline
- Location

## Penalties for Violations
### Equal Pay Act
- Back pay (no cap)
- Liquidated damages (double back wages)
- 2-3 year statute of limitations (3 if willful)
- Attorney fees
- Class action exposure

### Salary History Ban Violations
- Civil penalties (varies by jurisdiction)
- $1,000-$10,000 per violation
- Private right of action
- Administrative enforcement

### Pay Transparency Violations
- Fines for non-compliance with posting laws
- Required disclosure of range
- Penalties for retaliation

## Common Mistakes
- ❌ Asking about salary history
- ❌ Screening based on past compensation
- ❌ Not posting salary ranges (where required)
- ❌ Prohibiting wage discussions
- ❌ Basing pay on salary history
- ❌ No job-related justification for pay differentials
- ❌ Retaliating for pay equity complaints

## Best Practices
1. Remove salary history questions from applications
2. Train recruiters/managers on prohibitions
3. Establish salary ranges before posting
4. Conduct regular pay equity audits
5. Document legitimate pay differential reasons
6. Allow wage discussions
7. Respond promptly to accommodation requests
8. Review offer letters for compliance

## Sources
- Equal Pay Act (29 USC § 206(d))
- Title VII (pregnancy discrimination)
- State equal pay laws
- Salary history ban statutes/ordinances
- EEOC equal pay guidance

---
*This template provides guidance on pay equity and salary history ban compliance*`
      },
      
      // 20. Prevailing Wage Laws
      {
        templateId: "prevailing_wage_comprehensive",
        title: "Prevailing Wage Requirements (Public Contracts)",
        description: "Davis-Bacon and state prevailing wage requirements for government-funded projects",
        topicSlug: "prevailing-wage-laws-public-contracts",
        markdownContent: `# Prevailing Wage Requirements (Public Contracts)

## Quick Overview
What are prevailing wage requirements for workers on government-funded construction projects?

## Covered Employers
- Contractors and subcontractors on federal/state public works
- Construction, alteration, repair of public buildings
- Federal contracts $2,000+ (Davis-Bacon)
- State thresholds vary ($1,000-$25,000+)

## Covered Projects
### Federal (Davis-Bacon Act)
- Federal construction projects $2,000+
- Federally-assisted construction
- Federal buildings and works

### Related Federal Acts
- **Walsh-Healey**: Federal supply contracts $15,000+
- **Service Contract Act (SCA)**: Service contracts $2,500+
- **Contract Work Hours**: Safety standards for federal contracts

### State Prevailing Wage
- State-funded construction
- School construction
- Public works projects
- State thresholds and definitions vary

## Covered Workers
- Laborers and mechanics
- Apprentices and trainees (at percentage of journeyman rate)
- Not: Supervisors, administrative, professional employees

## Prevailing Wage Rates
### How Determined
- County-by-county rates
- By craft/classification
- DOL Wage Determinations (federal)
- State labor agency determinations (state projects)
- Survey of collectively bargained rates in area

### Rate Components
- **Base hourly rate**: Cash wages
- **Fringe benefits**: Health, pension, training, vacation
- Can pay fringe as cash or actual benefits

## Contractor Obligations
### Pre-Award
- Obtain applicable wage determination
- Include in bid calculations
- Subcontractor notification

### During Project
1. **Pay correct rates**: According to worker classification
2. **Post wage determination**: At job site
3. **Submit weekly certified payrolls**: WH-347 forms
4. **Maintain records**: Payroll, hours, classifications
5. **Employee interviews**: Cooperate with DOL interviews

## Certified Payroll Requirements
### Weekly Submission
- Form WH-347 or equivalent
- Each worker's classification
- Hours worked (daily and weekly)
- Rates paid (hourly and overtime)
- Deductions
- Statement of Compliance signed by contractor

### Submission Timing
- Weekly to contracting agency
- Within 7 days of pay period
- Subcontractors to prime, prime to agency

## Fringe Benefit Compliance
### Payment Options
- Actual contributions to bona fide benefit plans
- OR cash equivalent paid to employee
- Cannot pay less than prevailing rate total

### Documentation Required
- Plan documents for bona fide benefits
- Contribution receipts
- Participant statements

## Classification of Workers
- Must classify workers correctly by trade
- Use DOL/state classifications in wage determination
- Cannot use lower-paid classification to save money
- Apprentices: Must be registered program

## Retaliation Prohibition
- Cannot terminate for asking about wages
- Cannot discriminate for cooperating with investigation
- Whistleblower protections

## Anti-Kickback Protections
- Cannot induce worker to return/kickback wages
- Deductions must be legitimate and legal
- Full wages must be paid free and clear

## Penalties for Non-Compliance
### Contract Sanctions
- Withholding of contract payments
- Contract termination
- Debarment (3 years)
- Cannot bid on future federal/state contracts

### Financial Penalties
- Back wages to underpaid workers
- Liquidated damages
- Civil penalties
- Criminal prosecution for false statements

### Davis-Bacon Specific
- Automatic withholding of payments
- Investigation costs charged to contractor
- Cross-debarment (federal and state)

## Common Violations
- ❌ Paying below prevailing rate
- ❌ Misclassifying workers to lower classification
- ❌ Not paying overtime correctly (1.5x prevailing rate)
- ❌ Late or incomplete certified payrolls
- ❌ Not posting wage determination at site
- ❌ Failing to pay fringe benefits
- ❌ Improper apprentice ratios

## Best Practices
1. Obtain correct wage determination before bidding
2. Include prevailing wage costs in bid
3. Post wage determination prominently at job site
4. Classify workers accurately
5. Submit certified payrolls on time
6. Maintain detailed records
7. Monitor subcontractor compliance
8. Conduct internal compliance audits

## Apprentice Requirements
- Must be registered in DOL/state-approved program
- Paid percentage of journeyman rate per program schedule
- Ratio limits (typically 1:1 or 1:2 apprentice to journeyman)
- Cannot use to displace journeymen

## Sources
- Davis-Bacon Act (40 USC § 3141 et seq.)
- DOL Wage Determinations Online (WDOL)
- State prevailing wage statutes
- Certified payroll forms and instructions
- Contractor compliance guides

---
*This template provides comprehensive prevailing wage compliance guidance for contractors on public works*`
      },
      
    ];

    let createdCount = 0;
    
    for (const template of templates) {
      try {
        await ctx.runMutation(api.complianceTemplates.upsertTemplate, {
          templateId: template.templateId,
          title: template.title,
          description: template.description,
          markdownContent: template.markdownContent,
          topicSlug: template.topicSlug,
          isActive: true,
        });
        
        createdCount++;
        console.log(`✅ Created template: ${template.title}`);
      } catch (error) {
        console.error(`❌ Failed to create ${template.title}:`, error);
      }
    }

    console.log(`🎉 Template seeding complete. Created ${createdCount} templates.`);
    return { success: true, templatesCreated: createdCount, total: templates.length };
  },
});

