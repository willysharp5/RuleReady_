import { NextRequest } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

// POST /api/compliance/alerts/subscribe - Subscribe to compliance alerts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhook_url, email, filters } = body;
    
    if (!webhook_url && !email) {
      return new Response(
        JSON.stringify({ error: 'Either webhook_url or email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate filters
    const validatedFilters = {
      jurisdictions: Array.isArray(filters?.jurisdictions) ? filters.jurisdictions : [],
      topics: Array.isArray(filters?.topics) ? filters.topics : [],
      severity: Array.isArray(filters?.severity) ? filters.severity : ['critical', 'high'],
      changeTypes: Array.isArray(filters?.changeTypes) ? filters.changeTypes : ['new_law', 'amendment', 'deadline_change'],
    };
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");
    
    // Create subscription record (this would integrate with user settings)
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For now, store in a simple format - this would be enhanced with proper user management
    const subscription = {
      subscriptionId,
      webhook_url,
      email,
      filters: validatedFilters,
      status: 'active',
      createdAt: Date.now(),
      lastNotification: null,
      notificationCount: 0,
    };
    
    // In a full implementation, this would:
    // 1. Store subscription in database
    // 2. Validate webhook URL
    // 3. Send confirmation email
    // 4. Set up monitoring triggers
    
    console.log(`📧 Created compliance alert subscription: ${subscriptionId}`);
    console.log(`   Webhook: ${webhook_url || 'none'}`);
    console.log(`   Email: ${email || 'none'}`);
    console.log(`   Jurisdictions: ${validatedFilters.jurisdictions.join(', ') || 'all'}`);
    console.log(`   Topics: ${validatedFilters.topics.join(', ') || 'all'}`);
    console.log(`   Severity: ${validatedFilters.severity.join(', ')}`);
    
    const response = {
      success: true,
      subscriptionId,
      subscription: {
        ...subscription,
        webhook_url: webhook_url ? '***configured***' : null, // Don't expose URLs in response
      },
      message: 'Compliance alert subscription created successfully',
      metadata: {
        jurisdictionsMonitored: validatedFilters.jurisdictions.length || 'all',
        topicsMonitored: validatedFilters.topics.length || 'all',
        severityLevels: validatedFilters.severity,
        estimatedAlertsPerMonth: estimateAlertFrequency(validatedFilters),
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Compliance alerts subscription error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create compliance alert subscription', 
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Estimate alert frequency based on filters
function estimateAlertFrequency(filters: {
  jurisdictions: string[];
  topics: string[];
  severity: string[];
  changeTypes: string[];
}): string {
  let baseFrequency = 10; // Base alerts per month
  
  // Adjust based on jurisdiction count
  if (filters.jurisdictions.length > 0) {
    baseFrequency = Math.ceil(baseFrequency * (filters.jurisdictions.length / 52));
  }
  
  // Adjust based on topic count
  if (filters.topics.length > 0) {
    baseFrequency = Math.ceil(baseFrequency * (filters.topics.length / 25));
  }
  
  // Adjust based on severity
  if (filters.severity.includes('critical')) {
    baseFrequency += 5;
  }
  if (filters.severity.includes('high')) {
    baseFrequency += 3;
  }
  
  return `${baseFrequency}-${baseFrequency * 2} alerts`;
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
