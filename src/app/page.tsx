'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/layout/hero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Clock, ExternalLink, LogIn, X, Play, Pause, Globe, RefreshCw, Search, ChevronLeft, ChevronRight, Maximize2, Minimize2, Bot, Eye, Info, FileText, Monitor, File, CheckCircle2, MessageCircle, User, ThumbsUp, ThumbsDown, ArrowUp, ArrowDown, Copy, Check, Newspaper, Save, Edit, Plus } from 'lucide-react'
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useRouter } from 'next/navigation'
import { WebhookConfigModal } from '@/components/WebhookConfigModal'

import { APP_CONFIG } from '@/config/app.config'
import { validateEmail, validatePassword } from '@/lib/validation'
import { useToast } from '@/hooks/use-toast'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { TopicBadge } from '@/components/ComplianceInfo'
import { Tooltip } from '@/components/ui/tooltip'
import { ComplianceGuide } from '@/components/ComplianceGuide'
import { DeleteConfirmationPopover } from '@/components/ui/delete-confirmation-popover'
import { ChangeTrackingPopover } from '@/components/ui/change-tracking-popover'
import { ComplianceTemplateEditor } from '@/components/ComplianceTemplateEditor'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

// Helper function to format interval display
function formatInterval(minutes: number | undefined): string {
  if (!minutes || minutes === 0) return 'Not set';
  if (minutes < 1) return `${Math.round(minutes * 60)} seconds`;
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return '1 hour';
  if (minutes < 1440) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${Math.floor(hours)} hours`;
  }
  const days = minutes / 1440;
  return days === 1 ? '1 day' : `${Math.floor(days)} days`;
}

// Helper function to get favicon URL with fallback
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    // Use Google's favicon service (most reliable)
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '/ruleready-icon.svg'; // Use local fallback
  }
}


// Helper function to clean website name by removing priority prefixes
function cleanWebsiteName(name: string): string {
  // Remove priority prefixes like [CRITICAL], [HIGH], [MEDIUM], [LOW], [TEST]
  return name.replace(/^\[(CRITICAL|HIGH|MEDIUM|LOW|TEST)\]\s*/, '');
}

export default function HomePage() {
  const { addToast } = useToast()
  const router = useRouter()
  
  // Single-user mode - no authentication required
  const isAuthenticated = true
  const authLoading = false
  
  // Auth state
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [helperText, setHelperText] = useState('')
  
  // Website monitoring state
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isMonitoringOnce, setIsMonitoringOnce] = useState(false)
  
  // Convex queries - now working with proper environment variable
  const websitesQuery = useQuery(api.websites.getUserWebsites)
  const allScrapeHistoryQuery = useQuery(api.websites.getAllScrapeHistory)
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  const templatesQuery = useQuery(api.complianceTemplates.getActiveTemplates)
  
  // Use fallback empty arrays to prevent loading states when query returns undefined
  const websites = websitesQuery || []
  const allScrapeHistory = allScrapeHistoryQuery || []
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  const templates = templatesQuery || []

  const createWebsite = useMutation(api.websites.createWebsite)
  const deleteWebsite = useMutation(api.websites.deleteWebsite)
  const pauseWebsite = useMutation(api.websites.pauseWebsite)
  const updateWebsite = useMutation(api.websites.updateWebsite)
  const upsertTemplate = useMutation(api.complianceTemplates.upsertTemplate)
  const saveResearch = useMutation(api.savedResearch.saveResearch)
  const updateSavedResearch = useMutation(api.savedResearch.updateSavedResearch)
  const triggerScrape = useAction(api.firecrawl.triggerScrape)
  const crawlWebsite = useAction(api.firecrawl.crawlWebsite)
  const chatSettings = useQuery(api.chatSettings.getChatSettings)
  const updateChatSettings = useMutation(api.chatSettings.updateChatSettings)

  // Track scrape results
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null)
  const [viewingSpecificScrape, setViewingSpecificScrape] = useState<string | null>(null)
  const [checkLogFilter, setCheckLogFilter] = useState<'all' | 'changed' | 'meaningful'>('all')
  const [processingWebsites, setProcessingWebsites] = useState<Set<string>>(new Set())
  const [deletingWebsites, setDeletingWebsites] = useState<Set<string>>(new Set())
  const [newlyCreatedWebsites, setNewlyCreatedWebsites] = useState<Set<string>>(new Set())
  const [showAddedLines, setShowAddedLines] = useState(true)
  const [showRemovedLines, setShowRemovedLines] = useState(true)
  const [onlyShowDiff, setOnlyShowDiff] = useState(true)
  
  // Pagination states
  const [websitesPage, setWebsitesPage] = useState(1)
  const [changesPage, setChangesPage] = useState(1)
  const [modalWebsitesPage, setModalWebsitesPage] = useState(1)
  const ITEMS_PER_PAGE_WEBSITES = 5
  const ITEMS_PER_PAGE_CHANGES = 10
  const ITEMS_PER_PAGE_MODAL = 10 // For expanded modal
  
  // Expanded panel state
  const [expandedPanel, setExpandedPanel] = useState<'websites' | 'changes' | null>(null)
  
  // Webhook configuration modal state
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null)
  const [pendingWebsite, setPendingWebsite] = useState<{
    url: string
    name: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [changesSearchQuery, setChangesSearchQuery] = useState('')
  
  // Compliance filtering state
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  
  
  // Modal filter states
  const [modalSelectedJurisdiction, setModalSelectedJurisdiction] = useState<string>('')
  const [modalSelectedPriority, setModalSelectedPriority] = useState<string>('')
  const [modalSelectedTopic, setModalSelectedTopic] = useState<string>('')
  const [modalSelectedStatus, setModalSelectedStatus] = useState<string>('')
  
  
  // Bulk selection state
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<Set<string>>(new Set())
  
  // Advanced add website form state
  const [monitoringMode, setMonitoringMode] = useState<'once' | 'scheduled'>('once') // New: monitoring mode switch
  const [enableAiAnalysis, setEnableAiAnalysis] = useState(true)
  const [isComplianceSite, setIsComplianceSite] = useState(false)
  const [selectedPriorityLevel, setSelectedPriorityLevel] = useState<'critical' | 'high' | 'medium' | 'low'>('medium')
  const [checkInterval, setCheckInterval] = useState(1440) // Default to 1 day
  const [monitorType, setMonitorType] = useState<'single' | 'full_site'>('single')
  const [maxPages, setMaxPages] = useState(10)
  const [maxCrawlDepth, setMaxCrawlDepth] = useState(2)
  const [complianceTemplate, setComplianceTemplate] = useState('')
  
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
  
  // Template editor state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    topicKey: string
    topicName: string
  } | null>(null)
  
  // Firecrawl options state - v1 compatible (parsers removed for API compatibility)
  const [firecrawlConfig, setFirecrawlConfig] = useState(() => {
    return JSON.stringify({
      formats: ["markdown", "links"],
      onlyMainContent: false,
      waitFor: 2000,
      maxAge: 172800000,
      removeBase64Images: true,
    }, null, 2)
  })
  
  // AI Analysis settings state
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [aiSystemPrompt, setAiSystemPrompt] = useState(`Analyze website changes and determine if they are meaningful for compliance monitoring.

Focus on detecting:
- Legal requirement changes
- Deadline modifications
- Rate or threshold updates
- Policy changes
- New regulations or amendments
- Enforcement updates

Ignore:
- Minor formatting changes
- Navigation updates
- Cosmetic modifications
- Temporary notices
- Marketing content changes

Provide a meaningful change score (0-1) and reasoning for the assessment.`)
  const [meaningfulChangeThreshold, setMeaningfulChangeThreshold] = useState(70) // Store as percentage (70%)
  
  
  // Add website section visibility
  const [showAddWebsiteSection, setShowAddWebsiteSection] = useState(false)
  
  // AI Chat section visibility
  const [showAiChatSection, setShowAiChatSection] = useState(false)
  const [showChatConfig, setShowChatConfig] = useState(false)
  
  // AI Chat state
  const [chatSelectedJurisdiction, setChatSelectedJurisdiction] = useState('')
  const [chatSelectedTopic, setChatSelectedTopic] = useState('')
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
  
  // Chat configuration state - NO DEFAULTS, loaded from database only
  const [chatModel, setChatModel] = useState('')
  const [maxContextReports, setMaxContextReports] = useState(5)
  const [chatSystemPrompt, setChatSystemPrompt] = useState('')
  const [enableComplianceContext, setEnableComplianceContext] = useState(true)
  const [enableSemanticSearch, setEnableSemanticSearch] = useState(true)
  const [isUpdatingChat, setIsUpdatingChat] = useState(false)
  const [chatSuccess, setChatSuccess] = useState(false)
  
  // Chat refs
  const formRef = useRef<HTMLFormElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  
  // Compliance Research state (chat-style)
  const [showResearchSection, setShowResearchSection] = useState(false)
  const [showResearchSettings, setShowResearchSettings] = useState(false)
  const [researchQuery, setResearchQuery] = useState('')
  const [researchMessages, setResearchMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    scrapedUrlSources?: any[]
    internalSources?: any[]
    webSources?: any[]
    newsResults?: any[]
    imageResults?: any[]
  }>>([])
  const [researchFollowUpQuestions, setResearchFollowUpQuestions] = useState<string[]>([])
  const [isResearching, setIsResearching] = useState(false)
  const [researchJurisdiction, setResearchJurisdiction] = useState('')
  const [researchTopic, setResearchTopic] = useState('')
  const [selectedResearchTemplate, setSelectedResearchTemplate] = useState<string>('')
  const researchListRef = useRef<HTMLDivElement | null>(null)
  const [copiedResearchMessageId, setCopiedResearchMessageId] = useState<string | null>(null)
  
  // Save research modal state
  const [showSaveResearchModal, setShowSaveResearchModal] = useState(false)
  const [savingResearchMessage, setSavingResearchMessage] = useState<any>(null)
  const [savedResearchTitle, setSavedResearchTitle] = useState('')
  const [savedResearchContent, setSavedResearchContent] = useState('')
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  
  // Research URL scraping state
  const [researchUrls, setResearchUrls] = useState<string[]>(['']) // Start with one empty field
  const [researchUrlValidation, setResearchUrlValidation] = useState<{[index: number]: { isValid: boolean | null, isValidating: boolean, message: string }}>({})
  const [showAdvancedResearchOptions, setShowAdvancedResearchOptions] = useState(false)
  const MAX_RESEARCH_URLS = 5
  
  // Research configuration state
  const [researchSystemPrompt, setResearchSystemPrompt] = useState(`You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Provide accurate, authoritative information about employment law.
Cite sources using inline [1], [2], [3] format.
Distinguish between federal and state requirements.
Mention effective dates when relevant.
Note penalties or deadlines when applicable.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`)
  const [researchFirecrawlConfig, setResearchFirecrawlConfig] = useState(() => {
    return JSON.stringify({
      sources: ['web', 'news', 'images'],
      limit: 8,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
        maxAge: 86400000
      }
    }, null, 2)
  })
  
  // Refs to track previous settings state and prevent duplicate messages
  const prevComplianceContextRef = useRef<boolean | null>(null)
  const prevSemanticSearchRef = useRef<boolean | null>(null)
  const lastSystemMessageRef = useRef<string | null>(null)
  
  // Scroll to bottom function - like Vercel Chat SDK
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    const el = listRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior
        })
      })
    }
  }, [])

  // Check if user is near bottom of chat
  const checkScrollPosition = useCallback(() => {
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
  }, [messages.length])

  // Add scroll event listener
  useEffect(() => {
    const el = listRef.current
    if (el) {
      el.addEventListener('scroll', checkScrollPosition, { passive: true })
      // Initial check
      checkScrollPosition()
      return () => el.removeEventListener('scroll', checkScrollPosition)
    }
  }, [messages.length, checkScrollPosition]) // Re-attach when messages change

  // Helper function to add system messages safely without duplicates
  const addSystemMessage = useCallback((messageType: string, content: string) => {
    const messageKey = `${messageType}-${Date.now()}`
    
    // Prevent duplicate messages by checking if we just added a similar one
    if (lastSystemMessageRef.current !== messageType) {
      const systemMessage: ChatMessage = {
        id: `${messageKey}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content
      }
      setMessages(prev => [...prev, systemMessage])
      setTimeout(() => scrollToBottom(), 10)
      lastSystemMessageRef.current = messageType
      
      // Clear the last message type after a delay to allow future messages
      setTimeout(() => {
        if (lastSystemMessageRef.current === messageType) {
          lastSystemMessageRef.current = null
        }
      }, 2000)
    }
  }, [scrollToBottom])

  useEffect(() => {
    // Auto-scroll to bottom on new messages - like Vercel Chat SDK
    scrollToBottom()
    setShowScrollButton(false) // Hide scroll button when auto-scrolling
    // Check scroll position after a brief delay to ensure content has rendered
    setTimeout(() => {
      checkScrollPosition()
    }, 100)
  }, [messages, checkScrollPosition, scrollToBottom])

  // Also scroll when loading state changes (for real-time responses)
  useEffect(() => {
    if (!isLoading) {
      scrollToBottom()
      setShowScrollButton(false) // Hide scroll button when auto-scrolling
    }
  }, [isLoading, scrollToBottom])

  // Dynamic quick prompts based on selected filters
  const getQuickPrompts = () => {
    const basePrompts = [
      'What are the minimum wage requirements?',
      'What harassment training is required?',
      'What are the posting requirements?',
      'What leave policies apply?',
    ]
    
    if (chatSelectedJurisdiction && chatSelectedTopic) {
      const topicName = topics?.find(t => t.topicKey === chatSelectedTopic)?.name || chatSelectedTopic
      return [
        `What are the ${topicName.toLowerCase()} requirements in ${chatSelectedJurisdiction}?`,
        `How does ${chatSelectedJurisdiction} handle ${topicName.toLowerCase()}?`,
        `What are the penalties for ${topicName.toLowerCase()} violations in ${chatSelectedJurisdiction}?`,
      ]
    } else if (chatSelectedJurisdiction) {
      return [
        `What is the minimum wage in ${chatSelectedJurisdiction}?`,
        `What are ${chatSelectedJurisdiction}'s posting requirements?`,
        `What harassment training does ${chatSelectedJurisdiction} require?`,
      ]
    } else if (chatSelectedTopic) {
      const topicName = topics?.find(t => t.topicKey === chatSelectedTopic)?.name || chatSelectedTopic
      return [
        `What are the ${topicName.toLowerCase()} requirements?`,
        `Which states have the strictest ${topicName.toLowerCase()} rules?`,
        `What are common ${topicName.toLowerCase()} violations?`,
      ]
    }
    
    return basePrompts
  }

  const quickPrompts = getQuickPrompts()

  // Send message function
  const sendMessage = async (content: string) => {
    if (isLoading || !content.trim()) return
    
    // Check if both context options are disabled
    if (!enableComplianceContext && !enableSemanticSearch) {
      addSystemMessage(
        'send-warning',
        `⚠️ **Cannot Answer Compliance Questions**\n\nI cannot provide accurate compliance answers because both data sources are disabled:\n\n❌ Compliance Context: Disabled\n❌ Semantic Search: Disabled\n\nTo get compliance assistance, please enable at least one option in the **Chat Configuration** section above. I can then help you with employment law questions using our comprehensive compliance database.`
      )
      return
    }
    
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
          jurisdiction: chatSelectedJurisdiction,
          topic: chatSelectedTopic,
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
  
  const handleCopyResearchMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedResearchMessageId(messageId)
      setTimeout(() => setCopiedResearchMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy research message:', error)
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedResearchMessageId(messageId)
      setTimeout(() => setCopiedResearchMessageId(null), 2000)
    }
  }
  
  // Validate research URLs with debounce
  const validateResearchUrl = async (url: string, index: number) => {
    if (!url.trim()) {
      setResearchUrlValidation(prev => ({
        ...prev,
        [index]: { isValid: null, isValidating: false, message: '' }
      }))
      return
    }

    setResearchUrlValidation(prev => ({
      ...prev,
      [index]: { isValid: null, isValidating: true, message: 'Validating...' }
    }))

    try {
      // Basic URL format validation
      let processedUrl = url.trim()
      if (!processedUrl.match(/^https?:\/\//)) {
        processedUrl = 'https://' + processedUrl
      }
      
      const urlObj = new URL(processedUrl)
      
      // Check if it's a PDF
      const isPdf = processedUrl.toLowerCase().endsWith('.pdf')
      
      // Simple validation - just check URL format
      setResearchUrlValidation(prev => ({
        ...prev,
        [index]: { 
          isValid: true, 
          isValidating: false, 
          message: isPdf ? '✓ PDF detected' : '✓ Valid URL' 
        }
      }))
    } catch (e) {
      setResearchUrlValidation(prev => ({
        ...prev,
        [index]: { isValid: false, isValidating: false, message: 'Invalid URL format' }
      }))
    }
  }
  
  // Debounced URL validation
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    
    researchUrls.forEach((url: string, index: number) => {
      if (url.trim()) {
        const timer = setTimeout(() => {
          validateResearchUrl(url, index)
        }, 800)
        timers.push(timer)
      }
    })
    
    return () => timers.forEach(timer => clearTimeout(timer))
  }, [researchUrls])
  
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

    // Basic URL format validation
    try {
      const url = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`)
      
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
        body: JSON.stringify({ url: url.toString() }),
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
      if (url.trim()) {
        validateUrl(url)
      }
    }, 1000) // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId)
  }, [url])
  
  // Update firecrawl config when settings change (v1 API compatible)
  useEffect(() => {
    const config: Record<string, unknown> = {
      formats: ["markdown", "links"],
      onlyMainContent: false,
      waitFor: 2000,
      maxAge: 172800000, // 48 hours cache
      removeBase64Images: true
    }
    
    if (monitorType === 'full_site') {
      config.limit = maxPages
      config.maxDepth = maxCrawlDepth
    }
    
    setFirecrawlConfig(JSON.stringify(config, null, 2))
  }, [monitorType, maxPages, maxCrawlDepth])
  
  
  // Auto-adjust frequency based on priority (following documented system logic)
  useEffect(() => {
    let adjustedInterval: number
    
    if (selectedPriorityLevel === "critical") {
      adjustedInterval = 1440 // Daily (24 hours)
    } else if (selectedPriorityLevel === "high") {
      adjustedInterval = 2880 // Every 2 days (48 hours)
    } else if (selectedPriorityLevel === "medium") {
      adjustedInterval = 10080 // Weekly (7 days)
    } else if (selectedPriorityLevel === "low") {
      adjustedInterval = 43200 // Monthly (30 days)
    } else {
      adjustedInterval = 1440 // Default to daily
    }
    
    setCheckInterval(adjustedInterval)
  }, [selectedPriorityLevel])
  
  // Load chat settings from database - NO FALLBACK DEFAULTS
  useEffect(() => {
    if (chatSettings) {
      setChatSystemPrompt(chatSettings.chatSystemPrompt ?? '')
      setChatModel(chatSettings.chatModel ?? '')
      setEnableComplianceContext(!!chatSettings.enableComplianceContext)
      setMaxContextReports(chatSettings.maxContextReports ?? 5)
      setEnableSemanticSearch(!!chatSettings.enableSemanticSearch)
    }
  }, [chatSettings])
  
  // Add system messages when compliance settings actually change (not on every render)
  useEffect(() => {
    // Only add message if this is an actual change (not initial load)
    if (prevComplianceContextRef.current !== null && prevComplianceContextRef.current !== enableComplianceContext) {
      addSystemMessage(
        'compliance-context',
        `**Settings Updated**\n\nCompliance context: ${enableComplianceContext ? '✅ Enabled' : '❌ Disabled'}\n\nI ${enableComplianceContext ? 'will now use' : 'will no longer use'} compliance reports to provide more accurate, context-aware responses about employment law requirements.`
      )
    }
    // Update ref to current value
    prevComplianceContextRef.current = enableComplianceContext
  }, [enableComplianceContext, addSystemMessage])
  
  useEffect(() => {
    // Only add message if this is an actual change (not initial load)
    if (prevSemanticSearchRef.current !== null && prevSemanticSearchRef.current !== enableSemanticSearch) {
      addSystemMessage(
        'semantic-search',
        `**Settings Updated**\n\nSemantic search: ${enableSemanticSearch ? '✅ Enabled' : '❌ Disabled'}\n\nI ${enableSemanticSearch ? 'will now use' : 'will no longer use'} advanced embedding-based search to find the most relevant compliance information for your questions.`
      )
    }
    // Update ref to current value
    prevSemanticSearchRef.current = enableSemanticSearch
  }, [enableSemanticSearch, addSystemMessage])
  
  // Add warning message when both context and embedding are disabled
  useEffect(() => {
    if (!enableComplianceContext && !enableSemanticSearch) {
      // Only add if both were just disabled or if this is a new state
      const shouldAddWarning = (
        (prevComplianceContextRef.current === true && !enableComplianceContext) ||
        (prevSemanticSearchRef.current === true && !enableSemanticSearch)
      )
      
      if (shouldAddWarning) {
        addSystemMessage(
          'both-disabled-warning',
          `⚠️ **Limited Functionality Warning**\n\nBoth compliance context and semantic search are currently disabled. To provide accurate compliance answers, I need at least one of these enabled:\n\n• **Compliance Context** - Uses compliance reports database\n• **Semantic Search** - Uses advanced embedding search\n\nPlease enable at least one option in the Chat Configuration above for better compliance assistance.`
        )
      }
    }
  }, [enableComplianceContext, enableSemanticSearch, addSystemMessage])
  
  // Get latest scrape for each website
  const latestScrapes = useQuery(api.websites.getLatestScrapeForWebsites)
  
  // Get all scrape results for check log
  // Removed: using direct fetch instead of useQuery
  
  

  
  // Get compliance filter data - using direct fetch instead of useQuery
  
  // Single-user mode: Check if setup is needed and auto-create websites
  const setupStatus = useQuery(api.singleUserSetup.needsSetup)
  const createAllWebsites = useMutation(api.singleUserSetup.createAllComplianceWebsites)
  
  // AUTO-SETUP DISABLED - Uncomment to enable automatic website creation
  // useEffect(() => {
  //   if (setupStatus?.needsSetup) {
  //     createAllWebsites()
  //       .then((result) => {
  //         addToast({
  //           title: "Setup Complete",
  //           description: `${result.created} compliance websites created and ready for monitoring`,
  //         });
  //       })
  //       .catch(() => {
  //         addToast({
  //           title: "Setup Error",
  //           description: "Failed to create compliance websites. Please try refreshing the page.",
  //           variant: "error",
  //         });
  //       });
  //   }
  // }, [setupStatus?.needsSetup, createAllWebsites, addToast])

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingSpecificScrape) {
          setViewingSpecificScrape(null)
        }
        if (showWebhookModal) {
          setShowWebhookModal(false)
          setEditingWebsiteId(null)
          setPendingWebsite(null)
        }
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [viewingSpecificScrape, showWebhookModal])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)

    // Trim email before validation and use
    const trimmedEmail = email.trim()
    
    // Validate email format first
    const emailValidation = validateEmail(trimmedEmail)
    if (!emailValidation.isValid) {
      addToast({
        variant: 'error',
        title: 'Invalid Email',
        description: emailValidation.error || 'Please enter a valid email address',
        duration: 4000
      })
      setIsAuthenticating(false)
      return
    }

    // Validate password
    const passwordValidation = validatePassword(password, authMode)
    if (!passwordValidation.isValid) {
      addToast({
        variant: 'error',
        title: 'Invalid Password',
        description: passwordValidation.error || 'Please check your password requirements',
        duration: 4000
      })
      setIsAuthenticating(false)
      return
    }

    try {
      // Single-user mode - no authentication needed
      // Clear form on successful auth
      setEmail('')
      setPassword('')
      setHelperText('')
      // Show success message
      addToast({
        variant: 'success',
        title: authMode === 'signIn' ? 'Welcome Back!' : 'Account Created!',
        description: authMode === 'signIn' 
          ? 'You have successfully signed in.' 
          : 'Your account has been created successfully.',
        duration: 3000
      })
      
      // Force a router refresh to ensure auth state is updated
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (error: unknown) {
      // Check for InvalidAccountId in various ways
        const errorMessage = (error as Error).message || String(error) || '';
      const errorLower = errorMessage.toLowerCase();
      
      // More comprehensive invalid account detection
      const isInvalidAccount = errorLower.includes('invalidaccountid') || 
                              errorLower.includes('invalid account') ||
                              errorLower.includes('no account') ||
                              errorLower.includes('account not found') ||
                              errorLower.includes('user not found') ||
                              errorLower.includes('does not exist');
      
      // Check for existing account errors
      const isExistingAccount = errorLower.includes('already exists') || 
                               errorLower.includes('already registered') ||
                               errorLower.includes('account exists') ||
                               errorLower.includes('email already');
      
      // Check for password errors
      const isPasswordError = errorLower.includes('password') || 
                             errorLower.includes('credentials') ||
                             errorLower.includes('authentication failed');
      
      if (isInvalidAccount && authMode === 'signIn') {
        // Auto-switch to signup mode for unregistered users
        setAuthMode('signUp')
        setPassword('') // Clear password for security
        setHelperText('No account found. Enter a password to create one.')
        setIsAuthenticating(false)
        return
      } else if (isExistingAccount && authMode === 'signUp') {
        setAuthMode('signIn')
        setHelperText('Account already exists. Enter your password to sign in.')
        setIsAuthenticating(false)
        return
      } else if (isPasswordError) {
        if (authMode === 'signIn') {
          addToast({
            variant: 'error',
            title: 'Authentication Failed',
            description: 'The password you entered is incorrect. Please try again.',
            duration: 4000
          })
        } else {
          addToast({
            variant: 'error',
            title: 'Account Creation Failed',
            description: 'Unable to create your account. Please check your password and try again.',
            duration: 4000
          })
        }
      } else if (errorLower.includes('network') || errorLower.includes('connection')) {
        addToast({
          variant: 'error',
          title: 'Connection Error',
          description: 'Please check your internet connection and try again.',
          duration: 5000
        })
      } else if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
        addToast({
          variant: 'warning',
          title: 'Too Many Attempts',
          description: 'Please wait a few minutes before trying again.',
          duration: 6000
        })
      } else {
        // Generic fallback with more helpful message
        addToast({
          variant: 'error',
          title: authMode === 'signIn' ? 'Sign In Failed' : 'Sign Up Failed',
          description: authMode === 'signIn' 
            ? 'Please check your email and password.' 
            : 'Please try again or contact support.',
          duration: 4000
        })
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleAddWebsite = () => {
    // Branch based on monitoring mode
    if (monitoringMode === 'once') {
      // One-time scrape - call handleMonitorOnce
      handleMonitorOnce()
    } else {
      // Scheduled monitoring - proceed with normal website creation
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

      setError('')
      
      // Store the pending website data and show the modal
      setPendingWebsite({
        url: processedUrl,
        name: autoGeneratedName
      })
      setShowWebhookModal(true)
      setUrl('')
    }
  }

  const handleMonitorOnce = async () => {
    if (!url) {
      setError('Please enter a URL')
      return
    }

    // Add https:// if no protocol is specified
    let processedUrl = url.trim()
    if (!processedUrl.match(/^https?:\/\//)) {
      processedUrl = 'https://' + processedUrl
    }

    // Basic URL validation
    try {
      new URL(processedUrl)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    setError('')
    setIsMonitoringOnce(true)
    
    try {
      // Create website entry for one-time scrape so it shows in "Currently Tracked Websites"
      const domain = new URL(processedUrl).hostname
      const websiteId = await createWebsite({
        url: processedUrl,
        name: `[ONE-TIME] ${domain}`,
        checkInterval: 525600, // 1 year (365 days) - effectively never auto-checks
        notificationPreference: 'none',
        monitorType: monitorType === 'full_site' ? 'full_site' : 'single_page',
        crawlLimit: maxPages,
        crawlDepth: maxCrawlDepth,
      })
      
      // Prepare AI/Firecrawl options from UI
      let parsedConfig: Record<string, unknown> | undefined
      try {
        parsedConfig = firecrawlConfig ? JSON.parse(firecrawlConfig) : undefined
      } catch {
        parsedConfig = undefined
      }

      // Scrape and save to the website entry
      const result = await crawlWebsite({ 
        url: processedUrl,
        limit: monitorType === 'full_site' ? maxPages : 1,
        config: parsedConfig,
        saveToDb: true,
        websiteId: websiteId,
      })
      
      addToast({
        variant: 'success',
        title: 'One-time monitoring completed',
        description: `Scraped ${result.totalPages} page${result.totalPages !== 1 ? 's' : ''} from ${processedUrl}${result.savedScrapeResultIds?.length ? ' • Saved to history' : ''}`,
        duration: 5000
      })
      
      setUrl('')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to monitor website'
      setError(errorMessage)
      addToast({
        variant: 'error',
        title: 'Monitoring failed',
        description: errorMessage,
        duration: 5000
      })
    } finally {
      setIsMonitoringOnce(false)
    }
  }

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!researchQuery.trim()) {
      addToast({
        variant: 'error',
        title: 'Empty query',
        description: 'Please enter a research question',
        duration: 3000
      })
      return
    }

    // Add user message to chat
    const userMessageId = Date.now().toString()
    setResearchMessages(prev => [...prev, {
      id: userMessageId,
      role: 'user',
      content: researchQuery
    }])
    
    const currentQuery = researchQuery
    setResearchQuery('')
    setIsResearching(true)
    
    // Create assistant message that will stream
    const assistantMessageId = (Date.now() + 1).toString()
    setResearchMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    }])
    
    try {
      // Filter out empty URLs
      const urlsToScrape = researchUrls.filter(url => url.trim()).map(url => url.trim());
      
      const response = await fetch('/api/compliance-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          includeInternalSources: true,
          jurisdiction: researchJurisdiction || undefined,
          topic: researchTopic || undefined,
          systemPrompt: researchSystemPrompt,
          firecrawlConfig: researchFirecrawlConfig,
          urls: urlsToScrape.length > 0 ? urlsToScrape : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Research request failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      let answer = ''
      let sources: any = {}
      
      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            
            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'sources') {
                sources = parsed
                console.log('📊 Sources received:', {
                  scrapedUrls: parsed.scrapedUrlSources?.length || 0,
                  internal: parsed.internalSources?.length || 0,
                  web: parsed.sources?.length || 0,
                  news: parsed.newsResults?.length || 0,
                  images: parsed.imageResults?.length || 0
                })
                // Update assistant message with sources
                setResearchMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId ? {
                    ...msg,
                    scrapedUrlSources: parsed.scrapedUrlSources || [],
                    internalSources: parsed.internalSources || [],
                    webSources: parsed.sources || [],
                    newsResults: parsed.newsResults || [],
                    imageResults: parsed.imageResults || []
                  } : msg
                ))
              } else if (parsed.type === 'text') {
                answer += parsed.content
                // Update assistant message with streaming content
                setResearchMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId ? { ...msg, content: answer } : msg
                ))
              } else if (parsed.type === 'followup') {
                setResearchFollowUpQuestions(parsed.questions || [])
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      // Scroll to bottom
      setTimeout(() => {
        researchListRef.current?.scrollTo({
          top: researchListRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 100)
      
      // Log final message state
      console.log('✅ Research complete. Final message state:', 
        researchMessages.find(m => m.id === assistantMessageId))
      
      addToast({
        variant: 'success',
        title: 'Research complete',
        description: `Found ${(sources.internalSources?.length || 0) + (sources.sources?.length || 0)} sources`,
        duration: 3000
      })
      
    } catch (error) {
      console.error('Research error:', error)
      // Remove the empty assistant message
      setResearchMessages(prev => prev.filter(m => m.id !== assistantMessageId))
      
      addToast({
        variant: 'error',
        title: 'Research failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      })
    } finally {
      setIsResearching(false)
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




  const handleCheckNow = async (websiteId: string) => {
    setProcessingWebsites(prev => new Set([...prev, websiteId]))
    
    try {
      await triggerScrape({ websiteId: websiteId as any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      // The UI will automatically update via Convex reactive queries
      
      // Keep processing indicator for a bit to show the scrape is running
      setTimeout(() => {
        setProcessingWebsites(prev => {
          const newSet = new Set(prev)
          newSet.delete(websiteId)
          return newSet
        })
      }, 5000) // Increased to 5 seconds
    } catch {
      setProcessingWebsites(prev => {
        const newSet = new Set(prev)
        newSet.delete(websiteId)
        return newSet
      })
    }
  }

  // Skip authentication for single-user mode
  if (false && authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </Layout>
    )
  }

  // Skip authentication check for single-user mode
  if (false && !isAuthenticated) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Hero content */}
              <div className="text-center lg:text-left">
                <h1 className="text-[3rem] lg:text-[4rem] font-semibold tracking-tight leading-none mb-6">
                  <span className="bg-gradient-to-tr from-blue-600 to-indigo-500 bg-clip-text text-transparent block">
                    RuleReady
                  </span>
                  <span className="text-black block">
                    Compliance
                  </span>
                </h1>
                <p className="text-xl text-zinc-600 dark:text-zinc-400">
                  AI-powered employment law monitoring across all US jurisdictions
                </p>
              </div>
              
              {/* Right side - Sign in form */}
              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="bg-white rounded-lg p-8 shadow-sm relative">
                  <LoadingOverlay 
                    visible={isAuthenticating} 
                    message={authMode === 'signIn' ? 'Signing you in...' : 'Creating your account...'}
                  />
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
                        placeholder={APP_CONFIG.email.placeholderEmail} 
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (helperText) setHelperText('')
                        }}
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
                        placeholder={authMode === 'signUp' ? 'Minimum 6 characters' : '••••••••'} 
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (helperText) setHelperText('')
                        }}
                        required
                        autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
                      />
                      {helperText && (
                        <p className="text-sm text-gray-600 mt-1">
                          {helperText}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      variant="default" 
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
                        Don&apos;t have an account?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('signUp')
                            setHelperText('')
                          }}
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
                          onClick={() => {
                            setAuthMode('signIn')
                            setHelperText('')
                          }}
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
  
  // Main authenticated view (when isAuthenticated = true)
  return (
    <Layout>
      <Header showCTA={false} />
      

      
      <Hero 
        title={
          <div className="flex flex-col leading-none">
            <span className="bg-gradient-to-tr from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              RuleReady
            </span>
            <span className="text-black">
              Compliance
            </span>
          </div>
        }
        subtitle="AI-powered employment law monitoring across all US jurisdictions"
      />
      
      <MainContent maxWidth="7xl" className="py-12">
        <div className="space-y-6">
          {/* Compliance Guide */}
          <ComplianceGuide />
          
          {/* AI Chat Assistant */}
          <div className="bg-white rounded-lg shadow-sm">
            {/* Collapsible Header */}
            <div className="p-6 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setShowAiChatSection(!showAiChatSection)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">AI Compliance Assistant</h3>
                    <p className="text-sm text-gray-600 mt-1">Ask questions about compliance requirements and regulations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {showAiChatSection ? 'Hide' : 'Show'} chat
                  </span>
                  <div className={`transform transition-transform ${showAiChatSection ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Collapsible Content */}
            {showAiChatSection && (
              <div className="bg-transparent">
                {/* Chat Configuration - Collapsible */}
                <div className="border-b border-gray-200">
                  <div className="p-6">
                    <button
                      type="button"
                      onClick={() => setShowChatConfig(!showChatConfig)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="font-medium text-gray-900">Chat Configuration</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {showChatConfig ? 'Hide' : 'Show'} settings
                        </span>
                        <div className={`transform transition-transform ${showChatConfig ? 'rotate-180' : ''}`}>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  {showChatConfig && (
                    <div className="px-6 pb-6 space-y-6">
                      {/* Chat Configuration */}
                      <div>
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
                  
                  {/* Spacer */}
                  <div className="h-1"></div>
                  
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
                      
                      {/* Save Settings */}
                      <div className="flex justify-end mt-4">
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
                              addToast({
                                title: "Chat Settings Saved",
                                description: "AI chat configuration has been updated successfully"
                              })
                            } catch (error) {
                              console.error('Failed to update chat settings:', error)
                              addToast({
                                title: "Save Error",
                                description: "Failed to save chat settings. Please try again."
                              })
                            } finally {
                              setIsUpdatingChat(false)
                            }
                          }}
                          disabled={isUpdatingChat}
                          className="gap-2"
                        >
                          {isUpdatingChat ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : chatSuccess ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-4 w-4" />
                              Save Chat Settings
                            </>
                          )}
                        </Button>
                      </div>
                      </div>
                    </div>
                  )}
                </div>
                
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
                          value={chatSelectedJurisdiction}
                          onChange={(e) => setChatSelectedJurisdiction(e.target.value)}
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
                          value={chatSelectedTopic}
                          onChange={(e) => setChatSelectedTopic(e.target.value)}
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
                    {(chatSelectedJurisdiction || chatSelectedTopic) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-600">Filtering by:</span>
                        {chatSelectedJurisdiction && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            📍 {chatSelectedJurisdiction}
                            <button
                              onClick={() => setChatSelectedJurisdiction('')}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        )}
                        {chatSelectedTopic && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <FileText className="h-3 w-3" />
                            {topics?.find(t => t.topicKey === chatSelectedTopic)?.name || chatSelectedTopic}
                            <button
                              onClick={() => setChatSelectedTopic('')}
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
            )}
          </div>
          
          {/* Advanced Add Website Form */}
          <div className="bg-white rounded-lg shadow-sm">
            {/* Collapsible Header */}
            <div className="p-6 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setShowAddWebsiteSection(!showAddWebsiteSection)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Add Website to Track</h3>
                    <p className="text-sm text-gray-600 mt-1">Configure monitoring for a new website</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {showAddWebsiteSection ? 'Hide' : 'Show'} form
                  </span>
                  <div className={`transform transition-transform ${showAddWebsiteSection ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Collapsible Content */}
            {showAddWebsiteSection && (
              <div className="p-6">
                    
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleAddWebsite();
            }} className="space-y-8">
              
              {/* Monitoring Mode Switch - NEW */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Monitoring Type</h4>
                    <p className="text-sm text-gray-600">Choose between one-time scrape or scheduled monitoring</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setMonitoringMode('once')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        monitoringMode === 'once'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Monitor Once
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonitoringMode('scheduled')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        monitoringMode === 'scheduled'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Scheduled Monitoring
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Section 1: Basic Website Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <h4 className="text-lg font-medium text-blue-900">Website Information</h4>
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
                          disabled={isAdding}
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

              {/* Section 2: Monitoring Schedule - Conditional based on mode */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <h4 className="text-lg font-medium text-purple-900">
                    {monitoringMode === 'once' ? 'Priority Level' : 'Schedule & Interval'}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {/* Show Priority for One-Time, Interval for Scheduled */}
                  {monitoringMode === 'once' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Priority Level</label>
                      <select
                        value={selectedPriorityLevel}
                        onChange={(e) => setSelectedPriorityLevel(e.target.value as 'critical' | 'high' | 'medium' | 'low')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="critical">🔴 Critical - High-impact content</option>
                        <option value="high">🟠 High - Important content</option>
                        <option value="medium">🟡 Medium - Standard monitoring</option>
                        <option value="low">🟢 Low - Informational content</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Priority level helps categorize this one-time scrape in your tracking list
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Check Interval (minutes)</label>
                      <Input
                        type="number"
                        min="1"
                        value={checkInterval}
                        onChange={(e) => setCheckInterval(parseInt(e.target.value) || 1440)}
                        className="w-full"
                        placeholder="e.g., 1440 for daily"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        How often to automatically check for changes (1440 = daily, 10080 = weekly, 43200 = monthly)
                      </p>
                    </div>
                  )}
                  
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
                    
                    {/* AI Settings Expansion */}
                    {showAiSettings && (
                      <div className="mt-4 p-4 bg-purple-100 border border-purple-300 rounded-lg space-y-4">
                        <div className="border-b border-purple-200 pb-3 mb-3">
                          <h5 className="text-sm font-medium text-purple-900 mb-2">What is AI Analysis?</h5>
                          <p className="text-xs text-purple-700 leading-relaxed">
                            AI Analysis uses advanced language models to automatically determine if website changes are meaningful for compliance monitoring. 
                            Instead of getting notified about every minor change (formatting, navigation updates, etc.), AI filters out noise and only alerts you to 
                            significant changes like legal requirement updates, deadline modifications, rate changes, or new regulations. This prevents alert fatigue 
                            and ensures you focus on changes that actually matter for compliance.
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              AI System Prompt
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAiSystemPrompt(`Analyze website changes and determine if they are meaningful for compliance monitoring.

Focus on detecting:
- Legal requirement changes
- Deadline modifications
- Rate or threshold updates
- Policy changes
- New regulations or amendments
- Enforcement updates

Ignore:
- Minor formatting changes
- Navigation updates
- Cosmetic modifications
- Temporary notices
- Marketing content changes

Provide a meaningful change score (0-1) and reasoning for the assessment.`)
                              }}
                              className="text-xs"
                            >
                              Default
                            </Button>
                          </div>
                          <textarea
                            value={aiSystemPrompt}
                            onChange={(e) => setAiSystemPrompt(e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                            placeholder="Enter AI analysis instructions..."
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Instructions for how AI should analyze website changes to determine if they are meaningful
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Meaningful Change Threshold
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="10"
                              max="100"
                              step="5"
                              value={meaningfulChangeThreshold}
                              onChange={(e) => setMeaningfulChangeThreshold(parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-sm font-mono text-gray-600 min-w-[3rem]">
                              {meaningfulChangeThreshold}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum confidence percentage (10%-100%) required to consider a change meaningful. Higher values = fewer alerts.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Monitoring Configuration */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="h-5 w-5 text-orange-600" />
                  <h4 className="text-lg font-medium text-orange-900">Monitoring Configuration</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {/* Left: Single Page */}
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
                      className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all h-full w-full ${
                        monitorType === 'single'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <File className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">Single Page</span>
                      </div>
                      <span className="text-sm text-gray-600">Monitor specific page only</span>
                    </label>
                  </div>

                  {/* Right: Full Site */}
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
                      className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all h-full w-full ${
                        monitorType === 'full_site'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-5 h-5 text-orange-600" />
                        <span className="font-medium">Full Site</span>
                      </div>
                      <span className="text-sm text-gray-600">Monitor entire website</span>
                      {monitorType === 'full_site' && (
                        <div className="mt-3 p-4 bg-orange-50 rounded-lg space-y-4 border border-orange-200">
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
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 4: Firecrawl Configuration */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="h-5 w-5 text-gray-600" />
                  <h4 className="text-lg font-medium text-gray-900">Firecrawl Configuration</h4>
                </div>
                
                 {/* Firecrawl Configuration - Always Open */}
                 <div className="bg-gray-50 rounded-lg p-4">
                   <h5 className="text-sm font-medium text-gray-700 mb-3">Firecrawl Configuration (JSON)</h5>
                   <div className="space-y-2">
                     <textarea
                       value={firecrawlConfig}
                       onChange={(e) => setFirecrawlConfig(e.target.value)}
                       rows={12}
                       className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                       placeholder="Enter Firecrawl configuration in JSON format..."
                     />
                     <div className="flex items-start justify-between">
                       <p className="text-xs text-gray-500">
                         This JSON automatically updates when you change form settings above. You can also edit it directly.
                       </p>
                       <a
                         href="https://docs.firecrawl.dev/api-reference/endpoint/scrape"
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-xs text-purple-600 hover:text-purple-800 underline flex items-center gap-1 ml-4 flex-shrink-0"
                       >
                         <ExternalLink className="h-3 w-3" />
                         Firecrawl Docs
                       </a>
                     </div>
                   </div>
                 </div>
              </div>

               {/* Submit Button - Single button that reacts to monitoring mode */}
               <div className="flex justify-end gap-3">
                        <Button 
                          type="submit"
                          variant="default"
                   size="default"
                   disabled={isAdding || isMonitoringOnce || !url.trim() || urlValidation.isValidating || urlValidation.isValid !== true}
                   className="gap-2"
                        >
                          {(isAdding || isMonitoringOnce) ? (
                            <>
                       <Loader2 className="h-4 w-4 animate-spin" />
                       {monitoringMode === 'once' ? 'Scraping...' : 'Adding Website...'}
                            </>
                          ) : (
                     <>
                       {monitoringMode === 'once' ? <Eye className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                       Start Monitoring
                     </>
                          )}
                        </Button>
                      </div>
                    </form>
            
                    {error && (
                 <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                   <p className="text-sm text-red-700">{error}</p>
                 </div>
                    )}
              </div>
            )}
          </div>
          
          {/* Compliance Research Section - NEW */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setShowResearchSection(!showResearchSection)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <Search className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Compliance Research</h3>
                    <p className="text-sm text-gray-600 mt-1">Search employment laws, regulations, and news with AI-powered insights</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {showResearchSection ? 'Hide' : 'Show'} research
                  </span>
                  <div className={`transform transition-transform ${showResearchSection ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Collapsible Research Content - Chat Style */}
            {showResearchSection && (
              <div className="bg-transparent">
                {/* Research Configuration - Collapsible */}
                <div className="border-b border-gray-200">
                  <div className="p-6">
                    <button
                      type="button"
                      onClick={() => setShowResearchSettings(!showResearchSettings)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="font-medium text-gray-900">Research Settings</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {showResearchSettings ? 'Hide' : 'Show'} settings
                        </span>
                        <div className={`transform transition-transform ${showResearchSettings ? 'rotate-180' : ''}`}>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  {showResearchSettings && (
                    <div className="px-6 pb-6 space-y-6">
                      {/* AI System Prompt */}
                      <div>
                        <Label htmlFor="research-prompt">AI System Prompt</Label>
                        <Textarea
                          id="research-prompt"
                          value={researchSystemPrompt}
                          onChange={(e) => setResearchSystemPrompt(e.target.value)}
                          rows={6}
                          placeholder="You are RuleReady Research AI..."
                          className="font-mono text-xs"
                        />
                        
                        {/* Show what gets added when filters are selected */}
                        {(researchJurisdiction || researchTopic) && (
                          <div className="mt-2 p-3 bg-purple-100 border border-purple-300 rounded">
                            <div className="text-xs font-medium text-purple-800 mb-1">
                              ↓ These lines are automatically added to your prompt when you search:
                            </div>
                            <div className="text-xs font-mono text-purple-900 space-y-1">
                              {researchJurisdiction && (
                                <div>Focus on jurisdiction: {researchJurisdiction}</div>
                              )}
                              {researchTopic && (
                                <div>Focus on topic: {topics?.find(t => t.topicKey === researchTopic)?.name || researchTopic}</div>
                              )}
                            </div>
                            <div className="text-xs text-purple-700 mt-2 italic">
                              These appear after "Based on these sources:" in the final prompt sent to AI
                            </div>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1">
                          Template selection auto-updates this prompt. Edit freely - your changes are preserved.
                        </p>
                      </div>
                      
                      {/* Firecrawl Configuration */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="research-firecrawl">Firecrawl Search Configuration (JSON)</Label>
                          <a
                            href="https://docs.firecrawl.dev/api-reference/endpoint/search"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Firecrawl Search API Docs
                          </a>
                        </div>
                        <Textarea
                          id="research-firecrawl"
                          value={researchFirecrawlConfig}
                          onChange={(e) => setResearchFirecrawlConfig(e.target.value)}
                          rows={10}
                          placeholder='{"sources": ["web", "news", "images"], "limit": 8}'
                          className="font-mono text-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Configure Firecrawl search sources, limits, and scraping options
                        </p>
                      </div>
                      
                      {/* Info Box */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-2">How Research Works:</h5>
                        <div className="text-xs text-blue-800 space-y-1">
                          <div>1. <strong>Search Phase:</strong> Firecrawl searches web, news, and images</div>
                          <div>2. <strong>Filter Phase:</strong> Jurisdiction/topic enhance search relevance</div>
                          <div>3. <strong>AI Phase:</strong> AI model analyzes sources and generates answer</div>
                          <div>4. <strong>Citation Phase:</strong> Sources numbered [1], [2], [3] for reference</div>
                        </div>
                      </div>
                      
                      {/* Current Configuration */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-2">Current Configuration:</h5>
                        <div className="text-xs text-blue-800 space-y-1">
                          <div><strong>Template:</strong> {selectedResearchTemplate ? (templates?.find((t: any) => t.templateId === selectedResearchTemplate)?.title || 'Selected') : 'None (uses default prompt)'}</div>
                          <div><strong>Jurisdiction:</strong> {researchJurisdiction || 'None (searches all)'}</div>
                          <div><strong>Topic:</strong> {researchTopic ? (topics?.find(t => t.topicKey === researchTopic)?.name || researchTopic) : 'None (searches all)'}</div>
                          <div><strong>URLs to Scrape:</strong> {researchUrls.filter(url => url.trim()).length > 0 ? `${researchUrls.filter(url => url.trim()).length} URL(s) provided` : 'None (web search only)'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chat Messages Area */}
                <div className="relative">
                  <div ref={researchListRef} className="h-[520px] overflow-y-auto px-6 py-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                      {researchMessages.length === 0 && (
                        <div className="text-center text-gray-500 py-12">
                          <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-lg font-medium">Ask anything about employment law</p>
                          <p className="text-sm mt-1">Powered by your compliance database + live web search</p>
                        </div>
                      )}
                      
                      {researchMessages.map((m) => (
                        <div key={m.id}>
                          <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-start gap-3 w-full ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-purple-100 text-purple-700'}`}>
                                {m.role === 'user' ? <User className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                              </div>
                              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[85%] ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                                {m.role === 'user' ? (
                                  <p>{m.content}</p>
                                ) : (
                                  <>
                                    {/* Debug info - always show for now */}
                                    <div className="mb-2 text-xs text-gray-400 font-mono">
                                      Debug: {m.scrapedUrlSources?.length || 0} scraped, {m.internalSources?.length || 0} internal, {m.webSources?.length || 0} web, {m.newsResults?.length || 0} news
                                    </div>
                                    
                                    <div className="compliance-research-content">
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
                                        {m.content || 'Searching...'}
                                      </ReactMarkdown>
                                    </div>
                                    
                                    {/* Sources - Scraped URLs (User Provided) */}
                                    {m.scrapedUrlSources && m.scrapedUrlSources.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-gray-300">
                                        <div className="text-xs font-medium text-orange-700 mb-2 flex items-center gap-1">
                                          <Globe className="h-3 w-3" />
                                          Your URLs ({m.scrapedUrlSources.length})
                                        </div>
                                        <ul className="space-y-1">
                                          {m.scrapedUrlSources.map((s: any, idx: number) => (
                                            <li key={idx} className="text-xs text-orange-800">
                                              <span className="font-mono mr-1">[{idx + 1}]</span>
                                              <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                                                {s.title}
                                              </a>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {/* Sources - Internal Database */}
                                    {m.internalSources && m.internalSources.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-gray-300">
                                        <div className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
                                          <FileText className="h-3 w-3" />
                                          Your Database ({m.internalSources.length})
                                        </div>
                                        <ul className="space-y-1">
                                          {m.internalSources.map((s: any, idx: number) => (
                                            <li key={idx} className="text-xs text-purple-800">
                                              <span className="font-mono mr-1">[{(m.scrapedUrlSources?.length || 0) + idx + 1}]</span>
                                              <span className="font-medium">{s.title}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {/* Sources - Web */}
                                    {m.webSources && m.webSources.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-gray-300">
                                        <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                                          <Search className="h-3 w-3" />
                                          Web Search ({m.webSources.length})
                                        </div>
                                        <ul className="space-y-1">
                                          {m.webSources.map((s: any, idx: number) => (
                                            <li key={idx} className="text-xs text-blue-800">
                                              <span className="font-mono mr-1">[{(m.scrapedUrlSources?.length || 0) + (m.internalSources?.length || 0) + idx + 1}]</span>
                                              <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">
                                                {s.title}
                                              </a>
                                              <span className="text-gray-500 ml-1">({s.siteName})</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {/* News Results */}
                                    {m.newsResults && m.newsResults.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-gray-300">
                                        <div className="text-xs font-medium text-orange-700 mb-2 flex items-center gap-1">
                                          <Newspaper className="h-3 w-3" />
                                          News ({m.newsResults.length})
                                        </div>
                                        <ul className="space-y-1">
                                          {m.newsResults.slice(0, 3).map((n: any, idx: number) => (
                                            <li key={idx} className="text-xs text-orange-800">
                                              <a href={n.url} target="_blank" rel="noreferrer" className="hover:underline">
                                                {n.title}
                                              </a>
                                              {n.publishedDate && <span className="text-gray-500 ml-1">({n.publishedDate})</span>}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Toolbar under assistant messages */}
                          {m.role === 'assistant' && (
                            <div className="mt-2 pl-11 flex items-center gap-3 text-gray-500">
                              <button 
                                className={`inline-flex items-center gap-1 text-xs hover:text-gray-700 transition-colors ${
                                  copiedResearchMessageId === m.id ? 'text-green-600' : ''
                                }`} 
                                onClick={() => handleCopyResearchMessage(m.content, m.id)} 
                                type="button"
                              >
                                {copiedResearchMessageId === m.id ? (
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
                              <button 
                                className="inline-flex items-center gap-1 text-xs hover:text-gray-700" 
                                type="button"
                                onClick={() => {
                                  setSavingResearchMessage(m)
                                  
                                  // Generate title with jurisdiction if available
                                  const firstLine = m.content.substring(0, 100).split('\n')[0].replace(/[#*]/g, '').trim();
                                  const titleWithJurisdiction = researchJurisdiction 
                                    ? `${researchJurisdiction} - ${firstLine}`
                                    : firstLine;
                                  setSavedResearchTitle(titleWithJurisdiction);
                                  
                                  // Add jurisdiction/topic as header in markdown if selected
                                  let contentWithHeader = m.content;
                                  if (researchJurisdiction || researchTopic) {
                                    const headerParts = [];
                                    if (researchJurisdiction) headerParts.push(`**Jurisdiction:** ${researchJurisdiction}`);
                                    if (researchTopic) {
                                      const topicName = topics?.find(t => t.topicKey === researchTopic)?.name || researchTopic;
                                      headerParts.push(`**Topic:** ${topicName}`);
                                    }
                                    contentWithHeader = `# Research Summary\n\n${headerParts.join(' | ')}\n\n---\n\n${m.content}`;
                                  }
                                  
                                  // Add sources as formatted markdown
                                  let sourcesMarkdown = '';
                                  
                                  // Scraped URLs (User Provided)
                                  if (m.scrapedUrlSources && m.scrapedUrlSources.length > 0) {
                                    sourcesMarkdown += '\n\n---\n\n## Sources - Your URLs\n\n';
                                    m.scrapedUrlSources.forEach((s: any, idx: number) => {
                                      sourcesMarkdown += `${idx + 1}. **[${s.title}](${s.url})**\n`;
                                      if (s.description) sourcesMarkdown += `   - ${s.description}\n`;
                                      sourcesMarkdown += '\n';
                                    });
                                  }
                                  
                                  // Internal Database Sources
                                  if (m.internalSources && m.internalSources.length > 0) {
                                    sourcesMarkdown += '\n## Sources - Your Database\n\n';
                                    m.internalSources.forEach((s: any, idx: number) => {
                                      const num = (m.scrapedUrlSources?.length || 0) + idx + 1;
                                      sourcesMarkdown += `${num}. **${s.title}**\n`;
                                      if (s.description) sourcesMarkdown += `   - ${s.description}\n`;
                                      sourcesMarkdown += '\n';
                                    });
                                  }
                                  
                                  // Web Sources
                                  if (m.webSources && m.webSources.length > 0) {
                                    sourcesMarkdown += '\n## Sources - Web Search\n\n';
                                    m.webSources.forEach((s: any, idx: number) => {
                                      const num = (m.scrapedUrlSources?.length || 0) + (m.internalSources?.length || 0) + idx + 1;
                                      sourcesMarkdown += `${num}. **[${s.title}](${s.url})**\n`;
                                      if (s.description) sourcesMarkdown += `   - ${s.description}\n`;
                                      if (s.siteName) sourcesMarkdown += `   - Source: ${s.siteName}\n`;
                                      sourcesMarkdown += '\n';
                                    });
                                  }
                                  
                                  // News Results
                                  if (m.newsResults && m.newsResults.length > 0) {
                                    sourcesMarkdown += '\n## News Articles\n\n';
                                    m.newsResults.forEach((n: any, idx: number) => {
                                      sourcesMarkdown += `- **[${n.title}](${n.url})**\n`;
                                      if (n.publishedDate) sourcesMarkdown += `  - Published: ${n.publishedDate}\n`;
                                      if (n.source) sourcesMarkdown += `  - Source: ${n.source}\n`;
                                      sourcesMarkdown += '\n';
                                    });
                                  }
                                  
                                  setSavedResearchContent(contentWithHeader + sourcesMarkdown);
                                  setShowSaveResearchModal(true);
                                }}
                              >
                                <Save className="h-3 w-3" /> Save
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {isResearching && (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-2xl text-sm">
                            <Search className="h-4 w-4 text-purple-600" />
                            <Loader2 className="h-4 w-4 animate-spin text-purple-700" />
                            <span className="text-gray-700">Researching…</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bottom composer */}
                <form onSubmit={handleResearchSubmit} className="px-4 pb-4">
                  {/* Follow-up question chips */}
                  {researchFollowUpQuestions.length > 0 && (
                    <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2 mb-2">
                      {researchFollowUpQuestions.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          type="button"
                          onClick={() => {
                            setResearchQuery(q)
                            setTimeout(() => {
                              handleResearchSubmit(new Event('submit') as any)
                            }, 0)
                          }}
                          disabled={isResearching}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Single Toggle for All Advanced Options */}
                  <div className="max-w-3xl mx-auto mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedResearchOptions(!showAdvancedResearchOptions)}
                      className="w-full h-9 text-sm"
                      disabled={isResearching}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {showAdvancedResearchOptions ? (
                          <>
                            <ChevronLeft className="h-4 w-4" />
                            Hide Additional Prompts
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-4 w-4" />
                            Show Additional Prompts (Jurisdiction, Topic, Templates, URLs)
                          </>
                        )}
                      </div>
                    </Button>
                  </div>
                  
                  {/* Advanced Options Section - All Together */}
                  {showAdvancedResearchOptions && (
                  <div className="max-w-3xl mx-auto mb-3 space-y-3">
                    {/* Filters Row */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <select
                          value={researchJurisdiction}
                          onChange={(e) => setResearchJurisdiction(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                          disabled={isResearching}
                        >
                          <option value="">All Jurisdictions</option>
                          {jurisdictions?.map(j => (
                            <option key={j.code} value={j.name}>{j.name}</option>
                          ))}
                        </select>
                        <Tooltip content={
                          <div className="text-xs">
                            <div>Filters search results and tells AI to focus on this jurisdiction.</div>
                            <div className="mt-1">Gets added as: "Focus on jurisdiction: X"</div>
                          </div>
                        }>
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </Tooltip>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <select
                          value={researchTopic}
                          onChange={(e) => setResearchTopic(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                          disabled={isResearching}
                        >
                          <option value="">All Topics</option>
                          {topics?.slice(0, 15).map(t => (
                            <option key={t.topicKey} value={t.topicKey}>{t.name}</option>
                          ))}
                        </select>
                        <Tooltip content={
                          <div className="text-xs">
                            <div>Filters search results and tells AI to focus on this topic.</div>
                            <div className="mt-1">Gets added as: "Focus on topic: X"</div>
                          </div>
                        }>
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </Tooltip>
                      </div>
                    </div>
                    
                    {/* Template Dropdown */}
                    <div className="flex items-center gap-1">
                    <select
                      className="px-3 py-1.5 border border-purple-300 bg-purple-50 text-purple-900 rounded text-sm font-medium"
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        
                        if (selectedValue === 'view-all') {
                          // Navigate to settings page
                          router.push('/settings#templates');
                          return;
                        } else if (selectedValue === 'none') {
                          // Clear template - reset to default prompt
                          setSelectedResearchTemplate('');
                          setResearchSystemPrompt(`You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Provide accurate, authoritative information about employment law.
Cite sources using inline [1], [2], [3] format.
Distinguish between federal and state requirements.
Mention effective dates when relevant.
Note penalties or deadlines when applicable.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`);
                          
                          addToast({
                            variant: 'success',
                            title: 'Template cleared',
                            description: 'Using default prompt (no template structure)',
                            duration: 2000
                          });
                        } else if (selectedValue === 'new') {
                          // Create new template
                          setEditingTemplate({
                            topicKey: '',
                            topicName: 'New Template'
                          });
                          setShowTemplateEditor(true);
                        } else if (selectedValue === 'edit') {
                          // Edit current template
                          if (selectedResearchTemplate) {
                            const template = templates?.find((t: any) => t.templateId === selectedResearchTemplate);
                            const topic = topics?.find(t => t.topicKey === template?.topicKey);
                            if (topic) {
                              setEditingTemplate({
                                topicKey: topic.topicKey,
                                topicName: topic.name
                              });
                              setShowTemplateEditor(true);
                            }
                          }
                        } else if (selectedValue) {
                          // Select template for research
                          setSelectedResearchTemplate(selectedValue);
                          
                          // Find template and update system prompt with its structure
                          const template = templates?.find((t: any) => t.templateId === selectedValue);
                          if (template && template.markdownContent) {
                            const enhancedPrompt = `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Provide accurate, authoritative information about employment law.
Cite sources using inline [1], [2], [3] format.
Distinguish between federal and state requirements.
Mention effective dates when relevant.
Note penalties or deadlines when applicable.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.

IMPORTANT: Structure your response using this template format:
${template.markdownContent}

Follow the template sections but adapt based on the query. Not all sections may be relevant for every query.`;
                            
                            setResearchSystemPrompt(enhancedPrompt);
                            
                            addToast({
                              variant: 'success',
                              title: 'Template selected',
                              description: `Using ${template.title} template for structured responses`,
                              duration: 3000
                            });
                          }
                        }
                        // Reset dropdown
                        e.target.value = '';
                      }}
                      value=""
                      disabled={isResearching}
                    >
                      <option value="">
                        {selectedResearchTemplate 
                          ? `Using: ${templates?.find((t: any) => t.templateId === selectedResearchTemplate)?.title || 'Template'}`
                          : 'Templates...'}
                      </option>
                      <option value="view-all" className="font-semibold">View All Templates →</option>
                      <option value="none">None (Default Prompt)</option>
                      <option value="new" className="font-semibold">Create New Template</option>
                      {selectedResearchTemplate && (
                        <option value="edit" className="font-semibold">Edit Current Template</option>
                      )}
                      <option disabled>──────────</option>
                      {templates?.map((template: any) => (
                        <option key={template.templateId} value={template.templateId}>
                          {template.title} {template.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <Tooltip content={
                      <div className="text-xs">
                        <div>Templates provide structured format for AI responses.</div>
                        <div className="mt-1">Selecting a template auto-updates the AI System Prompt.</div>
                      </div>
                    }>
                      <Info className="h-4 w-4 text-purple-400 cursor-help" />
                    </Tooltip>
                    </div>
                  
                  {/* Additional URLs to Scrape */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-orange-600" />
                          <h5 className="text-sm font-medium text-orange-900">Additional URLs to Scrape (Optional)</h5>
                          <Tooltip content={
                            <div className="text-xs">
                              <div>Add specific URLs to scrape and include in research.</div>
                              <div className="mt-1">Firecrawl will scrape these pages and combine with web search.</div>
                            </div>
                          }>
                            <Info className="h-4 w-4 text-orange-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <span className="text-xs text-orange-700">
                          {researchUrls.filter(url => url.trim()).length} / {MAX_RESEARCH_URLS} URLs
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {researchUrls.map((url, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <Input
                                type="url"
                                placeholder="https://example.com or https://example.com/file.pdf"
                                value={url}
                                onChange={(e) => {
                                  const newUrls = [...researchUrls];
                                  newUrls[index] = e.target.value;
                                  setResearchUrls(newUrls);
                                }}
                                disabled={isResearching}
                                className={`w-full pr-10 text-sm ${
                                  researchUrlValidation[index]?.isValid === true ? 'border-green-500 focus:ring-green-500' :
                                  researchUrlValidation[index]?.isValid === false ? 'border-red-500 focus:ring-red-500' :
                                  'border-gray-300'
                                }`}
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                {researchUrlValidation[index]?.isValidating ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                ) : researchUrlValidation[index]?.isValid === true ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : researchUrlValidation[index]?.isValid === false ? (
                                  <X className="h-4 w-4 text-red-500" />
                                ) : null}
                              </div>
                            </div>
                            {researchUrls.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newUrls = researchUrls.filter((_, i) => i !== index);
                                  setResearchUrls(newUrls);
                                }}
                                disabled={isResearching}
                                className="h-9 w-9 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {index === researchUrls.length - 1 && researchUrls.length < MAX_RESEARCH_URLS && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setResearchUrls([...researchUrls, '']);
                                }}
                                disabled={isResearching}
                                className="h-9 w-9 p-0 bg-orange-100 border-orange-300 hover:bg-orange-200"
                              >
                                <Plus className="h-4 w-4 text-orange-600" />
                              </Button>
                            )}
                          </div>
                        ))}
                        
                        {/* Validation messages */}
                        {Object.entries(researchUrlValidation).map(([idx, validation]: [string, any]) => {
                          const index = parseInt(idx);
                          if (!validation.message || !researchUrls[index]?.trim()) return null;
                          return (
                            <div key={idx} className={`text-xs ${
                              validation.isValid === true ? 'text-green-600' :
                              validation.isValid === false ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              URL {index + 1}: {validation.message}
                            </div>
                          );
                        })}
                      </div>
                      
                      {researchUrls.filter(url => url.trim()).length > 3 && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ More than 3 URLs may slow down research response time
                        </p>
                      )}
                      
                      <p className="text-xs text-orange-700 mt-2">
                        💡 Tip: PDFs are supported - paste PDF URLs directly
                      </p>
                    </div>
                  </div>
                  )}
                  
                  {/* Text Composer - Always Visible */}
                  <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border px-3 py-2">
                    <Textarea
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (!isResearching && researchQuery.trim()) {
                            handleResearchSubmit(e)
                          }
                        }
                      }}
                      rows={2}
                      placeholder="Ask about employment law, regulations, requirements..."
                      disabled={isResearching}
                      className="resize-none border-0 focus-visible:ring-0"
                    />
                    <Button type="submit" disabled={isResearching || !researchQuery.trim()} className="h-9 w-9 rounded-full p-0">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          {/* Two Column Layout */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
            {/* Left Column - Websites */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm flex flex-col relative">
                <LoadingOverlay visible={isMonitoringOnce} message="Crawling…" />
                {/* Search Header */}
                <div className="p-6 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Currently Tracked Websites</h3>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedPanel(expandedPanel === 'websites' ? null : 'websites')}
                          className="w-8 h-8 p-0 bg-black text-white border-black rounded-[10px] [box-shadow:inset_0px_-2px_0px_0px_#18181b,_0px_1px_6px_0px_rgba(24,_24,_27,_58%)] hover:bg-gray-800 hover:text-gray-200 hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#18181b,_0px_1px_3px_0px_rgba(24,_24,_27,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#18181b,_0px_1px_2px_0px_rgba(24,_24,_27,_30%)] transition-all duration-200"
                          title={expandedPanel === 'websites' ? "Minimize" : "Expand"}
                        >
                          {expandedPanel === 'websites' ? (
                            <Minimize2 className="h-4 w-4" />
                          ) : (
                            <Maximize2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Bulk Action Buttons - underneath the expand button */}
                      {websites && websites.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const filteredWebsites = websites.filter(website => {
                                // Apply same filtering logic as the list
                                const query = searchQuery.toLowerCase()
                                const matchesSearch = cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                                     website.url.toLowerCase().includes(query)
                                if (!matchesSearch) return false
                                
                                
                                if (selectedJurisdiction) {
                                  const websiteJurisdiction = cleanWebsiteName(website.name).split(' - ')[0]
                                  if (websiteJurisdiction !== selectedJurisdiction) return false
                                }
                                if (selectedTopic && website.complianceMetadata?.topicKey !== selectedTopic) return false
                                if (selectedPriority && website.complianceMetadata?.priority !== selectedPriority) return false
                                if (selectedStatus) {
                                  if (selectedStatus === 'active' && (!website.isActive || website.isPaused)) return false
                                  if (selectedStatus === 'paused' && !website.isPaused) return false
                                  if (selectedStatus === 'inactive' && website.isActive) return false
                                }
                                return true
                              });
                              
                              const allSelected = filteredWebsites.every(w => selectedWebsiteIds.has(w._id));
                              if (allSelected) {
                                // Deselect all
                                setSelectedWebsiteIds(new Set());
                              } else {
                                // Select all filtered websites
                                setSelectedWebsiteIds(new Set(filteredWebsites.map(w => w._id)));
                              }
                            }}
                            className="gap-1 text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {(() => {
                              const filteredWebsites = websites.filter(website => {
                                const query = searchQuery.toLowerCase()
                                const matchesSearch = cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                                     website.url.toLowerCase().includes(query)
                                if (!matchesSearch) return false
                                
                                if (selectedJurisdiction) {
                                  const websiteJurisdiction = cleanWebsiteName(website.name).split(' - ')[0]
                                  if (websiteJurisdiction !== selectedJurisdiction) return false
                                }
                                if (selectedTopic && website.complianceMetadata?.topicKey !== selectedTopic) return false
                                if (selectedPriority && website.complianceMetadata?.priority !== selectedPriority) return false
                                if (selectedStatus) {
                                  if (selectedStatus === 'active' && (!website.isActive || website.isPaused)) return false
                                  if (selectedStatus === 'paused' && !website.isPaused) return false
                                  if (selectedStatus === 'inactive' && website.isActive) return false
                                }
                                return true
                              });
                              const allSelected = filteredWebsites.every(w => selectedWebsiteIds.has(w._id));
                              return allSelected ? 'Deselect All' : 'Select All';
                            })()}
                          </Button>
                          
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              const websitesToCheck = selectedWebsiteIds.size > 0 
                                ? websites.filter(w => selectedWebsiteIds.has(w._id) && w.isActive && !w.isPaused)
                                : websites.filter(w => w.isActive && !w.isPaused);
                              
                              for (const website of websitesToCheck) {
                                await handleCheckNow(website._id);
                              }
                            }}
                            disabled={selectedWebsiteIds.size === 0}
                            className="gap-1 text-xs"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Check Selected ({selectedWebsiteIds.size})
                          </Button>
                        </div>
                      )}
                      
                      {websites ? (
                        <span className="text-xs text-gray-500">
                          {websites.length} site{websites.length !== 1 ? 's' : ''} 
                          {(() => {
                            const complianceCount = websites.filter(w => w.complianceMetadata?.isComplianceWebsite).length
                            const regularCount = websites.length - complianceCount
                            return complianceCount > 0 ? ` (${complianceCount} compliance, ${regularCount} regular)` : ''
                          })()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Loading...</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="space-y-3">
                      {/* Search Input */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          type="text"
                          placeholder="Search by name or URL..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          disabled={!websites}
                        />
                      </div>
                      
                      {/* Filter Instructions */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start space-x-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-700">
                            <p className="font-medium mb-1">Filter your compliance monitoring:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div>• <strong>Jurisdiction:</strong> Filter by Federal or specific states</div>
                              <div>• <strong>Priority:</strong> Filter by monitoring frequency and importance</div>
                              <div>• <strong>Topic:</strong> Focus on specific compliance areas (harassment, wages, etc.)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Compliance Filters */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Jurisdiction Filter */}
                        <select 
                          className="px-2 py-1 border border-gray-300 rounded text-xs min-w-0 flex-shrink-0"
                          value={selectedJurisdiction}
                          onChange={(e) => setSelectedJurisdiction(e.target.value)}
                        >
                          <option value="">All Jurisdictions</option>
                          {jurisdictions?.map(j => (
                            <option key={j.code} value={j.name}>{j.name}</option>
                          ))}
                        </select>
                        
                        {/* Priority Filter */}
                        <select 
                          className="px-2 py-1 border border-gray-300 rounded text-xs min-w-0 flex-shrink-0"
                          value={selectedPriority}
                          onChange={(e) => setSelectedPriority(e.target.value)}
                        >
                          <option value="">All Priorities</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                          <option value="testing">Testing</option>
                        </select>
                        
                        {/* Topic Filter */}
                        <select 
                          className="px-2 py-1 border border-gray-300 rounded text-xs min-w-0 flex-shrink-0"
                          value={selectedTopic}
                          onChange={(e) => setSelectedTopic(e.target.value)}
                        >
                          <option value="">All Topics</option>
                          <option value="minimum_wage">Minimum Wage</option>
                          <option value="overtime">Overtime</option>
                          <option value="paid_sick_leave">Sick Leave</option>
                          <option value="harassment_training">Harassment Training</option>
                          <option value="workplace_safety">Workplace Safety</option>
                          <option value="background_checks">Background Checks</option>
                          <option value="workers_comp">Workers Comp</option>
                          <option value="posting_requirements">Posting Requirements</option>
                          <option value="family_medical_leave">Family Leave</option>
                          <option value="biometric_privacy">Biometric Privacy</option>
                        </select>
                      
                      {/* Status Filter */}
                      <select 
                        className="px-2 py-1 border border-gray-300 rounded text-xs min-w-0 flex-shrink-0"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="inactive">Inactive</option>
                      </select>
                        
                        
                      </div>
                      
                      {/* Filter Summary */}
                      {(selectedJurisdiction || selectedPriority || selectedTopic || selectedStatus) && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          <span className="text-xs text-gray-500">Filters:</span>
                          {selectedJurisdiction && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                              {selectedJurisdiction}
                              <button 
                                onClick={() => setSelectedJurisdiction('')}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >×</button>
                            </span>
                          )}
                          {selectedPriority && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                              {selectedPriority}
                              <button 
                                onClick={() => setSelectedPriority('')}
                                className="ml-1 text-orange-600 hover:text-orange-800"
                              >×</button>
                            </span>
                          )}
                          {selectedTopic && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                              {topics?.find(t => t.topicKey === selectedTopic)?.name || selectedTopic}
                              <button 
                                onClick={() => setSelectedTopic('')}
                                className="ml-1 text-green-600 hover:text-green-800"
                              >×</button>
                            </span>
                          )}
                          {selectedStatus && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                              Status: {selectedStatus}
                              <button 
                                onClick={() => setSelectedStatus('')}
                                className="ml-1 text-gray-600 hover:text-gray-800"
                              >×</button>
                            </span>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedJurisdiction('')
                              setSelectedPriority('')
                              setSelectedTopic('')
                              setSelectedStatus('')
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                    
                    {/* Website List */}
                    <div className="divide-y-2 divide-gray-300">
                      {(() => {
                        // Show loading state while websites is undefined
                        if (!websites) {
                          return (
                            <div className="p-8 text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                              <p className="text-gray-500">Loading websites...</p>
                            </div>
                          )
                        }


                        // Apply filtering logic
                        const filteredWebsites = websites.filter(website => {
                          // Search query filter
                          if (searchQuery) {
                            const query = searchQuery.toLowerCase()
                            const matchesSearch = cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                                website.url.toLowerCase().includes(query)
                            if (!matchesSearch) return false
                          }

                          

                          // Jurisdiction filter
                          if (selectedJurisdiction) {
                            if (website.complianceMetadata?.jurisdiction !== selectedJurisdiction) return false
                          }

                          // Priority filter
                          if (selectedPriority) {
                            if (website.complianceMetadata?.priority !== selectedPriority) return false
                          }

                          // Topic filter
                          if (selectedTopic) {
                            if (website.complianceMetadata?.topicKey !== selectedTopic) return false
                          }

                          // Status filter
                          if (selectedStatus) {
                            if (selectedStatus === 'active' && (!website.isActive || website.isPaused)) return false
                            if (selectedStatus === 'paused' && !website.isPaused) return false
                            if (selectedStatus === 'inactive' && website.isActive) return false
                          }

                          return true
                        })


                        const sortedWebsites = filteredWebsites
                          .sort((a, b) => {
                            // Sort compliance websites first, then by priority, then by creation time
                            const aIsCompliance = a.complianceMetadata?.isComplianceWebsite || false
                            const bIsCompliance = b.complianceMetadata?.isComplianceWebsite || false
                            
                            // Compliance websites first
                            if (aIsCompliance && !bIsCompliance) return -1
                            if (!aIsCompliance && bIsCompliance) return 1
                            
                            // Both compliance: sort by priority
                            if (aIsCompliance && bIsCompliance) {
                              const priorityOrder = { testing: 5, critical: 4, high: 3, medium: 2, low: 1 }
                              const aPriority = priorityOrder[a.complianceMetadata?.priority as keyof typeof priorityOrder] || 0
                              const bPriority = priorityOrder[b.complianceMetadata?.priority as keyof typeof priorityOrder] || 0
                              
                              if (aPriority !== bPriority) {
                                return bPriority - aPriority // Higher priority first
                              }
                            }
                            
                            // Same type: sort by creation time (newest first)
                            return b._creationTime - a._creationTime
                          })
                        
                        // Pagination calculations
                        const totalPages = Math.ceil(sortedWebsites.length / ITEMS_PER_PAGE_WEBSITES)
                        const startIndex = (websitesPage - 1) * ITEMS_PER_PAGE_WEBSITES
                        const endIndex = startIndex + ITEMS_PER_PAGE_WEBSITES
                        const paginatedWebsites = sortedWebsites.slice(startIndex, endIndex)
                        
                        // Filter results summary
                        const hasFilters = searchQuery || selectedJurisdiction || selectedPriority || selectedTopic || selectedStatus
                        const filterResultsText = hasFilters ? 
                          `Showing ${sortedWebsites.length} of ${websites.length} websites` :
                          `Showing all ${websites.length} websites`
                        
                        // Reset to page 1 if current page is out of bounds
                        if (websitesPage > totalPages && totalPages > 0) {
                          setWebsitesPage(1)
                        }
                        
                        // Filter Results Summary Component
                        const FilterResultsSummary = () => (
                          <div className="flex items-center justify-between text-sm text-gray-600 py-2 border-b border-gray-100 bg-gray-50 px-4 -mx-4">
                            <span>{filterResultsText}</span>
                            {hasFilters && (
                              <span className="text-xs">
                                {sortedWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite).length} compliance, {' '}
                                {sortedWebsites.length - sortedWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite).length} regular
                              </span>
                            )}
                          </div>
                        )
                        
                        if (sortedWebsites.length === 0 && (searchQuery || selectedJurisdiction || selectedPriority || selectedTopic || selectedStatus)) {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-lg font-medium">No websites found</p>
                              <div className="text-sm mt-2 space-y-1">
                                {searchQuery && <p>Search: &quot;{searchQuery}&quot;</p>}
                                {selectedJurisdiction && <p>Jurisdiction: {selectedJurisdiction}</p>}
                                {selectedPriority && <p>Priority: {selectedPriority}</p>}
                                {selectedTopic && <p>Topic: {topics?.find(t => t.topicKey === selectedTopic)?.name}</p>}
                                {selectedStatus && <p>Status: {selectedStatus}</p>}
                                
                              </div>
                              <button 
                                onClick={() => {
                                  setSearchQuery('')
                                  setSelectedJurisdiction('')
                                  setSelectedPriority('')
                                  setSelectedTopic('')
                                  setSelectedStatus('')
                                  
                                }}
                                className="mt-3 text-blue-600 hover:text-blue-800 text-sm underline"
                              >
                                Clear all filters
                              </button>
                            </div>
                          )
                        }
                        

                        if (websites.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-lg font-medium">No websites yet</p>
                              <p className="text-sm mt-1">Add your first website above to start monitoring</p>
                            </div>
                          )
                        }

                        return (
                          <>
                            <FilterResultsSummary />
                            {paginatedWebsites.map((website) => {
                  const latestScrape = latestScrapes?.[website._id];
                  const isProcessing = processingWebsites.has(website._id);
                  const isDeleting = deletingWebsites.has(website._id);
                  const hasChanged = latestScrape?.changeStatus === 'changed';
                  
                  return (
                    <div 
                      key={website._id}
                      className={`p-4 border-b-4 border-gray-700 hover:bg-gray-50 transition-colors cursor-pointer ${
                        isProcessing 
                          ? 'bg-orange-50' 
                          : isDeleting
                          ? 'bg-red-50 opacity-50'
                          : selectedWebsiteId === website._id
                          ? 'bg-orange-50 border-l-4 border-orange-500'
                          : selectedWebsiteIds.has(website._id)
                          ? 'bg-purple-50 border-l-4 border-purple-500'
                          : ''
                      }`}
                      onClick={() => {
                        // Clear bulk selection when selecting for change tracking
                        setSelectedWebsiteIds(new Set())
                        setSelectedWebsiteId(website._id)
                        setChangesPage(1) // Reset changes page when selecting a website
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Checkbox for bulk selection */}
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedWebsiteIds.has(website._id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSelected = new Set(selectedWebsiteIds);
                              if (e.target.checked) {
                                newSelected.add(website._id);
                              } else {
                                newSelected.delete(website._id);
                              }
                              setSelectedWebsiteIds(newSelected);
                            }}
                            className="w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                          />
                        </div>
                        
                        {/* Website favicon */}
                        <div className="flex-shrink-0">
                          {getFaviconUrl(website.url) ? (
                            <img 
                              src={getFaviconUrl(website.url)} 
                              alt={website.name}
                              className="w-12 h-12 object-contain rounded-lg bg-gray-50 p-2"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg></div>';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Globe className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Card Title */}
                              <div>
                                <h3 className="text-sm font-medium text-gray-900">{cleanWebsiteName(website.name)}</h3>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                              {/* Status Icons - Top Right, Horizontal */}
                              <div className="flex items-center gap-1">
                                {/* Priority Icon */}
                                {website.complianceMetadata?.isComplianceWebsite && (
                                  <Tooltip content={`${website.complianceMetadata.priority} priority - ${
                                    website.complianceMetadata.priority === 'critical' ? 'Checked Daily (High-impact rules)' :
                                    website.complianceMetadata.priority === 'high' ? 'Every 2 Days (Important requirements)' :
                                    website.complianceMetadata.priority === 'medium' ? 'Weekly (Standard compliance)' :
                                    website.complianceMetadata.priority === 'low' ? 'Monthly (Stable rules)' : 'Testing'
                                  }`}>
                                    <div className={`w-4 h-4 rounded-full ${
                                      website.complianceMetadata.priority === 'critical' ? 'bg-red-500' :
                                      website.complianceMetadata.priority === 'high' ? 'bg-orange-500' :
                                      website.complianceMetadata.priority === 'medium' ? 'bg-yellow-500' :
                                      website.complianceMetadata.priority === 'low' ? 'bg-green-500' : 'bg-purple-500'
                                    }`} />
                                  </Tooltip>
                                )}
                                
                                {/* Monitor Type Icon */}
                                <Tooltip content={website.monitorType === 'full_site' ? 'Full Site Monitoring' : 'Single Page Monitoring'}>
                                  {website.monitorType === 'full_site' ? (
                                    <Monitor className="w-4 h-4 text-orange-600" />
                                  ) : (
                                    <File className="w-4 h-4 text-gray-600" />
                                  )}
                                </Tooltip>
                                
                                {/* Status Icon */}
                                <Tooltip content={
                                  website.isPaused ? 'Monitoring Paused' : 
                                  website.isActive ? 'Actively Monitoring' : 'Inactive'
                                }>
                                  {website.isPaused ? (
                                    <Pause className="w-4 h-4 text-yellow-600" />
                                  ) : website.isActive ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-gray-400" />
                                  )}
                                </Tooltip>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex items-center gap-1">
                                <Tooltip content={website.isPaused ? "Resume monitoring" : "Pause monitoring"}>
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      pauseWebsite({ 
                                        websiteId: website._id, 
                                        isPaused: !website.isPaused 
                                      })
                                    }}
                                    className="w-8 h-8 p-0"
                                  >
                                    {website.isPaused ? (
                                      <Play className="h-4 w-4" />
                                    ) : (
                                      <Pause className="h-4 w-4" />
                                    )}
                                  </Button>
                                </Tooltip>

                                <DeleteConfirmationPopover
                                  trigger={
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-8 h-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        disabled={deletingWebsites.has(website._id)}
                                      title="Remove website"
                                      onPointerDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      >
                                        {deletingWebsites.has(website._id) ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <X className="h-4 w-4" />
                                        )}
                                      </Button>
                                  }
                                  title="Delete Website"
                                  description="This will permanently remove the website from monitoring. This action cannot be undone."
                                  itemName={cleanWebsiteName(website.name)}
                                  isLoading={deletingWebsites.has(website._id)}
                                  onConfirm={async () => {
                                    setDeletingWebsites(prev => new Set([...prev, website._id]))
                                    try {
                                      await deleteWebsite({ websiteId: website._id })
                                            } catch {
                                      throw new Error('Failed to delete website. Please try again.')
                                    } finally {
                                      setDeletingWebsites(prev => {
                                        const newSet = new Set(prev)
                                        newSet.delete(website._id)
                                        return newSet
                                      })
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Bottom row with status */}
                          {isProcessing ? (
                            <div className="mt-1 flex items-center gap-2 text-orange-600">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span className="text-xs">
                                {newlyCreatedWebsites.has(website._id) 
                                  ? 'Setting up...' 
                                  : 'Checking...'
                                }
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <div className="flex items-center gap-2">
                                {latestScrape && latestScrape.changeStatus !== 'new' && (
                                  <Tooltip content={hasChanged ? 'Changes detected in last check' : 'No changes detected'}>
                                    <div className={`w-2 h-2 rounded-full ${hasChanged ? 'bg-orange-500' : 'bg-green-500'}`} />
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Compliance Topic Info - Bottom */}
                          {website.complianceMetadata?.isComplianceWebsite && (
                            <div>
                              {/* Tags */}
                              <div className="flex items-center gap-2">
                                <TopicBadge 
                                  topicKey={website.complianceMetadata.topicKey}
                                  topicName={cleanWebsiteName(website.name).split(' - ')[1] || website.complianceMetadata.topicKey}
                                />
                              </div>
                              
                              {/* URL below tag */}
                              <div>
                                <Tooltip content={website.url}>
                                  <a 
                                    href={website.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 max-w-xs"
                                  >
                                    <span className="truncate">{website.url}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </a>
                                </Tooltip>
                              </div>
                              
                              {/* Check Info with Button */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <Tooltip content="Check interval">
                                    <span>{formatInterval(website.checkInterval)}</span>
                                  </Tooltip>
                                  <Tooltip content="Last checked">
                                    <span>{formatTimeAgo(website.lastChecked)}</span>
                                  </Tooltip>
                                </div>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCheckNow(website._id)
                                  }}
                                  disabled={isProcessing}
                                  className="text-xs h-6 px-2"
                                >
                                  Check Now
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                        })}
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div className="sticky bottom-0 bg-white border-t p-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                                  <span className="text-gray-600 text-center sm:text-left">
                                    Showing {startIndex + 1}-{Math.min(endIndex, sortedWebsites.length)} of {sortedWebsites.length} websites
                                  </span>
                                  <div className="flex items-center gap-1 justify-center sm:justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setWebsitesPage(websitesPage - 1)}
                                      disabled={websitesPage === 1}
                                      className="px-2"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    
                                    {/* Page Numbers */}
                                    {(() => {
                                      const maxVisiblePages = 5;
                                      const startPage = Math.max(1, websitesPage - Math.floor(maxVisiblePages / 2));
                                      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                      const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
                                      
                                      const pageNumbers = [];
                                      for (let i = adjustedStartPage; i <= endPage; i++) {
                                        pageNumbers.push(i);
                                      }
                                      
                                      return (
                                        <>
                                          {adjustedStartPage > 1 && (
                                            <>
                                    <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setWebsitesPage(1)}
                                                className="px-2"
                                              >
                                                1
                                              </Button>
                                              {adjustedStartPage > 2 && <span className="px-1">...</span>}
                                            </>
                                          )}
                                          
                                          {pageNumbers.map(pageNum => (
                                            <Button
                                              key={pageNum}
                                              variant={pageNum === websitesPage ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => setWebsitesPage(pageNum)}
                                              className="px-2"
                                            >
                                              {pageNum}
                                            </Button>
                                          ))}
                                          
                                          {endPage < totalPages && (
                                            <>
                                              {endPage < totalPages - 1 && <span className="px-1">...</span>}
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setWebsitesPage(totalPages)}
                                                className="px-2"
                                              >
                                                {totalPages}
                                              </Button>
                                            </>
                                          )}
                                        </>
                                      );
                                    })()}
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setWebsitesPage(websitesPage + 1)}
                                      disabled={websitesPage === totalPages}
                                      className="px-2"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
            </div>

            {/* Right Column - Changes */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm flex flex-col">
              <div className="p-6 border-b flex-shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                  <h3 className="text-xl font-semibold">Change Tracking Log</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant={checkLogFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCheckLogFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={checkLogFilter === 'changed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCheckLogFilter('changed')}
                    >
                      Changed Only
                    </Button>
                    <Button
                      variant={checkLogFilter === 'meaningful' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCheckLogFilter('meaningful')}
                      className="flex items-center gap-1"
                    >
                      <Bot className="h-3 w-3" />
                      Meaningful
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedPanel(expandedPanel === 'changes' ? null : 'changes')}
                      className="w-8 h-8 p-0 bg-black text-white border-black rounded-[10px] [box-shadow:inset_0px_-2px_0px_0px_#18181b,_0px_1px_6px_0px_rgba(24,_24,_27,_58%)] hover:bg-gray-800 hover:text-gray-200 hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#18181b,_0px_1px_3px_0px_rgba(24,_24,_27,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#18181b,_0px_1px_2px_0px_rgba(24,_24,_27,_30%)] transition-all duration-200"
                      title={expandedPanel === 'changes' ? "Minimize" : "Expand"}
                    >
                      {expandedPanel === 'changes' ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {(selectedWebsiteId || selectedWebsiteIds.size > 0) && websites && (
                  <div className="flex items-center gap-2 text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full inline-flex w-fit">
                    <span>Filtered:</span>
                    <span className="font-medium">
                      {(() => {
                        if (selectedWebsiteIds.size > 1) {
                          return `Filter +${selectedWebsiteIds.size}`;
                        } else if (selectedWebsiteIds.size === 1) {
                          const selectedWebsite = websites.find(w => selectedWebsiteIds.has(w._id));
                          return cleanWebsiteName(selectedWebsite?.name || 'Unknown');
                        } else if (selectedWebsiteId) {
                          return cleanWebsiteName(websites.find(w => w._id === selectedWebsiteId)?.name || 'Unknown');
                        }
                        return 'Unknown';
                      })()}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedWebsiteId(null)
                        setSelectedWebsiteIds(new Set())
                        setChangesPage(1)
                      }}
                      className="ml-1 hover:text-orange-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                
                {/* Search Input */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search changes by website name, title, or description..."
                      value={changesSearchQuery}
                      onChange={(e) => {
                        setChangesSearchQuery(e.target.value)
                        setChangesPage(1) // Reset to first page when searching
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* Changes List */}
              <div className="min-h-[600px]">
                {(() => {
                  // Show loading state while scrape history is undefined
                  if (!allScrapeHistory) {
                    return (
                      <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-gray-500">Loading change history...</p>
                      </div>
                    )
                  }

                  // Filter changes based on selected website, filter, and search query
                  const filteredHistory = allScrapeHistory?.filter(scrape => {
                    const websiteMatch = selectedWebsiteIds.size > 0 
                      ? selectedWebsiteIds.has(scrape.websiteId)
                      : !selectedWebsiteId || scrape.websiteId === selectedWebsiteId;
                    const filterMatch = checkLogFilter === 'all' || 
                      (checkLogFilter === 'changed' && scrape.changeStatus === 'changed') ||
                      (checkLogFilter === 'meaningful' && scrape.aiAnalysis?.isMeaningfulChange === true);
                    
                    // Search filter
                    const searchMatch = !changesSearchQuery || 
                      scrape.websiteName?.toLowerCase().includes(changesSearchQuery.toLowerCase()) ||
                      scrape.title?.toLowerCase().includes(changesSearchQuery.toLowerCase()) ||
                      scrape.description?.toLowerCase().includes(changesSearchQuery.toLowerCase());
                    
                    return websiteMatch && filterMatch && searchMatch;
                  }) || [];
                  
                  // Pagination calculations for changes
                  const totalChangesPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE_CHANGES)
                  const changesStartIndex = (changesPage - 1) * ITEMS_PER_PAGE_CHANGES
                  const changesEndIndex = changesStartIndex + ITEMS_PER_PAGE_CHANGES
                  const paginatedChanges = filteredHistory.slice(changesStartIndex, changesEndIndex)
                  
                  // Reset to page 1 if current page is out of bounds
                  if (changesPage > totalChangesPages && totalChangesPages > 0) {
                    setChangesPage(1)
                  }

                  if (filteredHistory.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No changes found</p>
                        {selectedWebsiteId ? (
                          <p className="text-sm mt-1">Select a different website or clear the filter</p>
                        ) : (
                          <p className="text-sm mt-1">Monitor websites to see changes here</p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      {paginatedChanges.map((scrape) => (
                    <div key={scrape._id} className="border-b hover:bg-gray-50">
                      <div className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Website favicon */}
                          <div className="flex-shrink-0">
                            {scrape.websiteUrl && getFaviconUrl(scrape.websiteUrl) ? (
                              <img 
                                src={getFaviconUrl(scrape.websiteUrl)} 
                                alt={scrape.websiteName}
                                className="w-8 h-8 object-contain rounded bg-gray-50 p-1"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg></div>';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <Globe className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">{scrape.websiteName}</h4>
                              <span className="text-xs text-gray-500">• {formatTimeAgo(scrape.scrapedAt)}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{scrape.websiteUrl}</p>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {scrape.aiAnalysis && (
                              <div className="relative group">
                                <Bot 
                                  className={`h-5 w-5 cursor-help ${
                                    scrape.aiAnalysis.isMeaningfulChange
                                      ? 'text-green-600'
                                      : 'text-red-500'
                                  }`}
                                />
                                <div className="absolute bottom-full right-0 mb-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-80">
                                  <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                  <div className={`font-medium mb-1 ${scrape.aiAnalysis.isMeaningfulChange ? 'text-green-400' : 'text-red-400'}`}>
                                    {scrape.aiAnalysis.meaningfulChangeScore}% {scrape.aiAnalysis.isMeaningfulChange ? 'Meaningful' : 'Not Meaningful'}
                                  </div>
                                  <div className="text-gray-300 whitespace-normal">{scrape.aiAnalysis.reasoning}</div>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              {scrape.changeStatus === 'changed' && scrape.diff ? (
                                <Button
                                  variant="code"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingSpecificScrape(scrape._id);
                                  }}
                                  className="w-7 h-7 p-0"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              ) : (
                                <div className="w-7 h-7"></div>
                              )}
                              {scrape.changeStatus !== 'checking' && scrape.markdown && (
                                <ChangeTrackingPopover
                                  trigger={
                                    <button
                                      className="w-7 h-7 p-0 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center cursor-pointer"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </button>
                                  }
                                  scrapeData={{
                                    _id: scrape._id,
                                    websiteId: scrape.websiteId,
                                    websiteName: scrape.websiteName,
                                    url: scrape.url,
                                    markdown: scrape.markdown,
                                    changeStatus: scrape.changeStatus,
                                    scrapedAt: scrape.scrapedAt,
                                    aiAnalysis: scrape.aiAnalysis,
                                  }}
                                />
                              )}
                            </div>
                            <div className="w-20 flex justify-end">
                              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 w-20 justify-center ${
                                scrape.changeStatus === 'changed' ? 'bg-orange-100 text-orange-800' :
                                scrape.changeStatus === 'checking' ? 'bg-blue-100 text-blue-800' :
                                scrape.changeStatus === 'new' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {scrape.changeStatus === 'checking' && (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                )}
                                {scrape.changeStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                      
                      {/* Pagination Controls for Changes */}
                      {totalChangesPages > 1 && (
                        <div className="sticky bottom-0 bg-white border-t p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                            <span className="text-gray-600 text-center sm:text-left">
                              Showing {changesStartIndex + 1}-{Math.min(changesEndIndex, filteredHistory.length)} of {filteredHistory.length} changes
                            </span>
                            <div className="flex items-center gap-1 justify-center sm:justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setChangesPage(changesPage - 1)}
                                disabled={changesPage === 1}
                                className="px-2"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              
                              {/* Page Numbers */}
                              {(() => {
                                const maxVisiblePages = 5;
                                const startPage = Math.max(1, changesPage - Math.floor(maxVisiblePages / 2));
                                const endPage = Math.min(totalChangesPages, startPage + maxVisiblePages - 1);
                                const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
                                
                                const pageNumbers = [];
                                for (let i = adjustedStartPage; i <= endPage; i++) {
                                  pageNumbers.push(i);
                                }
                                
                                return (
                                  <>
                                    {adjustedStartPage > 1 && (
                                      <>
                              <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setChangesPage(1)}
                                          className="px-2"
                                        >
                                          1
                                        </Button>
                                        {adjustedStartPage > 2 && <span className="px-1">...</span>}
                                      </>
                                    )}
                                    
                                    {pageNumbers.map(pageNum => (
                                      <Button
                                        key={pageNum}
                                        variant={pageNum === changesPage ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setChangesPage(pageNum)}
                                        className="px-2"
                                      >
                                        {pageNum}
                                      </Button>
                                    ))}
                                    
                                    {endPage < totalChangesPages && (
                                      <>
                                        {endPage < totalChangesPages - 1 && <span className="px-1">...</span>}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setChangesPage(totalChangesPages)}
                                          className="px-2"
                                        >
                                          {totalChangesPages}
                                        </Button>
                                      </>
                                    )}
                                  </>
                                );
                              })()}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setChangesPage(changesPage + 1)}
                                disabled={changesPage === totalChangesPages}
                                className="px-2"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
        </div>
      </MainContent>
      
      {/* Expanded Panel Modal */}
      {expandedPanel && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setExpandedPanel(null)
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {expandedPanel === 'websites' ? 'Currently Tracked Websites' : 'Change Tracking Log'}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedPanel(null)}
                className="w-8 h-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              {expandedPanel === 'websites' ? (
                // Websites expanded view - reuse the existing websites list logic
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {websites && (
                          <span className="text-sm text-gray-500">
                            {(() => {
                              // Calculate filtered websites count
                              const filteredWebsites = websites.filter(website => {
                                // Search query filter
                                const query = searchQuery.toLowerCase()
                                const matchesSearch = cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                                     website.url.toLowerCase().includes(query)
                                if (!matchesSearch) return false
                                
                                
                                
                                // Jurisdiction filter
                                if (modalSelectedJurisdiction) {
                                  const websiteJurisdiction = cleanWebsiteName(website.name).split(' - ')[0]
                                  if (websiteJurisdiction !== modalSelectedJurisdiction) return false
                                }
                                
                                // Topic filter
                                if (modalSelectedTopic) {
                                  if (website.complianceMetadata?.topicKey !== modalSelectedTopic) return false
                                }
                                
                                // Priority filter
                                if (modalSelectedPriority) {
                                  if (website.complianceMetadata?.priority !== modalSelectedPriority) return false
                                }
                                
                                // Status filter
                                if (modalSelectedStatus) {
                                  if (modalSelectedStatus === 'active' && (!website.isActive || website.isPaused)) return false
                                  if (modalSelectedStatus === 'paused' && !website.isPaused) return false
                                  if (modalSelectedStatus === 'inactive' && website.isActive) return false
                                }
                                
                                return true
                              });
                              
                              const hasFilters = modalSelectedJurisdiction || modalSelectedTopic || modalSelectedPriority || modalSelectedStatus || searchQuery
                              const totalCount = websites.length
                              const filteredCount = filteredWebsites.length
                              const complianceCount = filteredWebsites.filter(w => w.complianceMetadata?.isComplianceWebsite).length
                              const regularCount = filteredCount - complianceCount
                              
                              if (hasFilters && filteredCount !== totalCount) {
                                return `${filteredCount} of ${totalCount} site${totalCount !== 1 ? 's' : ''}${complianceCount > 0 ? ` (${complianceCount} compliance, ${regularCount} regular)` : ''}`
                              } else {
                                return `${totalCount} site${totalCount !== 1 ? 's' : ''}${complianceCount > 0 ? ` (${complianceCount} compliance, ${regularCount} regular)` : ''}`
                              }
                            })()}
                          </span>
                        )}
                      </div>
                      
                      {/* Bulk Action Buttons - positioned on the right */}
                        {websites && websites.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const filteredWebsites = websites.filter(website => {
                                // Apply same filtering logic as the list
                                const query = searchQuery.toLowerCase()
                                const matchesSearch = cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                                     website.url.toLowerCase().includes(query)
                                if (!matchesSearch) return false
                                
                                
                                if (modalSelectedJurisdiction) {
                                  const websiteJurisdiction = cleanWebsiteName(website.name).split(' - ')[0]
                                  if (websiteJurisdiction !== modalSelectedJurisdiction) return false
                                }
                                if (modalSelectedTopic && website.complianceMetadata?.topicKey !== modalSelectedTopic) return false
                                if (modalSelectedPriority && website.complianceMetadata?.priority !== modalSelectedPriority) return false
                                if (modalSelectedStatus) {
                                  if (modalSelectedStatus === 'active' && (!website.isActive || website.isPaused)) return false
                                  if (modalSelectedStatus === 'paused' && !website.isPaused) return false
                                  if (modalSelectedStatus === 'inactive' && website.isActive) return false
                                }
                                return true
                              });
                              
                              const allSelected = filteredWebsites.every(w => selectedWebsiteIds.has(w._id));
                              if (allSelected) {
                                // Deselect all
                                setSelectedWebsiteIds(new Set());
                              } else {
                                // Select all filtered websites
                                setSelectedWebsiteIds(new Set(filteredWebsites.map(w => w._id)));
                              }
                            }}
                            className="gap-2"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {(() => {
                              const filteredWebsites = websites.filter(website => {
                                const query = searchQuery.toLowerCase()
                                const matchesSearch = cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                                     website.url.toLowerCase().includes(query)
                                if (!matchesSearch) return false
                                
                                if (modalSelectedJurisdiction) {
                                  const websiteJurisdiction = cleanWebsiteName(website.name).split(' - ')[0]
                                  if (websiteJurisdiction !== modalSelectedJurisdiction) return false
                                }
                                if (modalSelectedTopic && website.complianceMetadata?.topicKey !== modalSelectedTopic) return false
                                if (modalSelectedPriority && website.complianceMetadata?.priority !== modalSelectedPriority) return false
                                if (modalSelectedStatus) {
                                  if (modalSelectedStatus === 'active' && (!website.isActive || website.isPaused)) return false
                                  if (modalSelectedStatus === 'paused' && !website.isPaused) return false
                                  if (modalSelectedStatus === 'inactive' && website.isActive) return false
                                }
                                return true
                              });
                              const allSelected = filteredWebsites.every(w => selectedWebsiteIds.has(w._id));
                              return allSelected ? 'Deselect All' : 'Select All';
                            })()}
                          </Button>
                          
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              const websitesToCheck = selectedWebsiteIds.size > 0 
                                ? websites.filter(w => selectedWebsiteIds.has(w._id) && w.isActive && !w.isPaused)
                                : websites.filter(w => w.isActive && !w.isPaused);
                              
                              for (const website of websitesToCheck) {
                                await handleCheckNow(website._id);
                              }
                            }}
                            disabled={selectedWebsiteIds.size === 0}
                            className="gap-2"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Check Selected ({selectedWebsiteIds.size})
                          </Button>
                        </div>
                        )}
                      </div>
                    <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Search by name or URL..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setModalWebsitesPage(1); // Reset to first page when searching
                        }}
                        className="pl-10"
                        disabled={!websites}
                      />
                      </div>
                      
                      {/* Filter Controls */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Jurisdiction Filter */}
                        <div>
                          <select
                            value={modalSelectedJurisdiction}
                            onChange={(e) => {
                              setModalSelectedJurisdiction(e.target.value);
                              setModalWebsitesPage(1);
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">All Jurisdictions</option>
                            {jurisdictions?.map((jurisdiction) => (
                              <option key={jurisdiction.name} value={jurisdiction.name}>
                                {jurisdiction.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Topic Filter */}
                        <div>
                          <select
                            value={modalSelectedTopic}
                            onChange={(e) => {
                              setModalSelectedTopic(e.target.value);
                              setModalWebsitesPage(1);
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">All Topics</option>
                            {topics?.map((topic) => (
                              <option key={topic.topicKey} value={topic.topicKey}>
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Priority Filter */}
                        <div>
                          <select
                            value={modalSelectedPriority}
                            onChange={(e) => {
                              setModalSelectedPriority(e.target.value);
                              setModalWebsitesPage(1);
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">All Priorities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                        
                        {/* Status Filter */}
                        <div>
                          <select
                            value={modalSelectedStatus}
                            onChange={(e) => {
                              setModalSelectedStatus(e.target.value);
                              setModalWebsitesPage(1);
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Filter Toggles */}
                      <div className="flex items-center justify-between">
                        {/* Clear All Filters Button */}
                        {(modalSelectedJurisdiction || modalSelectedTopic || modalSelectedPriority || modalSelectedStatus) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setModalSelectedJurisdiction('');
                              setModalSelectedTopic('');
                              setModalSelectedPriority('');
                              setModalSelectedStatus('');
                              setModalWebsitesPage(1);
                            }}
                            className="text-xs"
                          >
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                      
                      {/* Active Filters Display */}
                      {(modalSelectedJurisdiction || modalSelectedTopic || modalSelectedPriority || modalSelectedStatus) && (
                        <div className="flex flex-wrap gap-2">
                          {modalSelectedJurisdiction && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                              Jurisdiction: {modalSelectedJurisdiction}
                              <button
                                onClick={() => setModalSelectedJurisdiction('')}
                                className="hover:text-purple-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {modalSelectedTopic && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                              Topic: {topics?.find(t => t.topicKey === modalSelectedTopic)?.name || modalSelectedTopic}
                              <button
                                onClick={() => setModalSelectedTopic('')}
                                className="hover:text-purple-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {modalSelectedPriority && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                              Priority: {modalSelectedPriority}
                              <button
                                onClick={() => setModalSelectedPriority('')}
                                className="hover:text-purple-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {modalSelectedStatus && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                              Status: {modalSelectedStatus}
                              <button
                                onClick={() => setModalSelectedStatus('')}
                                className="hover:text-purple-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {!websites ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-gray-500">Loading websites...</p>
                      </div>
                    ) : websites.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No websites tracked yet</p>
                        <p className="text-sm">Compliance rules will appear here automatically, or add additional websites above</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {(() => {
                          // Filter websites
                          const filteredWebsites = websites.filter(website => {
                            // Search query filter
                            const query = searchQuery.toLowerCase()
                            const matchesSearch = cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                   website.url.toLowerCase().includes(query)
                            if (!matchesSearch) return false
                            
                            
                            
                            // Jurisdiction filter
                            if (modalSelectedJurisdiction) {
                              const websiteJurisdiction = cleanWebsiteName(website.name).split(' - ')[0]
                              if (websiteJurisdiction !== modalSelectedJurisdiction) return false
                            }
                            
                            // Topic filter
                            if (modalSelectedTopic) {
                              if (website.complianceMetadata?.topicKey !== modalSelectedTopic) return false
                            }
                            
                            // Priority filter
                            if (modalSelectedPriority) {
                              if (website.complianceMetadata?.priority !== modalSelectedPriority) return false
                            }
                            
                            // Status filter
                            if (modalSelectedStatus) {
                              if (modalSelectedStatus === 'active' && (!website.isActive || website.isPaused)) return false
                              if (modalSelectedStatus === 'paused' && !website.isPaused) return false
                              if (modalSelectedStatus === 'inactive' && website.isActive) return false
                            }
                            
                            return true
                          });
                          
                          // Pagination calculations for modal
                          const totalModalPages = Math.ceil(filteredWebsites.length / ITEMS_PER_PAGE_MODAL);
                          const modalStartIndex = (modalWebsitesPage - 1) * ITEMS_PER_PAGE_MODAL;
                          const modalEndIndex = modalStartIndex + ITEMS_PER_PAGE_MODAL;
                          const paginatedModalWebsites = filteredWebsites.slice(modalStartIndex, modalEndIndex);
                          
                          // Reset to page 1 if current page is out of bounds
                          if (modalWebsitesPage > totalModalPages && totalModalPages > 0) {
                            setModalWebsitesPage(1);
                          }
                          
                          return paginatedModalWebsites.map((website) => {
                          const isProcessing = processingWebsites.has(website._id);
                          const isDeleting = deletingWebsites.has(website._id);
                          
                          return (
                            <div 
                              key={website._id}
                              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                                isProcessing 
                                  ? 'bg-orange-50' 
                                  : isDeleting
                                  ? 'bg-red-50 opacity-50'
                                  : selectedWebsiteId === website._id
                                  ? 'bg-orange-50 border-l-4 border-orange-500'
                                  : selectedWebsiteIds.has(website._id)
                                  ? 'bg-purple-50 border-l-4 border-purple-500'
                                  : ''
                              }`}
                              onClick={() => {
                                setSelectedWebsiteId(website._id)
                                setChangesPage(1) // Reset changes page when selecting a website
                              }}
                            >
                              <div className="flex items-center gap-4">
                                {/* Checkbox for bulk selection */}
                                <div className="flex-shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedWebsiteIds.has(website._id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const newSelected = new Set(selectedWebsiteIds);
                                      if (e.target.checked) {
                                        newSelected.add(website._id);
                                      } else {
                                        newSelected.delete(website._id);
                                      }
                                      setSelectedWebsiteIds(newSelected);
                                    }}
                                    className="w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                                  />
                                </div>
                                
                                {/* Website favicon */}
                                <div className="flex-shrink-0">
                                  {getFaviconUrl(website.url) ? (
                                    <img 
                                      src={getFaviconUrl(website.url)} 
                                      alt={website.name}
                                      className="w-12 h-12 object-contain rounded-lg bg-gray-50 p-2"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = '<div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg></div>';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                      <Globe className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      {/* Card Title */}
                                      <div>
                                        <h3 className="text-sm font-medium text-gray-900">{cleanWebsiteName(website.name)}</h3>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                      {/* Status Icons - Top Right, Horizontal */}
                                      <div className="flex items-center gap-1">
                                        {/* Priority Icon */}
                                        {website.complianceMetadata?.isComplianceWebsite && (
                                          <Tooltip content={`${website.complianceMetadata.priority} priority - ${
                                            website.complianceMetadata.priority === 'critical' ? 'Checked Daily (High-impact rules)' :
                                            website.complianceMetadata.priority === 'high' ? 'Every 2 Days (Important requirements)' :
                                            website.complianceMetadata.priority === 'medium' ? 'Weekly (Standard compliance)' :
                                            website.complianceMetadata.priority === 'low' ? 'Monthly (Stable rules)' : 'Testing'
                                          }`}>
                                          <div className={`w-4 h-4 rounded-full ${
                                            website.complianceMetadata.priority === 'critical' ? 'bg-red-500' :
                                            website.complianceMetadata.priority === 'high' ? 'bg-orange-500' :
                                            website.complianceMetadata.priority === 'medium' ? 'bg-yellow-500' :
                                            website.complianceMetadata.priority === 'low' ? 'bg-green-500' : 'bg-purple-500'
                                          }`} />
                                          </Tooltip>
                                        )}
                                        
                                        {/* Monitor Type Icon */}
                                        <Tooltip content={website.monitorType === 'full_site' ? 'Full Site Monitoring' : 'Single Page Monitoring'}>
                                        {website.monitorType === 'full_site' ? (
                                          <Monitor className="w-4 h-4 text-orange-600" />
                                        ) : (
                                          <File className="w-4 h-4 text-gray-600" />
                                        )}
                                        </Tooltip>
                                        
                                        {/* Status Icon */}
                                        <Tooltip content={
                                          website.isPaused ? 'Monitoring is paused' :
                                          website.isActive ? 'Monitoring is active' : 'Monitoring is inactive'
                                        }>
                                        {website.isPaused ? (
                                          <Pause className="w-4 h-4 text-yellow-600" />
                                        ) : website.isActive ? (
                                          <Play className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <X className="w-4 h-4 text-gray-400" />
                                        )}
                                        </Tooltip>
                                      </div>
                                      
                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-1">
                                        <Tooltip content={website.isPaused ? "Resume monitoring" : "Pause monitoring"}>
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                              pauseWebsite({ 
                                                websiteId: website._id, 
                                                isPaused: !website.isPaused 
                                              })
                                          }}
                                          className="w-7 h-7 p-0"
                                        >
                                            {website.isPaused ? (
                                              <Play className="h-4 w-4" />
                                          ) : (
                                              <Pause className="h-4 w-4" />
                                          )}
                                        </Button>
                                        </Tooltip>
                                        
                                        <Tooltip content="Remove website from monitoring">
                                        <DeleteConfirmationPopover
                                          trigger={
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              disabled={isDeleting}
                                              className="w-7 h-7 p-0"
                                            >
                                              {isDeleting ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <X className="h-3 w-3" />
                                              )}
                                            </Button>
                                          }
                                          title="Delete Website"
                                          description="This will permanently remove the website from monitoring. This action cannot be undone."
                                          itemName={cleanWebsiteName(website.name)}
                                          isLoading={deletingWebsites.has(website._id)}
                                          onConfirm={async () => {
                                            setDeletingWebsites(prev => new Set([...prev, website._id]))
                                            try {
                                              await deleteWebsite({ websiteId: website._id })
                                            } catch {
                                              throw new Error('Failed to delete website. Please try again.')
                                            } finally {
                                              setDeletingWebsites(prev => {
                                                const newSet = new Set(prev)
                                                newSet.delete(website._id)
                                                return newSet
                                              })
                                            }
                                          }}
                                        />
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Compliance Topic Info - Bottom */}
                                  {website.complianceMetadata?.isComplianceWebsite && (
                                    <div className="mt-3 space-y-2">
                                      {/* Tags */}
                                      <div className="flex items-center gap-2">
                                        <TopicBadge 
                                          topicKey={website.complianceMetadata.topicKey}
                                          topicName={cleanWebsiteName(website.name).split(' - ')[1] || website.complianceMetadata.topicKey}
                                        />
                                      </div>
                                      
                                      {/* URL below tag */}
                                      <div>
                                        <Tooltip content={website.url}>
                                        <a 
                                          href={website.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 max-w-xs"
                                        >
                                          <span className="truncate">{website.url}</span>
                                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                        </a>
                                        </Tooltip>
                                      </div>
                                      
                                      {/* Check Info with Button */}
                                      <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                          <Tooltip content="Check interval" side="top">
                                          <span>{formatInterval(website.checkInterval)}</span>
                                          </Tooltip>
                                          <Tooltip content="Last checked" side="top">
                                          <span>{formatTimeAgo(website.lastChecked)}</span>
                                          </Tooltip>
                                        </div>
                                        <Tooltip content={isProcessing ? 'Checking for changes...' : 'Check now for changes'}>
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCheckNow(website._id)
                                          }}
                                          disabled={isProcessing}
                                          className="gap-1"
                                        >
                                          {isProcessing ? (
                                            <>
                                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                              {newlyCreatedWebsites.has(website._id) ? 'Setting up' : 'Checking'}
                                            </>
                                          ) : (
                                            <>
                                              <RefreshCw className="mr-1 h-3 w-3" />
                                              Check Now
                                            </>
                                          )}
                                        </Button>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                              </div>
                            </div>
                          )
                        });
                        })()}
                        
                        {/* Pagination Controls for Modal */}
                        {(() => {
                          const filteredWebsites = websites.filter(website => {
                            const query = searchQuery.toLowerCase()
                            return cleanWebsiteName(website.name).toLowerCase().includes(query) || 
                                   website.url.toLowerCase().includes(query)
                          });
                          const totalModalPages = Math.ceil(filteredWebsites.length / ITEMS_PER_PAGE_MODAL);
                          
                          return totalModalPages > 1 && (
                            <div className="sticky bottom-0 bg-white border-t p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                                <span className="text-gray-600 text-center sm:text-left">
                                  Page {modalWebsitesPage} of {totalModalPages} ({filteredWebsites.length} websites)
                                </span>
                                <div className="flex items-center gap-2 justify-center sm:justify-end">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setModalWebsitesPage(modalWebsitesPage - 1)}
                                    disabled={modalWebsitesPage === 1}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setModalWebsitesPage(modalWebsitesPage + 1)}
                                    disabled={modalWebsitesPage === totalModalPages}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Changes expanded view - reuse the existing changes list logic
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={checkLogFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCheckLogFilter('all')}
                        >
                          All
                        </Button>
                        <Button
                          variant={checkLogFilter === 'changed' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCheckLogFilter('changed')}
                        >
                          Changed Only
                        </Button>
                        <Button
                          variant={checkLogFilter === 'meaningful' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCheckLogFilter('meaningful')}
                          className="flex items-center gap-1"
                        >
                          <Bot className="h-3 w-3" />
                          Meaningful
                        </Button>
                      </div>
                    </div>
                    {(selectedWebsiteId || selectedWebsiteIds.size > 0) && websites && (
                      <div className="flex items-center gap-2 text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full inline-flex w-fit mb-4">
                        <span>Filtered:</span>
                        <span className="font-medium">
                          {(() => {
                            if (selectedWebsiteIds.size > 1) {
                              return `Filter +${selectedWebsiteIds.size}`;
                            } else if (selectedWebsiteIds.size === 1) {
                              const selectedWebsite = websites.find(w => selectedWebsiteIds.has(w._id));
                              return cleanWebsiteName(selectedWebsite?.name || 'Unknown');
                            } else if (selectedWebsiteId) {
                              return cleanWebsiteName(websites.find(w => w._id === selectedWebsiteId)?.name || 'Unknown');
                            }
                            return 'Unknown';
                          })()}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedWebsiteId(null)
                            setSelectedWebsiteIds(new Set())
                            setChangesPage(1)
                          }}
                          className="ml-1 hover:text-orange-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Search changes by website name, title, or description..."
                        value={changesSearchQuery}
                        onChange={(e) => {
                          setChangesSearchQuery(e.target.value)
                          setChangesPage(1)
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {/* Changes list with filtering */}
                    <div className="divide-y">
                      {(() => {
                        if (!allScrapeHistory) {
                          return (
                            <div className="p-8 text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                              <p className="text-gray-500">Loading change history...</p>
                            </div>
                          )
                        }
                        
                        // Apply filters
                        const filteredHistory = allScrapeHistory.filter(scrape => {
                          const websiteMatch = selectedWebsiteIds.size > 0 
                            ? selectedWebsiteIds.has(scrape.websiteId)
                            : !selectedWebsiteId || scrape.websiteId === selectedWebsiteId;
                          const filterMatch = checkLogFilter === 'all' || 
                      (checkLogFilter === 'changed' && scrape.changeStatus === 'changed') ||
                      (checkLogFilter === 'meaningful' && scrape.aiAnalysis?.isMeaningfulChange === true);
                          const searchMatch = !changesSearchQuery || 
                            scrape.websiteName?.toLowerCase().includes(changesSearchQuery.toLowerCase()) ||
                            scrape.title?.toLowerCase().includes(changesSearchQuery.toLowerCase()) ||
                            scrape.description?.toLowerCase().includes(changesSearchQuery.toLowerCase());
                          return websiteMatch && filterMatch && searchMatch;
                        });
                        
                        return filteredHistory.map((scrape) => (
                          <div key={scrape._id} className="border-b hover:bg-gray-50">
                            <div className="p-3">
                              <div className="flex items-center gap-3">
                                {/* Website favicon */}
                                <div className="flex-shrink-0">
                                  {scrape.websiteUrl && getFaviconUrl(scrape.websiteUrl) ? (
                                    <img 
                                      src={getFaviconUrl(scrape.websiteUrl)} 
                                      alt={scrape.websiteName}
                                      className="w-8 h-8 object-contain rounded bg-gray-50 p-1"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = '<div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg></div>';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                      <Globe className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm truncate">{scrape.websiteName}</h4>
                                    <span className="text-xs text-gray-500">• {formatTimeAgo(scrape.scrapedAt)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">{scrape.websiteUrl}</p>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {scrape.aiAnalysis && (
                                    <div className="relative group">
                                      <Bot 
                                        className={`h-5 w-5 cursor-help ${
                                          scrape.aiAnalysis.isMeaningfulChange
                                            ? 'text-green-600'
                                            : 'text-red-500'
                                        }`}
                                      />
                                      <div className="absolute bottom-full right-0 mb-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-80">
                                        <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                        <div className={`font-medium mb-1 ${scrape.aiAnalysis.isMeaningfulChange ? 'text-green-400' : 'text-red-400'}`}>
                                          {scrape.aiAnalysis.meaningfulChangeScore}% {scrape.aiAnalysis.isMeaningfulChange ? 'Meaningful' : 'Not Meaningful'}
                                        </div>
                                        <div className="text-gray-300 whitespace-normal">{scrape.aiAnalysis.reasoning}</div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    {scrape.changeStatus === 'changed' && scrape.diff ? (
                                      <Button
                                        variant="code"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingSpecificScrape(scrape._id);
                                        }}
                                        className="w-7 h-7 p-0"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <div className="w-7 h-7"></div>
                                    )}
                                    {scrape.changeStatus !== 'checking' && scrape.markdown && (
                                      <ChangeTrackingPopover
                                        trigger={
                                          <button
                                            className="w-7 h-7 p-0 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center cursor-pointer"
                                          >
                                            <Eye className="h-3 w-3" />
                                          </button>
                                        }
                                        scrapeData={{
                                          _id: scrape._id,
                                          websiteId: scrape.websiteId,
                                          websiteName: scrape.websiteName,
                                          url: scrape.url,
                                          markdown: scrape.markdown,
                                          changeStatus: scrape.changeStatus,
                                          scrapedAt: scrape.scrapedAt,
                                          aiAnalysis: scrape.aiAnalysis,
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="w-20 flex justify-end">
                                    <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 w-20 justify-center ${
                                      scrape.changeStatus === 'changed' ? 'bg-orange-100 text-orange-800' :
                                      scrape.changeStatus === 'checking' ? 'bg-blue-100 text-blue-800' :
                                      scrape.changeStatus === 'new' ? 'bg-gray-100 text-gray-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {scrape.changeStatus === 'checking' && (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      )}
                                      {scrape.changeStatus}
                                    </span>
                                  </div>
                                </div>
                                </div>
                              </div>
                            </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
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
                  <div className="overflow-y-auto max-h-[70vh] bg-white">
                    {scrape.diff && scrape.diff.text ? (
                      <div className="p-4 space-y-4">
                        {(() => {
                          const isAddition = (line: string) => line.startsWith('+') && !line.startsWith('+++');
                          const isDeletion = (line: string) => line.startsWith('-') && !line.startsWith('---');
                          const additions = diffLines.filter(isAddition).map(l => l.replace(/^\+/, ''));
                          const deletions = diffLines.filter(isDeletion).map(l => l.replace(/^\-/, ''));
                            
                            return (
                            <>
                              {/* Summary chips */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 border border-green-200">+ {additions.length} added</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 border border-red-200">- {deletions.length} removed</span>
                              </div>

                              {/* Added content */}
                              {additions.length > 0 && (onlyShowDiff || (!onlyShowDiff && showAddedLines)) && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-green-800">Added</h4>
                                  <div className="space-y-1.5">
                                    {additions.map((text, idx) => (
                                      <div key={`add-${idx}`} className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-900 whitespace-pre-wrap break-words">
                                        {text || ' '}
                        </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Removed content */}
                              {deletions.length > 0 && (onlyShowDiff || (!onlyShowDiff && showRemovedLines)) && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-red-800">Removed</h4>
                                  <div className="space-y-1.5">
                                    {deletions.map((text, idx) => (
                                      <div key={`del-${idx}`} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-900 whitespace-pre-wrap break-words">
                                        {text || ' '}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">No diff available for this change.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onlyShowDiff}
                          onChange={(e) => setOnlyShowDiff(e.target.checked)}
                          className="h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-orange-700">Only Show Diff</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showAddedLines}
                          onChange={(e) => setShowAddedLines(e.target.checked)}
                          className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                          disabled={onlyShowDiff}
                        />
                        <span className={`text-green-700 ${onlyShowDiff ? 'opacity-50' : ''}`}>Show Added</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showRemovedLines}
                          onChange={(e) => setShowRemovedLines(e.target.checked)}
                          className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                          disabled={onlyShowDiff}
                        />
                        <span className={`text-red-700 ${onlyShowDiff ? 'opacity-50' : ''}`}>Show Removed</span>
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
      {(editingWebsiteId || pendingWebsite) && (
        <WebhookConfigModal
          isOpen={showWebhookModal}
          onClose={() => {
            setShowWebhookModal(false)
            setEditingWebsiteId(null)
            setPendingWebsite(null)
          }}
          onSave={async (config) => {
            if (pendingWebsite) {
              // Create new website with configured settings
              setIsAdding(true)
              try {
                const websiteId = await createWebsite({
                  url: pendingWebsite.url,
                  name: pendingWebsite.name,
                  checkInterval: config.checkInterval || 60,
                  notificationPreference: config.notificationPreference,
                  monitorType: config.monitorType,
                  crawlLimit: config.crawlLimit,
                  crawlDepth: config.crawlDepth
                })
                
                // Add to processing state to show initial setup is happening
                setProcessingWebsites(prev => new Set([...prev, websiteId]))
                setNewlyCreatedWebsites(prev => new Set([...prev, websiteId]))
                
                // If checkNow is true, trigger an immediate check
                if (config.checkNow) {
                  try {
                    await triggerScrape({ websiteId })
                  } catch {
                    // Silently handle error
                  }
                }
                
                // Remove from processing after initial setup time
                setTimeout(() => {
                  setProcessingWebsites(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(websiteId)
                    return newSet
                  })
                  setNewlyCreatedWebsites(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(websiteId)
                    return newSet
                  })
                }, config.monitorType === 'full_site' ? 15000 : 8000)
                
                setPendingWebsite(null)
              } catch (error: unknown) {
                setError((error as Error).message || 'Failed to add website')
              } finally {
                setIsAdding(false)
              }
            } else if (editingWebsiteId) {
              // Update existing website
              await updateWebsite({
                websiteId: editingWebsiteId as any,
                url: config.url,
                notificationPreference: config.notificationPreference,
                checkInterval: config.checkInterval,
                monitorType: config.monitorType,
                crawlLimit: config.crawlLimit,
                crawlDepth: config.crawlDepth,
                compliancePriority: config.compliancePriority,
                overrideComplianceInterval: config.overrideComplianceInterval,
                priorityChangeReason: config.priorityChangeReason,
              })
            }
            setShowWebhookModal(false)
            setEditingWebsiteId(null)
            setPendingWebsite(null)
          }}
          initialConfig={
            editingWebsiteId ? (() => {
              const website = websites?.find(w => w._id === editingWebsiteId);
              return {
                notificationPreference: (website?.notificationPreference === 'email' ? 'email' : 'none'),
                url: website?.url ?? '',
                checkInterval: website?.checkInterval ?? 60,
                monitorType: website?.monitorType ?? 'single_page',
                crawlLimit: website?.crawlLimit ?? 5,
                crawlDepth: website?.crawlDepth ?? 3,
                complianceMetadata: website?.complianceMetadata || undefined,
              };
            })() : {
              notificationPreference: 'none',
              checkInterval: 60,
              monitorType: 'single_page',
              crawlLimit: 5,
              crawlDepth: 3
            }
          }
          websiteName={pendingWebsite?.name || cleanWebsiteName(websites?.find(w => w._id === editingWebsiteId)?.name || 'Website')}
        />
      )}
      
      {/* Compliance Template Editor */}
      {showTemplateEditor && editingTemplate && (
        <ComplianceTemplateEditor
          isOpen={showTemplateEditor}
          onClose={() => {
            setShowTemplateEditor(false)
            setEditingTemplate(null)
          }}
          onSave={async (templateData) => {
            await upsertTemplate(templateData)
          }}
        />
      )}
      
      {/* Save Research Modal */}
      {showSaveResearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold">Save Research Result</h3>
              <button
                onClick={() => setShowSaveResearchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Input
                  value={savedResearchTitle}
                  onChange={(e) => setSavedResearchTitle(e.target.value)}
                  placeholder="Enter a title for this research..."
                  className="w-full"
                />
              </div>
              
              {/* Editor/Preview Toggle */}
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Content
                </label>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setShowMarkdownPreview(false)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      !showMarkdownPreview
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Edit className="h-3 w-3 inline mr-1" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMarkdownPreview(true)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      showMarkdownPreview
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eye className="h-3 w-3 inline mr-1" />
                    Preview
                  </button>
                </div>
              </div>
              
              {/* Editor or Preview */}
              {showMarkdownPreview ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[300px]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      h1: ({children}) => <h1 className="text-2xl font-bold mb-3 text-gray-900">{children}</h1>,
                      h2: ({children}) => <h2 className="text-xl font-bold mt-4 mb-2 text-gray-800">{children}</h2>,
                      h3: ({children}) => <h3 className="text-lg font-bold mt-3 mb-2 text-gray-800">{children}</h3>,
                      p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="mb-3 space-y-1 ml-5">{children}</ul>,
                      ol: ({children}) => <ol className="mb-3 space-y-1 ml-5">{children}</ol>,
                      li: ({children}) => <li className="leading-relaxed list-disc">{children}</li>,
                      strong: ({children}) => <strong className="font-bold text-gray-900">{children}</strong>,
                      em: ({children}) => <em className="italic">{children}</em>,
                      a: ({children, ...props}) => <a className="text-blue-600 hover:underline" {...props}>{children}</a>,
                    }}
                  >
                    {savedResearchContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  value={savedResearchContent}
                  onChange={(e) => setSavedResearchContent(e.target.value)}
                  rows={15}
                  placeholder="Edit your research content..."
                  className="font-mono text-sm"
                />
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSaveResearchModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await saveResearch({
                      title: savedResearchTitle || 'Untitled Research',
                      content: savedResearchContent,
                      originalQuery: savingResearchMessage?.content?.substring(0, 200) || '',
                      jurisdiction: researchJurisdiction || undefined,
                      topic: researchTopic || undefined,
                      templateUsed: selectedResearchTemplate || undefined,
                      internalSources: savingResearchMessage?.internalSources,
                      webSources: savingResearchMessage?.webSources,
                      newsResults: savingResearchMessage?.newsResults,
                    })
                    
                    addToast({
                      variant: 'success',
                      title: 'Research saved',
                      description: `"${savedResearchTitle}" saved successfully`,
                      duration: 3000
                    })
                    
                    setShowSaveResearchModal(false)
                  } catch (error) {
                    addToast({
                      variant: 'error',
                      title: 'Save failed',
                      description: error instanceof Error ? error.message : 'Unknown error',
                      duration: 5000
                    })
                  }
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Research
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </Layout>
  )
}