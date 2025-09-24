import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// GET /api/compliance/rules - Get compliance rules with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jurisdiction = searchParams.get('jurisdiction');
    const topic = searchParams.get('topic');
    const priority = searchParams.get('priority');
    const changedSince = searchParams.get('changedSince');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    
    // Get all rules
    const allRules = await convex.query(api.csvImport.getAllRules);
    
    // Apply filters
    let filteredRules = allRules;
    
    if (jurisdiction) {
      filteredRules = filteredRules.filter((rule: any) => 
        rule.jurisdiction.toLowerCase() === jurisdiction.toLowerCase()
      );
    }
    
    if (topic) {
      filteredRules = filteredRules.filter((rule: any) => 
        rule.topicKey === topic
      );
    }
    
    if (priority) {
      filteredRules = filteredRules.filter((rule: any) => 
        rule.priority === priority
      );
    }
    
    if (changedSince) {
      const sinceDate = new Date(changedSince).getTime();
      filteredRules = filteredRules.filter((rule: any) => 
        (rule.lastSignificantChange || rule.updatedAt || rule.createdAt) >= sinceDate
      );
    }
    
    // Apply limit
    filteredRules = filteredRules.slice(0, limit);
    
    // Format response
    const response = {
      rules: filteredRules.map((rule: any) => ({
        ruleId: rule.ruleId,
        jurisdiction: rule.jurisdiction,
        topicKey: rule.topicKey,
        topicLabel: rule.topicLabel,
        sourceUrl: rule.sourceUrl,
        priority: rule.priority,
        changeFrequency: rule.changeFrequency,
        lastSignificantChange: rule.lastSignificantChange,
        monitoringStatus: rule.monitoringStatus,
        crawlSettings: rule.crawlSettings,
        metadata: rule.metadata,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
      metadata: {
        total: allRules.length,
        filtered: filteredRules.length,
        filters: {
          jurisdiction,
          topic,
          priority,
          changedSince,
        },
        generatedAt: Date.now(),
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Compliance rules API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch compliance rules', 
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
