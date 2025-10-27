import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, jurisdiction, topic } = body;

    // Get user's custom system prompt and settings FIRST
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    let userChatSettings: Record<string, unknown> = {};
    try {
      userChatSettings = await convex.query(api.chatSettings.getChatSettings) || {};
    } catch (e) {
      console.log("Could not load chat settings, using defaults");
    }

    const lastUser = messages[messages.length - 1]?.content || "";
    console.log(`🔍 Chat API: Processing question "${lastUser}"`);
    console.log(`⚙️ Settings: compliance=${userChatSettings.enableComplianceContext}, semantic=${userChatSettings.enableSemanticSearch}`);
    
    // If no jurisdiction provided, return a clarification message immediately.
    // Do NOT infer a state from embedding matches or sources.
    if (!jurisdiction) {
      const clarificationTitle = 'Clarification Needed – Jurisdiction';
      const clarificationText = `To provide accurate information${topic ? ` about ${String(topic).replace(/_/g, ' ')}` : ''}, I need to know which jurisdiction you're asking about.\n\nPlease specify the state or territory (for example, California, Minnesota, District of Columbia) or say "Federal".`;
      return new Response(
        JSON.stringify({
          role: 'assistant',
          content: `# ${clarificationTitle}\n\n${clarificationText}`,
          title: clarificationTitle,
          sources: [],
          settings: {
            systemPrompt: userChatSettings.chatSystemPrompt || 'Compliance assistant prompt not set',
            model: userChatSettings.chatModel || 'gemini-2.0-flash-exp',
            complianceContext: userChatSettings.enableComplianceContext ?? true,
            maxContextReports: userChatSettings.maxContextReports || 5,
            semanticSearch: userChatSettings.enableSemanticSearch ?? true,
            sourcesFound: 0,
            jurisdiction: 'Unspecified',
            topic: 'Insufficient',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    let sources: unknown[] = [];
    
    // Do embedding search if semantic search is enabled OR if compliance context is enabled
    if (userChatSettings.enableSemanticSearch !== false || userChatSettings.enableComplianceContext !== false) {
      try {
        console.log('📝 Calling embeddingTopKSources...');
        const res: unknown = await convex.action(api.embeddingManager.embeddingTopKSources, {
          question: lastUser,
          k: (userChatSettings.maxContextReports as number) || 5,
          threshold: 0.3,
          jurisdiction: jurisdiction || undefined,
          topicKey: topic || undefined,
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
            k: (userChatSettings.maxContextReports as number) || 5,
            threshold: 0.1,
            jurisdiction: jurisdiction || undefined,
            topicKey: topic || undefined,
          });
          sources = (resLow as { sources?: unknown[] })?.sources || [];
          console.log(`📊 Low threshold search returned ${sources.length} sources`);
        } catch (e) {
          console.error("Low threshold search failed:", e);
        }
      }
    } else {
      console.log('🚫 Both semantic search AND compliance context disabled - skipping embedding search');
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
      topicLabel?: string;
      topicKey?: string;
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

    // Get relevant compliance data based on context (only if compliance context enabled)
    let complianceContext = "";
    if (userChatSettings.enableComplianceContext !== false) {
      complianceContext = await getComplianceContext(jurisdiction, topic);
      console.log(`📋 Using compliance context (${complianceContext.length} chars)`);
    } else {
      console.log('🚫 Compliance context disabled - using general knowledge only');
    }
    
    // Use system prompt from database - NO DEFAULT FALLBACK
    const baseSystemPrompt = (userChatSettings.chatSystemPrompt as string);
    if (!baseSystemPrompt) {
      throw new Error("Chat system prompt not configured in database. Please set it in Settings.");
    }
    console.log(`📝 Using system prompt from database: ${baseSystemPrompt.substring(0, 100)}...`);
    
    // Create system prompt based on settings
    let systemPrompt = baseSystemPrompt;
    
    // ALWAYS add context about available data, even if no sources found
    if (userChatSettings.enableComplianceContext !== false || userChatSettings.enableSemanticSearch !== false) {
      
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
  let sourceText = `[#${i+1}] ${s.jurisdiction || ''} ${s.topicLabel || ''} (${((s.similarity||0)*100).toFixed(1)}%)\nURL: ${s.sourceUrl || 'N/A'}`;
  
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

You should:
1. Provide general guidance based on your knowledge if applicable
2. Clearly state "I don't have specific data for ${jurisdiction || 'this jurisdiction'} ${topic ? `about ${topic.replace(/_/g, ' ')}` : ''} in my database"
3. Suggest alternative jurisdictions or topics that ARE available in the database
4. Recommend consulting official sources or legal counsel for this specific area

Be helpful and honest about the limitations.`;
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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    // Convert messages to Gemini format
    const lastMessage = messages[messages.length - 1];
    const prompt = systemPrompt + "\n\nUser: " + lastMessage.content + "\n\nAssistant:";

    // Generate response
    const result = await model.generateContent(prompt);
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
          topicKey: s.topicKey,
          topicLabel: s.topicLabel,
        })),
        settings: {
          systemPrompt: userChatSettings.chatSystemPrompt || "Default compliance assistant prompt",
          model: userChatSettings.chatModel || "gemini-2.0-flash-exp",
          complianceContext: userChatSettings.enableComplianceContext ?? true,
          maxContextReports: userChatSettings.maxContextReports || 5,
          semanticSearch: userChatSettings.enableSemanticSearch ?? true,
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

