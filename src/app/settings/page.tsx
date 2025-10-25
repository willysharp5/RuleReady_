'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Loader2, ArrowLeft, Mail, AlertCircle, Key, Copy, Plus, Webhook, CheckCircle, Check, HelpCircle, Clock, XCircle, ExternalLink, Bot, Info, Trash2, MessageCircle, Send, User, ThumbsUp, ThumbsDown, ArrowUp, ArrowDown, MapPin, Eye, FileText, Lightbulb, Search, Edit3 } from 'lucide-react'
// Removed auth imports for single-user mode
// import { useConvexAuth } from "convex/react"
// import { useAuthActions } from "@convex-dev/auth/react"
import Link from 'next/link'
import { FirecrawlKeyManager } from '@/components/FirecrawlKeyManager'
import { validateEmailTemplate } from '@/lib/validateTemplate'
import { APP_CONFIG, getFromEmail } from '@/config/app.config'
import { DeleteConfirmationPopover } from '@/components/ui/delete-confirmation-popover'
import { JurisdictionDetailsPopover } from '@/components/ui/jurisdiction-details-popover'
import { ComplianceTemplateEditor } from '@/components/ComplianceTemplateEditor'
// Removed useChat - using custom implementation
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    id: number
    similarity: number
    url?: string
    jurisdiction?: string
    topicKey?: string
    topicLabel?: string
  }>
  settings?: {
    systemPrompt: string
    model: string
    complianceContext: boolean
    maxContextReports: number
    semanticSearch: boolean
    sourcesFound: number
    jurisdiction: string
    topic: string
  }
}

// EmbeddedChatUI component removed - now available on landing page

