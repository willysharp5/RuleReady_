import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const role = request.cookies.get('ruleready-role')?.value || null
  const isAuthenticated = request.cookies.get('ruleready-auth')?.value === 'true'
  
  if (!isAuthenticated) {
    return NextResponse.json({ role: null }, { status: 401 })
  }
  
  return NextResponse.json({ role })
}

