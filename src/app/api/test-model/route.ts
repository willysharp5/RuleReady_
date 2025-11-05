import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model } = body;

    // Check if GEMINI_API_KEY is set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable not set' },
        { status: 500 }
      );
    }

    // Initialize Gemini with the specified model
    const genAI = new GoogleGenerativeAI(apiKey);
    const genModel = genAI.getGenerativeModel({ 
      model: model || 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    });

    // Simple test prompt
    const prompt = 'Test: Reply with just "OK" to confirm you are working.';

    // Generate response
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      response: text,
      model: model || 'gemini-2.5-flash-lite',
    });

  } catch (error) {
    console.error('Model test error:', error);
    
    // Provide the full error message for debugging
    let errorMessage = 'Failed to test model';
    if (error instanceof Error) {
      // Return the full error message so users can see quota/availability issues
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

