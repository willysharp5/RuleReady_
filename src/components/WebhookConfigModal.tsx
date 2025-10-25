'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Bot, Globe, Monitor, File, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

interface WebhookConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: {
    notificationPreference: 'none' | 'email'
    url?: string
    checkInterval?: number
    monitorType?: 'single_page' | 'full_site'
    crawlLimit?: number
    crawlDepth?: number
    checkNow?: boolean
    compliancePriority?: 'critical' | 'high' | 'medium' | 'low' | 'testing'
    overrideComplianceInterval?: boolean
    priorityChangeReason?: string
  }) => void
  initialConfig?: {
    notificationPreference: 'none' | 'email'
    url?: string
    checkInterval?: number
    monitorType?: 'single_page' | 'full_site'
    crawlLimit?: number
    crawlDepth?: number
    complianceMetadata?: {
      priority: 'critical' | 'high' | 'medium' | 'low' | 'testing'
      isComplianceWebsite: boolean
      jurisdiction: string
      topicKey: string
      ruleId: string
      hasManualOverride?: boolean
      originalPriority?: string
    }
  }
  websiteName: string
}

export function WebhookConfigModal({ isOpen, onClose, onSave, initialConfig, websiteName }: WebhookConfigModalProps) {
  const router = useRouter()
  
  // Form state - exactly matching the add form
  const [url, setUrl] = useState(initialConfig?.url || '')
  const [enableAiAnalysis, setEnableAiAnalysis] = useState(true)
  // Compliance toggle removed per simplified monitoring plan
  const [selectedPriorityLevel, setSelectedPriorityLevel] = useState<'critical' | 'high' | 'medium' | 'low'>(
    (initialConfig?.complianceMetadata?.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium'
  )
  const [checkInterval, setCheckInterval] = useState(initialConfig?.checkInterval || 1440)
  const [monitorType, setMonitorType] = useState<'single' | 'full_site'>(
    initialConfig?.monitorType === 'full_site' ? 'full_site' : 'single'
  )
  const [maxPages, setMaxPages] = useState(initialConfig?.crawlLimit || 10)
  const [maxCrawlDepth, setMaxCrawlDepth] = useState(initialConfig?.crawlDepth || 2)
  const [notificationType, setNotificationType] = useState(initialConfig?.notificationPreference || 'none')
  // Compliance template removed per simplified monitoring plan
  const [checkNow, setCheckNow] = useState(true)
  
  // AI Settings state
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [emailOnlyIfMeaningful, setEmailOnlyIfMeaningful] = useState(true)
  const [meaningfulChangeThreshold, setMeaningfulChangeThreshold] = useState(75)
  const [aiSystemPrompt, setAiSystemPrompt] = useState(`You are an AI assistant specialized in analyzing website changes for compliance monitoring. Your task is to determine if a detected change is "meaningful" for compliance purposes.

MEANINGFUL changes for compliance include:
- Legal requirement updates
- Deadline modifications  
- Rate/fee changes
- New regulations or rules
- Policy updates
- Compliance threshold changes
- Training requirement updates
- Penalty/fine changes

NOT meaningful (ignore these):
- Cosmetic modifications
- Temporary notices
- Marketing content changes

Provide a meaningful change score (0-1) and reasoning for the assessment.`)

  // URL validation state
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean | null
    isValidating: boolean
    message: string
    siteTitle?: string
    siteDescription?: string
  }>({
    isValid: null,
    isValidating: false,
    message: ''
  })

  // URL validation function
  const validateUrl = async (inputUrl: string) => {
    if (!inputUrl.trim()) {
      setUrlValidation({
        isValid: null,
        isValidating: false,
        message: ''
      })
      return
    }

    try {
      const urlObj = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`)
      
      setUrlValidation({
        isValid: null,
        isValidating: true,
        message: 'Validating URL...'
      })

      // Try to fetch the URL to verify it's accessible
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlObj.toString() }),
      })

      const result = await response.json()

      if (response.ok && result.isValid) {
        setUrlValidation({
          isValid: true,
          isValidating: false,
          message: 'URL is valid and accessible',
          siteTitle: result.title,
          siteDescription: result.description
        })
      } else {
        setUrlValidation({
          isValid: false,
          isValidating: false,
          message: result.error || 'URL is not accessible or invalid'
        })
      }
    } catch {
      setUrlValidation({
        isValid: false,
        isValidating: false,
        message: 'Invalid URL format'
      })
    }
  }

  // Debounced URL validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (url.trim() && url !== initialConfig?.url) {
        validateUrl(url)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [url, initialConfig?.url])

  const handleSave = useCallback(() => {
    onSave({
      notificationPreference: notificationType as 'none' | 'email',
      url: url.trim() || undefined,
      checkInterval: checkInterval,
      monitorType: monitorType === 'single' ? 'single_page' : 'full_site',
      crawlLimit: monitorType === 'full_site' ? maxPages : undefined,
      crawlDepth: monitorType === 'full_site' ? maxCrawlDepth : undefined,
      checkNow: checkNow,
      compliancePriority: selectedPriorityLevel,
      overrideComplianceInterval: false,
      priorityChangeReason: undefined,
    })
  }, [notificationType, url, checkInterval, monitorType, maxPages, maxCrawlDepth, checkNow, selectedPriorityLevel, onSave])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleSave])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Website Settings</h2>
              <p className="text-sm text-gray-600 mt-1">Configure monitoring for {websiteName}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8">
            
            {/* Section 1: Basic Website Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <h4 className="text-lg font-medium text-blue-900">Website Information</h4>
              </div>
              
              {/* Email Notifications */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={notificationType === 'email'}
                    onChange={(e) => setNotificationType(e.target.checked ? 'email' : 'none')}
                    className="w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  Enable Email Notifications
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Get notified when changes are detected on this website
                </p>
              </div>

              {/* Website URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Website URL</label>
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder="https://example.com" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className={`w-full pr-10 ${
                      urlValidation.isValid === true ? 'border-green-500 focus:ring-green-500' :
                      urlValidation.isValid === false ? 'border-red-500 focus:ring-red-500' :
                      'border-gray-300'
                    }`}
                  />
                  {/* Validation Icon and Button */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                    {urlValidation.isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : urlValidation.isValid === true ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : urlValidation.isValid === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                    
                    {url.trim() && !urlValidation.isValidating && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => validateUrl(url)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        title="Validate URL"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Validation Message */}
                {urlValidation.message && (
                  <div className={`text-sm ${
                    urlValidation.isValid === true ? 'text-green-600' :
                    urlValidation.isValid === false ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {urlValidation.message}
                  </div>
                )}
                
                {/* Site Preview */}
                {urlValidation.isValid === true && (urlValidation.siteTitle || urlValidation.siteDescription) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Globe className="h-5 w-5 text-green-600 mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {urlValidation.siteTitle && (
                          <h4 className="text-sm font-medium text-green-900 truncate">
                            {urlValidation.siteTitle}
                          </h4>
                        )}
                        {urlValidation.siteDescription && (
                          <p className="text-xs text-green-700 mt-1 line-clamp-2">
                            {urlValidation.siteDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: AI Analysis and Priority */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-5 w-5 text-purple-600" />
                <h4 className="text-lg font-medium text-purple-900">AI Analysis & Priority</h4>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {/* AI Analysis Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">AI Analysis</label>
                      <p className="text-xs text-gray-500">Enable AI-powered change analysis</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAiSettings(!showAiSettings)}
                      className="text-xs"
                    >
                      {showAiSettings ? 'Hide' : 'Show'} Settings
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableAiAnalysis}
                        onChange={(e) => setEnableAiAnalysis(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                    <span className="text-sm text-gray-700">
                      {enableAiAnalysis ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Priority Level */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Priority Level</label>
                  <select
                    value={selectedPriorityLevel}
                    onChange={(e) => setSelectedPriorityLevel(e.target.value as 'critical' | 'high' | 'medium' | 'low')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="critical">🔴 Critical - Checked Daily (High-impact rules)</option>
                    <option value="high">🟠 High - Every 2 Days (Important requirements)</option>
                    <option value="medium">🟡 Medium - Weekly (Standard compliance)</option>
                    <option value="low">🟢 Low - Monthly (Stable rules)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Monitoring Configuration */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="h-5 w-5 text-orange-600" />
                <h4 className="text-lg font-medium text-orange-900">Monitoring Configuration</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monitor Type */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Monitor Type</label>
                  <div className="grid grid-cols-2 gap-4 items-stretch w-full">
                    <div className="relative h-full w-full">
                      <input
                        type="radio"
                        id="single"
                        name="monitorType"
                        value="single"
                        checked={monitorType === 'single'}
                        onChange={(e) => setMonitorType(e.target.value as 'single' | 'full_site')}
                        className="sr-only peer"
                      />
                      <label
                        htmlFor="single"
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all h-full w-full ${
                          monitorType === 'single'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-gray-600" />
                          <div>
                            <span className="font-medium">Single Page</span>
                            <p className="text-sm text-gray-600">Monitor specific page only</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    
                    <div className="relative h-full w-full">
                      <input
                        type="radio"
                        id="full_site"
                        name="monitorType"
                        value="full_site"
                        checked={monitorType === 'full_site'}
                        onChange={(e) => setMonitorType(e.target.value as 'single' | 'full_site')}
                        className="sr-only peer"
                      />
                      <label
                        htmlFor="full_site"
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all h-full w-full ${
                          monitorType === 'full_site'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Monitor className="w-5 h-5 text-orange-600" />
                          <div>
                            <span className="font-medium">Full Site</span>
                            <p className="text-sm text-gray-600">Monitor entire website</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    
                    {/* Full Site Options */}
                    {monitorType === 'full_site' && (
                      <div className="p-4 bg-orange-100 border border-orange-300 rounded-lg space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Maximum Pages</label>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={maxPages}
                              onChange={(e) => setMaxPages(parseInt(e.target.value) || 10)}
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">Limit pages to crawl (1-100)</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Maximum Crawl Depth</label>
                            <Input
                              type="number"
                              min="1"
                              max="5"
                              value={maxCrawlDepth}
                              onChange={(e) => setMaxCrawlDepth(parseInt(e.target.value) || 2)}
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">How deep to crawl links (1-5)</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Scraping Frequency */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="h-5 w-5 text-green-600" />
                <h4 className="text-lg font-medium text-green-900">Scraping Frequency</h4>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">How often should this website be checked</label>
                <select
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={15}>⚡ 15 seconds - Testing only</option>
                  <option value={60}>🔴 1 hour - Very frequent</option>
                  <option value={360}>🟠 6 hours - Frequent</option>
                  <option value={1440}>🟡 1 day - Daily (Recommended)</option>
                  <option value={2880}>🔵 2 days - Bi-daily</option>
                  <option value={10080}>🟢 1 week - Weekly</option>
                </select>
                <p className="text-xs text-gray-500">
                  More frequent checking uses more resources but catches changes faster
                </p>
              </div>
            </div>

            {/* Check Now Option */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="check-now"
                checked={checkNow}
                onChange={(e) => setCheckNow(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
              />
              <label htmlFor="check-now" className="text-sm text-gray-700">
                Check for changes immediately after saving
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="gap-2">
                <Globe className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}