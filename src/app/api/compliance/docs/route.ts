import { NextRequest } from 'next/server';

// GET /api/compliance/docs - API documentation
export async function GET(req: NextRequest) {
  const baseUrl = req.url.replace('/docs', '');
  
  const documentation = {
    title: "RuleReady Compliance API",
    version: "1.0",
    description: "Professional API for accessing compliance data across all US jurisdictions",
    baseUrl,
    
    endpoints: {
      
      "GET /api/compliance/rules": {
        description: "Get compliance rules with filtering",
        parameters: {
          jurisdiction: "Filter by jurisdiction (e.g., 'California', 'Federal')",
          topic: "Filter by topic key (e.g., 'minimum_wage', 'harassment_training')",
          priority: "Filter by priority (critical, high, medium, low)",
          changedSince: "ISO date string - only rules changed since this date",
          limit: "Maximum number of results (default: 100)"
        },
        example: `${baseUrl}/rules?jurisdiction=California&topic=minimum_wage&priority=critical`,
        response: {
          rules: [
            {
              ruleId: "california_minimum_wage",
              jurisdiction: "California", 
              topicKey: "minimum_wage",
              topicLabel: "Minimum Wage",
              sourceUrl: "https://www.dir.ca.gov/dlse/faq_minimumwage.htm",
              priority: "critical",
              changeFrequency: "quarterly",
              lastSignificantChange: 1703980800000,
              monitoringStatus: "active"
            }
          ],
          metadata: {
            total: 1298,
            filtered: 1,
            generatedAt: 1703980800000
          }
        }
      },
      
      "GET /api/compliance/changes": {
        description: "Get recent compliance changes with filtering",
        parameters: {
          severity: "Filter by severity (critical, high, medium, low)",
          since: "ISO date string - changes since this date",
          jurisdiction: "Filter by jurisdiction",
          topic: "Filter by topic key",
          limit: "Maximum number of results (default: 50)"
        },
        example: `${baseUrl}/changes?severity=critical&since=2024-01-01&jurisdiction=California`,
        response: {
          changes: [
            {
              changeId: "california_minimum_wage_2024_001",
              ruleId: "california_minimum_wage",
              changeType: "amendment",
              severity: "critical",
              detectedAt: 1703980800000,
              effectiveDate: 1706659200000,
              changeDescription: "Minimum wage increased to $17.00/hour",
              jurisdiction: "California",
              topicKey: "minimum_wage"
            }
          ],
          metadata: {
            total: 2,
            filtered: 1,
            generatedAt: 1703980800000
          }
        }
      },
      
      "GET /api/compliance/deadlines": {
        description: "Get upcoming compliance deadlines",
        parameters: {
          upcoming: "Time window (e.g., '30days', '3months', '1year')",
          jurisdiction: "Filter by jurisdiction",
          topic: "Filter by topic key", 
          type: "Filter by deadline type (training_deadline, posting_deadline, compliance_deadline, renewal_deadline)"
        },
        example: `${baseUrl}/deadlines?upcoming=30days&jurisdiction=California&type=training_deadline`,
        response: {
          deadlines: [
            {
              deadlineId: "annual_harassment_training_2024",
              title: "Annual Harassment Training Renewal",
              description: "Complete annual harassment prevention training",
              deadlineDate: 1706659200000,
              deadlineType: "training_deadline",
              status: "upcoming",
              daysUntilDeadline: 45,
              rule: {
                jurisdiction: "California",
                topicKey: "harassment_training",
                priority: "critical"
              }
            }
          ],
          metadata: {
            total: 1,
            daysAhead: 30,
            generatedAt: 1703980800000
          }
        }
      },
      
      "POST /api/compliance/query": {
        description: "Advanced compliance knowledge queries using AI",
        requestBody: {
          query: "Natural language compliance question",
          include_recent_changes: "Include recent changes in response (boolean)",
          jurisdiction: "Focus on specific jurisdiction (optional)",
          topic: "Focus on specific topic (optional)",
          max_sources: "Maximum sources to include (default: 10)",
          threshold: "Similarity threshold 0-1 (default: 0.7)"
        },
        example: {
          query: "What are the current California minimum wage requirements?",
          include_recent_changes: true,
          jurisdiction: "California",
          topic: "minimum_wage"
        },
        response: {
          query: "What are the current California minimum wage requirements?",
          answer: "Comprehensive AI-generated answer with citations",
          confidence: 0.95,
          sources: [
            {
              ruleId: "california_minimum_wage",
              jurisdiction: "California",
              topicLabel: "Minimum Wage",
              similarity: 0.87,
              relevanceScore: 87
            }
          ],
          relatedTopics: ["overtime", "pay_frequency"],
          recentChanges: [],
          metadata: {
            sourcesFound: 5,
            changesIncluded: 0,
            processingTime: 1250
          }
        }
      },
      
      "POST /api/compliance/alerts/subscribe": {
        description: "Subscribe to compliance change alerts",
        requestBody: {
          webhook_url: "URL to receive webhook notifications (optional)",
          email: "Email address for notifications (optional)", 
          filters: {
            jurisdictions: "Array of jurisdictions to monitor",
            topics: "Array of topics to monitor",
            severity: "Array of severity levels to include",
            changeTypes: "Array of change types to monitor"
          }
        },
        example: {
          webhook_url: "https://your-app.com/webhook",
          email: "compliance@company.com",
          filters: {
            jurisdictions: ["California", "New York"],
            topics: ["minimum_wage", "overtime"],
            severity: ["critical", "high"]
          }
        },
        response: {
          success: true,
          subscriptionId: "sub_1703980800000_abc123",
          message: "Compliance alert subscription created successfully",
          metadata: {
            jurisdictionsMonitored: 2,
            topicsMonitored: 2,
            estimatedAlertsPerMonth: "5-10 alerts"
          }
        }
      }
    },
    
    authentication: {
      note: "Currently in single-user mode. Future versions will require API keys.",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "YourApp/1.0"
      }
    },
    
    rateLimits: {
      rules: "100 requests per minute",
      changes: "50 requests per minute", 
      deadlines: "100 requests per minute",
      query: "20 requests per minute (AI-powered)",
      subscribe: "10 requests per minute"
    },
    
    dataSchema: {
      jurisdiction: "52 US jurisdictions (Federal + 50 states + DC)",
      topics: "25 compliance topics (minimum_wage, overtime, harassment_training, etc.)",
      priorities: "critical, high, medium, low",
      changeTypes: "new_law, amendment, deadline_change, penalty_change, coverage_change, procedural_change",
      severities: "critical, high, medium, low"
    },
    
    support: {
      documentation: "/docs",
      issues: "https://github.com/your-org/ruleready-compliance/issues",
      contact: "support@ruleready.com"
    }
  };
  
  return new Response(JSON.stringify(documentation, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
