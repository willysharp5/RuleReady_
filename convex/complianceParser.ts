import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// PHASE 2.2: Template-Aware Intelligent Change Detection
export const parseComplianceContent = internalAction({
  args: { 
    content: v.string(),
    ruleId: v.string(),
    previousContent: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    console.log(`📝 Parsing compliance content for rule: ${args.ruleId}`);
    
    // 1. Parse content using compliance template sections
    const sections = extractTemplateSections(args.content);
    
    // 2. Compare with previous version section by section
    const previousSections = args.previousContent ? 
      extractTemplateSections(args.previousContent) : {};
    const changes = detectSectionChanges(sections, previousSections);
    
    // 3. Use Gemini AI to assess significance of changes
    const aiAnalysis = await analyzeChangesWithAI(ctx, changes, args.ruleId);
    
    // 4. Extract key compliance data (dates, amounts, requirements)
    const metadata = extractComplianceMetadata(sections);
    
    // 5. Generate structured change report
    const changeScore = calculateChangeScore(changes, aiAnalysis);
    
    console.log(`✅ Parsing complete for ${args.ruleId}: ${Object.keys(sections).length} sections, score: ${changeScore}`);
    
    return {
      sections,
      changes,
      aiAnalysis,
      metadata,
      changeScore,
      hasSignificantChanges: changeScore > 0.3, // 30% threshold for significance
      contentHash: await calculateContentHash(args.content),
      rawContent: args.content, // Include original content
      processedAt: Date.now(),
    };
  }
});

// Template section extraction based on compliance_template.txt structure
function extractTemplateSections(content: string) {
  const sections = {
    overview: extractSection(content, "Overview"),
    coveredEmployers: extractSection(content, "Covered Employers"),
    coveredEmployees: extractSection(content, "Covered Employees"),
    employerResponsibilities: extractSection(content, "What Should Employers Do?"),
    trainingRequirements: extractSection(content, "Training Requirements"),
    trainingDeadlines: extractSection(content, "Training Deadlines"),
    qualifiedTrainers: extractSection(content, "Qualified Trainers"),
    specialRequirements: extractSection(content, "Special Requirements"),
    coverageElection: extractSection(content, "Coverage Election"),
    reciprocity: extractSection(content, "Reciprocity/Extraterritorial Coverage"),
    employerDeadlines: extractSection(content, "Employer Responsibilities & Deadlines"),
    notificationRequirements: extractSection(content, "Employer Notification Requirements"),
    postingRequirements: extractSection(content, "Posting Requirements"),
    recordkeepingRequirements: extractSection(content, "Recordkeeping Requirements"),
    penalties: extractSection(content, "Penalties for Non-Compliance"),
    sources: extractSection(content, "Sources"),
  };
  
  // Filter out empty sections
  return Object.fromEntries(
    Object.entries(sections).filter(([_, value]) => value && value.trim().length > 0)
  );
}

// Extract individual sections using various detection methods
function extractSection(content: string, sectionName: string): string | undefined {
  const lines = content.split('\n');
  let inSection = false;
  let sectionContent = '';
  
  // Try exact match first
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for section header (exact match or close variations)
    if (line === sectionName || 
        line.toLowerCase() === sectionName.toLowerCase() ||
        line.includes(sectionName) ||
        sectionName.includes(line)) {
      inSection = true;
      continue;
    }
    
    // Stop at next section header (all caps or title case)
    if (inSection && i > 0) {
      const nextLine = line;
      if (nextLine.length > 3 && 
          (nextLine === nextLine.toUpperCase() || 
           nextLine.match(/^[A-Z][^a-z]*[A-Z]/) ||
           nextLine.startsWith("##") ||
           nextLine.match(/^\d+\./))) {
        break;
      }
    }
    
    if (inSection && line.length > 0) {
      sectionContent += line + '\n';
    }
  }
  
  const cleaned = sectionContent.trim();
  return cleaned.length > 10 ? cleaned : undefined; // Minimum content threshold
}

