'use client'

import { useState, useEffect } from 'react'

export type UserRole = 'admin' | 'user' | null

export function useAuth() {
  const [role, setRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/auth/role')
        if (response.ok) {
          const data = await response.json()
          setRole(data.role)
        } else {
          setRole(null)
        }
      } catch (error) {
        console.error('Failed to fetch role:', error)
        setRole(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRole()
  }, [])

  return {
    role,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    isAuthenticated: role !== null,
    isLoading,
  }
}

