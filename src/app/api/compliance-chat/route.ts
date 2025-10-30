import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, jurisdiction, topic, systemPrompt: customSystemPrompt, additionalContext } = body;

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

    const lastUser = messages[messages.length - 1]?.content || "";
    console.log(`🔍 Chat API: Processing question "${lastUser}"`);
    console.log(`⚙️ Jurisdiction: ${jurisdiction || 'ALL'}, Topic: ${topic || 'ALL'}`);
    
    let sources: unknown[] = [];
    
    // Always do embedding search for chat
    try {
      console.log('📝 Calling embeddingTopKSources...');
      const res: unknown = await convex.action(api.embeddingManager.embeddingTopKSources, {
        question: lastUser,
        k: 5, // Always get top 5 sources
        threshold: 0.3,
        jurisdiction: jurisdiction || undefined,
        topicSlug: topic || undefined,
      });
      sources = (res as { sources?: unknown[] })?.sources || [];
      console.log(`📊 Chat API: Received ${sources.length} sources from embedding search`);
    } catch (e) {
      console.error("Embedding retrieval failed:", e);
      sources = [];
    }

    // Fallback: much lower threshold if no sources were found
    if (!sources.length) {
      console.log('🔄 No sources found, trying with threshold 0.1...');
      try {
        const resLow: unknown = await convex.action(api.embeddingManager.embeddingTopKSources, {
          question: lastUser,
          k: 5,
          threshold: 0.1,
          jurisdiction: jurisdiction || undefined,
          topicSlug: topic || undefined,
        });
        sources = (resLow as { sources?: unknown[] })?.sources || [];
        console.log(`📊 Low threshold search returned ${sources.length} sources`);
      } catch (e) {
        console.error("Low threshold search failed:", e);
      }
    }
    
    // If no sources found with threshold 0.3, try lower threshold before giving up
    // This prevents false negatives when user has selected specific jurisdiction/topic
    if (!sources.length) {
      console.log('⚠️ No sources at threshold 0.3, but continue anyway - let Gemini use general knowledge or explain limitations');
      // DO NOT return insufficient context here - let the LLM handle it
      // The LLM will be told in the system prompt that no specific sources were found
    }

    // Type guard for source objects
    type SourceObject = {
      jurisdiction?: string;
      topicName?: string;
      topicSlug?: string;
      similarity?: number;
      sourceUrl?: string;
      extractedSections?: {
        overview?: string;
        coveredEmployers?: string;
        coveredEmployees?: string;
        employerResponsibilities?: string;
        trainingRequirements?: string;
        postingRequirements?: string;
        penalties?: string;
        sources?: string;
      };
    };
    
    const typedSources = sources as SourceObject[];

    // Get compliance context
    const complianceContext = await getComplianceContext(jurisdiction, topic);
    console.log(`📋 Using compliance context (${complianceContext.length} chars)`);
    
    // Use custom system prompt from request (required)
    if (!customSystemPrompt) {
      throw new Error("Chat system prompt not provided in request.");
    }
    console.log(`📝 Using custom system prompt: ${customSystemPrompt.substring(0, 100)}...`);
    
    // Create system prompt
    let systemPrompt = customSystemPrompt;
    
    // Add additional context from user if provided
    if (additionalContext && additionalContext.trim()) {
      systemPrompt += `\n\nADDITIONAL CONTEXT PROVIDED BY USER:\n${additionalContext}\n\nUse this context when answering the user's question.`;
    }
    
    // ALWAYS add context about available data, even if no sources found
    if (true) {
      
      if (sources.length > 0) {
        // We have sources - provide them
        systemPrompt += `

You have access to comprehensive compliance data from 1,175 reports across all US jurisdictions, structured according to this template:

COMPLIANCE TEMPLATE STRUCTURE:
- Overview: Brief description of the law/requirement
- Covered Employers: Who must comply with this requirement
- Covered Employees: Which employees are covered/protected
- What Should Employers Do: Specific actions employers must take
- Training Requirements: Training content, duration, format requirements
- Training Deadlines: Timing requirements for different employee types
- Qualified Trainers: Who can provide the training/services
- Special Requirements: Special cases, exceptions, industry-specific requirements
- Coverage Election: Optional coverage choices or rejection options
- Reciprocity/Extraterritorial Coverage: Cross-state/jurisdiction coverage rules
- Employer Responsibilities & Deadlines: Ongoing obligations, renewal requirements
- Employer Notification Requirements: Required notifications to employees
- Posting Requirements: Required workplace postings, notices
- Recordkeeping Requirements: Records to maintain, retention periods
- Penalties for Non-Compliance: Fines, penalties, consequences
- Sources: Relevant statutes, regulations, agency websites

CURRENT CONTEXT:
${complianceContext}

SOURCES (most relevant first):
${(typedSources || []).map((s: SourceObject, i: number) => {
  let sourceText = `[#${i+1}] ${s.jurisdiction || ''} ${s.topicName || ''} (${((s.similarity||0)*100).toFixed(1)}%)\nURL: ${s.sourceUrl || 'N/A'}`;
  
  // Add extracted sections if available
  if (s.extractedSections) {
    if (s.extractedSections.overview) {
      sourceText += `\nOverview: ${s.extractedSections.overview.slice(0, 300)}`;
    }
    if (s.extractedSections.coveredEmployers) {
      sourceText += `\nCovered Employers: ${s.extractedSections.coveredEmployers.slice(0, 200)}`;
    }
    if (s.extractedSections.penalties) {
      sourceText += `\nPenalties: ${s.extractedSections.penalties.slice(0, 200)}`;
    }
  }
  
  return sourceText;
}).join('\n\n')}

