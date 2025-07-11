'use client'

import { useState } from 'react'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/layout/hero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Loader2, Clock, ExternalLink, LogIn, Eye, Download, Grid, List, X, Play, Pause, ChevronLeft, ChevronRight, Globe, Activity, CheckCircle, AlertCircle, BarChart3, RefreshCw, Settings2 } from 'lucide-react'
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth, useMutation, useQuery, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import { WebhookConfigModal } from '@/components/WebhookConfigModal'

// Helper function to format interval display
function formatInterval(minutes: number): string {
  if (minutes < 1) return `${minutes * 60} seconds`;
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const days = minutes / 1440;
  return days === 1 ? '1 day' : `${days} days`;
}

export default function HomePage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()
  
  // Auth state
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  
  // Website monitoring state
  const [url, setUrl] = useState('')
  const [checkInterval, setCheckInterval] = useState('60') // default 60 minutes
  const [error, setError] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [checkingWebsiteId, setCheckingWebsiteId] = useState<string | null>(null)
  
  // Convex queries and mutations
  const websites = useQuery(api.websites.getUserWebsites)
  const createWebsite = useMutation(api.websites.createWebsite)
  const deleteWebsite = useMutation(api.websites.deleteWebsite)
  const toggleWebsite = useMutation(api.websites.toggleWebsiteActive)
  const updateWebsite = useMutation(api.websites.updateWebsite)
  const triggerScrape = useAction(api.firecrawl.triggerScrape)

  // Track scrape results
  const [scrapeResults, setScrapeResults] = useState<Record<string, { status: string, message: string }>>({})
  const [viewingChangesFor, setViewingChangesFor] = useState<string | null>(null)
  const [viewingSpecificScrape, setViewingSpecificScrape] = useState<string | null>(null)
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'monitoring' | 'checkLog'>('monitoring')
  const [checkLogFilter, setCheckLogFilter] = useState<'all' | 'changed'>('all')
  const [checkLogView, setCheckLogView] = useState<'list' | 'tile'>('list')
  const [processingWebsites, setProcessingWebsites] = useState<Set<string>>(new Set())
  const [showAddedLines, setShowAddedLines] = useState(true)
  const [showRemovedLines, setShowRemovedLines] = useState(true)
  const [checkLogPage, setCheckLogPage] = useState(1)
  const ITEMS_PER_PAGE_TILE = 9
  const ITEMS_PER_PAGE_LIST = 10
  
  // Webhook configuration modal state
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null)
  const [pendingNotificationConfig, setPendingNotificationConfig] = useState<{
    notificationPreference: 'none' | 'email' | 'webhook' | 'both'
    webhookUrl?: string
  } | null>(null)
  
  // Get latest scrape with changes for the selected website
  const latestScrapeHistory = useQuery(
    api.websites.getWebsiteScrapeHistory, 
    viewingChangesFor ? { websiteId: viewingChangesFor as any, limit: 5 } : "skip" // eslint-disable-line @typescript-eslint/no-explicit-any
  )
  
  // Get latest scrape for each website
  const latestScrapes = useQuery(api.websites.getLatestScrapeForWebsites)
  
  // Get all scrape results for check log
  const allScrapeHistory = useQuery(api.websites.getAllScrapeHistory)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setIsAuthenticating(true)

    try {
      await signIn("password", {
        email,
        password,
        flow: authMode,
      })
      setEmail('')
      setPassword('')
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setAuthError(error.message || 'Authentication failed')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleAddWebsite = async () => {
    if (!url) {
      setError('Please enter a URL')
      return
    }

    // Add https:// if no protocol is specified
    let processedUrl = url.trim()
    if (!processedUrl.match(/^https?:\/\//)) {
      processedUrl = 'https://' + processedUrl
    }

    // Basic URL validation and auto-generate name
    let autoGeneratedName = ''
    try {
      const urlObj = new URL(processedUrl)
      // Generate a friendly name from the hostname
      autoGeneratedName = urlObj.hostname
        .replace('www.', '')
        .split('.')[0]
        .charAt(0).toUpperCase() + urlObj.hostname.replace('www.', '').split('.')[0].slice(1)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    const interval = parseFloat(checkInterval)
    if (isNaN(interval) || (interval < 5 && interval !== 0.25)) {
      setError('Check interval must be at least 5 minutes (except for 15-second test mode)')
      return
    }

    setError('')
    setIsAdding(true)

    try {
      const websiteId = await createWebsite({
        url: processedUrl,
        name: autoGeneratedName,
        checkInterval: interval,
        notificationPreference: pendingNotificationConfig?.notificationPreference || 'none',
        webhookUrl: pendingNotificationConfig?.webhookUrl,
      })
      
      setUrl('')
      setCheckInterval('60')
      setPendingNotificationConfig(null)
      
      // Show webhook configuration modal for the newly created website
      if (websiteId) {
        setEditingWebsiteId(websiteId)
        setShowWebhookModal(true)
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(error.message || 'Failed to add website')
    } finally {
      setIsAdding(false)
    }
  }

  const formatTimeAgo = (timestamp: number | undefined) => {
    if (!timestamp) return 'Never'
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    return `${Math.floor(seconds / 86400)} days ago`
  }

  const downloadMarkdown = (markdown: string | undefined, websiteName: string, timestamp: number) => {
    if (!markdown) {
      console.error('No markdown content available to download')
      return
    }
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${websiteName.replace(/[^a-z0-9]/gi, '_')}_${new Date(timestamp).toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCheckNow = async (websiteId: string) => {
    setCheckingWebsiteId(websiteId)
    setProcessingWebsites(prev => new Set([...prev, websiteId]))
    
    try {
      await triggerScrape({ websiteId })
      // The UI will automatically update via Convex reactive queries
      setCheckingWebsiteId(null)
      
      // Keep processing indicator for a bit to show the scrape is running
      setTimeout(() => {
        setProcessingWebsites(prev => {
          const newSet = new Set(prev)
          newSet.delete(websiteId)
          return newSet
        })
      }, 5000) // Increased to 5 seconds
    } catch (error) {
      console.error('Failed to trigger scrape:', error)
      setScrapeResults(prev => ({ 
        ...prev, 
        [websiteId]: { 
          status: 'error', 
          message: 'Failed to check website: ' + (error as any).message // eslint-disable-line @typescript-eslint/no-explicit-any 
        } 
      }))
      setCheckingWebsiteId(null)
      setProcessingWebsites(prev => {
        const newSet = new Set(prev)
        newSet.delete(websiteId)
        return newSet
      })
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setScrapeResults(prev => {
          const newResults = { ...prev }
          delete newResults[websiteId]
          return newResults
        })
      }, 5000)
    }
  }

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </Layout>
    )
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl w-full mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Hero content */}
              <div className="text-center lg:text-left">
                <h1 className="text-[3rem] lg:text-[4rem] font-semibold tracking-tight leading-none mb-6">
                  <span className="bg-gradient-to-tr from-red-600 to-yellow-500 bg-clip-text text-transparent block">
                    Firecrawl
                  </span>
                  <span className="text-black block">
                    Observer
                  </span>
                </h1>
                <p className="text-xl text-zinc-600 dark:text-zinc-400">
                  Monitor websites with Firecrawl change tracking
                </p>
              </div>
              
              {/* Right side - Sign in form */}
              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="bg-white rounded-lg p-8 shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <h2 className="text-2xl font-semibold">
                {authMode === 'signIn' ? 'Welcome Back' : 'Get Started'}
              </h2>
            </div>
            <p className="text-center text-zinc-600 mb-6">
              {authMode === 'signIn' 
                ? 'Sign in to your account to continue monitoring websites' 
                : 'Create an account to start monitoring website changes'}
            </p>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                  Email
                </label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                  Password
                </label>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
                />
              </div>
              
              {authError && (
                <p className="text-sm text-red-500">{authError}</p>
              )}
              
              <Button 
                type="submit" 
                variant="orange" 
                className="w-full"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {authMode === 'signIn' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {authMode === 'signIn' ? 'Sign In' : 'Sign Up'}
                  </>
                )}
              </Button>
            </form>
            
            <p className="text-center text-sm text-zinc-600 mt-4">
              {authMode === 'signIn' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signUp')}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signIn')}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
      </Layout>
    )
  }

  return (
    <Layout>
      <Header ctaHref="https://github.com/new?template_name=firecrawl-observer&template_owner=your-org" />
      
      <Hero 
        title={
          <div className="flex flex-col leading-none">
            <span className="bg-gradient-to-tr from-red-600 to-yellow-500 bg-clip-text text-transparent">
              Firecrawl
            </span>
            <span className="text-black">
              Observer
            </span>
          </div>
        }
        subtitle="Monitor websites with Firecrawl change tracking"
      />
      
      <MainContent maxWidth="7xl" className="py-12">
        <div className="space-y-8">
          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'monitoring'
                  ? 'text-orange-600 border-orange-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Websites
            </button>
            <button
              onClick={() => setActiveTab('checkLog')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === 'checkLog'
                  ? 'text-orange-600 border-orange-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Check Log
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'monitoring' ? (
            <>
              {/* Websites Section */}
              <div className="space-y-4">
                {/* Header with Add Form */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Monitored Websites</h3>
                    {websites && websites.length > 0 && (
                      <Button
                        variant="orange"
                        size="sm"
                        onClick={async () => {
                          const activeWebsites = websites.filter(w => w.isActive);
                          for (const website of activeWebsites) {
                            await handleCheckNow(website._id);
                          }
                        }}
                      >
                        Check All Active Sites
                      </Button>
                    )}
                  </div>
                  
                  {/* Add Website Form */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add New Website</label>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleAddWebsite();
                    }} className="flex items-center gap-3">
                      <Input 
                        type="text" 
                        placeholder="example.com" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isAdding}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-600 whitespace-nowrap">Check every</span>
                        <Select 
                          value={checkInterval}
                          onChange={(e) => setCheckInterval(e.target.value)}
                          className="w-32"
                          disabled={isAdding}
                        >
                          <option value="0.25">15 seconds (TEST)</option>
                          <option value="5">5 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="180">3 hours</option>
                          <option value="360">6 hours</option>
                          <option value="720">12 hours</option>
                          <option value="1440">24 hours</option>
                          <option value="4320">3 days</option>
                          <option value="10080">7 days</option>
                        </Select>
                      </div>
                      <Button 
                        type="submit"
                        variant="orange"
                        size="sm"
                        disabled={isAdding}
                        className="whitespace-nowrap"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Start Observing'
                        )}
                      </Button>
                    </form>
                    {error && (
                      <p className="text-sm text-red-500 mt-2">{error}</p>
                    )}
                  </div>
                </div>

                {/* Monitored Websites List */}
                {websites && websites.length > 0 && (
                  
                  <div className="grid gap-4">
                {websites
                  .sort((a, b) => b._creationTime - a._creationTime)
                  .map((website) => {
                  const latestScrape = latestScrapes?.[website._id];
                  const isProcessing = processingWebsites.has(website._id);
                  const hasChanged = latestScrape?.changeStatus === 'changed';
                  
                  return (
                    <div 
                      key={website._id}
                      className={`rounded-lg shadow-sm hover:shadow-md transition-all ${
                        isProcessing 
                          ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300' 
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          {/* Website image or icon */}
                          <div className="flex-shrink-0">
                            {latestScrape?.ogImage ? (
                              <img 
                                src={latestScrape.ogImage} 
                                alt={website.name}
                                className="w-16 h-16 object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg></div>';
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Globe className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Header with name and status */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-semibold text-gray-900">{website.name}</h4>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  website.isActive 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                                }`}>
                                  {website.isActive ? (
                                    <>
                                      <Activity className="w-3 h-3 mr-1" />
                                      Active
                                    </>
                                  ) : (
                                    'Paused'
                                  )}
                                </span>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="code"
                                  size="sm"
                                  onClick={() => setViewingChangesFor(website._id)}
                                  title="View history"
                                >
                                  <BarChart3 className="h-4 w-4 mr-1" />
                                  History
                                </Button>
                                <Button 
                                  variant="code" 
                                  size="sm"
                                  onClick={() => {
                                    setEditingWebsiteId(website._id)
                                    setShowWebhookModal(true)
                                  }}
                                  title="Configure notifications"
                                  className="w-8 h-8 p-0"
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="code" 
                                  size="sm"
                                  onClick={() => toggleWebsite({ websiteId: website._id })}
                                  title={website.isActive ? 'Pause monitoring' : 'Resume monitoring'}
                                  className="w-8 h-8 p-0"
                                >
                                  {website.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                                <Button 
                                  variant="code" 
                                  size="sm"
                                  onClick={() => deleteWebsite({ websiteId: website._id })}
                                  title="Remove website"
                                  className="w-8 h-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* URL */}
                            <a 
                              href={website.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-3"
                            >
                              <Globe className="w-3 h-3" />
                              {website.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            
                            {/* Status and title */}
                            {isProcessing ? (
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-2 text-orange-600">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span className="text-sm font-medium">Checking for changes...</span>
                                </div>
                              </div>
                            ) : latestScrape && latestScrape.changeStatus !== 'new' ? (
                              <div className="mb-3">
                                <div className="flex items-start gap-2">
                                  {hasChanged ? (
                                    <div className="flex items-center gap-2 text-orange-600">
                                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm font-medium">Changes detected</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm">No changes</span>
                                    </div>
                                  )}
                                </div>
                                {latestScrape.title && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                    {latestScrape.title}
                                  </p>
                                )}
                              </div>
                            ) : null}
                            
                            {/* Meta info and check button */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeAgo(website.lastChecked)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3" />
                                  Every {formatInterval(website.checkInterval)}
                                </div>
                              </div>
                              
                              <Button 
                                variant={isProcessing ? "outline" : "orange"}
                                size="sm"
                                onClick={() => handleCheckNow(website._id)}
                                disabled={isProcessing}
                                className="text-xs"
                              >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Checking
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                    Check Now
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Error messages */}
                            {scrapeResults[website._id] && (
                              <div className={`mt-2 text-xs ${
                                scrapeResults[website._id].status === 'error' ? 'text-red-600' : 
                                'text-gray-600'
                              }`}>
                                {scrapeResults[website._id].message}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                )}
              </div>

          {/* Changes Modal */}
          {viewingChangesFor && latestScrapeHistory && latestScrapeHistory.length > 0 && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setViewingChangesFor(null)
                  setExpandedDiffId(null)
                }
              }}
            >
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="text-xl font-semibold">Scrape History</h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    Showing recent checks and changes for this website
                  </p>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {/* Show history of scrapes */}
                  <div className="space-y-4">
                    {latestScrapeHistory.map((scrape, index) => (
                      <div key={scrape._id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start gap-4">
                          {/* Scrape image thumbnail */}
                          {scrape.ogImage && index === 0 && (
                            <img 
                              src={scrape.ogImage}
                              alt="Page preview"
                              className="w-20 h-20 object-cover rounded flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">
                                {formatTimeAgo(scrape.scrapedAt)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                scrape.changeStatus === 'changed' ? 'bg-orange-100 text-orange-800' :
                                scrape.changeStatus === 'new' ? 'bg-blue-100 text-blue-800' :
                                scrape.changeStatus === 'same' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {scrape.changeStatus}
                              </span>
                            </div>
                            
                            {scrape.title && index === 0 && (
                              <p className="text-sm font-medium mb-1">{scrape.title}</p>
                            )}
                            
                            {scrape.description && index === 0 && (
                              <p className="text-xs text-zinc-600 mb-2">{scrape.description}</p>
                            )}
                        
                        {scrape.changeStatus === 'changed' && scrape.diff ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => setExpandedDiffId(expandedDiffId === scrape._id ? null : scrape._id)}
                            >
                              {expandedDiffId === scrape._id ? 'Hide diff' : 'View diff'}
                            </Button>
                            
                            {expandedDiffId === scrape._id && (
                              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                                <div className="bg-gray-900 p-4 max-h-96 overflow-y-auto">
                                  <div className="font-mono text-sm">
                                    {(scrape.diff.text || '').split('\n').map((line, lineIndex) => {
                                      const isAddition = line.startsWith('+') && !line.startsWith('+++');
                                      const isDeletion = line.startsWith('-') && !line.startsWith('---');
                                      const isContext = line.startsWith('@@');
                                      const isFileHeader = line.startsWith('+++') || line.startsWith('---');
                                      
                                      // Filter based on checkboxes
                                      if (isAddition && !showAddedLines) return null;
                                      if (isDeletion && !showRemovedLines) return null;
                                      
                                      return (
                                        <div
                                          key={lineIndex}
                                          className={`px-2 py-0.5 ${
                                            isAddition ? 'bg-green-900/30 text-green-300' :
                                            isDeletion ? 'bg-red-900/30 text-red-300' :
                                            isContext ? 'bg-blue-900/30 text-blue-300 font-bold' :
                                            isFileHeader ? 'text-gray-400' :
                                            'text-gray-300'
                                          }`}
                                        >
                                          <span className="select-none text-gray-500 mr-2">
                                            {String(lineIndex + 1).padStart(4, ' ')}
                                          </span>
                                          <span>{line || ' '}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-2 border-t flex items-center gap-4 text-sm">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={showAddedLines}
                                      onChange={(e) => setShowAddedLines(e.target.checked)}
                                      className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <span className="text-green-700">Show added</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={showRemovedLines}
                                      onChange={(e) => setShowRemovedLines(e.target.checked)}
                                      className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                                    />
                                    <span className="text-red-700">Show removed</span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </>
                        ) : scrape.changeStatus === 'new' && index === latestScrapeHistory.length - 1 ? (
                          <p className="text-sm text-zinc-600">Initial scrape - baseline established</p>
                        ) : scrape.changeStatus === 'same' ? (
                          <p className="text-sm text-zinc-600">No changes from previous scrape</p>
                        ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {latestScrapeHistory.length === 0 && (
                      <p className="text-center text-zinc-600">No scrape history available yet.</p>
                    )}
                  </div>
                </div>
                <div className="p-6 border-t flex justify-end">
                  <Button size="sm" onClick={() => {
                    setViewingChangesFor(null)
                    setExpandedDiffId(null)
                  }}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
            </>
          ) : (
            /* Check Log Tab */
            <div className="space-y-4">
              {/* Filter and view controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={checkLogFilter === 'all' ? 'orange' : 'code'}
                    size="sm"
                    onClick={() => {
                      setCheckLogFilter('all')
                      setCheckLogPage(1)
                    }}
                  >
                    All Checks
                  </Button>
                  <Button
                    variant={checkLogFilter === 'changed' ? 'orange' : 'code'}
                    size="sm"
                    onClick={() => {
                      setCheckLogFilter('changed')
                      setCheckLogPage(1)
                    }}
                  >
                    Changed Only
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  {processingWebsites.size > 0 && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing {processingWebsites.size} check{processingWebsites.size > 1 ? 's' : ''}...</span>
                    </div>
                  )}
                  
                  <div className="flex gap-1">
                    <Button
                      variant={checkLogView === 'list' ? 'code' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setCheckLogView('list')
                        setCheckLogPage(1)
                      }}
                      className="px-2"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={checkLogView === 'tile' ? 'code' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setCheckLogView('tile')
                        setCheckLogPage(1)
                      }}
                      className="px-2"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Check log entries */}
              {(() => {
                // Filter and paginate data
                const filteredData = allScrapeHistory?.filter(scrape => 
                  checkLogFilter === 'all' || scrape.changeStatus === 'changed'
                ) || []
                
                const itemsPerPage = checkLogView === 'tile' ? ITEMS_PER_PAGE_TILE : ITEMS_PER_PAGE_LIST
                const totalPages = Math.ceil(filteredData.length / itemsPerPage)
                const startIndex = (checkLogPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedData = filteredData.slice(startIndex, endIndex)
                
                // Reset to page 1 if current page is out of bounds
                if (checkLogPage > totalPages && totalPages > 0) {
                  setCheckLogPage(1)
                }
                
                return (
                  <>
                    {checkLogView === 'list' ? (
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Website
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Page Title
                            </th>
                            <th className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Show loading entries for websites being processed */}
                          {websites && Array.from(processingWebsites).map(websiteId => {
                            const website = websites.find(w => w._id === websiteId)
                            if (!website) return null
                            return (
                              <tr key={`loading-${websiteId}`} className="bg-orange-50 animate-pulse">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Checking...
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900">{website.name}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-xs">{website.url}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  Now
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                                </td>
                              </tr>
                            )
                          })}
                          {paginatedData.map((scrape) => (
                        <tr key={scrape._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex text-xs px-2 py-1 rounded-full ${
                              scrape.changeStatus === 'changed' ? 'bg-orange-100 text-orange-800' :
                              scrape.changeStatus === 'new' ? 'bg-blue-100 text-blue-800' :
                              scrape.changeStatus === 'same' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {scrape.changeStatus === 'changed' ? 'Changed' :
                               scrape.changeStatus === 'new' ? 'Initial' :
                               scrape.changeStatus === 'same' ? 'Same' :
                               'Removed'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{scrape.websiteName}</div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">{scrape.websiteUrl}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTimeAgo(scrape.scrapedAt)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="truncate max-w-xs">
                              {scrape.title || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex gap-2 justify-end">
                              {scrape.changeStatus === 'changed' && scrape.diff && (
                                <Button
                                  variant="code"
                                  size="sm"
                                  onClick={() => {
                                    setViewingSpecificScrape(scrape._id);
                                  }}
                                >
                                  View Diff
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadMarkdown(scrape.markdown, scrape.websiteName, scrape.scrapedAt)}
                                title="Download Markdown"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {(!allScrapeHistory || allScrapeHistory.length === 0) && (
                        <div className="text-center py-12">
                          <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <p className="text-zinc-500">No checks recorded yet. Start monitoring websites to see the check log.</p>
                        </div>
                      )}
                      
                      {filteredData.length === 0 && allScrapeHistory && allScrapeHistory.length > 0 && (
                        <div className="text-center py-12">
                          <p className="text-zinc-500">No changes detected in the check log.</p>
                        </div>
                      )}
                    </div>
                    ) : (
                      /* Tile View */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Show loading tiles for websites being processed */}
                        {websites && Array.from(processingWebsites).map(websiteId => {
                          const website = websites.find(w => w._id === websiteId)
                          if (!website) return null
                          return (
                            <div key={`loading-tile-${websiteId}`} className="bg-white rounded-lg shadow-sm overflow-hidden border border-orange-200 animate-pulse">
                              {/* Loading image placeholder */}
                              <div className="h-48 bg-gray-200"></div>
                              
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-medium text-gray-900 truncate flex-1">{website.name}</h3>
                                  <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full ml-2 bg-orange-100 text-orange-800 flex items-center">
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Checking
                                  </span>
                                </div>
                                
                                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
                                
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                  <span>Now</span>
                                  <a href={website.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 truncate max-w-[200px]">
                                    {website.url}
                                  </a>
                                </div>
                                
                                <div className="h-8 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          )
                        })}
                        {paginatedData.map((scrape) => (
                      <div key={scrape._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
                        {/* OG Image */}
                        {scrape.ogImage ? (
                          <div className="aspect-video w-full bg-gray-100">
                            <img 
                              src={scrape.ogImage} 
                              alt={scrape.websiteName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.parentElement!.style.display = 'none'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-48 bg-gray-100 flex items-center justify-center">
                            <ExternalLink className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-gray-900 truncate flex-1">{scrape.websiteName}</h3>
                            <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full ml-2 ${
                              scrape.changeStatus === 'changed' ? 'bg-orange-100 text-orange-800' :
                              scrape.changeStatus === 'new' ? 'bg-blue-100 text-blue-800' :
                              scrape.changeStatus === 'same' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {scrape.changeStatus === 'changed' ? 'Changed' :
                               scrape.changeStatus === 'new' ? 'Initial' :
                               scrape.changeStatus === 'same' ? 'Same' :
                               'Removed'}
                            </span>
                          </div>
                          
                          <div className="flex-1">
                            {scrape.title && (
                              <p className="text-sm text-gray-700 mb-2 line-clamp-2">{scrape.title}</p>
                            )}
                            
                            {scrape.description && (
                              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{scrape.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>{formatTimeAgo(scrape.scrapedAt)}</span>
                            <a 
                              href={scrape.websiteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-gray-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="orange"
                              size="sm"
                              className="flex-1"
                              onClick={() => downloadMarkdown(scrape.markdown, scrape.websiteName, scrape.scrapedAt)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            {scrape.changeStatus === 'changed' && scrape.diff && (
                              <Button
                                variant="code"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setViewingSpecificScrape(scrape._id);
                                }}
                              >
                                View Diff
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                        ))}
                        
                        {(!allScrapeHistory || allScrapeHistory.length === 0) && (
                          <div className="col-span-full text-center py-12">
                            <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-zinc-500">No checks recorded yet. Start monitoring websites to see the check log.</p>
                          </div>
                        )}
                        
                        {filteredData.length === 0 && allScrapeHistory && allScrapeHistory.length > 0 && (
                          <div className="col-span-full text-center py-12">
                            <p className="text-zinc-500">No changes detected in the check log.</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} checks
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCheckLogPage(checkLogPage - 1)}
                            disabled={checkLogPage === 1}
                            className="gap-1"
                          >
                            <ChevronLeft className="h-3 w-3" />
                            Previous
                          </Button>
                          
                          {/* Page numbers */}
                          <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                              // Show first page, last page, and pages around current
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= checkLogPage - 1 && page <= checkLogPage + 1)
                              ) {
                                return (
                                  <Button
                                    key={page}
                                    variant={page === checkLogPage ? 'code' : 'outline'}
                                    size="sm"
                                    onClick={() => setCheckLogPage(page)}
                                    className="min-w-[40px]"
                                  >
                                    {page}
                                  </Button>
                                )
                              } else if (
                                page === checkLogPage - 2 || 
                                page === checkLogPage + 2
                              ) {
                                return <span key={page} className="px-2">...</span>
                              }
                              return null
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCheckLogPage(checkLogPage + 1)}
                            disabled={checkLogPage === totalPages}
                            className="gap-1"
                          >
                            Next
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </MainContent>
      
      {/* Specific Diff Modal - Outside tab content */}
      {viewingSpecificScrape && allScrapeHistory && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingSpecificScrape(null)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {(() => {
              const scrape = allScrapeHistory.find(s => s._id === viewingSpecificScrape);
              if (!scrape) return null;
              
              // Parse the diff text into lines
              const diffLines = scrape.diff?.text?.split('\n') || [];
              
              return (
                <>
                  <div className="p-6 border-b bg-gray-50">
                    <h3 className="text-xl font-semibold">Change Diff</h3>
                    <p className="text-sm text-zinc-600 mt-1">
                      {scrape.websiteName} • {formatTimeAgo(scrape.scrapedAt)}
                    </p>
                  </div>
                  <div className="overflow-y-auto max-h-[70vh] bg-gray-900">
                    {scrape.diff && scrape.diff.text ? (
                      <div className="p-4">
                        <div className="font-mono text-sm">
                          {diffLines.map((line, index) => {
                            const isAddition = line.startsWith('+') && !line.startsWith('+++');
                            const isDeletion = line.startsWith('-') && !line.startsWith('---');
                            const isContext = line.startsWith('@@');
                            const isFileHeader = line.startsWith('+++') || line.startsWith('---');
                            
                            // Filter based on checkboxes
                            if (isAddition && !showAddedLines) return null;
                            if (isDeletion && !showRemovedLines) return null;
                            
                            return (
                              <div
                                key={index}
                                className={`px-2 py-0.5 ${
                                  isAddition ? 'bg-green-900/30 text-green-300' :
                                  isDeletion ? 'bg-red-900/30 text-red-300' :
                                  isContext ? 'bg-blue-900/30 text-blue-300 font-bold' :
                                  isFileHeader ? 'text-gray-400' :
                                  'text-gray-300'
                                }`}
                              >
                                <span className="select-none text-gray-500 mr-2">
                                  {String(index + 1).padStart(4, ' ')}
                                </span>
                                <span>{line || ' '}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-400">No diff available for this change.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showAddedLines}
                          onChange={(e) => setShowAddedLines(e.target.checked)}
                          className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <span className="text-green-700">Added</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showRemovedLines}
                          onChange={(e) => setShowRemovedLines(e.target.checked)}
                          className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <span className="text-red-700">Removed</span>
                      </label>
                    </div>
                    <Button variant="code" size="sm" onClick={() => setViewingSpecificScrape(null)}>
                      Close
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* Webhook Configuration Modal */}
      {editingWebsiteId && (
        <WebhookConfigModal
          isOpen={showWebhookModal}
          onClose={() => {
            setShowWebhookModal(false)
            setEditingWebsiteId(null)
          }}
          onSave={async (config) => {
            // Update website with notification preferences
            if (editingWebsiteId) {
              await updateWebsite({
                websiteId: editingWebsiteId,
                notificationPreference: config.notificationPreference,
                webhookUrl: config.webhookUrl
              })
            }
            setShowWebhookModal(false)
            setEditingWebsiteId(null)
          }}
          initialConfig={{
            notificationPreference: websites?.find(w => w._id === editingWebsiteId)?.notificationPreference || 'none',
            webhookUrl: websites?.find(w => w._id === editingWebsiteId)?.webhookUrl
          }}
          websiteName={websites?.find(w => w._id === editingWebsiteId)?.name || 'Website'}
        />
      )}
      
      <Footer />
    </Layout>
  )
}