// Detect changes between section versions
function detectSectionChanges(newSections: any, oldSections: any) {
  const changes = [];
  
  // Check for new sections
  for (const [sectionName, newContent] of Object.entries(newSections)) {
    if (!oldSections[sectionName]) {
      changes.push({
        section: sectionName,
        changeType: "new_section",
        newContent: newContent as string,
        significance: 0.8, // New sections are significant
      });
    } else {
      // Compare content
      const oldContent = oldSections[sectionName] as string;
      const similarity = calculateTextSimilarity(newContent as string, oldContent);
      
      if (similarity < 0.85) { // 85% similarity threshold
        changes.push({
          section: sectionName,
          changeType: "content_changed",
          oldContent,
          newContent: newContent as string,
          similarity,
          significance: 1 - similarity, // Lower similarity = higher significance
        });
      }
    }
  }
  
  // Check for removed sections
  for (const [sectionName, oldContent] of Object.entries(oldSections)) {
    if (!newSections[sectionName]) {
      changes.push({
        section: sectionName,
        changeType: "section_removed",
        oldContent: oldContent as string,
        significance: 0.7, // Removed sections are significant
      });
    }
  }
  
  return changes;
}

// AI-powered change analysis using Gemini
async function analyzeChangesWithAI(ctx: any, changes: any[], ruleId: string) {
  if (changes.length === 0) {
    return {
      severity: "none",
      impactAreas: [],
      changeType: "no_change",
      confidence: 1.0,
      summary: "No significant changes detected",
      businessImpact: "minimal",
      recommendations: []
    };
  }
  
  // Create analysis prompt for Gemini
  const changesText = changes.map(c => 
    `Section: ${c.section}\nType: ${c.changeType}\nSignificance: ${c.significance}\n` +
    (c.newContent ? `New: ${c.newContent.substring(0, 200)}...\n` : '') +
    (c.oldContent ? `Old: ${c.oldContent.substring(0, 200)}...\n` : '')
  ).join('\n---\n');
  
  const prompt = `Analyze these compliance law changes for rule ${ruleId}:

${changesText}

Assess:
1. Business impact severity (critical/high/medium/low)
2. Affected areas (wages, training, deadlines, penalties, etc.)
3. Change type (new_law, amendment, deadline_change, penalty_change, etc.)
4. Implementation urgency
5. Plain-English summary

Respond with JSON:
{
  "severity": "critical|high|medium|low",
  "impactAreas": ["area1", "area2"],
  "changeType": "new_law|amendment|deadline_change|penalty_change|coverage_change|procedural_change",
  "confidence": 0.0-1.0,
  "summary": "Brief summary",
  "businessImpact": "Description of business impact",
  "recommendations": ["action1", "action2"]
}`;

  try {
    // Use existing Gemini integration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("⚠️ No Gemini API key - using fallback analysis");
      return getFallbackAnalysis(changes);
    }
    
    // Call Gemini API (placeholder - integrate with existing Gemini setup)
    const analysis = await callGeminiAPI(prompt, apiKey);
    return analysis;
    
  } catch (error) {
    console.error("AI analysis failed:", error);
    return getFallbackAnalysis(changes);
  }
}

// Fallback analysis when AI is unavailable
function getFallbackAnalysis(changes: any[]) {
  const maxSignificance = Math.max(...changes.map(c => c.significance));
  
  let severity = "low";
  if (maxSignificance > 0.7) severity = "critical";
  else if (maxSignificance > 0.5) severity = "high";
  else if (maxSignificance > 0.3) severity = "medium";
  
  return {
    severity,
    impactAreas: changes.map(c => c.section),
    changeType: changes.some(c => c.changeType === "new_section") ? "new_law" : "amendment",
    confidence: 0.6, // Lower confidence for fallback
    summary: `${changes.length} sections changed with max significance ${maxSignificance.toFixed(2)}`,
    businessImpact: "Requires review to determine impact",
    recommendations: ["Review changes manually", "Consult legal team if critical"]
  };
}

