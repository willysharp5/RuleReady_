import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
      urls // Array of URLs to scrape
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

    console.log(`[${requestId}] Starting compliance research for: "${query}"`);

    // Step 0: Scrape provided URLs (if any)
    let scrapedUrlSources: any[] = [];
    if (urls && Array.isArray(urls) && urls.length > 0) {
      console.log(`[${requestId}] Scraping ${urls.length} provided URLs...`);
      
      try {
        // Scrape all URLs in parallel
        const scrapePromises = urls.map(async (url: string) => {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: url,
              formats: ['markdown'],
              onlyMainContent: true
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
        console.log(`[${requestId}] Scraped ${scrapedUrlSources.length} URLs successfully`);
      } catch (urlError) {
        console.warn(`[${requestId}] URL scraping failed:`, urlError);
        // Continue with web search even if URL scraping fails
      }
    }

    // Step 1: Internal DB search - TODO: Add later when embeddings are ready
    const internalSources: any[] = [];
    // Will implement internal search after embeddings are generated

    // Step 2: Search with Firecrawl v2 API
    console.log(`[${requestId}] Searching with Firecrawl...`);
    
    // Enhance query with jurisdiction and topic filters
    let enhancedQuery = query;
    if (jurisdiction && topic) {
      enhancedQuery = `${query} ${jurisdiction} ${topic}`;
    } else if (jurisdiction) {
      enhancedQuery = `${query} ${jurisdiction}`;
    } else if (topic) {
      enhancedQuery = `${query} ${topic}`;
    }
    
    console.log(`[${requestId}] Enhanced query: "${enhancedQuery}"`);
    
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
        console.log(`[${requestId}] Using custom Firecrawl config`);
      } catch (e) {
        console.warn(`[${requestId}] Invalid Firecrawl config JSON, using defaults`);
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
      const errorData = await searchResponse.json();
      throw new Error(`Firecrawl API error: ${errorData.error || searchResponse.statusText}`);
    }

    const searchResult = await searchResponse.json();
    const searchData = searchResult.data || {};
    
    // Extract results
    const webResults = searchData.web || [];
    const newsData = searchData.news || [];
    const imagesData = searchData.images || [];
    
    // Transform sources
    const sources = webResults.map((item: any) => ({
      url: item.url,
      title: item.title || item.url,
      description: item.description || item.snippet,
      content: item.content,
      markdown: item.markdown,
      favicon: item.favicon,
      image: item.ogImage || item.image,
      siteName: new URL(item.url).hostname
    })).filter((item: any) => item.url);
    
    const newsResults = newsData.map((item: any) => ({
      url: item.url,
      title: item.title,
      description: item.snippet || item.description,
      publishedDate: item.date,
      source: item.source || new URL(item.url).hostname,
      image: item.imageUrl
    })).filter((item: any) => item.url);
    
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

    console.log(`[${requestId}] Found ${sources.length} web, ${newsResults.length} news, ${imageResults.length} images`);

    // Step 3: Merge all sources (priority order: scraped URLs, internal DB, web search)
    const allSources = [...scrapedUrlSources, ...internalSources, ...sources];
    
    console.log(`[${requestId}] Total sources: ${allSources.length} (${scrapedUrlSources.length} scraped URLs + ${internalSources.length} internal + ${sources.length} web)`);

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

    // Step 3: Generate AI response with Gemini (streaming)
    console.log(`[${requestId}] Generating AI response with Gemini...`);
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
- Use markdown for readability
- Include citations inline as [1], [2], etc. when referencing specific sources
- Citations correspond to source order (first source = [1], second = [2], etc.)
- Structure longer responses with headers and bullet points
- Always mention jurisdiction (federal vs state) when relevant`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    const userPrompt = `Answer this compliance research query: "${query}"

${jurisdiction ? `Focus on jurisdiction: ${jurisdiction}\n` : ''}${topic ? `Focus on topic: ${topic}\n` : ''}
Based on these sources:
${context}`;

    // Use Gemini streaming
    const chat = model.startChat({
      history: [],
    });

    const result = await chat.sendMessageStream(userPrompt + '\n\nSystem instructions: ' + finalSystemPrompt);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
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
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'text',
                content: text
              })}\n\n`));
            }
          }

          // Generate follow-up questions
          const followUpResult = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{
                text: `Based on this compliance query: "${query}"

Generate 5 natural follow-up questions that would help the user understand related compliance topics.

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
            .slice(0, 5);

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

