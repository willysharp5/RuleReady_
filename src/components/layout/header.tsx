'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Github, LogOut, User, Loader2, ChevronDown, Webhook, Code, Key, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

interface HeaderProps {
  showCTA?: boolean
  ctaText?: string
  ctaHref?: string
}

export function Header({ showCTA = true, ctaText = "Use this template", ctaHref = "#" }: HeaderProps) {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const currentUser = useQuery(api.users.getCurrentUser)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
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
          <img src="/firecrawl-logo-with-fire.webp" alt="Firecrawl" className="h-8 w-auto" />
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/docs">
            <Button variant="outline" size="sm" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </Button>
          </Link>
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
                  <Link href="/settings?section=firecrawl" className="flex items-center cursor-pointer">
                    <Key className="mr-2 h-4 w-4" />
                    <span>Firecrawl API Key</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/webhook-playground" className="flex items-center cursor-pointer">
                    <Webhook className="mr-2 h-4 w-4" />
                    <span>Webhook Playground</span>
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