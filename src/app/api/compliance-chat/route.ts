import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, jurisdiction, topic, systemPrompt: customSystemPrompt, additionalContext } = body;

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
    
    // Add context based on filters
    if (jurisdiction || topic) {
      const complianceContext = await getComplianceContext(jurisdiction, topic);
      systemPrompt += `\n\nCONTEXT:\n${complianceContext}`;
    }
    
    // Add additional context from user if provided
    if (additionalContext && additionalContext.trim()) {
      systemPrompt += `\n\nADDITIONAL CONTEXT PROVIDED BY USER:\n${additionalContext}\n\nUse this context when answering the user's question.`;
    }

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
    
    const displayTitle = (jurisdiction || 'Compliance') + ' – ' + (topic || 'Guidance');

    return new Response(
      JSON.stringify({ 
        role: 'assistant', 
        content: text,
        title: displayTitle,
        sources: [],
        settings: {
          systemPrompt: baseSystemPrompt,
          model: model || (dbSettings.chatModel as string) || "gemini-2.0-flash-exp",
          sourcesFound: 0,
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
