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
import { Loader2, ArrowLeft, Mail, AlertCircle, Key, Copy, Plus, Webhook, CheckCircle, Check, HelpCircle, Clock, XCircle, ExternalLink, Bot, Info, Trash2, MessageCircle, Send, User, ThumbsUp, ThumbsDown, ArrowUp, ArrowDown, MapPin, Eye, FileText, Lightbulb } from 'lucide-react'
// Removed auth imports for single-user mode
// import { useConvexAuth } from "convex/react"
// import { useAuthActions } from "@convex-dev/auth/react"
import Link from 'next/link'
import { FirecrawlKeyManager } from '@/components/FirecrawlKeyManager'
import { validateEmailTemplate } from '@/lib/validateTemplate'
import { APP_CONFIG, getFromEmail } from '@/config/app.config'
import { DeleteConfirmationPopover } from '@/components/ui/delete-confirmation-popover'
import { JurisdictionDetailsPopover } from '@/components/ui/jurisdiction-details-popover'
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

function EmbeddedChatUI() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your RuleReady compliance assistant. Ask about minimum wage, harassment training, leave, posting, or other requirements.",
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  
  // Get compliance data for context
  const jurisdictions = useQuery(api.complianceQueries.getJurisdictions)
  const topics = useQuery(api.complianceQueries.getTopics)

  const formRef = useRef<HTMLFormElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  
  // Scroll to bottom function - like Vercel Chat SDK
  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    const el = listRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior
        })
      })
    }
  }

  // Check if user is near bottom of chat
  const checkScrollPosition = () => {
    const el = listRef.current
    if (el && messages.length > 1) {
      const { scrollTop, scrollHeight, clientHeight } = el
      // More sensitive threshold - show button if user scrolled up more than 50px from bottom
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      const shouldShowButton = distanceFromBottom > 50
      setShowScrollButton(shouldShowButton)
    } else {
      setShowScrollButton(false)
    }
  }

  // Add scroll event listener
  useEffect(() => {
    const el = listRef.current
    if (el) {
      el.addEventListener('scroll', checkScrollPosition, { passive: true })
      // Initial check
      checkScrollPosition()
      return () => el.removeEventListener('scroll', checkScrollPosition)
    }
  }, [messages.length]) // Re-attach when messages change

  useEffect(() => {
    // Auto-scroll to bottom on new messages - like Vercel Chat SDK
    scrollToBottom()
    setShowScrollButton(false) // Hide scroll button when auto-scrolling
    // Check scroll position after a brief delay to ensure content has rendered
    setTimeout(() => {
      checkScrollPosition()
    }, 100)
  }, [messages])

  // Also scroll when loading state changes (for real-time responses)
  useEffect(() => {
    if (!isLoading) {
      scrollToBottom()
      setShowScrollButton(false) // Hide scroll button when auto-scrolling
    }
  }, [isLoading])

  // Dynamic quick prompts based on selected filters
  const getQuickPrompts = () => {
    const basePrompts = [
      'What are the minimum wage requirements?',
      'What harassment training is required?',
      'What are the posting requirements?',
      'What leave policies apply?',
    ]
    
    if (selectedJurisdiction && selectedTopic) {
      const topicName = topics?.find(t => t.topicKey === selectedTopic)?.name || selectedTopic
      return [
        `What are the ${topicName.toLowerCase()} requirements in ${selectedJurisdiction}?`,
        `How does ${selectedJurisdiction} handle ${topicName.toLowerCase()}?`,
        `What are the penalties for ${topicName.toLowerCase()} violations in ${selectedJurisdiction}?`,
      ]
    } else if (selectedJurisdiction) {
      return [
        `What is the minimum wage in ${selectedJurisdiction}?`,
        `What are ${selectedJurisdiction}'s posting requirements?`,
        `What harassment training does ${selectedJurisdiction} require?`,
      ]
    } else if (selectedTopic) {
      const topicName = topics?.find(t => t.topicKey === selectedTopic)?.name || selectedTopic
      return [
        `What are the ${topicName.toLowerCase()} requirements?`,
        `Which states have the strictest ${topicName.toLowerCase()} rules?`,
        `What are common ${topicName.toLowerCase()} violations?`,
      ]
    }
    
    return basePrompts
  }

  const quickPrompts = getQuickPrompts()

  // Simple send message function
  const sendMessage = async (content: string) => {
    if (isLoading || !content.trim()) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    }
    
    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    // Scroll to bottom immediately after adding user message
    setTimeout(() => scrollToBottom(), 10)
    
    try {
      const response = await fetch('/api/compliance-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          jurisdiction: selectedJurisdiction,
          topic: selectedTopic,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to get response')
      }
      
      // Handle JSON response from Gemini
      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'No response received',
        sources: Array.isArray(data.sources) ? data.sources : [],
        settings: data.settings || undefined
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Scroll to bottom after adding assistant message
      setTimeout(() => scrollToBottom(), 10)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
      setTimeout(() => scrollToBottom(), 10)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const sendQuickPrompt = (q: string) => {
    sendMessage(q)
  }

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    }
  }

  return (
    <div className="bg-transparent">
      {/* Header status like demo */}
      <div className="px-4 py-3 border-b text-xs text-gray-600 flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <span className="relative inline-flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500"></span>
          </span>
          {isLoading ? 'Thinking…' : 'Ready'}
        </span>
      </div>

      {/* Filter Controls */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Jurisdiction Filter */}
            <div>
              <Label htmlFor="jurisdiction-filter" className="text-xs font-medium text-gray-700">
                Jurisdiction
              </Label>
              <select
                id="jurisdiction-filter"
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                className="w-full mt-1 p-2 text-xs border rounded-md bg-white"
              >
                <option value="">All Jurisdictions</option>
                {jurisdictions?.map((j) => (
                  <option key={j.code} value={j.name}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Filter */}
            <div>
              <Label htmlFor="topic-filter" className="text-xs font-medium text-gray-700">
                Topic
              </Label>
              <select
                id="topic-filter"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full mt-1 p-2 text-xs border rounded-md bg-white"
              >
                <option value="">All Topics</option>
                {topics?.slice(0, 15).map((t) => (
                  <option key={t.topicKey} value={t.topicKey}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Filters Display */}
          {(selectedJurisdiction || selectedTopic) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600">Filtering by:</span>
              {selectedJurisdiction && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  📍 {selectedJurisdiction}
                  <button
                    onClick={() => setSelectedJurisdiction('')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedTopic && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  <FileText className="h-3 w-3" />
                  {topics?.find(t => t.topicKey === selectedTopic)?.name || selectedTopic}
                  <button
                    onClick={() => setSelectedTopic('')}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="relative">
        <div ref={listRef} className="h-[520px] overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m) => (
          <div key={m.id}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-3 w-full ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                  {typeof m.content === 'string' ? (
                    <div className="compliance-chat-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-gray-900">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mt-3 mb-1 text-gray-800">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mt-2 mb-1 text-gray-800">{children}</h3>,
                          p: ({children}) => <p className="mb-2 leading-normal">{children}</p>,
                          ul: ({children}) => <ul className="mb-2 space-y-0.5 ml-4">{children}</ul>,
                          ol: ({children}) => <ol className="mb-2 space-y-0.5 ml-4">{children}</ol>,
                          li: ({children}) => <li className="leading-normal list-disc">{children}</li>,
                          strong: ({children}) => <strong className="font-bold text-gray-900">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    String(m.content)
                  )}
                  
                  {/* Sources display for assistant messages */}
                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-xs font-medium text-gray-600 mb-2">Sources (embedding matches)</div>
                      <ul className="space-y-1">
                        {m.sources.map((s) => (
                          <li key={s.id} className="text-xs text-gray-700">
                            <span className="font-mono mr-1">[{s.id}]</span>
                            {s.jurisdiction && <span className="mr-1">{s.jurisdiction}:</span>}
                            {s.topicLabel && <span className="mr-1">{s.topicLabel}</span>}
                            <span className="text-gray-500 mr-2">({Math.round((s.similarity || 0) * 100)}%)</span>
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a>
                            ) : (
                              <span className="text-gray-400">No URL</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Settings display for assistant messages */}
                  {m.role === 'assistant' && m.settings && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                          Response Settings Used
                        </summary>
                        <div className="mt-2 space-y-1 text-gray-600">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium">Model:</span> {m.settings.model}
                            </div>
                            <div>
                              <span className="font-medium">Sources Found:</span> {m.settings.sourcesFound}
                            </div>
                            <div>
                              <span className="font-medium">Jurisdiction:</span> {m.settings.jurisdiction}
                            </div>
                            <div>
                              <span className="font-medium">Topic:</span> {m.settings.topic}
                            </div>
                            <div>
                              <span className="font-medium">Compliance Context:</span> {m.settings.complianceContext ? 'Enabled' : 'Disabled'}
                            </div>
                            <div>
                              <span className="font-medium">Semantic Search:</span> {m.settings.semanticSearch ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="font-medium">System Prompt:</span>
                            <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono max-h-20 overflow-y-auto">
                              {m.settings.systemPrompt}
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Toolbar under assistant messages like demo */}
                          {m.role !== 'user' && (
                <div className="mt-2 pl-11 flex items-center gap-3 text-gray-500">
                  <button 
                    className={`inline-flex items-center gap-1 text-xs hover:text-gray-700 transition-colors ${
                      copiedMessageId === m.id ? 'text-green-600' : ''
                    }`} 
                    onClick={() => handleCopyMessage(String(m.content), m.id)} 
                    type="button"
                  >
                    {copiedMessageId === m.id ? (
                      <>
                        <Check className="h-3 w-3" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                  <span className="h-3 w-px bg-gray-200" />
                  <button className="inline-flex items-center text-xs hover:text-gray-700" type="button">
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button className="inline-flex items-center text-xs hover:text-gray-700" type="button">
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-2xl text-sm">
              <Bot className="h-4 w-4 text-gray-600" />
              <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
              <span className="text-gray-700">Thinking…</span>
            </div>
          </div>
        )}
        </div>
        
        {/* Scroll to bottom button - centered like Vercel Chat SDK */}
        {showScrollButton && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button
              onClick={() => {
                scrollToBottom('smooth')
                setShowScrollButton(false)
              }}
              size="sm"
              className="h-10 w-10 rounded-full p-0 shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all duration-200 hover:scale-105 relative"
              title="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
              {/* Small pulse indicator */}
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-400 rounded-full animate-pulse"></div>
            </Button>
          </div>
        )}
      </div>

      {/* Bottom composer like demo */}
      <form ref={formRef} onSubmit={handleSubmit} className="px-4 pb-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2 mb-2">
          {quickPrompts.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              type="button"
              onClick={() => sendQuickPrompt(q)}
              disabled={isLoading}
            >
              {q}
            </Button>
          ))}
        </div>
        <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border px-3 py-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!isLoading && input.trim()) {
                  formRef.current?.requestSubmit()
                }
              }
            }}
            rows={2}
            placeholder="Send a message…"
            disabled={isLoading}
            className="resize-none border-0 focus-visible:ring-0"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="h-9 w-9 rounded-full p-0">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
    </div>
  )
}

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
  
  const [activeSection, setActiveSection] = useState<'email' | 'webhooks' | 'firecrawl' | 'api' | 'ai' | 'ai-chat' | 'monitoring' | 'jurisdictions'>('email')
  
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
  const [defaultWebhook, setDefaultWebhook] = useState('')
  const [emailTemplate, setEmailTemplate] = useState('')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isUpdatingWebhook, setIsUpdatingWebhook] = useState(false)
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [webhookSuccess, setWebhookSuccess] = useState(false)
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
  const [webhookOnlyIfMeaningful, setWebhookOnlyIfMeaningful] = useState(false)
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
  
  // Query currentUser - it will return null if not authenticated
  // const currentUser = useQuery(api.users.getCurrentUser)
  
  // Handle query parameter navigation
  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'firecrawl') {
      setActiveSection('firecrawl')
    } else if (section === 'email') {
      setActiveSection('email')
    } else if (section === 'ai') {
      setActiveSection('ai')
    }
    
    // Handle verification success
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
                  onClick={() => setActiveSection('webhooks')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'webhooks'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Webhook className="h-4 w-4" />
                  Webhooks
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
                  onClick={() => setActiveSection('api')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'api'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Key className="h-4 w-4" />
                  Observer API Keys
                </button>
                <button
                  onClick={() => setActiveSection('ai')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'ai'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  AI Analysis
                </button>
                <button
                  onClick={() => setActiveSection('ai-chat')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'ai-chat'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  AI Chat Assistant
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
              
              {activeSection === 'webhooks' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">Webhooks</h2>
                  
                  <div className="space-y-8">
                    {/* Default Webhook Configuration */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Default Webhook URL</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="default-webhook">Default Webhook URL (Optional)</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="default-webhook"
                              type="url"
                              placeholder="https://your-webhook.com/endpoint"
                              value={defaultWebhook}
                              onChange={(e) => setDefaultWebhook(e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              variant="default" 
                              size="sm"
                              disabled={isUpdatingWebhook || defaultWebhook === (userSettings?.defaultWebhookUrl || '')}
                              onClick={async () => {
                                setIsUpdatingWebhook(true)
                                try {
                                  await updateDefaultWebhook({ 
                                    webhookUrl: defaultWebhook || undefined 
                                  })
                                  setWebhookSuccess(true)
                                  setTimeout(() => setWebhookSuccess(false), 3000)
                                } catch (error) {
                                  console.error('Failed to update webhook:', error)
                                } finally {
                                  setIsUpdatingWebhook(false)
                                }
                              }}
                            >
                              {isUpdatingWebhook ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : webhookSuccess ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            This webhook will be used as default for new monitors if not specified
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Webhook Playground */}
                    <div className="border-t pt-8">
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-black">
                        <Webhook className="h-5 w-5 text-purple-500" />
                        Webhook Playground
                      </h3>
                      
                      <div className="space-y-6">
                        {/* Webhook URL Section */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-black">Test Webhook Endpoint</h4>
                            <div className="relative group">
                              <HelpCircle className="h-5 w-5 text-gray-400 cursor-help" />
                              <div className="absolute right-0 mt-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                <div className="absolute -top-2 right-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-gray-900"></div>
                                <h4 className="font-medium mb-2">How to use the Webhook Playground</h4>
                                <ol className="space-y-1 list-decimal list-inside">
                                  <li>Copy the webhook URL below</li>
                                  <li>Go to your website settings and click the settings icon</li>
                                  <li>Select &quot;Webhook only&quot; or &quot;Email and Webhook&quot; as the notification type</li>
                                  <li>Paste the webhook URL and save</li>
                                  <li>When changes are detected, webhooks will appear here in real-time</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                          
                          {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
                            <div className="mb-4 p-4 border border-purple-200 rounded-lg">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">Localhost URLs won&apos;t work!</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Convex runs in the cloud and cannot access localhost. Use one of these options:
                                  </p>
                                  <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                                    <li>Use <a href="https://ngrok.com" target="_blank" className="underline font-medium">ngrok</a> to expose your local server: <code className="bg-gray-100 px-1 rounded">ngrok http {window.location.port || 3000}</code></li>
                                    <li>Deploy your app to Vercel, Netlify, or another hosting service</li>
                                    <li>Use a webhook testing service like <a href="https://webhook.site" target="_blank" className="underline font-medium">webhook.site</a></li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Input
                              value={typeof window !== 'undefined' ? `${window.location.origin}/api/test-webhook` : 'Loading...'}
                              readOnly
                              className="flex-1 font-mono text-sm"
                            />
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/api/test-webhook`)
                                setCopiedWebhook(true)
                                setTimeout(() => setCopiedWebhook(false), 2000)
                              }}
                            >
                              {copiedWebhook ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy URL
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Use this URL in your website notification settings to test webhook deliveries
                          </p>
                        </div>
                        
                        {/* Webhook Payloads List */}
                        <div className="border rounded-lg">
                          <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                            <h4 className="font-medium flex items-center gap-2">
                              Received Webhooks
                              {webhookPayloads && webhookPayloads.length > 0 && (
                                <span className="text-sm font-normal text-gray-500">
                                  ({webhookPayloads.length} total)
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-purple-600">
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                Live
                              </span>
                            </h4>
                            {webhookPayloads && webhookPayloads.length > 0 && (
                              <DeleteConfirmationPopover
                                trigger={
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Clear All
                                  </Button>
                                }
                                title="Clear All Webhooks"
                                description="This will permanently delete all received webhook payloads from the playground."
                                itemName={`${webhookPayloads.length} webhook payload${webhookPayloads.length !== 1 ? 's' : ''}`}
                                onConfirm={async () => await clearPayloads()}
                              />
                            )}
                          </div>

                          {!webhookPayloads || webhookPayloads.length === 0 ? (
                            <div className="p-12 text-center">
                              <Webhook className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">No webhooks received yet</p>
                              <p className="text-sm text-gray-400 mt-2">
                                Configure a website to use the webhook URL above and trigger a change
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y max-h-96 overflow-y-auto">
                              {webhookPayloads.map((payload) => (
                                <div 
                                  key={payload._id} 
                                  className="p-4 hover:bg-gray-50 transition-all"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                          {payload.status === 'success' ? (
                                            <CheckCircle className="h-5 w-5 text-black" />
                                          ) : (
                                            <XCircle className="h-5 w-5 text-purple-500" />
                                          )}
                                          <span className="font-medium text-sm">
                                            {payload.payload?.event || 'Webhook Event'}
                                          </span>
                                          <span className="text-sm text-gray-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {(() => {
                                              const seconds = Math.floor((Date.now() - payload.receivedAt) / 1000)
                                              if (seconds < 60) return 'Just now'
                                              if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
                                              if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
                                              return `${Math.floor(seconds / 86400)} days ago`
                                            })()}
                                          </span>
                                        </div>
                                        {payload.payload?.website?.url && (
                                          <a 
                                            href={payload.payload.website.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-black hover:text-gray-700 hover:underline flex items-center gap-1"
                                          >
                                            {payload.payload.website.url}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>

                                      {/* Compact JSON Payload */}
                                      <div className="mt-2">
                                        <div className="bg-gray-900 text-gray-100 rounded overflow-hidden text-xs">
                                          <div className="p-2">
                                            <pre className="whitespace-pre-wrap break-all">
                                              <code>
                                                {expandedPayload === payload._id 
                                                  ? JSON.stringify(payload.payload, null, 2)
                                                  : JSON.stringify(payload.payload).slice(0, 100) + '...'
                                                }
                                              </code>
                                            </pre>
                                          </div>
                                          <div className="px-2 pb-2">
                                            <Button
                                              variant="code"
                                              size="sm"
                                              className="h-6 px-2 text-xs"
                                              onClick={() => setExpandedPayload(
                                                expandedPayload === payload._id ? null : payload._id
                                              )}
                                            >
                                              {expandedPayload === payload._id ? 'Collapse' : 'Expand'}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
              
              {activeSection === 'api' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">Observer API Keys</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-gray-600 mb-4">
                        Observer API keys authenticate server-to-server requests to our Next.js API routes
                        (which proxy to Convex). They are used for automation and integrations (e.g., HRIS,
                        payroll, calendars, webhooks) to programmatically create/update monitors and fetch
                        compliance data. These keys are distinct from your Firecrawl Auth key (which powers
                        scraping) and never grant scraping privileges.
                      </p>
                      <div className="text-sm text-gray-500 mb-4">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Use in Authorization header as <code>Bearer &lt;observer_api_key&gt;</code></li>
                          <li>Scope: API access for monitor management and compliance endpoints</li>
                          <li>Best for backend jobs, webhooks, and client system integrations</li>
                          <li>Do not embed in frontend apps; keep keys in secure server env vars</li>
                        </ul>
                      </div>
                      
                      <Link href="/api-docs" className="text-purple-600 hover:text-orange-700 text-sm font-medium">
                        View API Documentation →
                      </Link>
                    </div>
                    
                    {/* Created API key alert */}
                    {createdApiKey && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">API Key Created</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Make sure to copy your API key now. You won&apos;t be able to see it again!
                        </p>
                        <div className="flex gap-2">
                          <code className="flex-1 p-2 bg-white border rounded text-xs font-mono">
                            {createdApiKey}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(createdApiKey)
                              setCreatedApiKey(null)
                            }}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* API Keys list */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Your API Keys</h3>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowNewApiKey(true)}
                          disabled={apiKeys && apiKeys.length >= 5}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create New Key
                        </Button>
                      </div>
                      
                      {showNewApiKey && (
                        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                          <div className="flex gap-2">
                            <Input
                              placeholder="API key name (e.g., Production)"
                              value={newApiKeyName}
                              onChange={(e) => setNewApiKeyName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateApiKey()}
                              className="flex-1"
                            />
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleCreateApiKey}
                              disabled={!newApiKeyName.trim()}
                            >
                              Create
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowNewApiKey(false)
                                setNewApiKeyName('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {apiKeys && apiKeys.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {apiKeys.map((key) => (
                            <div
                              key={key._id}
                              className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm">{key.name}</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteApiKey(key._id)}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-1 mb-2">
                                <code className="text-xs text-gray-500 font-mono flex-1 truncate">
                                  {key.keyPreview}
                                </code>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyApiKey(key.keyPreview, key._id)}
                                  className="h-6 w-6 p-0 border-0"
                                >
                                  {copiedKeyId === key._id ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(key.createdAt).toLocaleDateString()}
                                {key.lastUsed && (
                                  <span className="block">Used: {new Date(key.lastUsed).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Key className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No API keys yet</p>
                          <p className="text-xs mt-1">Create your first API key to get started</p>
                        </div>
                      )}
                      
                      {apiKeys && apiKeys.length >= 5 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Maximum of 5 API keys allowed per account
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'ai' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">AI Analysis Settings</h2>
                  
                  <div className="space-y-6">
                    {/* AI Enable Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">Enable AI Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Use AI to determine if website changes are meaningful or just noise
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={aiEnabled}
                          onChange={(e) => setAiEnabled(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>
                    
                    {aiEnabled && (
                      <>
                        {/* LLM Configuration */}
                        <div className="border rounded-lg p-6 space-y-6">
                          <h4 className="font-medium text-lg">LLM Configuration</h4>
                          
                          {/* API Key */}
                          <div>
                            <Label htmlFor="ai-api-key">API Key</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                id="ai-api-key"
                                type="password"
                                placeholder="sk-... or your provider's API key"
                                value={aiApiKey}
                                onChange={(e) => setAiApiKey(e.target.value)}
                                className="flex-1 font-mono"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  setIsTestingAI(true)
                                  setAiTestResult(null)
                                  try {
                                    // First save the settings
                                    await updateAISettings({
                                      enabled: true,
                                      model: aiModel,
                                      baseUrl: aiBaseUrl,
                                      systemPrompt: aiSystemPrompt,
                                      threshold: aiThreshold,
                                      apiKey: aiApiKey,
                                    })
                                    // Then test the connection
                                    const result = await testAIModel()
                                    setAiTestResult({
                                      success: result.success,
                                      message: result.success ? (result.message || 'Success') : (result.error || 'Test failed')
                                    })
                                  } catch (error) {
                                    setAiTestResult({
                                      success: false,
                                      message: (error as Error).message || 'Test failed'
                                    })
                                  } finally {
                                    setIsTestingAI(false)
                                  }
                                }}
                                disabled={!aiApiKey || isTestingAI}
                              >
                                {isTestingAI ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Test'
                                )}
                              </Button>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Your API key from OpenAI or any compatible provider
                            </p>
                            {aiTestResult && (
                              <div className={`mt-2 p-2 rounded text-sm ${
                                aiTestResult.success 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {aiTestResult.success ? '✅' : '❌'} {aiTestResult.message}
                              </div>
                            )}
                          </div>
                          
                          {/* Model */}
                          <div>
                            <Label htmlFor="ai-model">Model</Label>
                            <Input
                              id="ai-model"
                              type="text"
                              placeholder="gpt-4o-mini"
                              value={aiModel}
                              onChange={(e) => setAiModel(e.target.value)}
                              className="mt-1 font-mono"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              Model identifier (e.g., gpt-4o-mini, claude-4-sonnet, etc.)
                            </p>
                          </div>
                          
                          {/* Base URL */}
                          <div>
                            <Label htmlFor="ai-base-url">Base URL (Optional)</Label>
                            <Input
                              id="ai-base-url"
                              type="url"
                              placeholder="https://api.openai.com/v1"
                              value={aiBaseUrl}
                              onChange={(e) => setAiBaseUrl(e.target.value)}
                              className="mt-1 font-mono"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              Custom endpoint for OpenAI-compatible APIs. Leave empty for OpenAI.
                            </p>
                          </div>
                          
                          {/* Provider Examples */}
                          <div className="text-sm text-gray-600 space-y-1">
                            <p className="font-medium">Provider Examples:</p>
                            <ul className="space-y-1 ml-4">
                              <li>• <a href="https://platform.openai.com/api-keys" target="_blank" className="text-purple-600 hover:underline">OpenAI</a>: gpt-4o-mini</li>
                              <li>• <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-purple-600 hover:underline">Anthropic</a>: claude-4-sonnet</li>
                              <li>• <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-purple-600 hover:underline">Google</a>: gemini-2.5-flash-lite</li>
                              <li>• <a href="https://console.groq.com/keys" target="_blank" className="text-purple-600 hover:underline">Groq</a>: moonshotai/kimi-k2-instruct</li>
                              <li>• And more...</li>
                            </ul>
                          </div>
                        </div>
                        
                        {/* System Prompt */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="ai-prompt">System Prompt</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const defaultPrompt = `You are an AI assistant specialized in analyzing website changes. Your task is to determine if a detected change is "meaningful" or just noise.

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
                                setAiSystemPrompt(defaultPrompt)
                              }}
                            >
                              Use Default
                            </Button>
                          </div>
                          <Textarea
                            id="ai-prompt"
                            value={aiSystemPrompt}
                            onChange={(e) => setAiSystemPrompt(e.target.value)}
                            rows={10}
                            className="mt-1 font-mono text-xs min-h-[240px]"
                            placeholder="Enter your custom system prompt..."
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Customize how the AI analyzes changes. The AI will receive the diff and should return JSON.
                          </p>
                        </div>
                        
                        {/* Threshold Setting */}
                        <div>
                          <Label htmlFor="ai-threshold">Meaningful Change Threshold</Label>
                          <div className="flex items-center gap-4 mt-2">
                            <input
                              id="ai-threshold"
                              type="range"
                              min="0"
                              max="100"
                              value={aiThreshold}
                              onChange={(e) => setAiThreshold(parseInt(e.target.value))}
                              className="flex-1 accent-orange-500"
                            />
                            <div className="w-16 text-center">
                              <span className="text-lg font-medium text-purple-600">{aiThreshold}%</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Changes with AI scores above this threshold will be marked as meaningful
                          </p>
                        </div>
                        
                        {/* Info Box */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-600">
                              <p className="font-medium mb-1">How AI Analysis Works</p>
                              <ul className="space-y-1 list-disc list-inside">
                                <li>When a change is detected, the AI analyzes the diff</li>
                                <li>The AI assigns a score (0-100) based on meaningfulness</li>
                                <li>Changes above your threshold are marked as meaningful</li>
                                <li>You can filter the change log by meaningful changes only</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* AI-based Notification Filtering */}
                    {aiEnabled && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          AI-Based Notification Filtering
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Only send notifications when AI determines changes are meaningful
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <label className="text-sm font-medium">Email notifications only for meaningful changes</label>
                              <p className="text-xs text-gray-500">Skip email notifications for changes AI marks as noise</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={emailOnlyIfMeaningful}
                                onChange={(e) => setEmailOnlyIfMeaningful(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <label className="text-sm font-medium">Webhook notifications only for meaningful changes</label>
                              <p className="text-xs text-gray-500">Skip webhook notifications for changes AI marks as noise</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={webhookOnlyIfMeaningful}
                                onChange={(e) => setWebhookOnlyIfMeaningful(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button
                        variant="default"
                        onClick={async () => {
                          setIsUpdatingAI(true)
                          try {
                            await updateAISettings({
                              enabled: aiEnabled,
                              model: aiEnabled ? aiModel : undefined,
                              baseUrl: aiEnabled ? aiBaseUrl : undefined,
                              systemPrompt: aiEnabled ? aiSystemPrompt : undefined,
                              threshold: aiEnabled ? aiThreshold : undefined,
                              apiKey: aiEnabled ? aiApiKey : undefined,
                            })
                            
                            // Also update notification filtering settings
                            await updateNotificationFiltering({
                              emailOnlyIfMeaningful,
                              webhookOnlyIfMeaningful,
                            })
                            
                            setAiSuccess(true)
                            setTimeout(() => setAiSuccess(false), 3000)
                          } catch (error) {
                            console.error('Failed to update AI settings:', error)
                          } finally {
                            setIsUpdatingAI(false)
                          }
                        }}
                        disabled={isUpdatingAI}
                      >
                        {isUpdatingAI ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : aiSuccess ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          'Save AI Settings'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'ai-chat' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <MessageCircle className="h-6 w-6" />
                    AI Chat Assistant
                  </h2>
                  
                  <div className="space-y-6">
                    {/* Chat Configuration */}
                    <div>
                      <h3 className="font-medium mb-4">Chat Configuration</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Model Selection */}
                        <div>
                          <Label htmlFor="chat-model">AI Model</Label>
                          <select
                            id="chat-model"
                            value={chatModel}
                            onChange={(e) => setChatModel(e.target.value)}
                            className="w-full mt-1 p-2 border rounded"
                          >
                            <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Recommended)</option>
                            <option value="gemini-pro">Gemini Pro</option>
                            <option value="gpt-4">GPT-4</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Gemini 2.0 Flash provides fast, accurate compliance analysis
                          </p>
                        </div>
                        
                        {/* Context Reports */}
                        <div>
                          <Label htmlFor="max-reports">Max Reports per Query</Label>
                          <Input
                            id="max-reports"
                            type="number"
                            min="1"
                            max="20"
                            value={maxContextReports}
                            onChange={(e) => setMaxContextReports(Number(e.target.value))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            How many relevant reports to include in AI context
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* System Prompt */}
                    <div>
                      <Label htmlFor="chat-prompt">Chat System Prompt</Label>
                      <Textarea
                        id="chat-prompt"
                        value={chatSystemPrompt}
                        onChange={(e) => setChatSystemPrompt(e.target.value)}
                        rows={4}
                        placeholder="You are a professional compliance assistant..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Customize how the AI assistant behaves and responds to compliance questions
                      </p>
                    </div>
                    
                    {/* Compliance Data Settings */}
                    <div>
                      <h4 className="font-medium mb-3">Compliance Data Integration</h4>
                      
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={enableComplianceContext}
                            onChange={(e) => setEnableComplianceContext(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Use compliance reports as context</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={enableSemanticSearch}
                            onChange={(e) => setEnableSemanticSearch(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Enable semantic search with embeddings</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Template Information */}
                    <div>
                      <h4 className="font-medium mb-3">Compliance Template Structure</h4>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <h5 className="font-medium text-blue-900 mb-2">16 Template Sections Used:</h5>
                        <div className="grid grid-cols-2 gap-1 text-xs text-blue-800">
                          <div>• Overview</div>
                          <div>• Covered Employers</div>
                          <div>• Covered Employees</div>
                          <div>• Training Requirements</div>
                          <div>• Training Deadlines</div>
                          <div>• Qualified Trainers</div>
                          <div>• Special Requirements</div>
                          <div>• Coverage Election</div>
                          <div>• Reciprocity Coverage</div>
                          <div>• Employer Deadlines</div>
                          <div>• Notification Requirements</div>
                          <div>• Posting Requirements</div>
                          <div>• Recordkeeping Requirements</div>
                          <div>• Penalties</div>
                          <div>• Sources</div>
                          <div>• + Custom Sections</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Embedded Chat UI */}
                    <EmbeddedChatUI />
                    
                    {/* Save Settings */}
                    <div className="flex justify-end">
                      <Button
                        onClick={async () => {
                          setIsUpdatingChat(true)
                          try {
                            await updateChatSettings({
                              chatSystemPrompt,
                              chatModel,
                              enableComplianceContext,
                              maxContextReports,
                              enableSemanticSearch,
                            })
                            setChatSuccess(true)
                            setTimeout(() => setChatSuccess(false), 3000)
                          } catch (error) {
                            console.error('Failed to update chat settings:', error)
                          } finally {
                            setIsUpdatingChat(false)
                          }
                        }}
                        disabled={isUpdatingChat}
                      >
                        {isUpdatingChat ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : chatSuccess ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          'Save Chat Settings'
                        )}
                      </Button>
                    </div>
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
                          onChange={(e) => setJurisdictionFilter(e.target.value)}
                          className="w-full mt-1 p-2 border rounded-md text-sm"
                        >
                          <option value="">All Jurisdictions</option>
                          {jurisdictions?.map((j) => (
                            <option key={j.code} value={j.name}>{j.name}</option>
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
                      
                      {/* Summary */}
                      <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600">
                        <div className="flex justify-between items-center">
                          <span>
                            Showing {jurisdictions?.filter(j => !jurisdictionFilter || j.name === jurisdictionFilter).length || 0} jurisdictions
                          </span>
                          <span>
                            Total: {jurisdictions?.reduce((sum, j) => sum + j.ruleCount, 0) || 0} compliance rules
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </MainContent>
      
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