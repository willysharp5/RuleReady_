import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const body = await request.json();
    const { 
      query, 
      includeInternalSources = true, 
      jurisdiction, 
      topic,
      systemPrompt,
      firecrawlConfig,
      additionalContext, // User-provided reference documents or context
      urls, // Array of URLs to scrape
      isRefinement, // Is this a refinement request?
      currentAnswer, // The answer being refined
      currentSources // Sources from original answer
    } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get API keys
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!firecrawlApiKey) {
      return NextResponse.json({ error: 'Firecrawl API key not configured' }, { status: 500 });
    }
    
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Step 0: Scrape provided URLs (if any - new URLs only in refinement)
    let scrapedUrlSources: any[] = [];
    if (urls && Array.isArray(urls) && urls.length > 0) {
      
      try {
        // Scrape all URLs in parallel
        const scrapePromises = urls.map(async (url: string) => {
          // Check if URL is a PDF
          const isPdf = url.toLowerCase().endsWith('.pdf');
          
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: url,
              formats: ['markdown'],
              onlyMainContent: true,
              // Add PDF parser if it's a PDF (v1 API compatible)
              ...(isPdf ? { extractorOptions: { mode: 'llm-extraction' } } : {})
            })
          });
          
          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            return {
              url: url,
              title: scrapeData.data?.metadata?.title || new URL(url).hostname,
              description: scrapeData.data?.metadata?.description || 'Scraped content',
              content: scrapeData.data?.markdown || scrapeData.data?.content,
              markdown: scrapeData.data?.markdown,
              source: 'user-provided-url',
              siteName: new URL(url).hostname
            };
          }
          return null;
        });
        
        const results = await Promise.all(scrapePromises);
        scrapedUrlSources = results.filter(r => r !== null);
      } catch (urlError) {
        // Continue with web search even if URL scraping fails
      }
    }

    // Step 1: Internal DB search - TODO: Add later when embeddings are ready
    const internalSources: any[] = [];
    // Will implement internal search after embeddings are generated

    // Step 2: Search with Firecrawl v2 API (skip if refinement mode with no new URLs)
    let webResults: any[] = [];
    let newsData: any[] = [];
    let imagesData: any[] = [];
    let configError: string | null = null;
    
    if (isRefinement && (!urls || urls.length === 0)) {
      // Refinement mode with no new URLs - reuse existing sources
      // Load sources from currentSources parameter
      if (currentSources) {
        if (currentSources.scrapedUrls) {
          scrapedUrlSources = currentSources.scrapedUrls;
        }
        if (currentSources.web) {
          webResults = currentSources.web;
        }
        if (currentSources.news) {
          newsData = currentSources.news;
        }
      }
    } else {
      // Normal mode or refinement with new URLs - do web search
      // Enhance query with jurisdiction and topic filters
      let enhancedQuery = query;
      if (jurisdiction && topic) {
        enhancedQuery = `${query} ${jurisdiction} ${topic}`;
      } else if (jurisdiction) {
        enhancedQuery = `${query} ${jurisdiction}`;
      } else if (topic) {
        enhancedQuery = `${query} ${topic}`;
      }
      
      // Parse custom Firecrawl config or use defaults
      let searchConfig: any = {
        query: enhancedQuery,
        sources: ['web', 'news', 'images'],
        limit: 8,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
          maxAge: 86400000
        }
      };
      
      if (firecrawlConfig) {
        try {
          const customConfig = JSON.parse(firecrawlConfig);
          searchConfig = {
            query: enhancedQuery,
            ...customConfig
          };
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Parse failed';
          configError = JSON.stringify({
            message: 'Invalid Firecrawl JSON configuration - using defaults',
            error: errorMsg,
            invalidJson: firecrawlConfig
          });
        }
      }
      
      const searchResponse = await fetch('https://api.firecrawl.dev/v2/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchConfig)
      });

      if (!searchResponse.ok) {
        let errorMsg = searchResponse.statusText;
        try {
          const responseText = await searchResponse.text();
          try {
            const errorData = JSON.parse(responseText);
            errorMsg = errorData.error || errorMsg;
          } catch {
            // Not JSON, use the text directly
            errorMsg = responseText.substring(0, 200) || errorMsg;
          }
        } catch {
          // Couldn't read response at all
        }
        throw new Error(`Firecrawl API error: ${errorMsg}`);
      }

      const searchResult = await searchResponse.json();
      const searchData = searchResult.data || {};
      
      // Extract results
      webResults = searchData.web || [];
      newsData = searchData.news || [];
      imagesData = searchData.images || [];
    }
    
    // Transform sources (skip if refinement mode - already transformed)
    let sources, newsResults;
    
    if (isRefinement && (!urls || urls.length === 0)) {
      // Sources already transformed from previous search - use as-is
      sources = webResults;
      newsResults = newsData;
    } else {
      // Transform fresh search results
      sources = webResults.map((item: any) => ({
        url: item.url,
        title: item.title || item.url,
        description: item.description || item.snippet,
        content: item.content,
        markdown: item.markdown,
        favicon: item.favicon,
        image: item.ogImage || item.image,
        siteName: new URL(item.url).hostname
      })).filter((item: any) => item.url);
      
      newsResults = newsData.map((item: any) => ({
        url: item.url,
        title: item.title,
        description: item.snippet || item.description,
        publishedDate: item.date,
        source: item.source || new URL(item.url).hostname,
        image: item.imageUrl
      })).filter((item: any) => item.url);
    }
    
    const imageResults = imagesData.map((item: any) => {
      if (!item.url || !item.imageUrl) return null;
      return {
        url: item.url,
        title: item.title || 'Untitled',
        thumbnail: item.imageUrl,
        source: new URL(item.url).hostname,
        width: item.imageWidth,
        height: item.imageHeight,
        position: item.position
      };
    }).filter(Boolean);

    // Step 3: Merge all sources (priority order: scraped URLs, internal DB, web search)
    const allSources = [...scrapedUrlSources, ...internalSources, ...sources];

    // Step 3: Prepare context from sources (internal first for better answers)
    const context = allSources
      .map((source: any, index: number) => {
        const content = source.markdown || source.content || '';
        // Limit content to 2000 chars per source
        const relevantContent = content.substring(0, 2000);
        const sourceLabel = source.source === 'internal-database' 
          ? `[INTERNAL DATABASE] ${source.title}` 
          : source.title;
        return `[${index + 1}] ${sourceLabel}\nURL: ${source.url}\n${relevantContent}`;
      })
      .join('\n\n---\n\n');

    // Get research settings from database
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    let researchSettings: Record<string, unknown> = {};
    try {
      researchSettings = await convex.query(api.researchSettings.getResearchSettings) || {};
    } catch {
      console.log("Could not load research settings from database");
    }
    
    // Step 3: Generate AI response with Gemini (streaming)
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: (researchSettings.researchModel as string) || 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: (researchSettings.researchTemperature as number) ?? 0.5,
        maxOutputTokens: (researchSettings.researchMaxTokens as number) ?? 1048576,
      }
    });

    // Use custom system prompt if provided, otherwise use default
    const defaultSystemPrompt = `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

CRITICAL FORMATTING RULES:
- NEVER use LaTeX/math syntax ($...$) for regular numbers
- Write ALL numbers as plain text: "90 days" NOT "$90$ days", "50%" NOT "$50\\%$"
- Only use math syntax for actual mathematical equations if absolutely necessary

RESPONSE STYLE FOR COMPLIANCE:
- Provide accurate, authoritative information about employment law
- Be direct and clear - compliance is serious
- Cite sources using inline [1], [2], [3] format
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable

FORMAT:
- Use markdown for readability (## for headers, **bold**, - for bullets)
- Do NOT wrap your response in code blocks
- Do NOT escape markdown syntax
- Write natural markdown as if writing a document
- Include citations inline as [1], [2], etc. when referencing specific sources
- Citations correspond to source order (first source = [1], second = [2], etc.)
- Structure longer responses with headers and bullet points
- Always mention jurisdiction (federal vs state) when relevant`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    let userPrompt;
    
    if (isRefinement && currentAnswer) {
      // Refinement mode: Include current answer and refinement instruction
      userPrompt = `The user previously asked a compliance question and received an answer. Now they want you to refine that answer.

PREVIOUS ANSWER (for context):
${currentAnswer}

USER'S REFINEMENT REQUEST:
${query}

${jurisdiction ? `Focus on jurisdiction: ${jurisdiction}\n` : ''}${topic ? `Focus on topic: ${topic}\n` : ''}

YOUR TASK:
Generate an updated compliance research answer that:
1. Incorporates the user's requested changes
2. Maintains the same overall structure and sections as the previous answer
3. Keeps unchanged sections the same
4. Adds or expands on what the user requested

CRITICAL: FORMAT YOUR ENTIRE RESPONSE AS MARKDOWN (not as code, not escaped):
- Start headers with ## (like: ## Overview)
- Do NOT escape markdown (NO backslashes)
- Do NOT wrap in code blocks
- Use **text** for bold
- Use - for bullet lists
- Cite sources as [1], [2], [3] inline
- Just write natural markdown as if writing a document

${additionalContext ? `ADDITIONAL CONTEXT PROVIDED BY USER:\n${additionalContext}\n\n` : ''}Available sources for citations:
${context}`;
    } else {
      // Normal mode: Generate new answer
      userPrompt = `Answer this compliance research query: "${query}"

${jurisdiction ? `Focus on jurisdiction: ${jurisdiction}\n` : ''}${topic ? `Focus on topic: ${topic}\n` : ''}${additionalContext ? `\nADDITIONAL CONTEXT PROVIDED BY USER:\n${additionalContext}\n\n` : ''}Based on these sources:
${context}`;
    }

    // Use Gemini streaming
    const chat = model.startChat({
      history: [],
    });

    const fullPrompt = userPrompt + '\n\nSystem instructions: ' + finalSystemPrompt;
    const result = await chat.sendMessageStream(fullPrompt);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send config error if any
          if (configError) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'warning',
              message: configError
            })}\n\n`));
          }
          
          // Send the final prompt for debugging
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'prompt',
            prompt: fullPrompt
          })}\n\n`));
          
          // Send sources first (including scraped URLs, internal, and web sources)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'sources',
            scrapedUrlSources,
            internalSources,
            sources,
            newsResults,
            imageResults
          })}\n\n`));

          // Stream AI response
          for await (const chunk of result.stream) {
            try {
              const text = chunk.text();
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'text',
                  content: text
                })}\n\n`));
              }
            } catch (chunkError) {
              // Ignore chunk errors, continue streaming
            }
          }

          // Generate follow-up questions
          const followUpResult = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{
                text: `Based on this compliance query: "${query}"

Generate 3 natural follow-up questions that would help the user understand related compliance topics.

ONLY generate questions if the query warrants them:
- Make them genuinely helpful for compliance research
- Focus on related requirements, deadlines, or jurisdictions
- Make questions specific and actionable

Return only the questions, one per line, no numbering.`
              }]
            }]
          });

          const followUpText = followUpResult.response.text();
          const followUpQuestions = followUpText
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0)
            .slice(0, 3);

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'followup',
            questions: followUpQuestions
          })}\n\n`));

          // Send done signal
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          
        } catch (error) {
          console.error(`[${requestId}] Stream error:`, error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error(`[${requestId}] API error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Research failed', message: errorMessage },
      { status: 500 }
    );
  }
}

