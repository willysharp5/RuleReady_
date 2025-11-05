'use client'

import { useAuth } from '@/hooks/useAuth'

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, isLoading } = useAuth()
  
  if (isLoading) {
    return null
  }
  
  if (!isAdmin) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

