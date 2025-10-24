import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, jurisdiction, topic } = body;

    // Top‑K embedding retrieval for RAG context
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    const lastUser = messages[messages.length - 1]?.content || "";
    console.log(`🔍 Chat API: Processing question "${lastUser}"`);
    let sources: unknown[] = [];
    try {
      console.log('📝 Calling embeddingTopKSources...');
      const res: unknown = await convex.action(api.embeddingManager.embeddingTopKSources, {
        question: lastUser,
        k: 5,
        threshold: 0.3, // Lower threshold to find matches
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
          k: 5,
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
    
    // Final fallback: use mock sources if embedding search completely fails
    if (!sources.length) {
      console.log('🧪 Using mock sources as final fallback...');
      try {
        const mockRes: unknown = await convex.action(api.testChatSources.getMockSources, {
          question: lastUser,
          k: 3,
          jurisdiction: jurisdiction || undefined,
          topicKey: topic || undefined,
        });
        sources = (mockRes as { sources?: unknown[] })?.sources || [];
        console.log(`📊 Mock fallback returned ${sources.length} sources for ${jurisdiction || 'Federal'}`);
      } catch {}
    }

    // Type guard for source objects
    type SourceObject = {
      jurisdiction?: string;
      topicLabel?: string;
      topicKey?: string;
      similarity?: number;
      sourceUrl?: string;
    };
    
    const typedSources = sources as SourceObject[];

    // Get user's custom system prompt and settings
    const convexForSettings = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    let userChatSettings: any = {};
    try {
      userChatSettings = await convexForSettings.query("chatSettings:getChatSettings") || {};
    } catch (e) {
      console.log("Could not load chat settings, using defaults");
    }

    // Get relevant compliance data based on context
    const complianceContext = await getComplianceContext(jurisdiction, topic);
    
    // Use custom system prompt or default
    const baseSystemPrompt = userChatSettings.chatSystemPrompt || `You are a professional compliance assistant specializing in US employment law.`;
    
    // Create system prompt with compliance template structure + sources
    const systemPrompt = baseSystemPrompt + `

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
${(typedSources || []).map((s: SourceObject, i: number) => `[#${i+1}] ${s.jurisdiction || ''} ${s.topicLabel || ''} (${((s.similarity||0)*100).toFixed(1)}%)\nURL: ${s.sourceUrl || 'N/A'}`).join('\n\n')}

Provide accurate, actionable compliance guidance based on this structured data. Always cite specific jurisdictions and include practical implementation steps. Be professional but conversational.

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

    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAhrzBihKERZknz5Y3O6hpvlge1o2EZU4U";
    
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
    const displayTitle = (typedSources[0]?.jurisdiction || jurisdiction || 'Compliance') +
      ' – ' + (typedSources[0]?.topicLabel || topic || 'Guidance');

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

