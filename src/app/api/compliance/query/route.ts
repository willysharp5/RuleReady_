import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// POST /api/compliance/query - Advanced compliance knowledge queries
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, include_recent_changes, jurisdiction, topic, max_sources, threshold } = body;
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    
    // Use the Phase 3 Enhanced RAG system
    const ragResult = await convex.action(api.complianceRAG.queryComplianceKnowledge, {
      query,
      jurisdiction,
      topicKey: topic,
      includeChanges: include_recent_changes || false,
      maxSources: max_sources || 10,
      threshold: threshold || 0.7,
    });
    
    // Format response for API consumers
    const response = {
      query,
      answer: ragResult.answer,
      confidence: ragResult.confidence,
      sources: ragResult.sources.map((source: any) => ({
        ruleId: source.ruleId,
        jurisdiction: source.jurisdiction,
        topicKey: source.topicKey,
        topicLabel: source.topicLabel,
        sourceUrl: source.sourceUrl,
        similarity: source.similarity,
        relevanceScore: Math.round((source.similarity || 0) * 100),
      })),
      relatedTopics: ragResult.relatedTopics,
      recentChanges: ragResult.recentChanges,
      metadata: {
        ...ragResult.metadata,
        apiVersion: "1.0",
        model: "gemini-2.0-flash-exp",
        processingTime: Date.now() - ragResult.metadata.queryTime,
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Compliance query API error:', error);
    
    // Check if it's the "too many bytes" error we've seen before
    const isBytesError = error instanceof Error && error.message.includes('Too many bytes read');
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process compliance query', 
        details: (error as Error).message,
        suggestion: isBytesError ? 
          'Try a more specific query with jurisdiction/topic filters to reduce data load' :
          'Please try again or contact support'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
