import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Parse compliance content using template structure
export const parseComplianceContent = internalAction({
  args: { 
    content: v.string(),
    ruleId: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`📝 Parsing compliance content for rule: ${args.ruleId}`);
    
    // 1. Extract template sections
    const sections = extractAllTemplateSections(args.content);
    
    // 2. Extract structured compliance data
    const complianceData = extractComplianceData(args.content);
    
    // 3. Identify key changes indicators
    const changeIndicators = identifyChangeIndicators(args.content);
    
    // 4. Calculate content hash for change detection
    const contentHash = await calculateContentHash(args.content);
    
    // 5. Generate AI analysis of the content
    const aiAnalysis = await analyzeContentWithAI(ctx, {
      content: args.content,
      sections,
      complianceData,
      ruleId: args.ruleId,
    });
    
    return {
      sections,
      complianceData,
      changeIndicators,
      contentHash,
      aiAnalysis,
      parsedAt: Date.now(),
      contentLength: args.content.length,
    };
  },
});

// Extract all compliance template sections
function extractAllTemplateSections(content: string) {
  const templateSections = [
    "Overview",
    "Covered Employers", 
    "Covered Employees",
    "What Should Employers Do?",
    "Training Requirements",
    "Training Deadlines",
    "Qualified Trainers",
    "Special Requirements",
    "Coverage Election",
    "Reciprocity/Extraterritorial Coverage",
    "Employer Responsibilities & Deadlines",
    "Employer Notification Requirements", 
    "Posting Requirements",
    "Recordkeeping Requirements",
    "Penalties for Non-Compliance",
    "Sources"
  ];
  
  const sections: Record<string, string> = {};
  
  for (const sectionName of templateSections) {
    const sectionContent = extractSection(content, sectionName);
    if (sectionContent) {
      sections[sectionName.toLowerCase().replace(/[^a-z0-9]/g, '_')] = sectionContent;
    }
  }
  
  return sections;
}

// Extract structured compliance data
function extractComplianceData(content: string) {
  return {
    // Dates and deadlines
    effectiveDates: extractDates(content),
    deadlines: extractDeadlines(content),
    
    // Financial information
    penaltyAmounts: extractPenalties(content),
    wageRates: extractWageRates(content),
    
    // Coverage criteria
    employeeThresholds: extractEmployeeThresholds(content),
    businessTypes: extractBusinessTypes(content),
    
    // Requirements
    trainingHours: extractTrainingHours(content),
    postingRequirements: extractPostingRequirements(content),
    
    // Legal references
    statutes: extractStatutes(content),
    regulations: extractRegulations(content),
  };
}

// Identify change indicators in content
function identifyChangeIndicators(content: string) {
  const indicators = {
    newLaw: false,
    amendment: false,
    effectiveDate: false,
    emergency: false,
    sunset: false,
  };
  
  const lowerContent = content.toLowerCase();
  
  // Check for new law indicators
  if (lowerContent.includes('new law') || lowerContent.includes('newly enacted')) {
    indicators.newLaw = true;
  }
  
  // Check for amendment indicators
  if (lowerContent.includes('amend') || lowerContent.includes('revised') || lowerContent.includes('updated')) {
    indicators.amendment = true;
  }
  
  // Check for effective date language
  if (lowerContent.includes('effective') || lowerContent.includes('takes effect')) {
    indicators.effectiveDate = true;
  }
  
  // Check for emergency provisions
  if (lowerContent.includes('emergency') || lowerContent.includes('immediate effect')) {
    indicators.emergency = true;
  }
  
  // Check for sunset clauses
  if (lowerContent.includes('sunset') || lowerContent.includes('expires')) {
    indicators.sunset = true;
  }
  
  return indicators;
}

// AI analysis of compliance content
async function analyzeContentWithAI(ctx: any, data: any) {
  // Placeholder for Gemini AI analysis
  // This would use your existing Gemini infrastructure
  
  const prompt = `Analyze this compliance content for ${data.ruleId}:

${data.content.substring(0, 2000)}...

Please identify:
1. Key compliance requirements
2. Covered employers and employees  
3. Important deadlines and effective dates
4. Penalties for non-compliance
5. Recent changes or updates
6. Business impact severity (critical/high/medium/low)

Provide structured analysis for legal professionals.`;

  // For now, return structured placeholder
  return {
    keyRequirements: extractKeyRequirements(data.content),
    coveredEntities: extractCoveredEntities(data.content),
    criticalDeadlines: data.complianceData.deadlines.slice(0, 3),
    businessImpact: assessBusinessImpact(data.sections),
    changeRisk: assessChangeRisk(data.changeIndicators),
    confidence: 0.85,
  };
}

// Extract key compliance requirements
function extractKeyRequirements(content: string): string[] {
  const requirements = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Look for requirement indicators
    if (line.match(/must|required|shall|mandatory/i) && line.length > 20 && line.length < 200) {
      requirements.push(line.trim());
    }
  }
  
  return requirements.slice(0, 5); // Top 5 requirements
}

// Extract covered entities information
function extractCoveredEntities(content: string): { employers: string[], employees: string[] } {
  const employers = [];
  const employees = [];
  
  // Look for employer coverage patterns
  const employerMatches = content.match(/employers?\s+with\s+[^.]+/gi);
  if (employerMatches) {
    employers.push(...employerMatches.slice(0, 3));
  }
  
  // Look for employee coverage patterns  
  const employeeMatches = content.match(/employees?\s+who\s+[^.]+/gi);
  if (employeeMatches) {
    employees.push(...employeeMatches.slice(0, 3));
  }
  
  return { employers, employees };
}

