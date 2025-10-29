'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scale } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple string match - if password is "gusto", let them in
    if (password === 'gusto') {
      router.push('/home')
        } else {
      setError('Incorrect password')
      setPassword('')
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
              disabled={!password}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                            >
              Continue
                            </button>
                </form>
              </div>
          </div>
                  </div>
  )
}