// Placeholder for EmailTemplateEditor - accepts props to satisfy types
const EmailTemplateEditor = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-4 font-mono text-sm min-h-[300px] rounded-lg border"
      placeholder="Enter your HTML template here..."
      disabled={disabled}
    />
  )
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Single-user mode - no authentication required
  const isAuthenticated = true
  const authLoading = false
  
  const [activeSection, setActiveSection] = useState<'email' | 'firecrawl' | 'monitoring' | 'jurisdictions' | 'templates'>('email')
  
  // API Key state
  const [showNewApiKey, setShowNewApiKey] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  
  // Webhook playground state
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null)
  
  // Notification settings state
  const [notificationEmail, setNotificationEmail] = useState('')
  // Removed default webhook settings
  const [emailTemplate, setEmailTemplate] = useState('')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  
  const [templateSuccess, setTemplateSuccess] = useState(false)
  const [showHtmlSource, setShowHtmlSource] = useState(true)
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiModel, setAiModel] = useState('gpt-4o-mini') // Default to OpenAI's gpt-4o-mini
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiSystemPrompt, setAiSystemPrompt] = useState('')
  const [aiThreshold, setAiThreshold] = useState(70)
  const [aiApiKey, setAiApiKey] = useState('')
  const [emailOnlyIfMeaningful, setEmailOnlyIfMeaningful] = useState(false)
  
  const [isUpdatingAI, setIsUpdatingAI] = useState(false)
  const [aiSuccess, setAiSuccess] = useState(false)
  const [isTestingAI, setIsTestingAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // AI Chat settings state
  const [chatEnabled, setChatEnabled] = useState(true)
  const [chatModel, setChatModel] = useState('gemini-2.0-flash-exp')
  const [chatSystemPrompt, setChatSystemPrompt] = useState('You are a professional compliance assistant specializing in US employment law.')
  const [enableComplianceContext, setEnableComplianceContext] = useState(true)
  const [maxContextReports, setMaxContextReports] = useState(5)
  const [enableSemanticSearch, setEnableSemanticSearch] = useState(true)
  const [isUpdatingChat, setIsUpdatingChat] = useState(false)
  const [chatSuccess, setChatSuccess] = useState(false)
  
  // Jurisdictions page state
  const [jurisdictionFilter, setJurisdictionFilter] = useState('')
  const [jurisdictionSearch, setJurisdictionSearch] = useState('')
  const [jurisdictionPage, setJurisdictionPage] = useState(1)
  const [jurisdictionPageSize, setJurisdictionPageSize] = useState(10)
  
  // API Key queries and mutations
  const apiKeys = useQuery(api.apiKeys.getUserApiKeys)
  const createApiKey = useMutation(api.apiKeys.createApiKey)
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey)
  
  // Monitoring queries
  const cronStatus = useQuery(api.monitoring.getCronJobStatus)
  const embeddingJobs = useQuery(api.monitoring.getEmbeddingJobMetrics)
  const crawlerHealth = useQuery(api.monitoring.getComplianceCrawlerHealth)
  const systemStatus = useQuery(api.monitoring.getSystemStatus)
  
  // Chat settings queries and mutations
  const chatSettings = useQuery(api.chatSettings.getChatSettings)
  const updateChatSettings = useMutation(api.chatSettings.updateChatSettings)
  
  // Compliance data queries for jurisdictions page
  const jurisdictions = useQuery(api.complianceQueries.getJurisdictions)
  const topics = useQuery(api.complianceQueries.getTopics)
  
  // Webhook playground queries and mutations
  const webhookPayloads = useQuery(api.webhookPlayground.getWebhookPayloads, { limit: 50 })
  const clearPayloads = useMutation(api.webhookPlayground.clearWebhookPayloads)
  
  // User settings queries and mutations
  const userSettings = useQuery(api.userSettings.getUserSettings)
  const emailConfig = useQuery(api.emailManager.getEmailConfig)
  const updateDefaultWebhook = useMutation(api.userSettings.updateDefaultWebhook)
  const updateEmailConfig = useMutation(api.emailManager.updateEmailConfig)
  const updateEmailTemplate = useMutation(api.userSettings.updateEmailTemplate)
  const resendVerificationEmail = useAction(api.emailManager.resendVerificationEmail)
  const updateAISettings = useMutation(api.userSettings.updateAISettings)
  const updateNotificationFiltering = useMutation(api.userSettings.updateNotificationFiltering)
  const testAIModel = useAction(api.testActions.testAIModel)
  const testEmailSending = useAction(api.testActions.testEmailSending)
  
  // Template management queries and mutations
  const allTemplates = useQuery(api.complianceTemplates.getAllTemplates)
  const upsertTemplate = useMutation(api.complianceTemplates.upsertTemplate)
  const deleteTemplateAction = useMutation(api.complianceTemplates.deleteTemplate)
  
  // Template management state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    topicKey: string
    topicName: string
    template?: any
  } | null>(null)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  
  // Query currentUser - it will return null if not authenticated
  // const currentUser = useQuery(api.users.getCurrentUser)
  
  // Handle query parameter navigation
  useEffect(() => {
    const section = searchParams.get('section')
    const templateParam = searchParams.get('template')
    
    if (section === 'firecrawl') {
      setActiveSection('firecrawl')
    } else if (section === 'email') {
      setActiveSection('email')
    } else if (section === 'templates') {
      setActiveSection('templates')
      
      // If template parameter is provided, auto-open that template for editing
      if (templateParam && allTemplates) {
        const template = allTemplates.find(t => t.templateId === templateParam)
        if (template) {
          setEditingTemplate({
            topicKey: template.topicKey || '',
            topicName: template.title,
            template: template
          })
          setShowTemplateEditor(true)
        }
      }
    }
  }, [searchParams, allTemplates])
    
    // Handle verification success
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setEmailSuccess(true)
      setTimeout(() => setEmailSuccess(false), 5000)
    }
    
    // Handle verification errors
    const error = searchParams.get('error')
    if (error) {
      let errorMessage = 'Verification failed'
      switch (error) {
        case 'missing-token':
          errorMessage = 'Verification link is invalid'
          break
        case 'token-expired':
          errorMessage = 'Verification link has expired'
          break
        case 'invalid-token':
          errorMessage = 'Invalid verification token'
          break
        case 'verification-failed':
          errorMessage = 'Email verification failed'
          break
        case 'verification-error':
          errorMessage = 'An error occurred during verification'
          break
      }
      setEmailError(errorMessage)
      setTimeout(() => setEmailError(null), 10000)
    }
  }, [searchParams])
  
  // Populate form fields with existing data
  useEffect(() => {
    if (userSettings?.defaultWebhookUrl) {
      setDefaultWebhook(userSettings.defaultWebhookUrl)
    }
    if (userSettings?.emailTemplate) {
      setEmailTemplate(userSettings.emailTemplate)
    } else if (userSettings !== undefined) {
      // Set default template if no custom template exists
      const defaultTemplate = `
<h2>Website Change Alert</h2>
<p>We've detected changes on the website you're monitoring:</p>
<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3>{{websiteName}}</h3>
  <p><a href="{{websiteUrl}}">{{websiteUrl}}</a></p>
  <p><strong>Changed at:</strong> {{changeDate}}</p>
  <p><strong>Page Title:</strong> {{pageTitle}}</p>
</div>
<p><a href="{{viewChangesUrl}}" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Changes</a></p>
      `.trim()
      setEmailTemplate(defaultTemplate)
    }
    
    // Populate AI settings
    if (userSettings) {
      setAiEnabled(userSettings.aiAnalysisEnabled || false)
      setAiModel(userSettings.aiModel || 'gpt-4o-mini')
      setAiBaseUrl(userSettings.aiBaseUrl || '')
      
      // Set system prompt with default if not provided
      const defaultSystemPrompt = `You are an AI assistant specialized in analyzing website changes. Your task is to determine if a detected change is "meaningful" or just noise.

Meaningful changes include:
- Content updates (text, images, prices)
- New features or sections
- Important announcements
- Product availability changes
- Policy updates

NOT meaningful (ignore these):
- Rotating banners/carousels
- Dynamic timestamps
- View counters
- Session IDs
- Random promotional codes
- Cookie consent banners
- Advertising content
- Social media feed updates

Analyze the provided diff and return a JSON response with:
{
  "score": 0-100 (how meaningful the change is),
  "isMeaningful": true/false,
  "reasoning": "Brief explanation of your decision"
}`;
      
      setAiSystemPrompt(userSettings.aiSystemPrompt || defaultSystemPrompt)
      setAiThreshold(userSettings.aiMeaningfulChangeThreshold || 70)
      setAiApiKey(userSettings.aiApiKey || '')
      setEmailOnlyIfMeaningful(userSettings.emailOnlyIfMeaningful || false)
      setWebhookOnlyIfMeaningful(userSettings.webhookOnlyIfMeaningful || false)
    }
  }, [userSettings])
  
  // Load chat settings when available
  useEffect(() => {
    if (chatSettings) {
      setChatSystemPrompt(chatSettings.chatSystemPrompt || 'You are a professional compliance assistant specializing in US employment law.')
      setChatModel(chatSettings.chatModel || 'gemini-2.0-flash-exp')
      setEnableComplianceContext(chatSettings.enableComplianceContext ?? true)
      setMaxContextReports(chatSettings.maxContextReports || 5)
      setEnableSemanticSearch(chatSettings.enableSemanticSearch ?? true)
    }
  }, [chatSettings])
  
  useEffect(() => {
    if (emailConfig?.email) {
      setNotificationEmail(emailConfig.email)
    }
  }, [emailConfig])
  
  // Show loading while auth is loading
  if (authLoading) {
    return (
      <Layout>
        <Header />
        <MainContent maxWidth="7xl" className="py-12">
          <div>
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading your account details...</p>
              </div>
            </div>
          </div>
        </MainContent>
        <Footer />
      </Layout>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/')
    return null
  }

  
  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) return
    
    try {
      const result = await createApiKey({ name: newApiKeyName })
      setCreatedApiKey(result.key)
      setNewApiKeyName('')
      setShowNewApiKey(false)
    } catch (error) {
      console.error('Failed to create API key:', error)
    }
  }
  
  const handleCopyApiKey = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKeyId(keyId)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }
  
  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return
    
    try {
      await deleteApiKey({ keyId: keyId as Id<"apiKeys"> })
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }
  
  return (
    <Layout>
      <Header />
      
      <MainContent maxWidth="7xl" className="py-12">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('email')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'email'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </button>
                <button
                  onClick={() => setActiveSection('firecrawl')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'firecrawl'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Key className="h-4 w-4" />
                  Firecrawl Auth
                </button>
                <button
                  onClick={() => setActiveSection('monitoring')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'monitoring'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  System Health
                </button>
                <button
                  onClick={() => setActiveSection('jurisdictions')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'jurisdictions'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Jurisdictions
                </button>
                <button
                  onClick={() => setActiveSection('templates')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'templates'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Compliance Templates
                </button>
              </nav>
            </div>
            
            {/* Content */}
            <div className="flex-1">
              {activeSection === 'email' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">Email Notifications</h2>
                  
                  {/* Error message */}
                  {emailError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <p className="text-sm text-red-700">{emailError}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-8">
                    {/* Email Configuration */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Notifications
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="notification-email">Notification Email</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="notification-email"
                              type="email"
                              placeholder={APP_CONFIG.email.defaultRecipient}
                              value={notificationEmail}
                              onChange={(e) => setNotificationEmail(e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              variant="default" 
                              size="sm"
                              disabled={isUpdatingEmail || !notificationEmail || notificationEmail === emailConfig?.email}
                              onClick={async () => {
                                setIsUpdatingEmail(true)
                                try {
                                  await updateEmailConfig({ email: notificationEmail })
                                  setEmailSuccess(true)
                                  setTimeout(() => setEmailSuccess(false), 3000)
                                } catch (error) {
                                  console.error('Failed to update email:', error)
                                } finally {
                                  setIsUpdatingEmail(false)
                                }
                              }}
                            >
                              {isUpdatingEmail ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : emailSuccess ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            We&apos;ll send change notifications to this email address
                          </p>
                        </div>
                        
                        {/* Email verification status */}
                        {emailConfig && (
                          <div className={`flex items-center justify-between p-3 rounded-lg ${
                            emailConfig.isVerified 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-amber-50 border border-amber-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {emailConfig.isVerified ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <p className="text-sm text-green-700">
                                    Email verified and ready to receive notifications
                                  </p>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <p className="text-sm text-amber-700">
                                    Please verify your email address to receive notifications
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {emailConfig.isVerified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    setIsSendingTestEmail(true)
                                    setTestEmailResult(null)
                                    try {
                                      const result = await testEmailSending()
                                      setTestEmailResult({
                                        success: result.success,
                                        message: result.message
                                      })
                                    } catch (error) {
                                      setTestEmailResult({
                                        success: false,
                                        message: (error as Error).message || 'Failed to send test email'
                                      })
                                    } finally {
                                      setIsSendingTestEmail(false)
                                    }
                                  }}
                                  disabled={isSendingTestEmail}
                                >
                                  {isSendingTestEmail ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Send Test Email'
                                  )}
                                </Button>
                              )}
                              {!emailConfig.isVerified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await resendVerificationEmail()
                                      alert('Verification email sent!')
                                    } catch (error) {
                                      console.error('Failed to resend email:', error)
                                      alert('Failed to resend verification email')
                                    }
                                  }}
                                >
                                  Resend
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Test email result */}
                        {testEmailResult && (
                          <div className={`p-3 rounded-lg text-sm ${
                            testEmailResult.success 
                              ? 'bg-green-50 text-green-700 border border-green-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {testEmailResult.success ? '✅' : '❌'} {testEmailResult.message}
                          </div>
                        )}
                        
                        {/* Email template preview */}
                        <div>
                          <h4 className="font-medium mb-2">Email Preview</h4>
                          <div className="border rounded-lg p-4 bg-gray-50">
                            <div className="space-y-2 text-sm">
                              <p className="font-semibold">Subject: Changes detected on example.com</p>
                              <div className="border-t pt-2">
                                <p className="text-gray-600">Hi there,</p>
                                <p className="text-gray-600 mt-2">
                                  We&apos;ve detected changes on the website you&apos;re monitoring:
                                </p>
                                <div className="mt-2 p-3 bg-white rounded border">
                                  <p className="font-medium">example.com</p>
                                  <p className="text-gray-500 text-xs mt-1">Changed at: <span suppressHydrationWarning>{new Date().toLocaleString()}</span></p>
                                </div>
                                <p className="text-gray-600 mt-2">
                                  <a href="#" className="text-purple-600 underline">View changes →</a>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Email Template Editor */}
                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-3">Email Template</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Customize the email template that will be sent when changes are detected. Use variables to insert dynamic content.
                      </p>
                      
                      {/* Available Variables */}
                      <div className="mb-4 p-3 border rounded-lg">
                        <h5 className="font-medium mb-2">Available Variables</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-mono bg-gray-100 px-1 rounded">{"{{websiteName}}"}</span> - Website name
                          </div>
                          <div>
                            <span className="font-mono bg-gray-100 px-1 rounded">{"{{websiteUrl}}"}</span> - Website URL
                          </div>
                          <div>
                            <span className="font-mono bg-gray-100 px-1 rounded">{"{{changeDate}}"}</span> - When change was detected
                          </div>
                          <div>
                            <span className="font-mono bg-gray-100 px-1 rounded">{"{{changeType}}"}</span> - Type of change
                          </div>
                          <div>
                            <span className="font-mono bg-gray-100 px-1 rounded">{"{{pageTitle}}"}</span> - Page title
                          </div>
                          <div>
                            <span className="font-mono bg-gray-100 px-1 rounded">{"{{viewChangesUrl}}"}</span> - Link to view changes
                          </div>
                          {aiEnabled && (
                            <>
                              <div>
                                <span className="font-mono bg-gray-100 px-1 rounded">{"{{aiMeaningfulScore}}"}</span> - AI score (0-100)
                              </div>
                              <div>
                                <span className="font-mono bg-gray-100 px-1 rounded">{"{{aiIsMeaningful}}"}</span> - Yes/No meaningful
                              </div>
                              <div>
                                <span className="font-mono bg-gray-100 px-1 rounded">{"{{aiReasoning}}"}</span> - AI reasoning
                              </div>
                              <div>
                                <span className="font-mono bg-gray-100 px-1 rounded">{"{{aiModel}}"}</span> - AI model used
                              </div>
                              <div>
                                <span className="font-mono bg-gray-100 px-1 rounded">{"{{aiAnalyzedAt}}"}</span> - AI analysis time
                              </div>
                            </>
                          )}
                        </div>
                        {aiEnabled && (
                          <p className="text-xs text-gray-500 mt-2">
                            AI variables are only available when AI analysis is enabled and a change is analyzed.
                          </p>
                        )}
                      </div>
                      
                      {/* Toggle between editor and HTML view */}
                      <div className="mb-4 flex gap-2">
                        <Button
                          variant={showHtmlSource ? "outline" : "code"}
                          size="sm"
                          onClick={() => setShowHtmlSource(false)}
                        >
                          Editor
                        </Button>
                        <Button
                          variant={showHtmlSource ? "code" : "outline"}
                          size="sm"
                          onClick={() => setShowHtmlSource(true)}
                        >
                          HTML Source
                        </Button>
                      </div>
                      
                      {showHtmlSource ? (
                        <div className="border rounded-lg">
                          <textarea
                            value={emailTemplate}
                            onChange={(e) => setEmailTemplate(e.target.value)}
                            className="w-full p-4 font-mono text-sm min-h-[300px] rounded-lg"
                            placeholder="Enter your HTML template here..."
                            disabled={isUpdatingTemplate}
                          />
                        </div>
                      ) : (
                        <EmailTemplateEditor
                          value={emailTemplate}
                          onChange={setEmailTemplate}
                          disabled={isUpdatingTemplate}
                        />
                      )}
                      
                      {/* Email Preview */}
                      <div className="mt-6">
                        <h4 className="font-medium mb-3">Preview</h4>
                        <div className="border rounded-lg p-6 bg-gray-50">
                          <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
                            <div className="mb-4 text-sm text-gray-500 border-b pb-2">
                              <p><strong>From:</strong> {getFromEmail()}</p>
                              <p><strong>To:</strong> {notificationEmail || APP_CONFIG.email.defaultRecipient}</p>
                              <p><strong>Subject:</strong> Changes detected on Example Website</p>
                            </div>
                            <div 
                              className="prose prose-sm max-w-none"
                              suppressHydrationWarning
                              dangerouslySetInnerHTML={{ 
                                __html: emailTemplate
                                  .replace(/{{websiteName}}/g, 'Example Website')
                                  .replace(/{{websiteUrl}}/g, 'https://example.com')
                                  .replace(/{{changeDate}}/g, new Date().toLocaleString())
                                  .replace(/{{changeType}}/g, 'Content changed')
                                  .replace(/{{pageTitle}}/g, 'Example Page Title')
                                  .replace(/{{viewChangesUrl}}/g, '#')
                                  .replace(/{{aiMeaningfulScore}}/g, '85')
                                  .replace(/{{aiIsMeaningful}}/g, 'Yes')
                                  .replace(/{{aiReasoning}}/g, 'The page content has been updated with new product information and pricing changes.')
                                  .replace(/{{aiModel}}/g, 'gpt-4o-mini')
                                  .replace(/{{aiAnalyzedAt}}/g, new Date().toLocaleString())
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const defaultTemplate = `
<h2>Website Change Alert</h2>
<p>We've detected changes on the website you're monitoring:</p>
<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3>{{websiteName}}</h3>
  <p><a href="{{websiteUrl}}">{{websiteUrl}}</a></p>
  <p><strong>Changed at:</strong> {{changeDate}}</p>
  <p><strong>Page Title:</strong> {{pageTitle}}</p>
</div>
<p><a href="{{viewChangesUrl}}" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Changes</a></p>
                            `.trim()
                            setEmailTemplate(defaultTemplate)
                            setTemplateSuccess(false)
                          }}
                          disabled={isUpdatingTemplate || !emailTemplate}
                        >
                          Reset to Default
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            // Validate template first
                            const validation = validateEmailTemplate(emailTemplate)
                            if (!validation.isValid) {
                              alert('Template validation failed:\n\n' + validation.errors.join('\n'))
                              return
                            }
                            
                            setIsUpdatingTemplate(true)
                            try {
                              await updateEmailTemplate({ template: emailTemplate })
                              setTemplateSuccess(true)
                              setTimeout(() => setTemplateSuccess(false), 3000)
                            } catch (error) {
                              console.error('Failed to update template:', error)
                              alert('Failed to save template. Please try again.')
                            } finally {
                              setIsUpdatingTemplate(false)
                            }
                          }}
                          disabled={isUpdatingTemplate || emailTemplate === (userSettings?.emailTemplate || '')}
                        >
                          {isUpdatingTemplate ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : templateSuccess ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Saved
                            </>
                          ) : (
                            'Save Template'
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Global email preferences */}
                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-3">Email Preferences</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-orange-500" defaultChecked />
                          <span className="text-sm">Send instant notifications for each change</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'firecrawl' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">Firecrawl Auth</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-gray-600 mb-4">
                        Connect your Firecrawl API key to enable website monitoring. Firecrawl powers the web scraping and change detection functionality.
                      </p>
                      
                      <a 
                        href="https://www.firecrawl.dev/app/api-keys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-orange-700 text-sm font-medium"
                      >
                        Get your Firecrawl API key →
                      </a>
                    </div>
                    
                    <FirecrawlKeyManager />
                  </div>
                </div>
              )}
              
              {activeSection === 'monitoring' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Bot className="h-6 w-6" />
                    System Health & Job Monitoring
                  </h2>
                  
                  <div className="space-y-6">
                    {/* System Overview */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">System Overview</h3>
                      {systemStatus ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-purple-700">Total Websites</div>
                            <div className="text-2xl font-bold text-purple-900">{systemStatus.overview.totalWebsites}</div>
                            <div className="text-xs text-purple-600">{systemStatus.overview.activeWebsites} active</div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-blue-700">Compliance Rules</div>
                            <div className="text-2xl font-bold text-blue-900">{systemStatus.overview.totalRules}</div>
                            <div className="text-xs text-blue-600">across 52 jurisdictions</div>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-green-700">Embeddings</div>
                            <div className="text-2xl font-bold text-green-900">{systemStatus.overview.totalEmbeddings.toLocaleString()}</div>
                            <div className="text-xs text-green-600">for RAG system</div>
                          </div>
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-orange-700">24h Activity</div>
                            <div className="text-2xl font-bold text-orange-900">{systemStatus.activity24h.changesDetected}</div>
                            <div className="text-xs text-orange-600">changes detected</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
                          <p className="text-gray-500">Loading system status...</p>
                        </div>
                      )}
                    </div>

                    {/* Cron Jobs Status */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Scheduled Jobs Status</h3>
                      {cronStatus ? (
                        <div className="space-y-3">
                          {cronStatus.jobs.map(job => (
                            <div key={job.name} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="font-medium">{job.name}</span>
                                  <p className="text-sm text-gray-600">{job.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    job.status === 'healthy' ? 'bg-green-500' : 
                                    job.status === 'no_recent_activity' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                  <span className={`text-sm font-medium ${
                                    job.status === 'healthy' ? 'text-green-700' : 
                                    job.status === 'no_recent_activity' ? 'text-yellow-700' : 'text-red-700'
                                  }`}>
                                    {job.status === 'healthy' ? 'Healthy' : 
                                     job.status === 'no_recent_activity' ? 'No Recent Activity' : 'Issues'}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-500">Last Run</div>
                                  <div className="font-medium">
                                    {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Success Rate</div>
                                  <div className="font-medium">{job.successRate}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Total Runs (24h)</div>
                                  <div className="font-medium">{job.totalRuns}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Failures (24h)</div>
                                  <div className="font-medium text-red-600">{job.failures}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                          <p className="text-gray-500">Loading job status...</p>
                        </div>
                      )}
                    </div>

                    {/* Embedding Jobs */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Embedding Generation Jobs</h3>
                      {embeddingJobs ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Total Embeddings</div>
                              <div className="text-xl font-bold text-purple-600">{embeddingJobs.totalEmbeddings.toLocaleString()}</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Pending</div>
                              <div className="text-xl font-bold text-yellow-600">{embeddingJobs.pendingJobs}</div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Processing</div>
                              <div className="text-xl font-bold text-blue-600">{embeddingJobs.processingJobs}</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Completed</div>
                              <div className="text-xl font-bold text-green-600">{embeddingJobs.completedJobs}</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Failed</div>
                              <div className="text-xl font-bold text-red-600">{embeddingJobs.failedJobs}</div>
                            </div>
                          </div>
                          
                          {/* Recent Jobs Table */}
                          {embeddingJobs.recentJobs.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <h4 className="font-medium text-sm">Recent Jobs (24h)</h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="border-b bg-gray-50">
                                    <tr>
                                      <th className="text-left p-2">Job ID</th>
                                      <th className="text-left p-2">Type</th>
                                      <th className="text-left p-2">Status</th>
                                      <th className="text-left p-2">Progress</th>
                                      <th className="text-left p-2">Started</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {embeddingJobs.recentJobs.map(job => (
                                      <tr key={job.jobId} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-mono text-xs">{job.jobId.slice(0, 16)}...</td>
                                        <td className="p-2 capitalize">{job.jobType.replace('_', ' ')}</td>
                                        <td className="p-2">
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {job.status}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          {job.progress.completed}/{job.progress.total}
                                          {job.progress.failed > 0 && (
                                            <span className="text-red-600 ml-1">({job.progress.failed} failed)</span>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                          <p className="text-gray-500">Loading embedding jobs...</p>
                        </div>
                      )}
                    </div>

                    {/* Compliance Crawler Health */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Compliance Crawler Health</h3>
                      {crawlerHealth ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium mb-3">Recent Activity (24h)</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Rules checked:</span>
                                  <span className="font-medium">{crawlerHealth.rulesChecked}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Changes detected:</span>
                                  <span className="font-medium text-orange-600">{crawlerHealth.changesDetected}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Successful crawls:</span>
                                  <span className="font-medium text-green-600">{crawlerHealth.successfulCrawls}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Failed crawls:</span>
                                  <span className="font-medium text-red-600">{crawlerHealth.failedCrawls}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Success rate:</span>
                                  <span className="font-medium">{crawlerHealth.crawlSuccessRate}%</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-3">System Components</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${crawlerHealth.workpoolHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span className="text-sm">Workpool: {crawlerHealth.workpoolHealthy ? 'Healthy' : 'Issues detected'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${crawlerHealth.firecrawlHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span className="text-sm">FireCrawl: {crawlerHealth.firecrawlHealthy ? 'Healthy' : 'Issues detected'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${crawlerHealth.geminiHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span className="text-sm">Gemini AI: {crawlerHealth.geminiHealthy ? 'Healthy' : 'Issues detected'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Recent Activity */}
                          {crawlerHealth.recentActivity.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3">Recent Crawler Activity</h4>
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="border-b bg-gray-50">
                                    <tr>
                                      <th className="text-left p-2">Rule ID</th>
                                      <th className="text-left p-2">Status</th>
                                      <th className="text-left p-2">Changes</th>
                                      <th className="text-left p-2">Time</th>
                                      <th className="text-left p-2">Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {crawlerHealth.recentActivity.map((activity, index) => (
                                      <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-mono text-xs">{activity.ruleId}</td>
                                        <td className="p-2">
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            activity.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                          }`}>
                                            {activity.status}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          {activity.changesDetected ? 
                                            <span className="text-orange-600 font-medium">Yes</span> : 
                                            <span className="text-gray-500">No</span>
                                          }
                                        </td>
                                        <td className="p-2">{new Date(activity.timestamp).toLocaleString()}</td>
                                        <td className="p-2">{activity.processingTime ? `${activity.processingTime}ms` : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                          <p className="text-gray-500">Loading crawler health...</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Raw Data Access */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Raw Data & Debugging</h3>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const data = JSON.stringify(cronStatus, null, 2);
                              const blob = new Blob([data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `cron-status-${new Date().toISOString().split('T')[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Export Cron Logs (JSON)
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const data = JSON.stringify(embeddingJobs, null, 2);
                              const blob = new Blob([data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `embedding-jobs-${new Date().toISOString().split('T')[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Export Embedding Jobs (JSON)
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const data = JSON.stringify(crawlerHealth, null, 2);
                              const blob = new Blob([data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `crawler-health-${new Date().toISOString().split('T')[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Export Crawler Results (JSON)
                          </Button>
                        </div>
                        
                        <details className="border rounded-lg p-3">
                          <summary className="cursor-pointer font-medium text-sm">View Raw System Status (JSON)</summary>
                          <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                            {JSON.stringify({ 
                              cronStatus, 
                              embeddingJobs, 
                              crawlerHealth, 
                              systemStatus 
                            }, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'jurisdictions' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <MapPin className="h-6 w-6" />
                    Jurisdictions & Compliance Rules
                  </h2>
                  
                  <div className="space-y-6">
                    {/* Filter Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong className="flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Tip:
                        </strong> Use "View Details" to filter rules by topic and priority within each jurisdiction.
                      </p>
                    </div>
                    
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="jurisdiction-filter">Filter by Jurisdiction</Label>
                        <select
                          id="jurisdiction-filter"
                          value={jurisdictionFilter}
                          onChange={(e) => { setJurisdictionFilter(e.target.value); setJurisdictionPage(1); }}
                          className="w-full mt-1 p-2 border rounded-md text-sm"
                        >
                          <option value="">All Jurisdictions</option>
                          {jurisdictions?.map((j) => (
                            <option key={j.code} value={j.name}>{j.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="jurisdiction-search">Search</Label>
                        <input
                          id="jurisdiction-search"
                          type="text"
                          value={jurisdictionSearch}
                          onChange={(e) => { setJurisdictionSearch(e.target.value); setJurisdictionPage(1); }}
                          placeholder="Search by name, type..."
                          className="w-full mt-1 p-2 border rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="jurisdiction-page-size">Page Size</Label>
                        <select
                          id="jurisdiction-page-size"
                          value={jurisdictionPageSize}
                          onChange={(e) => { setJurisdictionPageSize(parseInt(e.target.value)); setJurisdictionPage(1); }}
                          className="w-full mt-1 p-2 border rounded-md text-sm"
                        >
                          {[10, 20, 50].map(s => (
                            <option key={s} value={s}>{s} per page</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Jurisdictions Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-medium text-sm">
                          Compliance Rules by Jurisdiction
                          {jurisdictionFilter && (
                            <span className="ml-2 text-gray-500">
                              (filtered by: {jurisdictionFilter})
                            </span>
                          )}
                        </h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-gray-50">
                            <tr>
                              <th className="text-left p-3 font-medium">Jurisdiction</th>
                              <th className="text-left p-3 font-medium">Type</th>
                              <th className="text-left p-3 font-medium">Rules</th>
                              <th className="text-left p-3 font-medium">Last Updated</th>
                              <th className="text-left p-3 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jurisdictions
                              ?.filter(j => !jurisdictionFilter || j.name === jurisdictionFilter)
                              ?.filter(j => !jurisdictionSearch ||
                                j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()) ||
                                j.type.toLowerCase().includes(jurisdictionSearch.toLowerCase())
                              )
                              ?.slice((jurisdictionPage - 1) * jurisdictionPageSize, jurisdictionPage * jurisdictionPageSize)
                              .map((jurisdiction) => (
                              <tr key={jurisdiction.code} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">{jurisdiction.name}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    jurisdiction.type === 'federal' ? 'bg-blue-100 text-blue-800' :
                                    jurisdiction.type === 'state' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {jurisdiction.type}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-medium">{jurisdiction.ruleCount}</span>
                                  <span className="text-gray-500 ml-1">rules</span>
                                </td>
                                <td className="p-3 text-gray-600">
                                  {jurisdiction.lastUpdated ? 
                                    new Date(jurisdiction.lastUpdated).toLocaleDateString() : 
                                    'N/A'
                                  }
                                </td>
                                <td className="p-3">
                                  <JurisdictionDetailsPopover
                                    trigger={
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View Details
                                      </Button>
                                    }
                                    jurisdiction={jurisdiction.name}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Summary + Pagination */}
                      <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <span>
                            {(() => {
                              const filtered = (jurisdictions || [])
                                .filter(j => !jurisdictionFilter || j.name === jurisdictionFilter)
                                .filter(j => !jurisdictionSearch || j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()) || j.type.toLowerCase().includes(jurisdictionSearch.toLowerCase()))
                              const total = filtered.length
                              const start = total === 0 ? 0 : (jurisdictionPage - 1) * jurisdictionPageSize + 1
                              const end = Math.min(jurisdictionPage * jurisdictionPageSize, total)
                              return `Showing ${start}-${end} of ${total} jurisdictions`
                            })()}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-2 py-1 border rounded disabled:opacity-50"
                              onClick={() => setJurisdictionPage(p => Math.max(1, p - 1))}
                              disabled={jurisdictionPage === 1}
                            >
                              Prev
                            </button>
                            <span className="px-2">
                              Page {jurisdictionPage}
                            </span>
                            <button
                              className="px-2 py-1 border rounded disabled:opacity-50"
                              onClick={() => {
                                const filtered = (jurisdictions || [])
                                  .filter(j => !jurisdictionFilter || j.name === jurisdictionFilter)
                                  .filter(j => !jurisdictionSearch || j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()) || j.type.toLowerCase().includes(jurisdictionSearch.toLowerCase()))
                                const totalPages = Math.max(1, Math.ceil(filtered.length / jurisdictionPageSize))
                                setJurisdictionPage(p => Math.min(totalPages, p + 1))
                              }}
                            >
                              Next
                            </button>
                          </div>
                          <span>
                            Total rules: {jurisdictions?.reduce((sum, j) => sum + j.ruleCount, 0) || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'templates' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Compliance Templates
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Manage legal counsel templates for compliance monitoring
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingTemplate({
                          topicKey: 'new',
                          topicName: 'New Template'
                        });
                        setShowTemplateEditor(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Template
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Search and Filter */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                          </div>
                          <Input
                            type="text"
                            placeholder="Search templates by name or topic..."
                            value={templateSearchQuery}
                            onChange={(e) => setTemplateSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {allTemplates?.length || 0} templates
                      </div>
                    </div>
                    
                    {/* Templates Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allTemplates
        ?.filter(template => 
          !templateSearchQuery || 
          template.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
          (template.topicKey && template.topicKey.toLowerCase().includes(templateSearchQuery.toLowerCase())) ||
          (template.description && template.description.toLowerCase().includes(templateSearchQuery.toLowerCase()))
        )
                        ?.map((template) => (
                        <div
                          key={template._id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">
                                {template.title}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {template.description || `Topic: ${template.topicKey || 'General'}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1" />
                          </div>
                          
                          <div className="text-xs text-gray-600 mb-3">
                            <div className="flex items-center justify-between">
                              <span>
                                {template.markdownContent.length} characters
                              </span>
                              <span>
                                Updated {new Date(template.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate({
                                  topicKey: template.topicKey || '',
                                  topicName: template.title,
                                  template: template
                                });
                                setShowTemplateEditor(true);
                              }}
                              className="flex-1 text-xs"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            
                            {!template.isDefault && (
                              <DeleteConfirmationPopover
                                trigger={
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                }
                                title="Delete Template"
                                description="This will permanently delete this compliance template. This action cannot be undone."
                                itemName={template.title}
                                onConfirm={async () => {
                                  await deleteTemplateAction({ templateId: template.templateId });
                                  addToast({
                                    title: "Template Deleted",
                                    description: `${template.title} template has been deleted`
                                  });
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Empty State */}
                    {(!allTemplates || allTemplates.length === 0) && (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No templates found</p>
                        <p className="text-sm mb-4">Create your first compliance template to get started</p>
                        <Button
                          onClick={() => {
                            setEditingTemplate({
                              topicKey: 'new',
                              topicName: 'New Template'
                            });
                            setShowTemplateEditor(true);
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Create Template
                        </Button>
                      </div>
                    )}
                    
                    {/* Filtered Empty State */}
                    {allTemplates && allTemplates.length > 0 && 
                     allTemplates.filter(template => 
                       !templateSearchQuery || 
                       template.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                       (template.topicKey && template.topicKey.toLowerCase().includes(templateSearchQuery.toLowerCase())) ||
                       (template.description && template.description.toLowerCase().includes(templateSearchQuery.toLowerCase()))
                     ).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No templates match your search</p>
                        <p className="text-xs mt-1">Try a different search term</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </MainContent>
      
      {/* Compliance Template Editor */}
      {showTemplateEditor && editingTemplate && (
        <ComplianceTemplateEditor
          isOpen={showTemplateEditor}
          onClose={() => {
            setShowTemplateEditor(false)
            setEditingTemplate(null)
          }}
          templateId={editingTemplate.template?.templateId}
          initialTemplate={editingTemplate.template ? {
            title: editingTemplate.template.title,
            description: editingTemplate.template.description,
            markdownContent: editingTemplate.template.markdownContent,
            topicKey: editingTemplate.template.topicKey,
            isDefault: editingTemplate.template.isDefault
          } : undefined}
          onSave={async (templateData) => {
            await upsertTemplate(templateData)
            addToast({
              title: "Template Saved",
              description: `${templateData.title} template has been saved successfully`
            });
          }}
        />
      )}
      
      <Footer />
    </Layout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}