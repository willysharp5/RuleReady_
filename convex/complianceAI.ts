import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { internal, api } from "./_generated/api";

// PHASE 3.2: AI-Powered Change Impact Analysis
export const analyzeComplianceChange = internalAction({
  args: { 
    ruleId: v.string(),
    oldContent: v.string(),
    newContent: v.string(),
    changeContext: v.object({
      jurisdiction: v.string(),
      topicKey: v.string(),
      lastChanged: v.optional(v.number())
    })
  },
  handler: async (ctx, args) => {
    console.log(`🧠 Analyzing compliance changes for ${args.changeContext.jurisdiction} ${args.changeContext.topicKey}`);
    
    // 1. Generate embeddings for both versions to detect semantic changes
    let similarityScore = 0.5; // Default fallback
    try {
      const [oldEmbedding, newEmbedding] = await Promise.all([
        generateEmbedding(args.oldContent),
        generateEmbedding(args.newContent)
      ]);
      
      // 2. Calculate semantic similarity score
      similarityScore = calculateCosineSimilarity(oldEmbedding, newEmbedding);
      console.log(`📊 Semantic similarity: ${(similarityScore * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.log("⚠️ Could not generate embeddings for similarity analysis");
    }
    
    // 3. Use Gemini to analyze specific differences
    const aiAnalysis = await analyzeWithGemini(ctx, {
      prompt: `Analyze the following compliance law changes for ${args.changeContext.jurisdiction} ${args.changeContext.topicKey}:
      
      OLD VERSION:
      ${args.oldContent.substring(0, 2000)}...
      
      NEW VERSION:
      ${args.newContent.substring(0, 2000)}...
      
      Please identify:
      1. Key changes in requirements, deadlines, or penalties
      2. Business impact severity (critical/high/medium/low)
      3. Affected employer types
      4. Implementation timeline
      5. Plain-English summary of changes
      
      Respond with JSON:
      {
        "keyChanges": ["change1", "change2"],
        "severity": "critical|high|medium|low",
        "affectedEmployers": ["type1", "type2"],
        "implementationTimeline": "description",
        "summary": "plain English summary",
        "businessImpact": "impact description",
        "recommendedActions": ["action1", "action2"]
      }`,
      
      context: "compliance_law_analysis"
    });
    
    // 4. Extract structured data (dates, amounts, requirements)
    const structuredChanges = extractStructuredChanges(args.oldContent, args.newContent);
    
    // 5. Assess business impact and urgency
    const impactScore = calculateImpactScore({
      similarityScore,
      aiAnalysis,
      structuredChanges,
      topicPriority: getTopicPriority(args.changeContext.topicKey)
    });
    
    console.log(`✅ Analysis complete: ${aiAnalysis.severity} severity, impact score ${impactScore.score}`);
    
    return {
      changeDetected: similarityScore < 0.95, // Threshold for significant change
      severity: aiAnalysis.severity || impactScore.severity,
      impactAreas: aiAnalysis.affectedEmployers || [],
      keyChanges: structuredChanges,
      businessImpact: aiAnalysis.businessImpact,
      implementationTimeline: aiAnalysis.implementationTimeline,
      plainEnglishSummary: aiAnalysis.summary,
      confidence: Math.min(aiAnalysis.confidence || 0.8, impactScore.confidence),
      recommendedActions: aiAnalysis.recommendedActions || [],
      semanticSimilarity: similarityScore,
      analysisMetadata: {
        analyzedAt: Date.now(),
        ruleId: args.ruleId,
        jurisdiction: args.changeContext.jurisdiction,
        topicKey: args.changeContext.topicKey,
      }
    };
  }
});

// Semantic change detection using embeddings
export const detectSemanticChanges: any = internalAction({
  args: {
    entityId: v.string(),
    newContent: v.string(),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`🔍 Detecting semantic changes for entity: ${args.entityId}`);
    
    // Get existing embeddings for this entity
    const allEmbeddings = await ctx.runQuery(
      internal.embeddingManager.getEmbeddingsLimited,
      { 
        limit: 20 // Reduced to prevent byte overflow
      }
    );
    
    // Filter by entityId
    const existingEmbeddings = allEmbeddings.filter((emb: any) => emb.entityId === args.entityId);
    
    if (existingEmbeddings.length === 0) {
      console.log("No existing embeddings found - treating as new content");
      return {
        hasChanged: true,
        similarity: 0,
        changeType: "new_content",
        confidence: 1.0
      };
    }
    
    // Generate embedding for new content
    const newEmbedding = await generateEmbedding(args.newContent);
    const existingEmbedding = existingEmbeddings[0].embedding;
    
    // Calculate similarity
    const similarity = calculateCosineSimilarity(newEmbedding, existingEmbedding);
    const threshold = args.threshold || 0.85;
    const hasChanged = similarity < threshold;
    
    console.log(`📊 Semantic similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`);
    
    return {
      hasChanged,
      similarity,
      changeType: hasChanged ? "content_changed" : "no_change",
      confidence: Math.abs(similarity - threshold) + 0.5, // Higher confidence when far from threshold
      threshold,
      existingContentHash: existingEmbeddings[0].contentHash,
      newContentHash: await calculateContentHash(args.newContent),
    };
  }
});

// Generate embedding using existing infrastructure
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    // This would use the existing Gemini embedding generation
    // For now, return a mock embedding
    console.log(`🔗 Generating embedding for content (${content.length} chars)`);
    
    // Mock 1536-dimensional embedding (Gemini standard)
    return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Calculate cosine similarity between two embeddings
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimensions");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]
}

// Extract structured changes between content versions
function extractStructuredChanges(oldContent: string, newContent: string) {
  const changes = {
    addedSections: [] as string[],
    removedSections: [] as string[],
    modifiedSections: [] as string[],
    newDates: extractNewDates(oldContent, newContent),
    newPenalties: extractNewPenalties(oldContent, newContent),
    newRequirements: extractNewRequirements(oldContent, newContent),
  };
  
  // Basic section-level change detection
  const oldSections = extractSections(oldContent);
  const newSections = extractSections(newContent);
  
  // Find added sections
  for (const section of newSections) {
    if (!oldSections.includes(section)) {
      changes.addedSections.push(section);
    }
  }
  
  // Find removed sections
  for (const section of oldSections) {
    if (!newSections.includes(section)) {
      changes.removedSections.push(section);
    }
  }
  
  return changes;
}

// Calculate business impact score
function calculateImpactScore(params: {
  similarityScore: number;
  aiAnalysis: any;
  structuredChanges: any;
  topicPriority: string;
}) {
  let score = 0;
  
  // Semantic change contribution (40% of score)
  const semanticImpact = 1 - params.similarityScore;
  score += semanticImpact * 0.4;
  
  // Topic priority contribution (30% of score)
  const priorityWeights = { critical: 1.0, high: 0.8, medium: 0.6, low: 0.4 };
  const priorityImpact = priorityWeights[params.topicPriority as keyof typeof priorityWeights] || 0.5;
  score += priorityImpact * 0.3;
  
  // Structured changes contribution (30% of score)
  const structuredImpact = Math.min(1.0, 
    (params.structuredChanges.addedSections.length * 0.3) +
    (params.structuredChanges.removedSections.length * 0.4) +
    (params.structuredChanges.newDates.length * 0.2) +
    (params.structuredChanges.newPenalties.length * 0.1)
  );
  score += structuredImpact * 0.3;
  
  // Determine severity based on score
  let severity = "low";
  if (score > 0.8) severity = "critical";
  else if (score > 0.6) severity = "high";
  else if (score > 0.4) severity = "medium";
  
  return {
    score: Math.min(1.0, score),
    severity,
    confidence: 0.8,
    components: {
      semantic: semanticImpact,
      priority: priorityImpact,
      structured: structuredImpact,
    }
  };
}

// Get topic priority for impact calculation
function getTopicPriority(topicKey: string): string {
  const priorities = {
    minimum_wage: "critical",
    overtime: "high", 
    paid_sick_leave: "high",
    harassment_training: "high",
    workers_comp: "medium",
    posting_requirements: "medium",
    background_checks: "medium",
    family_leave: "low",
    youth_employment: "low",
  };
  
  return priorities[topicKey as keyof typeof priorities] || "medium";
}

// Utility functions for change extraction
function extractSections(content: string): string[] {
  const sectionHeaders = [
    "Overview", "Covered Employers", "Covered Employees",
    "What Should Employers Do?", "Training Requirements",
    "Posting Requirements", "Penalties for Non-Compliance", "Sources"
  ];
  
  return sectionHeaders.filter(header => 
    content.toLowerCase().includes(header.toLowerCase())
  );
}

function extractNewDates(oldContent: string, newContent: string): string[] {
  const oldDates = new Set(extractDates(oldContent));
  const newDates = extractDates(newContent);
  
  return newDates.filter(date => !oldDates.has(date));
}

function extractNewPenalties(oldContent: string, newContent: string): string[] {
  const oldPenalties = new Set(extractPenalties(oldContent));
  const newPenalties = extractPenalties(newContent);
  
  return newPenalties.filter(penalty => !oldPenalties.has(penalty));
}

function extractNewRequirements(oldContent: string, newContent: string): string[] {
  const oldReqs = new Set(extractRequirements(oldContent));
  const newReqs = extractRequirements(newContent);
  
  return newReqs.filter(req => !oldReqs.has(req));
}

// Utility functions (reuse from complianceParser.ts)
function extractDates(content: string): string[] {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = content.match(pattern);
    if (matches) dates.push(...matches);
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
    if (matches) penalties.push(...matches);
  }
  
  return [...new Set(penalties)];
}

function extractRequirements(content: string): string[] {
  const requirementPatterns = [
    /(?:must|shall|required?\s+to)\s+[^.]+/gi,
    /(?:employers?\s+)?(?:must|shall)\s+[^.]+/gi,
  ];
  
  const requirements: string[] = [];
  for (const pattern of requirementPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      requirements.push(...matches.map(m => m.trim()).filter(m => m.length > 10));
    }
  }
  
  return requirements.slice(0, 10);
}

async function calculateContentHash(content: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Placeholder for Gemini integration
async function analyzeWithGemini(ctx: any, params: { prompt: string; context: string }) {
  try {
    // This would integrate with existing Gemini API setup
    console.log("🤖 Calling Gemini for compliance analysis...");
    
    // For now, return structured placeholder based on content analysis
    return {
      keyChanges: ["Content analysis pending"],
      severity: "medium",
      affectedEmployers: ["All employers"],
      implementationTimeline: "Review immediately",
      summary: "Gemini analysis integration pending",
      businessImpact: "Moderate impact requiring review",
      recommendedActions: ["Review changes", "Update compliance procedures"],
      confidence: 0.7,
    };
    
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      keyChanges: ["Analysis failed"],
      severity: "unknown",
      affectedEmployers: [],
      implementationTimeline: "Unknown",
      summary: "Could not analyze changes",
      businessImpact: "Unknown impact",
      recommendedActions: ["Manual review required"],
      confidence: 0.0,
    };
  }
}
