import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = 'gustoadmin'
const USER_PASSWORD = 'gusto'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    let role: 'admin' | 'user' | null = null
    
    if (password === ADMIN_PASSWORD) {
      role = 'admin'
    } else if (password === USER_PASSWORD) {
      role = 'user'
    }
    
    if (role) {
      const response = NextResponse.json({ 
        success: true, 
        role 
      })
      
      // Set authentication cookie
      response.cookies.set('ruleready-auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
      
      // Set role cookie
      response.cookies.set('ruleready-role', role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
      
      return response
    } else {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
}

