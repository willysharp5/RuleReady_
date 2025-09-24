import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// GET /api/compliance/changes - Get compliance changes with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const since = searchParams.get('since');
    const jurisdiction = searchParams.get('jurisdiction');
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    
    // For now, return placeholder data since complianceChanges table is not fully implemented
    // This would query the complianceChanges table when it's ready
    const placeholderChanges = [
      {
        changeId: "federal_minimum_wage_2024_001",
        ruleId: "federal_minimum_wage",
        changeType: "amendment",
        severity: "critical",
        detectedAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
        effectiveDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        affectedSections: ["Overview", "Penalties"],
        changeDescription: "Federal minimum wage increased to $7.50/hour with enhanced penalties",
        aiConfidence: 0.95,
        humanVerified: false,
        notificationsSent: ["email", "webhook"],
        jurisdiction: "Federal",
        topicKey: "minimum_wage",
        topicLabel: "Minimum Wage",
      },
      {
        changeId: "california_harassment_training_2024_002",
        ruleId: "california_harassment_training",
        changeType: "deadline_change",
        severity: "high",
        detectedAt: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
        effectiveDate: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 days from now
        affectedSections: ["Training Requirements", "Training Deadlines"],
        changeDescription: "Updated harassment training deadlines for supervisors",
        aiConfidence: 0.87,
        humanVerified: true,
        notificationsSent: ["email"],
        jurisdiction: "California",
        topicKey: "harassment_training",
        topicLabel: "Harassment Training",
      }
    ];
    
    // Apply filters
    let filteredChanges = placeholderChanges;
    
    if (severity) {
      filteredChanges = filteredChanges.filter(change => 
        change.severity === severity
      );
    }
    
    if (since) {
      const sinceDate = new Date(since).getTime();
      filteredChanges = filteredChanges.filter(change => 
        change.detectedAt >= sinceDate
      );
    }
    
    if (jurisdiction) {
      filteredChanges = filteredChanges.filter(change => 
        change.jurisdiction.toLowerCase() === jurisdiction.toLowerCase()
      );
    }
    
    if (topic) {
      filteredChanges = filteredChanges.filter(change => 
        change.topicKey === topic
      );
    }
    
    // Apply limit
    filteredChanges = filteredChanges.slice(0, limit);
    
    const response = {
      changes: filteredChanges,
      metadata: {
        total: placeholderChanges.length,
        filtered: filteredChanges.length,
        filters: {
          severity,
          since,
          jurisdiction,
          topic,
        },
        generatedAt: Date.now(),
        note: "This is placeholder data. Real changes will come from complianceChanges table when crawler is active.",
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
    console.error('Compliance changes API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch compliance changes', 
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
