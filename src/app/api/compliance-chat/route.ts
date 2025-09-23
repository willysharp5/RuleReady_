import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
// using string action name to avoid build-time type coupling

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, jurisdiction, topic } = body;

    // Top‑K embedding retrieval for RAG context
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    const lastUser = messages[messages.length - 1]?.content || "";
    let sources: any[] = [];
    try {
      const res: any = await convex.action("embeddingManager:embeddingTopKSources", {
        question: lastUser,
        k: 5,
        threshold: 0.65,
        jurisdiction: jurisdiction || undefined,
        topicKey: topic || undefined,
      });
      sources = res?.sources || [];
    } catch (e) {
      console.error("Embedding retrieval failed:", e);
      sources = [];
    }

    // Get relevant compliance data based on context
    const complianceContext = await getComplianceContext(jurisdiction, topic);
    
    // Create system prompt with compliance template structure + sources
    const systemPrompt = `You are a professional compliance assistant specializing in US employment law. 

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
${(sources || []).map((s: any, i: number) => `[#${i+1}] ${s.jurisdiction || ''} ${s.topicLabel || ''} (${((s.similarity||0)*100).toFixed(1)}%)\nURL: ${s.sourceUrl || 'N/A'}\nSnippet: ${s.snippet || ''}`).join('\n\n')}

Provide accurate, actionable compliance guidance based on this structured data. Always cite specific jurisdictions and include practical implementation steps. Be professional but conversational.`;

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

    return new Response(
      JSON.stringify({ 
        role: 'assistant', 
        content: text,
        sources: (sources || []).map((s: any, i: number) => ({
          id: i + 1,
          similarity: s.similarity,
          url: s.sourceUrl,
          jurisdiction: s.jurisdiction,
          topicKey: s.topicKey,
          topicLabel: s.topicLabel,
        })),
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

