'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Github, LogOut, User, Loader2, ChevronDown, Code, BookOpen, Settings, Coins, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useQuery, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"

interface HeaderProps {
  showCTA?: boolean
  ctaText?: string
  ctaHref?: string
}

export function Header({ showCTA = true, ctaText = "View on GitHub", ctaHref = "https://github.com/willysharp5/RuleReady_" }: HeaderProps) {
  // Single-user mode - no authentication required
  const isAuthenticated = true
  const [isSigningOut, setIsSigningOut] = useState(false)
  const currentUser = useQuery(api.users.getCurrentUser)
  const firecrawlKey = useQuery(api.firecrawlKeys.getUserFirecrawlKey)
  const getTokenUsage = useAction(api.firecrawlKeys.getTokenUsage)
  const [tokenUsage, setTokenUsage] = useState<{ remaining_tokens?: number; error?: string } | null>(null)
  
  const fetchTokenUsage = useCallback(async () => {
    try {
      const result = await getTokenUsage()
      if (result.success) {
        setTokenUsage({ remaining_tokens: result.remaining_tokens })
      } else {
        setTokenUsage({ error: result.error })
      }
    } catch {
      setTokenUsage({ error: 'Failed to fetch token usage' })
    }
  }, [getTokenUsage])
  
  useEffect(() => {
    if (firecrawlKey?.hasKey && isAuthenticated) {
      fetchTokenUsage()
      // Refresh credits every 30 seconds
      const interval = setInterval(fetchTokenUsage, 30000)
      return () => clearInterval(interval)
    }
  }, [firecrawlKey?.hasKey, isAuthenticated, fetchTokenUsage])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      // Single-user mode - no sign out needed
      console.log('Single-user mode: sign out bypassed')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="px-4 sm:px-6 lg:px-8 py-4 border-b border-zinc-200 bg-white">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">RuleReady</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          {isAuthenticated && tokenUsage?.remaining_tokens !== undefined && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <Coins className="h-4 w-4" />
              <span>{tokenUsage.remaining_tokens.toLocaleString()} credits remaining</span>
            </div>
          )}
          {isAuthenticated ? (
            <>
              <Link href="/api-docs">
                <Button variant="orange" size="sm" className="gap-2">
                  <Code className="h-4 w-4" />
                  <span className="hidden sm:inline">API</span>
                </Button>
              </Link>
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="code" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{currentUser?.email || 'Account'}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-zinc-500">
                      {currentUser?.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/docs" className="flex items-center cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Documentation</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="cursor-pointer"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            showCTA && (
              <Button
                variant="code"
                asChild
              >
                <Link href={ctaHref} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  {ctaText}
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  )
}