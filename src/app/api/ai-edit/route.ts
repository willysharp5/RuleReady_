import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, action, customPrompt, tone } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get editor settings from database
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    let editorSettings: Record<string, unknown> = {};
    try {
      editorSettings = await convex.query(api.editorSettings.getEditorSettings) || {};
    } catch {
      console.log("Could not load editor settings from database");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable not set' },
        { status: 500 }
      );
    }

    // Action-specific prompts
    const prompts: Record<string, string> = {
      improve: 'Improve the clarity, flow, and overall quality of this text while preserving its meaning and key information:\n\n',
      grammar: 'Fix all spelling and grammar errors in this text. Return ONLY the corrected text:\n\n',
      shorter: 'Make this text more concise while keeping all key information and main points:\n\n',
      longer: 'Expand this text with more details, examples, and explanations:\n\n',
      simplify: 'Rewrite this text using simpler, clearer language that is easier to understand:\n\n',
      summarize: 'Create a concise summary of this text, capturing the main points:\n\n',
      continue: 'Continue writing from where this text ends. Match the style and tone:\n\n',
      legal: 'Rewrite this text to be more legally precise and professional. Add specific legal terminology where appropriate:\n\n',
      dates: 'Extract and list all important dates, deadlines, and time periods mentioned in this text:\n\n',
      requirements: 'Reformat this text as a clear bullet-point list of requirements:\n\n',
      tone_professional: 'Rewrite this text in a professional, business-appropriate tone:\n\n',
      tone_casual: 'Rewrite this text in a casual, friendly tone:\n\n',
      tone_formal: 'Rewrite this text in a formal, official tone:\n\n',
    };

    // Determine the prompt to use
    let finalPrompt = '';
    if (action === 'custom' && customPrompt) {
      finalPrompt = `${customPrompt}\n\nText to transform:\n${text}`;
    } else if (action === 'tone' && tone) {
      finalPrompt = (prompts[`tone_${tone}`] || prompts.tone_professional) + text;
    } else {
      finalPrompt = (prompts[action] || prompts.improve) + text;
    }

    // Initialize Gemini with editor settings
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: (editorSettings.editorModel as string) || 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: (editorSettings.editorTemperature as number) ?? 0.3,
        maxOutputTokens: (editorSettings.editorMaxTokens as number) ?? 2048,
      },
    });

    // Generate streaming response
    const result = await model.generateContentStream(finalPrompt);
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';
          
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            
            // Send chunk
            const data = JSON.stringify({ chunk: chunkText, done: false }) + '\n';
            controller.enqueue(encoder.encode(data));
          }
          
          // Send final message
          const finalData = JSON.stringify({ chunk: '', done: true, result: fullText.trim() }) + '\n';
          controller.enqueue(encoder.encode(finalData));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('AI edit error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI edit request', details: (error as Error).message },
      { status: 500 }
    );
  }
}