// Assess business impact based on content
function assessBusinessImpact(sections: any): "critical" | "high" | "medium" | "low" {
  // Check for high-impact indicators
  const penalties = sections.penalties_for_non_compliance || "";
  const requirements = sections.employer_responsibilities_deadlines || "";
  
  if (penalties.includes('$') || penalties.includes('criminal')) {
    return "critical";
  }
  
  if (requirements.includes('immediate') || requirements.includes('within')) {
    return "high";
  }
  
  return "medium";
}

// Assess change risk based on indicators
function assessChangeRisk(indicators: any): "high" | "medium" | "low" {
  if (indicators.emergency || indicators.newLaw) {
    return "high";
  }
  
  if (indicators.amendment || indicators.effectiveDate) {
    return "medium";
  }
  
  return "low";
}

// Utility functions from previous files
function extractSection(content: string, sectionName: string): string | undefined {
  const lines = content.split('\n');
  let inSection = false;
  let sectionContent = '';
  
  for (const line of lines) {
    if (line.trim() === sectionName) {
      inSection = true;
      continue;
    }
    
    if (inSection && line.match(/^[A-Z][^a-z]*$/) && line.trim() !== sectionName) {
      break;
    }
    
    if (inSection) {
      sectionContent += line + '\n';
    }
  }
  
  return sectionContent.trim() || undefined;
}

function extractDates(content: string): string[] {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }
  
  return [...new Set(dates)];
}

function extractPenalties(content: string): string[] {
  const penaltyPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g,
    /fine[sd]?\s+(?:of\s+)?(?:up\s+to\s+)?\$[\d,]+/gi,
    /penalty[ies]*\s+(?:of\s+)?(?:up\s+to\s+)?\$[\d,]+/gi,
  ];
  
  const penalties: string[] = [];
  for (const pattern of penaltyPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      penalties.push(...matches);
    }
  }
  
  return [...new Set(penalties)];
}

function extractDeadlines(content: string): string[] {
  const deadlinePatterns = [
    /deadline[s]?\s+(?:is|are|of)\s+[^.]+/gi,
    /due\s+(?:by|on|before)\s+[^.]+/gi,
    /must\s+be\s+(?:completed|submitted|filed)\s+(?:by|on|before)\s+[^.]+/gi,
  ];
  
  const deadlines: string[] = [];
  for (const pattern of deadlinePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      deadlines.push(...matches);
    }
  }
  
  return deadlines;
}

function extractWageRates(content: string): string[] {
  const wagePatterns = [
    /\$\d+(?:\.\d{2})?\s*(?:per\s+hour|\/hour|hourly)/gi,
    /minimum\s+wage\s+(?:of\s+)?\$\d+(?:\.\d{2})?/gi,
  ];
  
  const wages: string[] = [];
  for (const pattern of wagePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      wages.push(...matches);
    }
  }
  
  return wages;
}

function extractEmployeeThresholds(content: string): string[] {
  const thresholdPatterns = [
    /\b\d+\s+or\s+more\s+employees\b/gi,
    /employers?\s+with\s+\d+\s+or\s+more/gi,
    /businesses?\s+with\s+\d+\s+or\s+more/gi,
  ];
  
  const thresholds: string[] = [];
  for (const pattern of thresholdPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      thresholds.push(...matches);
    }
  }
  
  return thresholds;
}

function extractBusinessTypes(content: string): string[] {
  const businessPatterns = [
    /(?:retail|restaurant|manufacturing|healthcare|construction|nonprofit)\s+(?:employers?|businesses?)/gi,
    /employers?\s+in\s+the\s+(?:retail|restaurant|manufacturing|healthcare|construction|nonprofit)\s+industry/gi,
  ];
  
  const types: string[] = [];
  for (const pattern of businessPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      types.push(...matches);
    }
  }
  
  return types;
}

function extractTrainingHours(content: string): string[] {
  const trainingPatterns = [
    /\b\d+\s+hours?\s+of\s+training/gi,
    /training\s+(?:of\s+)?(?:at\s+least\s+)?\d+\s+hours?/gi,
  ];
  
  const hours: string[] = [];
  for (const pattern of trainingPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      hours.push(...matches);
    }
  }
  
  return hours;
}

function extractPostingRequirements(content: string): string[] {
  const postingPatterns = [
    /must\s+(?:post|display)\s+[^.]+/gi,
    /posting\s+(?:of\s+)?[^.]+\s+(?:is\s+)?required/gi,
    /workplace\s+poster[s]?\s+[^.]+/gi,
  ];
  
  const postings: string[] = [];
  for (const pattern of postingPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      postings.push(...matches);
    }
  }
  
  return postings;
}

function extractStatutes(content: string): string[] {
  const statutePatterns = [
    /\b\d+\s+U\.?S\.?C\.?\s+§?\s*\d+/gi, // Federal statutes
    /\b\d+\s+CFR\s+§?\s*\d+/gi, // Federal regulations
    /\b[A-Z]{2}\s+(?:Rev\.?\s+)?Stat\.?\s+§?\s*[\d.-]+/gi, // State statutes
  ];
  
  const statutes: string[] = [];
  for (const pattern of statutePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      statutes.push(...matches);
    }
  }
  
  return [...new Set(statutes)];
}

function extractRegulations(content: string): string[] {
  const regPatterns = [
    /\b\d+\s+CFR\s+[\d.]+/gi,
    /Code\s+of\s+Federal\s+Regulations/gi,
    /regulation[s]?\s+[\d.-]+/gi,
  ];
  
  const regulations: string[] = [];
  for (const pattern of regPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      regulations.push(...matches);
    }
  }
  
  return [...new Set(regulations)];
}

async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