Provide accurate, actionable compliance guidance based on this structured data. Always cite specific jurisdictions and include practical implementation steps. Be professional but conversational.`;
      } else {
        // No sources found - explain clearly without blocking
        systemPrompt += `

I searched the compliance database for ${jurisdiction ? `${jurisdiction} ` : ''}${topic ? `${topic.replace(/_/g, ' ')} ` : ''}information but did not find specific sources matching this query.

IMPORTANT: You MUST follow the CRITICAL RULES in your system prompt. If you are instructed to ONLY use database information and NOT use general knowledge, then:
- State clearly: "I don't have information about ${jurisdiction ? `${jurisdiction} ` : ''}${topic ? `${topic.replace(/_/g, ' ')} ` : 'this topic'} in my database"
- DO NOT provide general compliance advice
- STOP there

If your system prompt allows general knowledge, only then provide helpful guidance and suggest consulting official sources.`;
      }
    }
    
    // Add formatting instructions
    systemPrompt += `

FORMAT THE ANSWER CLEARLY:
- Do NOT include a title or heading at the start - the title will be added separately
- Use clear section headings: ## Overview, ## Key Requirements, ## Deadlines, ## Penalties, ## Recommendations
- Add a blank line after each paragraph for proper spacing
- Use bullet lists (- item) and numbered lists (1. item) where appropriate
- Use **bold text** for important terms, dollar amounts, dates, and requirements
- Do NOT include inline citations like [#1], [#2] - sources will be shown separately
- Do NOT include a "Sources" section - sources are handled separately
- Write each major point as a separate paragraph with blank lines between
- Start directly with the first section (## Overview)
- End each section with a blank line before the next section header`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const aiModel = genAI.getGenerativeModel({ 
      model: model || "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    // Convert messages to Gemini format
    const lastMessage = messages[messages.length - 1];
    const prompt = systemPrompt + "\n\nUser: " + lastMessage.content + "\n\nAssistant:";

    // Generate response
    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Compose a display title from filters or top source
    const displayTitle = (jurisdiction || 'Compliance') + ' – ' + (topic || 'Guidance');

    // Clean text to remove title duplication and improve formatting
    let cleanText = text
      .replace(/^#.*$/m, '')  // Remove any title lines
      .replace(/^\*\*.*\*\*$/m, '')  // Remove any bold title lines
      .replace(/## Sources[\s\S]*$/m, '') // Remove any sources section from content
      .replace(/---[\s\S]*Sources[\s\S]*$/m, '') // Remove sources blocks
      .replace(/\[#\d+\]/g, '') // Remove inline citations like [#1], [#2]
      .trim();

    // Improve formatting with moderate spacing
    cleanText = cleanText
      .replace(/##\s*/g, '\n\n## ') // Add spacing before headers
      .replace(/^## /m, '## ') // Ensure first header doesn't have extra spacing
      .replace(/\n- /g, '\n- ') // Keep bullet points close to previous content
      .replace(/\n\* /g, '\n* ') // Keep bullet points close to previous content
      .replace(/\n(\d+\.)/g, '\n$1') // Keep numbered lists close
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks to max 2
      .replace(/\.\s+([A-Z][^#])/g, '.\n\n$1') // Add line break only between distinct paragraphs
      .trim();
    
    const contentMarkdown = `# ${displayTitle}\n\n${cleanText}`;
    
    // Don't include sources in the markdown content - they'll be shown separately in UI

    return new Response(
      JSON.stringify({ 
        role: 'assistant', 
        content: contentMarkdown,
        title: displayTitle,
        sources: (typedSources || []).map((s: SourceObject, i: number) => ({
          id: i + 1,
          similarity: s.similarity,
          url: s.sourceUrl,
          jurisdiction: s.jurisdiction,
          topicSlug: s.topicSlug,
          topicName: s.topicName,
        })),
        settings: {
          systemPrompt: customSystemPrompt || "Default compliance assistant prompt",
          model: model || "gemini-2.0-flash-exp",
          sourcesFound: (typedSources || []).length,
          jurisdiction: jurisdiction || "All Jurisdictions",
          topic: topic || "All Topics",
        },
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Compliance chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process compliance chat request', details: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Get compliance context for chat
async function getComplianceContext(jurisdiction?: string, topic?: string) {
  // This would query your compliance reports and embeddings
  // For now, return structured context based on your existing data
  let context = `
Available compliance data:
- 1,175 detailed compliance reports
- Coverage across all 52 US jurisdictions
- 25 topic categories including wages, leave, safety, training
- Structured according to compliance template
- Real-time monitoring and change detection
- Professional analysis using Gemini 2.0 Flash`;

  if (jurisdiction) {
    context += `\n\nFOCUSED ON JURISDICTION: ${jurisdiction}`;
    context += `\nSpecialized knowledge of ${jurisdiction} employment law requirements`;
  }

  if (topic) {
    const topicDescriptions = {
      minimum_wage: "Minimum wage rates, tipped employee wages, youth wages, and wage floor requirements",
      harassment_training: "Sexual harassment prevention training requirements, supervisor certification, and compliance deadlines",
      overtime: "Overtime pay requirements, exemptions, work hour regulations, and time-and-a-half calculations",
      paid_sick_leave: "Earned sick time requirements, accrual rates, usage policies, and carryover rules",
      posting_requirements: "Mandatory workplace posters, employee notification requirements, and display standards",
      workers_comp: "Workers compensation insurance requirements, coverage levels, and exemptions",
      background_checks: "Employment screening requirements, ban-the-box regulations, and fair chance hiring",
    };
    
    const description = topicDescriptions[topic as keyof typeof topicDescriptions] || topic.replace(/_/g, ' ');
    context += `\n\nFOCUSED ON TOPIC: ${topic}`;
    context += `\nSpecialized in: ${description}`;
  }

  return context;
}

