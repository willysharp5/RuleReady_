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
    
    // Initialize Gemini (needed for AI-based extraction and chat)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = (model as string) || (dbSettings.chatModel as string) || "gemini-2.0-flash-exp";

    // AI-powered extraction: parse company context, question intent, and applicability
    let companyEmployeeStates: string[] = [];
    let employeesByState: Record<string, string[]> = {};
    let totalEmployees: number | null = null;
    let questionIntent: 'who-needs' | 'yes-no' | 'explain' | 'general' = 'general';
    
    if (additionalContext && additionalContext.trim()) {
      try {
        const extractor = genAI.getGenerativeModel({ model: modelName });
        const extractPrompt = `Extract structured data from the context and question below. Return ONLY valid minified JSON (no markdown, no extra text):

{
  "companyStates": string[],
  "employeesByState": { [state: string]: string[] },
  "totalEmployees": number | null,
  "questionIntent": "who-needs" | "yes-no" | "explain" | "general"
}

Rules:
- companyStates: US states (or District of Columbia) where the company has employees. Use full state names.
- employeesByState: for each state, array of employee names if listed.
- totalEmployees: total employee count if mentioned.
- questionIntent:
  - "who-needs": if question asks who/which employees need to do something
  - "yes-no": if question asks do/does/is/are/must/should (expecting yes/no)
  - "explain": if question asks explain/why/how/overview
  - "general": otherwise

QUESTION:
${lastUser}

CONTEXT:
${additionalContext}`;
        
        const extractRes = await extractor.generateContent({ contents: [{ role: 'user', parts: [{ text: extractPrompt }] }] });
        const extractText = extractRes.response.text().trim();
        let parsed: any;
        try {
          parsed = JSON.parse(extractText);
        } catch {
          const cleaned = extractText.replace(/^```[a-zA-Z]*\n?|```$/g, '').trim();
          parsed = JSON.parse(cleaned);
        }
        if (parsed) {
          if (Array.isArray(parsed.companyStates)) companyEmployeeStates = parsed.companyStates;
          if (parsed.employeesByState && typeof parsed.employeesByState === 'object') employeesByState = parsed.employeesByState;
          if (typeof parsed.totalEmployees === 'number') totalEmployees = parsed.totalEmployees;
          if (parsed.questionIntent) questionIntent = parsed.questionIntent;
        }
      } catch (e) {
        console.log('AI extraction failed:', (e as Error).message);
      }
    }

    // Create system prompt
    let systemPrompt = baseSystemPrompt;
    
    // Add jurisdiction/topic guidance so the model focuses correctly and doesn't generalize
    if (jurisdiction || topic) {
      systemPrompt += `\n\n=== CONTEXT FILTERS ===`;
      if (jurisdiction) {
        systemPrompt += `\nFocus on jurisdiction: ${jurisdiction}. If the provided saved research does not include ${jurisdiction}, say: "Insufficient data for ${jurisdiction}." Do NOT infer or assume requirements.`;
      }
      if (topic) {
        systemPrompt += `\nFocus on topic: ${topic}.`;
      }
    }
    
    // Applicability rules to prevent over-general answers or hallucinated obligations
    systemPrompt += `\n\n=== APPLICABILITY RULES (STRICT) ===
- Only use SAVED RESEARCH for legal requirements; do not use general knowledge.
- Use ADDITIONAL CONTEXT only for company-specific facts (locations, employee counts, roles).
- Never assume a requirement applies unless it is explicitly supported by the saved research for the given jurisdiction and employer profile.
- If additional context indicates zero employees in a jurisdiction, respond: "Not applicable in that jurisdiction due to zero employees." Do not recommend training or obligations for that jurisdiction.
- If information needed to determine applicability is missing (e.g., no jurisdiction, missing employee counts), respond with: "Insufficient data to determine applicability." Then list the exact data needed.
- If saved research does not cover the requested jurisdiction or topic, say so explicitly and stop; do not generalize from other jurisdictions.`;

    // Response style policy based on question intent
    let responseModeGuide = 'detailed';
    if (questionIntent === 'who-needs' || questionIntent === 'yes-no') {
      responseModeGuide = 'concise';
    } else if (questionIntent === 'explain') {
      responseModeGuide = 'detailed';
    }
    
    systemPrompt += `\n\n=== RESPONSE STYLE POLICY ===
Mode: ${responseModeGuide}
- concise: Answer with "Yes"/"No" or direct fact in 1–3 sentences with inline citations [1], [2]. No headers or long sections.
- detailed: Use the full template and sections. Be thorough with citations.
Never include meta-commentary about the mode. Output only the answer.`;
    
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

    if (companyEmployeeStates.length > 0) {
      systemPrompt += `\n\n=== COMPANY EMPLOYEE STATES (DERIVED) ===\n${companyEmployeeStates.join(', ')}`;
      systemPrompt += `\n=== EMPLOYEE COUNTS PER STATE ===\n${Object.entries(employeesByState).map(([s, names]) => `${s}: ${names.length}`).join(', ')}`;
    }
    
    const displayTitle = (jurisdiction || 'Compliance') + ' – ' + (topic || 'Guidance');

    // Get the actual saved research items to return
    let savedResearchSources = [];
    let selectedResearchJurisdictions: string[] = [];
    if (selectedResearchIds && selectedResearchIds.length > 0) {
      const allSavedResearch = await convex.query(api.savedResearch.getAllSavedResearch);
      const selected = (allSavedResearch || []).filter((r: any) => selectedResearchIds.includes(r._id));
      savedResearchSources = selected.map((r: any, index: number) => ({
        id: index + 1,
        _id: r._id,
        title: r.title,
        jurisdiction: r.jurisdiction,
        topic: r.topic,
        content: r.content,
        type: 'saved_research'
      }));
      selectedResearchJurisdictions = Array.from(new Set(selected.map((r: any) => (r.jurisdiction || '').toString()).filter(Boolean)));
    }

    // Guide applicability: intersect company states with selected research jurisdictions
    const intersect = (a: string[], b: string[]) => Array.from(new Set(a)).filter(x => new Set(b).has(x));
    const applicableJurisdictions = (companyEmployeeStates.length && selectedResearchJurisdictions.length)
      ? intersect(companyEmployeeStates, selectedResearchJurisdictions)
      : [];

    // Append explicit applicability guardrails based on computed sets
    if (companyEmployeeStates.length > 0 || selectedResearchJurisdictions.length > 0) {
      systemPrompt += `\n\n=== APPLICABILITY SCOPE (COMPUTED) ===\nCOMPANY_STATES: ${companyEmployeeStates.join(', ') || 'unknown'}\nRESEARCH_JURISDICTIONS: ${selectedResearchJurisdictions.join(', ') || 'none'}\nAPPLICABLE_JURISDICTIONS (intersection): ${applicableJurisdictions.join(', ') || 'none'}\nRules: Only answer for APPLICABLE_JURISDICTIONS. If none, respond: "Not applicable based on your employee locations and the selected research. Select research for your states: ${companyEmployeeStates.join(', ') || 'unknown'}"`;
    }

    // AI-powered threshold and applicability check
    let thresholdCheckResult: any = null;
    if (applicableJurisdictions.length > 0 && savedResearchSources.length > 0) {
      try {
        const checkPrompt = `Analyze if a compliance requirement applies to this company. Return ONLY valid minified JSON (no markdown):

{
  "applies": boolean,
  "reason": string,
  "employeesWhoNeed": string[] | null
}

Rules:
- applies: true if the requirement applies based on thresholds in the saved research.
- reason: one-sentence explanation including employee count and threshold.
- employeesWhoNeed: if "applies" is true and the question asks "who", list employee names from the applicable jurisdiction(s). Otherwise null.

SAVED RESEARCH (extract threshold and basis):
${(savedResearchSources[0]?.content as string || '').substring(0, 2000)}

COMPANY DATA:
States with employees: ${companyEmployeeStates.join(', ')}
${Object.entries(employeesByState).map(([s, names]) => `${s}: ${names.length} employees - Names: ${names.join(', ')}`).join('\n')}
Total employees: ${totalEmployees ?? 'unknown'}

APPLICABLE JURISDICTIONS (intersection of company states and research): ${applicableJurisdictions.join(', ')}

QUESTION:
${lastUser}`;

        const checkRes = await genAI.getGenerativeModel({ model: modelName }).generateContent({ contents: [{ role: 'user', parts: [{ text: checkPrompt }] }] });
        const checkText = checkRes.response.text().trim();
        try {
          thresholdCheckResult = JSON.parse(checkText);
        } catch {
          const cleaned = checkText.replace(/^```[a-zA-Z]*\n?|```$/g, '').trim();
          thresholdCheckResult = JSON.parse(cleaned);
        }
      } catch (e) {
        console.log('Threshold check failed:', (e as Error).message);
      }
    }

    // Handle direct answers based on AI threshold check - but make them conversational
    if (thresholdCheckResult && (questionIntent === 'who-needs' || questionIntent === 'yes-no')) {
      // Use AI to craft a natural conversational answer using the threshold check result
      try {
        const conversationalPrompt = `You are a helpful compliance assistant. Craft a brief, natural, conversational answer to this question using the analysis provided.

QUESTION: ${lastUser}

ANALYSIS RESULT:
- Applies: ${thresholdCheckResult.applies ? 'Yes' : 'No'}
- Reason: ${thresholdCheckResult.reason}
${thresholdCheckResult.employeesWhoNeed && Array.isArray(thresholdCheckResult.employeesWhoNeed) && thresholdCheckResult.employeesWhoNeed.length > 0 ? `- Employees who need training: ${thresholdCheckResult.employeesWhoNeed.join(', ')}` : ''}

COMPANY CONTEXT:
${Object.entries(employeesByState).map(([s, names]) => `${s}: ${names.join(', ')}`).join('\n')}

YOUR TASK:
Write a natural, conversational 2-3 sentence answer that:
- Directly addresses the person/entity mentioned in the question by name if applicable
- Explains why or why not in plain language
- References the specific law/jurisdiction
- Feels like chatting with a knowledgeable colleague, not a robot

If the question asks about a specific person, start with their name. Be warm and helpful.

Your answer:`;

        const conversationalRes = await genAI.getGenerativeModel({ model: modelName }).generateContent({ contents: [{ role: 'user', parts: [{ text: conversationalPrompt }] }] });
        const content = conversationalRes.response.text().trim();

        return new Response(
          JSON.stringify({ 
            role: 'assistant', 
            content,
            title: displayTitle,
            savedResearchSources: savedResearchSources,
            settings: {
              systemPrompt: baseSystemPrompt,
              model: modelName,
              sourcesFound: savedResearchSources.length,
              jurisdiction: jurisdiction || "All Jurisdictions",
              topic: topic || "All Topics",
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.log('Conversational answer failed, using structured:', (e as Error).message);
        // Fallback to structured
        let content: string;
        if (questionIntent === 'who-needs') {
          if (thresholdCheckResult.applies && thresholdCheckResult.employeesWhoNeed && Array.isArray(thresholdCheckResult.employeesWhoNeed) && thresholdCheckResult.employeesWhoNeed.length > 0) {
            content = `The following employees need to complete the training:\n\n${thresholdCheckResult.employeesWhoNeed.map((n: string) => `- ${n}`).join('\n')}\n\n${thresholdCheckResult.reason}`;
          } else if (!thresholdCheckResult.applies) {
            content = `No employees need to take the class. ${thresholdCheckResult.reason}`;
          } else {
            content = `Training is required in ${applicableJurisdictions.join(', ')}. ${thresholdCheckResult.reason}`;
          }
        } else {
          content = thresholdCheckResult.applies 
            ? `Yes. ${thresholdCheckResult.reason}` 
            : `No. ${thresholdCheckResult.reason}`;
        }
        return new Response(
          JSON.stringify({ 
            role: 'assistant', 
            content,
            title: displayTitle,
            savedResearchSources: savedResearchSources,
            settings: {
              systemPrompt: baseSystemPrompt,
              model: modelName,
              sourcesFound: savedResearchSources.length,
              jurisdiction: jurisdiction || "All Jurisdictions",
              topic: topic || "All Topics",
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Short-circuit: if no applicable jurisdictions, return not applicable
    if ((companyEmployeeStates.length > 0 && selectedResearchJurisdictions.length > 0) && applicableJurisdictions.length === 0) {
      const statesStr = companyEmployeeStates.join(', ');
      const researchStr = selectedResearchJurisdictions.join(', ');
      const content = questionIntent === 'yes-no'
        ? `No. You have no employees in ${researchStr}. Your employees are in: ${statesStr}.`
        : `Not applicable. Your employees are in ${statesStr}, but the selected research covers ${researchStr}. Select research for your actual states.`;

      return new Response(
        JSON.stringify({ 
          role: 'assistant', 
          content,
          title: displayTitle,
          savedResearchSources: savedResearchSources,
          settings: {
            systemPrompt: baseSystemPrompt,
            model: modelName,
            sourcesFound: savedResearchSources.length,
            jurisdiction: jurisdiction || "All Jurisdictions",
            topic: topic || "All Topics",
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For explain/general questions, use the full model with enhanced prompt
    const lastMessage = messages[messages.length - 1];
    const prompt = systemPrompt 
      + (jurisdiction ? `\n\nQuestion Jurisdiction: ${jurisdiction}` : '')
      + (topic ? `\nQuestion Topic: ${topic}` : '')
      + "\n\nUser Question: " + lastMessage.content 
      + "\n\nYour Response:";

    const aiModel = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: (dbSettings.chatTemperature as number) ?? 0.7,
        maxOutputTokens: (dbSettings.chatMaxTokens as number) ?? 8192,
      },
    });

    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Generate follow-up questions based on the answer and available context
    let followUpQuestions: string[] = [];
    try {
      const followUpPrompt = `Based on this compliance Q&A and the provided context, generate 3 specific follow-up questions.

ORIGINAL QUESTION: ${lastUser}
ANSWER: ${text.substring(0, 500)}

COMPANY CONTEXT (available):
${companyEmployeeStates.length > 0 ? `States: ${companyEmployeeStates.join(', ')}\nEmployee counts: ${Object.entries(employeesByState).map(([s, n]) => `${s}: ${n.length}`).join(', ')}` : 'No company context provided'}

SAVED RESEARCH TOPICS (available):
${savedResearchSources.map(r => `- ${r.title} (${r.jurisdiction || 'N/A'})`).join('\n')}

STRICT RULES:
- Only suggest questions answerable with the SAVED RESEARCH and COMPANY CONTEXT shown above
- Do NOT ask about features, settings, or using the app (e.g., "can you summarize", "if I select research")
- Focus on specific compliance details: deadlines, penalties, specific employee scenarios, exemptions
- Use actual employee names or states from the context when relevant
- Keep questions concise and natural (under 100 chars)
- Return ONLY the questions, one per line, no numbering or bullets

Generate 3 questions:`;

      const followUpResult = await aiModel.generateContent({ contents: [{ role: 'user', parts: [{ text: followUpPrompt }] }] });
      const followUpText = followUpResult.response.text();
      followUpQuestions = followUpText
        .split('\n')
        .map(q => q.trim().replace(/^[-•\d\.]+\s*/, ''))
        .filter(q => q.length > 0 && q.length < 150)
        .slice(0, 3);
    } catch (e) {
      console.log('Follow-up generation failed:', (e as Error).message);
    }

    return new Response(
      JSON.stringify({ 
        role: 'assistant', 
        content: text,
        title: displayTitle,
        savedResearchSources: savedResearchSources,
        followUpQuestions,
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
