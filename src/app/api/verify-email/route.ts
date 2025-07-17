import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/settings?error=missing-token', request.url))
  }

  try {
    await convex.mutation(api.emailManager.verifyEmail, { token })
    return NextResponse.redirect(new URL('/settings?section=notifications&verified=true', request.url))
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/settings?section=notifications&error=invalid-token', request.url))
  }
}