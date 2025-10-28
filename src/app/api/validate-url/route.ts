import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }
    
    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ 
        valid: false, 
        message: 'Invalid URL format' 
      }, { status: 400 })
    }
    
    // Try to fetch the URL with a HEAD request
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'RuleReady-URLValidator/1.0',
        },
        // Timeout after 5 seconds
        signal: AbortSignal.timeout(5000),
      })
      
      if (response.ok || response.status === 403 || response.status === 405) {
        // 403 and 405 mean the URL exists but blocks HEAD requests - that's fine
        return NextResponse.json({ 
          valid: true, 
          message: 'URL is accessible',
          status: response.status
        })
      } else {
        return NextResponse.json({ 
          valid: false, 
          message: `URL returned ${response.status}`,
          status: response.status
        })
      }
    } catch (error: any) {
      // Check if it's a timeout
      if (error.name === 'TimeoutError') {
        return NextResponse.json({ 
          valid: false, 
          message: 'URL validation timed out' 
        }, { status: 408 })
      }
      
      // Other fetch errors
      return NextResponse.json({ 
        valid: false, 
        message: 'URL not accessible' 
      }, { status: 503 })
    }
  } catch (error) {
    console.error('URL validation error:', error)
    return NextResponse.json({ 
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

