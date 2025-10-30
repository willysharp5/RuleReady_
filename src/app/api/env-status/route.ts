import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const envStatus = [
      {
        name: 'GEMINI_API_KEY',
        status: process.env.GEMINI_API_KEY ? 'set' : 'not_set',
        provider: 'Gemini'
      },
      {
        name: 'FIRECRAWL_API_KEY',
        status: process.env.FIRECRAWL_API_KEY ? 'set' : 'not_set',
        provider: 'Firecrawl'
      },
    ]

    return NextResponse.json({ envStatus })
  } catch (error) {
    console.error('Error checking environment status:', error)
    return NextResponse.json(
      { error: 'Failed to check environment status' },
      { status: 500 }
    )
  }
}

