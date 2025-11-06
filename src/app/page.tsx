'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scale } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        router.push('/home')
        router.refresh()
      } else {
        setError('Incorrect password')
        setPassword('')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setPassword('')
    } finally {
      setIsLoading(false)
    }
  }
  
    return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Scale className="h-16 w-16 text-purple-600" />
        </div>
            <h1 className="text-3xl font-bold bg-gradient-to-tr from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                    RuleReady
                </h1>
            <p className="text-gray-600 mt-2">Enter password to continue</p>
              </div>
              
          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                        type="password" 
                        value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
                    </div>
                    
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
                {error}
                </div>
            )}
            
                            <button
              type="submit"
              disabled={!password || isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                            >
              {isLoading ? 'Logging in...' : 'Continue'}
                            </button>
                </form>
              </div>
          </div>
                  </div>
  )
}
