'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/layout/hero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ExternalLink, LogIn, X, Search, Bot, Info, FileText, CheckCircle2, MessageCircle, User, ThumbsUp, ThumbsDown, ArrowUp, ArrowDown, Copy, Check, Newspaper, Save, Edit, Plus, Globe, ChevronLeft, ChevronRight, Square } from 'lucide-react'
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useRouter } from 'next/navigation'

import { APP_CONFIG } from '@/config/app.config'
import { validateEmail, validatePassword } from '@/lib/validation'
import { useToast } from '@/hooks/use-toast'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { TopicBadge } from '@/components/ComplianceInfo'
import { Tooltip } from '@/components/ui/tooltip'
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
  
  
  // Convex queries - now working with proper environment variable
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  const templatesQuery = useQuery(api.complianceTemplates.getActiveTemplates)
  
  // Use fallback empty arrays to prevent loading states when query returns undefined
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  const templates = templatesQuery || []

  const upsertTemplate = useMutation(api.complianceTemplates.upsertTemplate)
  const saveResearch = useMutation(api.savedResearch.saveResearch)
  const updateSavedResearch = useMutation(api.savedResearch.updateSavedResearch)
  const chatSettings = useQuery(api.chatSettings.getChatSettings)
  const updateChatSettings = useMutation(api.chatSettings.updateChatSettings)

  
  
  
  
  
  
  
  
  
  // Template editor state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    topicKey: string
    topicName: string
  } | null>(null)
  
  
  
  
  // Add website section visibility
  
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
  const [isRefinementMode, setIsRefinementMode] = useState(false)
  const [answerBeingRefined, setAnswerBeingRefined] = useState<any>(null)
  const [researchAbortController, setResearchAbortController] = useState<AbortController | null>(null)
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
  
  // Convert citation numbers to clickable links
  const makeSourceLinksClickable = (content: string, message: any) => {
    if (!content) return content
    
    // Build source URL map
    const sourceUrls: { [key: number]: string } = {}
    let currentIndex = 1
    
    // Scraped URLs first
    if (message.scrapedUrlSources) {
      message.scrapedUrlSources.forEach((s: any) => {
        sourceUrls[currentIndex++] = s.url
      })
    }
    
    // Internal sources (no URLs, skip)
    if (message.internalSources) {
      currentIndex += message.internalSources.length
    }
    
    // Web sources
    if (message.webSources) {
      message.webSources.forEach((s: any) => {
        sourceUrls[currentIndex++] = s.url
      })
    }
    
    // Replace [1], [2], [3] with clickable markdown links
    let processedContent = content
    Object.entries(sourceUrls).forEach(([num, url]) => {
      const citationPattern = new RegExp(`\\[${num}\\]`, 'g')
      processedContent = processedContent.replace(citationPattern, `[[${num}]](${url})`)
    })
    
    return processedContent
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
  

  // Handle escape key for modals
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
    
    // Create abort controller for this request
    const controller = new AbortController()
    setResearchAbortController(controller)
    
    try {
      // Filter out empty URLs
      const urlsToScrape = researchUrls.filter(url => url.trim()).map(url => url.trim());
      
      const response = await fetch('/api/compliance-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: currentQuery,
          includeInternalSources: true,
          jurisdiction: researchJurisdiction || undefined,
          topic: researchTopic || undefined,
          systemPrompt: researchSystemPrompt,
          firecrawlConfig: researchFirecrawlConfig,
          urls: urlsToScrape.length > 0 ? urlsToScrape : undefined,
          // Refinement mode data
          isRefinement: isRefinementMode,
          currentAnswer: isRefinementMode ? answerBeingRefined?.content : undefined,
          currentSources: isRefinementMode ? {
            scrapedUrls: answerBeingRefined?.scrapedUrlSources || [],
            internal: answerBeingRefined?.internalSources || [],
            web: answerBeingRefined?.webSources || [],
            news: answerBeingRefined?.newsResults || []
          } : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Research request failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      let answer = ''
      let sources: any = {}
      
      try {
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
      } catch (streamError: any) {
        // Handle stream reading errors (including abort)
        if (streamError.name === 'AbortError') {
          throw streamError // Re-throw to be caught by outer catch
        }
        console.warn('Stream reading error:', streamError)
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
      
      if (isRefinementMode) {
        addToast({
          variant: 'success',
          title: 'Refinement complete',
          description: 'Answer updated successfully',
          duration: 3000
        })
        // Exit refinement mode after successful refinement
        setIsRefinementMode(false)
        setAnswerBeingRefined(null)
      } else {
        addToast({
          variant: 'success',
          title: 'Research complete',
          description: `Found ${(sources.scrapedUrlSources?.length || 0) + (sources.internalSources?.length || 0) + (sources.sources?.length || 0)} sources`,
          duration: 3000
        })
      }
      
    } catch (error: any) {
      console.error('Research error:', error)
      
      // Check if it was aborted
      if (error.name === 'AbortError') {
        // Remove the empty assistant message
        setResearchMessages(prev => prev.filter(m => m.id !== assistantMessageId))
        
        addToast({
          variant: 'success',
          title: 'Research stopped',
          description: 'You cancelled the research request',
          duration: 2000
        })
      } else {
        // Remove the empty assistant message
        setResearchMessages(prev => prev.filter(m => m.id !== assistantMessageId))
        
        addToast({
          variant: 'error',
          title: isRefinementMode ? 'Refinement failed' : 'Research failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          duration: 5000
        })
      }
    } finally {
      setIsResearching(false)
      setResearchAbortController(null)
    }
  }
  
  const handleStopResearch = () => {
    if (researchAbortController) {
      try {
        researchAbortController.abort('User cancelled research')
      } catch (e) {
        // Ignore abort errors
      }
      setResearchAbortController(null)
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
                  AI-powered compliance research assistant
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
        subtitle="AI-powered compliance research assistant"
      />
      
      <MainContent maxWidth="7xl" className="py-12">
        <div className="space-y-6">
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
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="research-prompt">AI System Prompt</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const defaultPrompt = `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Provide accurate, authoritative information about employment law.
Cite sources using inline [1], [2], [3] format.
Distinguish between federal and state requirements.
Mention effective dates when relevant.
Note penalties or deadlines when applicable.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`;
                              
                              setResearchSystemPrompt(defaultPrompt);
                              setSelectedResearchTemplate(''); // Clear template selection
                              
                              addToast({
                                variant: 'success',
                                title: 'Reset to default',
                                description: 'AI System Prompt reset to default (template cleared)',
                                duration: 2000
                              });
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            Reset to Default
                          </Button>
                        </div>
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
                          Template selection auto-updates this prompt. Edit freely - click "Reset to Default" to restore.
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
                                          a: ({children, ...props}) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noreferrer" {...props}>{children}</a>,
                                        }}
                                      >
                                        {makeSourceLinksClickable(m.content, m) || 'Searching...'}
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
                                  setIsRefinementMode(true)
                                  setAnswerBeingRefined(m)
                                  setShowAdvancedResearchOptions(true)
                                  // Scroll to composer
                                  setTimeout(() => {
                                    researchListRef.current?.scrollTo({
                                      top: researchListRef.current.scrollHeight,
                                      behavior: 'smooth'
                                    })
                                  }, 100)
                                }}
                              >
                                <Edit className="h-3 w-3" /> Refine
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
                  
                  {/* Refinement Mode Banner */}
                  {isRefinementMode && answerBeingRefined && (
                    <div className="max-w-3xl mx-auto mb-2">
                      <div className="bg-purple-50 border-2 border-purple-400 rounded-lg p-4 relative">
                        {/* Big Red X - Top Right */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsRefinementMode(false)
                            setAnswerBeingRefined(null)
                          }}
                          className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110"
                          title="Exit Refinement Mode"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        
                        <div className="flex items-center gap-2 mb-1">
                          <Edit className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold text-purple-900">Refinement Mode</h4>
                        </div>
                        <p className="text-sm text-purple-700">
                          Refining: "{answerBeingRefined.content.substring(0, 60)}..."
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Adjust filters/template below or just describe changes. AI will update the answer while preserving structure.
                        </p>
                      </div>
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
                      placeholder={isRefinementMode 
                        ? "Tell AI what to change... (e.g., 'Change 2 hours to 5 hours', 'Add federal requirements', 'Expand penalties section')" 
                        : "Ask about employment law, regulations, requirements..."}
                      disabled={isResearching}
                      className="resize-none border-0 focus-visible:ring-0"
                    />
                    {isResearching ? (
                      <Button 
                        type="button" 
                        onClick={handleStopResearch} 
                        className="h-9 w-9 rounded-full p-0 bg-red-600 hover:bg-red-700"
                        title="Stop research"
                      >
                        <Square className="h-4 w-4 fill-current" />
                      </Button>
                    ) : (
                      <Button type="submit" disabled={!researchQuery.trim()} className="h-9 w-9 rounded-full p-0">
                        {isRefinementMode ? <Edit className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </MainContent>
      
      <Footer />
    </Layout>
  )
}