import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// GET /api/compliance/deadlines - Get upcoming compliance deadlines
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const upcoming = searchParams.get('upcoming') || '30days';
    const jurisdiction = searchParams.get('jurisdiction');
    const topic = searchParams.get('topic');
    const type = searchParams.get('type');
    
    // Parse upcoming parameter (e.g., "30days", "3months", "1year")
    let daysAhead = 30;
    if (upcoming.includes('days')) {
      daysAhead = parseInt(upcoming.replace('days', ''));
    } else if (upcoming.includes('months')) {
      daysAhead = parseInt(upcoming.replace('months', '')) * 30;
    } else if (upcoming.includes('year')) {
      daysAhead = parseInt(upcoming.replace('year', '')) * 365;
    }
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    
    // Get upcoming deadlines using the Phase 3 deadline tracking system
    try {
      const deadlines = await convex.query(api.complianceDeadlines.getUpcomingDeadlines, {
        daysAhead,
        jurisdiction,
        topicKey: topic,
      });
      
      // Apply additional filters
      let filteredDeadlines = deadlines;
      
      if (type) {
        filteredDeadlines = filteredDeadlines.filter((deadline: Record<string, unknown>) => 
          deadline.deadlineType === type
        );
      }
      
      // Enrich with rule information
      const enrichedDeadlines = await Promise.all(
        filteredDeadlines.map(async (deadline: Record<string, unknown>) => {
          try {
            const rules = await convex.query(api.csvImport.getAllRules);
            const rule = rules.find((r: Record<string, unknown>) => r.ruleId === deadline.ruleId);
            
            return {
              ...deadline,
              rule: rule ? {
                jurisdiction: rule.jurisdiction,
                topicKey: rule.topicKey,
                topicLabel: rule.topicLabel,
                sourceUrl: rule.sourceUrl,
                priority: rule.priority,
              } : null,
              daysUntilDeadline: Math.ceil((deadline.deadlineDate - Date.now()) / (24 * 60 * 60 * 1000)),
            };
          } catch (e) {
            return {
              ...deadline,
              rule: null,
              daysUntilDeadline: Math.ceil((deadline.deadlineDate - Date.now()) / (24 * 60 * 60 * 1000)),
            };
          }
        })
      );
      
      const response = {
        deadlines: enrichedDeadlines,
        metadata: {
          total: deadlines.length,
          filtered: filteredDeadlines.length,
          daysAhead,
          filters: {
            jurisdiction,
            topic,
            type,
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
      
    } catch (convexError) {
      console.log("Convex deadline query failed, returning placeholder data");
      
      // Fallback placeholder deadlines
      const placeholderDeadlines = [
        {
          deadlineId: "annual_harassment_training_2024",
          title: "Annual Harassment Training Renewal",
          description: "Complete annual harassment prevention training for all supervisors",
          deadlineDate: Date.now() + (45 * 24 * 60 * 60 * 1000), // 45 days from now
          deadlineType: "training_deadline",
          status: "upcoming",
          rule: {
            jurisdiction: "California",
            topicKey: "harassment_training",
            topicLabel: "Harassment Training",
            priority: "critical",
          },
          daysUntilDeadline: 45,
        },
        {
          deadlineId: "minimum_wage_posting_2024",
          title: "Minimum Wage Posting Update",
          description: "Update workplace postings with new minimum wage rates",
          deadlineDate: Date.now() + (15 * 24 * 60 * 60 * 1000), // 15 days from now
          deadlineType: "posting_deadline", 
          status: "upcoming",
          rule: {
            jurisdiction: "Federal",
            topicKey: "minimum_wage",
            topicLabel: "Minimum Wage",
            priority: "critical",
          },
          daysUntilDeadline: 15,
        }
      ];
      
      let filtered = placeholderDeadlines;
      
      if (jurisdiction) {
        filtered = filtered.filter(d => 
          d.rule.jurisdiction.toLowerCase() === jurisdiction.toLowerCase()
        );
      }
      
      if (topic) {
        filtered = filtered.filter(d => d.rule.topicKey === topic);
      }
      
      if (type) {
        filtered = filtered.filter(d => d.deadlineType === type);
      }
      
      return new Response(JSON.stringify({
        deadlines: filtered,
        metadata: {
          total: placeholderDeadlines.length,
          filtered: filtered.length,
          daysAhead,
          filters: { jurisdiction, topic, type },
          generatedAt: Date.now(),
          note: "Placeholder data - real deadlines will be available when deadline tracking is active",
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
  } catch (error) {
    console.error('Compliance deadlines API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch compliance deadlines', 
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