// Extract compliance metadata (dates, amounts, deadlines)
function extractComplianceMetadata(sections: any) {
  const metadata: any = {
    dates: [],
    penalties: [],
    deadlines: [],
    requirements: [],
    effectiveDates: [],
  };
  
  // Extract from all sections
  for (const [sectionName, content] of Object.entries(sections)) {
    if (typeof content !== 'string') continue;
    
    // Extract dates
    metadata.dates.push(...extractDates(content));
    
    // Extract penalties
    if (sectionName === 'penalties') {
      metadata.penalties.push(...extractPenalties(content));
    }
    
    // Extract deadlines
    if (sectionName.includes('deadline') || sectionName.includes('responsibilities')) {
      metadata.deadlines.push(...extractDeadlines(content));
    }
    
    // Extract requirements
    if (sectionName.includes('requirements') || sectionName.includes('responsibilities')) {
      metadata.requirements.push(...extractRequirements(content));
    }
  }
  
  // Remove duplicates and clean up
  metadata.dates = [...new Set(metadata.dates)].slice(0, 10);
  metadata.penalties = [...new Set(metadata.penalties)].slice(0, 5);
  metadata.deadlines = [...new Set(metadata.deadlines)].slice(0, 5);
  metadata.requirements = [...new Set(metadata.requirements)].slice(0, 10);
  
  return metadata;
}

// Calculate overall change score
function calculateChangeScore(changes: any[], aiAnalysis: any): number {
  if (changes.length === 0) return 0;
  
  // Base score from section changes
  const sectionScore = changes.reduce((sum, change) => sum + change.significance, 0) / changes.length;
  
  // AI confidence multiplier
  const confidenceMultiplier = aiAnalysis.confidence || 0.5;
  
  // Severity multiplier
  const severityMultipliers = {
    critical: 1.0,
    high: 0.8,
    medium: 0.6,
    low: 0.4,
    none: 0.1
  };
  const severityMultiplier = severityMultipliers[aiAnalysis.severity as keyof typeof severityMultipliers] || 0.5;
  
  return Math.min(1.0, sectionScore * confidenceMultiplier * severityMultiplier);
}

// Text similarity calculation using simple word overlap
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Content hash calculation for change detection
async function calculateContentHash(content: string): Promise<string> {
  // Simple hash for now - could use crypto.subtle.digest in production
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Utility functions for metadata extraction
function extractDates(content: string): string[] {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
    /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\beffective\s+(?:date|on)\s*:?\s*[^.]+/gi,
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }
  
  return dates;
}

function extractPenalties(content: string): string[] {
  const penaltyPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g, // Dollar amounts
    /fine[sd]?\s+(?:of\s+)?(?:up\s+to\s+)?\$[\d,]+/gi,
    /penalty[ies]*\s+(?:of\s+)?(?:up\s+to\s+)?\$[\d,]+/gi,
    /violation[s]?\s+(?:may\s+)?(?:result\s+in\s+)?(?:fines?\s+of\s+)?(?:up\s+to\s+)?\$[\d,]+/gi,
  ];
  
  const penalties: string[] = [];
  for (const pattern of penaltyPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      penalties.push(...matches);
    }
  }
  
  return penalties;
}

function extractDeadlines(content: string): string[] {
  const deadlinePatterns = [
    /deadline[s]?\s+(?:is|are|of)\s+[^.]+/gi,
    /due\s+(?:by|on|before)\s+[^.]+/gi,
    /must\s+be\s+(?:completed|submitted|filed)\s+(?:by|on|before)\s+[^.]+/gi,
    /within\s+\d+\s+(?:days|months|years)/gi,
    /(?:annual|quarterly|monthly)\s+(?:filing|submission|renewal)/gi,
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

function extractRequirements(content: string): string[] {
  const requirementPatterns = [
    /(?:must|shall|required?\s+to)\s+[^.]+/gi,
    /(?:employers?\s+)?(?:must|shall)\s+[^.]+/gi,
    /it\s+is\s+(?:required|mandatory)\s+[^.]+/gi,
    /(?:training|posting|notification)\s+(?:is\s+)?required\s+[^.]+/gi,
  ];
  
  const requirements: string[] = [];
  for (const pattern of requirementPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      requirements.push(...matches.map(m => m.trim()).filter(m => m.length > 10));
    }
  }
  
  return requirements.slice(0, 10); // Limit to prevent overwhelming output
}

// Placeholder for Gemini API integration
async function callGeminiAPI(prompt: string, apiKey: string) {
  // This would integrate with the existing Gemini setup
  // For now, return a structured fallback
  return {
    severity: "medium",
    impactAreas: ["compliance", "training"],
    changeType: "amendment",
    confidence: 0.7,
    summary: "Content analysis pending - integrate with existing Gemini API",
    businessImpact: "Moderate impact requiring review",
    recommendations: ["Review changes", "Update policies if needed"]
  };
}