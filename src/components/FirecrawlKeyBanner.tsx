'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Key, X, Check, Settings } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import Link from 'next/link'

export function ApiKeyBanner() {
  const [showForm, setShowForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const setFirecrawlKey = useMutation(api.firecrawlKeys.setFirecrawlKey)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    try {
      await setFirecrawlKey({ apiKey })
      setSuccess(true)
      setTimeout(() => {
        setShowForm(false)
        setApiKey('')
      }, 1500)
    } catch (err) {
      setError((err as Error).message || 'Failed to save API key')
    }
  }

  if (showForm) {
    return (
      <div className="bg-orange-50 border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <h3 className="text-sm font-medium text-orange-900 mb-1">Add Your Firecrawl Auth</h3>
                <p className="text-sm text-orange-700">
                  Get your API key from{' '}
                  <a 
                    href="https://www.firecrawl.dev/app/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-orange-800"
                  >
                    firecrawl.dev
                  </a>
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false)
                  setApiKey('')
                  setError('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" variant="orange" disabled={!apiKey}>
                {success ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  'Save Key'
                )}
              </Button>
            </div>
            
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-3 flex-shrink-0" />
            <p className="text-sm text-orange-800">
              Add your FireCrawl API key to enable compliance monitoring and change detection
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowForm(true)}
              variant="orange"
              size="sm"
              className="gap-2"
            >
              <Key className="h-4 w-4" />
              Add API Key
            </Button>
            <Link href="/settings?section=firecrawl">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}