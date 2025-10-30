import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, jurisdiction, topic, systemPrompt: customSystemPrompt, savedResearchContent, additionalContext, selectedResearchIds } = body;

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    
    // Get database settings as fallback
    let dbSettings: Record<string, unknown> = {};
    try {
      dbSettings = await convex.query(api.chatSettings.getChatSettings) || {};
    } catch {
      console.log("Could not load chat settings from database");
    }

    const lastUser = messages[messages.length - 1]?.content || "";
    console.log(`🔍 Chat API: Processing question "${lastUser}"`);
    console.log(`⚙️ Jurisdiction: ${jurisdiction || 'ALL'}, Topic: ${topic || 'ALL'}`);
    
    // Use custom system prompt from request, or fallback to database
    const baseSystemPrompt = customSystemPrompt || (dbSettings.chatSystemPrompt as string);
    if (!baseSystemPrompt) {
      throw new Error("Chat system prompt not configured. Please set it in Settings.");
    }
    console.log(`📝 Using ${customSystemPrompt ? 'custom' : 'database'} system prompt`);
    
    // Create system prompt
    let systemPrompt = baseSystemPrompt;
    
    // Add saved research (legal compliance info)
    if (savedResearchContent && savedResearchContent.trim()) {
      systemPrompt += `\n\n=== SAVED RESEARCH (LEGAL COMPLIANCE INFORMATION) ===\n${savedResearchContent}`;
      console.log(`📚 Using ${savedResearchContent.length} characters of saved research`);
    } else {
      systemPrompt += `\n\n=== NO SAVED RESEARCH SELECTED ===\nYou must say: "I don't have any saved research selected. Please select saved research from the knowledge base to provide legal compliance information."`;
      console.log(`⚠️ No saved research provided`);
    }
    
    // Add additional context (company info, scenarios, etc.)
    if (additionalContext && additionalContext.trim()) {
      systemPrompt += `\n\n=== ADDITIONAL CONTEXT (COMPANY/SCENARIO INFO) ===\n${additionalContext}`;
      console.log(`📄 Using ${additionalContext.length} characters of additional context`);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const aiModel = genAI.getGenerativeModel({ 
      model: model || (dbSettings.chatModel as string) || "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: (dbSettings.chatTemperature as number) ?? 0.7,
        maxOutputTokens: (dbSettings.chatMaxTokens as number) ?? 8192,
      },
    });

    // Convert messages to Gemini format
    const lastMessage = messages[messages.length - 1];
    const prompt = systemPrompt + "\n\nUser: " + lastMessage.content + "\n\nAssistant:";

    // Generate response
    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const displayTitle = (jurisdiction || 'Compliance') + ' – ' + (topic || 'Guidance');

    // Get the actual saved research items to return
    let savedResearchSources = [];
    if (selectedResearchIds && selectedResearchIds.length > 0) {
      const allSavedResearch = await convex.query(api.savedResearch.getAllSavedResearch);
      savedResearchSources = (allSavedResearch || [])
        .filter((r: any) => selectedResearchIds.includes(r._id))
        .map((r: any, index: number) => ({
          id: index + 1,
          _id: r._id,
          title: r.title,
          jurisdiction: r.jurisdiction,
          topic: r.topic,
          content: r.content,
          type: 'saved_research'
        }));
    }

    return new Response(
      JSON.stringify({ 
        role: 'assistant', 
        content: text,
        title: displayTitle,
        savedResearchSources: savedResearchSources,
        settings: {
          systemPrompt: baseSystemPrompt,
          model: model || (dbSettings.chatModel as string) || "gemini-2.0-flash-exp",
          sourcesFound: savedResearchSources.length,
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
  let context = `You are a compliance assistant providing guidance on US employment law.`;

  if (jurisdiction) {
    context += `\n\nFOCUSED ON JURISDICTION: ${jurisdiction}`;
    context += `\nProvide information specific to ${jurisdiction} employment law requirements.`;
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
      pay_frequency: "Pay frequency requirements, payment schedules, and timing regulations",
    };
    
    const description = topicDescriptions[topic as keyof typeof topicDescriptions] || topic.replace(/_/g, ' ');
    context += `\n\nFOCUSED ON TOPIC: ${topic}`;
    context += `\nSpecialized in: ${description}`;
  }

  return context;
}
