import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { isValid: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // Basic URL validation
    let validUrl: URL
    try {
      validUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { isValid: false, error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return NextResponse.json(
        { isValid: false, error: 'Only HTTP and HTTPS URLs are supported' },
        { status: 400 }
      )
    }

    try {
      // Attempt to fetch the URL with a timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(validUrl.toString(), {
        method: 'HEAD', // Use HEAD to avoid downloading full content
        signal: controller.signal,
        headers: {
          'User-Agent': 'RuleReady Website Monitor/1.0',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Try GET if HEAD fails (some servers don't support HEAD)
        const getResponse = await fetch(validUrl.toString(), {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'RuleReady Website Monitor/1.0',
          },
        })

        if (!getResponse.ok) {
          return NextResponse.json(
            { 
              isValid: false, 
              error: `Website returned ${getResponse.status} ${getResponse.statusText}` 
            },
            { status: 200 }
          )
        }

        // Try to extract title and description from the response
        const html = await getResponse.text()
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)

        return NextResponse.json({
          isValid: true,
          title: titleMatch ? titleMatch[1].trim() : undefined,
          description: descriptionMatch ? descriptionMatch[1].trim() : undefined,
        })
      }

      return NextResponse.json({
        isValid: true,
        title: undefined,
        description: undefined,
      })

    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') {
        return NextResponse.json(
          { isValid: false, error: 'Request timeout - website took too long to respond' },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { 
          isValid: false, 
          error: `Failed to connect to website: ${(error as Error).message}` 
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('URL validation error:', error)
    return NextResponse.json(
      { isValid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
