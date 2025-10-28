'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, ExternalLink, Globe, FileText, Newspaper, Loader2, CheckCircle2, Info, User, Copy, Check, Edit, Save, ChevronLeft, ChevronRight, ArrowUp, Square, ArrowDown, BookmarkPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Tooltip } from '@/components/ui/tooltip'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface ResearchFeatureProps {
  researchState?: {
    systemPrompt: string
    firecrawlConfig: string
    selectedTemplate: string
    jurisdiction: string
    topic: string
    urls: string[]
    additionalContext?: string
  }
  setResearchState?: (state: any) => void
}

export default function ResearchFeature({ researchState, setResearchState }: ResearchFeatureProps = {}) {
  const router = useRouter()
  const { addToast } = useToast()
  
  // Queries
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  const templatesQuery = useQuery(api.complianceTemplates.getActiveTemplates)
  
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  const templates = templatesQuery || []
  
  const saveResearch = useMutation(api.savedResearch.saveResearch)
  const saveConversation = useMutation(api.researchConversations.saveConversation)
  const deleteConversation = useMutation(api.researchConversations.deleteConversation)
  const updateConversationTitle = useMutation(api.researchConversations.updateConversationTitle)
  const allConversationsQuery = useQuery(api.researchConversations.getAllConversations)
  
  // Query to load a specific conversation when tab is clicked
  const [conversationToLoad, setConversationToLoad] = useState<string | null>(null)
  const loadedConversation = useQuery(
    api.researchConversations.getConversation,
    conversationToLoad ? { conversationId: conversationToLoad as any } : 'skip'
  )
  
  // Tab management
  const [tabs, setTabs] = useState<Array<{
    id: string
    title: string
    conversationId: string | null
    messages: any[]
    hasUnsavedChanges: boolean
  }>>([{
    id: 'tab-1',
    title: 'Chat 1',
    conversationId: null,
    messages: [],
    hasUnsavedChanges: false
  }])
  const [activeTabId, setActiveTabId] = useState('tab-1')
  const [isEditingTab, setIsEditingTab] = useState<string | null>(null)
  const [editingTabTitle, setEditingTabTitle] = useState('')
  const [tabsLoaded, setTabsLoaded] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteTabConfirm, setShowDeleteTabConfirm] = useState<string | null>(null)
  const [deleteTabPosition, setDeleteTabPosition] = useState({ x: 0, y: 0 })
  
  // Load saved conversations as tabs on mount
  useEffect(() => {
    if (allConversationsQuery && !tabsLoaded) {
      const conversations = allConversationsQuery || []
      
      if (conversations.length > 0) {
        // Create tabs from saved conversations
        const loadedTabs = conversations.map((conv, idx) => ({
          id: conv._id,
          title: conv.title,
          conversationId: conv._id,
          messages: [], // Will load when tab is activated
          hasUnsavedChanges: false
        }))
        
        setTabs(loadedTabs)
        setActiveTabId(loadedTabs[0].id)
        // Trigger loading of first conversation
        setConversationToLoad(loadedTabs[0].conversationId)
      }
      
      setTabsLoaded(true)
    }
  }, [allConversationsQuery, tabsLoaded])
  
  // Load conversation messages when tab changes or conversation loads
  useEffect(() => {
    if (loadedConversation && activeTab.conversationId === conversationToLoad) {
      setIsLoadingConversation(true)
      // Update tab with loaded messages
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, messages: loadedConversation.messages || [] }
          : tab
      ))
      // Give a moment for state to settle, then clear loading flag
      setTimeout(() => setIsLoadingConversation(false), 100)
    }
  }, [loadedConversation, conversationToLoad, activeTabId])
  
  // When switching tabs, load that tab's conversation if not already loaded
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab?.conversationId && activeTab.messages.length === 0) {
      // Tab has conversationId but no messages loaded yet
      setConversationToLoad(activeTab.conversationId)
    }
  }, [activeTabId, tabs])
  
  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  
  // Sync researchMessages with active tab
  const [researchQuery, setResearchQuery] = useState('')
  const researchMessages = activeTab.messages
  const setResearchMessages = (messages: any) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, messages: typeof messages === 'function' ? messages(tab.messages) : messages, hasUnsavedChanges: true }
        : tab
    ))
  }
  
  const [researchFollowUpQuestions, setResearchFollowUpQuestions] = useState<string[]>([])
  const [isResearching, setIsResearching] = useState(false)
  const [researchJurisdiction, setResearchJurisdiction] = useState('')
  const [researchTopic, setResearchTopic] = useState('')
  const [selectedResearchTemplate, setSelectedResearchTemplate] = useState<string>('')
  
  // Sync local state changes back to parent
  const updateJurisdiction = (value: string) => {
    setResearchJurisdiction(value)
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, jurisdiction: value })
    }
  }
  
  const updateTopic = (value: string) => {
    setResearchTopic(value)
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, topic: value })
    }
  }
  
  const updateSelectedTemplate = (value: string) => {
    setSelectedResearchTemplate(value)
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, selectedTemplate: value })
    }
  }
  
  const updateUrls = (urls: string[]) => {
    setResearchUrls(urls)
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, urls })
    }
  }
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
  const [showScrollButton, setShowScrollButton] = useState(false)
  const MAX_RESEARCH_URLS = 5
  
  // Research configuration state
  const [researchSystemPrompt, setResearchSystemPrompt] = useState(`You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Your role is to provide accurate, authoritative information about employment law based on the sources provided.

- Cite sources using inline [1], [2], [3] format
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed in your responses

If the user's question is extremely vague (like just "hello" or single word with no context), politely ask which jurisdiction and topic they're interested in. Otherwise, do your best to answer based on the sources and context available.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`)
  const [researchFirecrawlConfig, setResearchFirecrawlConfig] = useState(() => {
    return JSON.stringify({
      sources: ['web', 'news'],
      limit: 8,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
        maxAge: 86400000,
        removeBase64Images: true,
        timeout: 60000
      }
    }, null, 2)
  })
  
  // Template editor state (for when user wants to create/edit templates)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    topicKey: string
    topicName: string
  } | null>(null)
  
  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    const el = researchListRef.current
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
    const el = researchListRef.current
    if (el && researchMessages.length > 1) {
      const { scrollTop, scrollHeight, clientHeight } = el
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      const shouldShowButton = distanceFromBottom > 50
      setShowScrollButton(shouldShowButton)
    } else {
      setShowScrollButton(false)
    }
  }, [researchMessages.length])

  // Add scroll event listener
  useEffect(() => {
    const el = researchListRef.current
    if (el) {
      el.addEventListener('scroll', checkScrollPosition, { passive: true })
      checkScrollPosition()
      return () => el.removeEventListener('scroll', checkScrollPosition)
    }
  }, [researchMessages.length, checkScrollPosition])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
    setShowScrollButton(false)
    setTimeout(() => checkScrollPosition(), 100)
  }, [researchMessages, checkScrollPosition, scrollToBottom])

  // Copy message handler - includes sources in markdown
  const handleCopyResearchMessage = async (message: any, messageId: string) => {
    let fullContent = message.content;
    
    // Add sources sections in markdown format
    
    // Scraped URLs
    if (message.scrapedUrlSources && message.scrapedUrlSources.length > 0) {
      fullContent += '\n\n---\n\n## Sources - Your URLs\n\n';
      message.scrapedUrlSources.forEach((s: any, idx: number) => {
        fullContent += `${idx + 1}. **[${s.title}](${s.url})**\n`;
      });
    }
    
    // Internal Database Sources
    if (message.internalSources && message.internalSources.length > 0) {
      fullContent += '\n\n## Sources - Your Database\n\n';
      message.internalSources.forEach((s: any, idx: number) => {
        const num = (message.scrapedUrlSources?.length || 0) + idx + 1;
        fullContent += `${num}. **${s.title}**\n`;
      });
    }
    
    // Web Sources
    if (message.webSources && message.webSources.length > 0) {
      fullContent += '\n\n## Sources - Web Search\n\n';
      message.webSources.forEach((s: any, idx: number) => {
        const num = (message.scrapedUrlSources?.length || 0) + (message.internalSources?.length || 0) + idx + 1;
        fullContent += `${num}. **[${s.title}](${s.url})**\n`;
        if (s.description) fullContent += `   - ${s.description}\n`;
        if (s.siteName) fullContent += `   - Source: ${s.siteName}\n`;
        fullContent += '\n';
      });
    }
    
    // News Results
    if (message.newsResults && message.newsResults.length > 0) {
      fullContent += '\n\n## News Articles\n\n';
      message.newsResults.forEach((n: any, idx: number) => {
        fullContent += `- **[${n.title}](${n.url})**\n`;
        if (n.publishedDate) fullContent += `  - Published: ${n.publishedDate}\n`;
        if (n.source) fullContent += `  - Source: ${n.source}\n`;
        fullContent += '\n';
      });
    }
    
    try {
      await navigator.clipboard.writeText(fullContent)
      setCopiedResearchMessageId(messageId)
      setTimeout(() => setCopiedResearchMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy research message:', error)
      const textArea = document.createElement('textarea')
      textArea.value = fullContent
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
  
  // Handle research submit
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
    const wasInRefinementMode = isRefinementMode
    
    setResearchQuery('')
    setIsResearching(true)
    
    // Clear refinement mode when starting the request
    if (isRefinementMode) {
      setIsRefinementMode(false)
      setAnswerBeingRefined(null)
      setShowAdvancedResearchOptions(false)
    }
    
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
          jurisdiction: researchState?.jurisdiction || researchJurisdiction || undefined,
          topic: researchState?.topic || researchTopic || undefined,
          systemPrompt: researchState?.systemPrompt || researchSystemPrompt,
          firecrawlConfig: researchState?.firecrawlConfig || researchFirecrawlConfig,
          additionalContext: researchState?.additionalContext || undefined,
          urls: (researchState?.urls || researchUrls).filter((url: string) => url.trim()).length > 0 
            ? (researchState?.urls || researchUrls).filter((url: string) => url.trim()).map((url: string) => url.trim())
            : undefined,
          // Refinement mode data
          isRefinement: wasInRefinementMode,
          currentAnswer: wasInRefinementMode ? answerBeingRefined?.content : undefined,
          currentSources: wasInRefinementMode ? {
            scrapedUrls: answerBeingRefined?.scrapedUrlSources || [],
            internal: answerBeingRefined?.internalSources || [],
            web: answerBeingRefined?.webSources || [],
            news: answerBeingRefined?.newsResults || []
          } : undefined,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Research request failed: ${response.status}`)
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
                
                if (!parsed || !parsed.type) continue
                
                if (parsed.type === 'warning') {
                  // Set config error state to show in right panel
                  let warningDetails;
                  try {
                    warningDetails = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
                  } catch {
                    warningDetails = { message: parsed.message };
                  }
                  
                  // Update parent state to show error in right panel
                  if (setResearchState && researchState) {
                    setResearchState({
                      ...researchState,
                      configError: warningDetails
                    })
                  }
                } else if (parsed.type === 'prompt') {
                  // Store the final prompt for debugging
                  if (setResearchState && researchState) {
                    setResearchState({
                      ...researchState,
                      lastPromptSent: parsed.prompt
                    })
                  }
                } else if (parsed.type === 'sources') {
                  sources = parsed
                  // Update assistant message with sources
                  setResearchMessages(prev => prev.map(m =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          scrapedUrlSources: parsed.scrapedUrlSources || [],
                          internalSources: parsed.internalSources || [],
                          webSources: parsed.sources || [],
                          newsResults: parsed.newsResults || []
                        }
                      : m
                  ))
                } else if (parsed.type === 'text') {
                  answer += parsed.content
                  // Update assistant message with streaming content
                  setResearchMessages(prev => prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, content: answer }
                      : m
                  ))
                } else if (parsed.type === 'followup') {
                  setResearchFollowUpQuestions(parsed.questions || [])
                }
              } catch (parseError) {
                // Silently skip malformed JSON chunks - they happen at chunk boundaries
                // Only log if it's not a common "Unterminated string" error
                if (!(parseError instanceof SyntaxError && parseError.message.includes('Unterminated'))) {
                  console.error('Error parsing SSE data:', parseError)
                }
              }
            }
          }
        }
      } catch (readError: any) {
        if (readError.name === 'AbortError') {
          // Update last message to show it was stopped
          setResearchMessages(prev => prev.map((m, idx) =>
            idx === prev.length - 1 && m.role === 'assistant'
              ? { ...m, content: (m.content || '') + '\n\n_[Research stopped by user]_' }
              : m
          ))
        } else {
          throw readError
        }
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Research error:', error)
        addToast({
          variant: 'error',
          title: 'Research failed',
          description: error.message || 'Failed to complete research',
          duration: 5000
        })
        
        // Remove the empty assistant message
        setResearchMessages(prev => prev.filter(m => m.id !== assistantMessageId))
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

  // Auto-save active tab conversation after messages update (debounced)
  useEffect(() => {
    // Only auto-save if we have at least one complete exchange (user + assistant)
    const hasCompleteExchange = researchMessages.length >= 2 && 
                                researchMessages.some(m => m.role === 'assistant');
    
    // Don't save if we're loading an existing conversation or actively researching
    if (!hasCompleteExchange || isResearching || isLoadingConversation) return;
    
      const autoSaveTimer = setTimeout(async () => {
      try {
        // Pass existing conversationId if tab already has one
        const currentTab = tabs.find(t => t.id === activeTabId)
        
        const result = await saveConversation({
          conversationId: currentTab?.conversationId as any || undefined,
          title: currentTab?.title, // Use tab title (Chat 1, Chat 2, etc.)
          messages: researchMessages,
          filters: {
            jurisdiction: researchState?.jurisdiction || researchJurisdiction,
            topic: researchState?.topic || researchTopic,
            templateUsed: researchState?.selectedTemplate || selectedResearchTemplate,
          },
          settingsSnapshot: {
            systemPrompt: researchState?.systemPrompt || researchSystemPrompt,
            firecrawlConfig: researchState?.firecrawlConfig || researchFirecrawlConfig,
            additionalContext: researchState?.additionalContext,
          }
        })
        
        // Store conversation ID in the active tab (only if new)
        if (result.conversationId && !result.isUpdate) {
          setTabs(prev => prev.map(tab => 
            tab.id === activeTabId 
              ? { ...tab, conversationId: result.conversationId as string, hasUnsavedChanges: false }
              : tab
          ))
        } else if (result.isUpdate) {
          // Just mark as saved
          setTabs(prev => prev.map(tab => 
            tab.id === activeTabId 
              ? { ...tab, hasUnsavedChanges: false }
              : tab
          ))
        }
      } catch (error) {
        // Silent failure for auto-save
        console.error('Auto-save failed:', error)
      }
    }, 2000) // Auto-save 2 seconds after last message
    
    return () => clearTimeout(autoSaveTimer)
  }, [researchMessages, isResearching, isLoadingConversation, activeTabId])

  const handleClearChat = async () => {
    // Clear messages in UI
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, messages: [] }
        : tab
    ))
    
    // Also update database to remove messages (keep conversation shell)
    const currentTab = tabs.find(t => t.id === activeTabId)
    if (currentTab?.conversationId) {
      try {
        await saveConversation({
          conversationId: currentTab.conversationId as any,
          title: currentTab.title,
          messages: [], // Empty messages array
          filters: {
            jurisdiction: researchState?.jurisdiction || researchJurisdiction,
            topic: researchState?.topic || researchTopic,
            templateUsed: researchState?.selectedTemplate || selectedResearchTemplate,
          },
          settingsSnapshot: {
            systemPrompt: researchState?.systemPrompt || researchSystemPrompt,
            firecrawlConfig: researchState?.firecrawlConfig || researchFirecrawlConfig,
            additionalContext: researchState?.additionalContext,
          }
        })
      } catch (error) {
        console.error('Failed to clear conversation in database:', error)
      }
    }
    
    setResearchFollowUpQuestions([])
    setIsRefinementMode(false)
    setAnswerBeingRefined(null)
    setShowAdvancedResearchOptions(false)
    setShowClearConfirm(false)
    
    // Reset to default system prompt
    const defaultPrompt = `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Your role is to provide accurate, authoritative information about employment law based on the sources provided.

- Cite sources using inline [1], [2], [3] format
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed in your responses

If the user's question is extremely vague (like just "hello" or single word with no context), politely ask which jurisdiction and topic they're interested in. Otherwise, do your best to answer based on the sources and context available.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`
    
    // Reset Firecrawl config to default
    const defaultConfig = JSON.stringify({
      sources: ['web', 'news'],
      limit: 8,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
        maxAge: 86400000,
        removeBase64Images: true,
        timeout: 60000
      }
    }, null, 2)
    
    // Reset local state
    setResearchSystemPrompt(defaultPrompt)
    setResearchFirecrawlConfig(defaultConfig)
    updateJurisdiction('')
    updateTopic('')
    updateSelectedTemplate('')
    updateUrls([''])
    
    // Reset parent state (this updates the right panel)
    if (setResearchState && researchState) {
      setResearchState({
        systemPrompt: defaultPrompt,
        firecrawlConfig: defaultConfig,
        model: researchState.model || 'gemini-2.0-flash-exp',
        selectedTemplate: '',
        jurisdiction: '',
        topic: '',
        urls: [''],
        additionalContext: '',
        configError: null,
        lastPromptSent: ''
      })
    }
  }

  const handleAddTab = () => {
    const newTabNumber = tabs.length + 1
    const newTab = {
      id: `tab-${Date.now()}`,
      title: `Chat ${newTabNumber}`,
      conversationId: null,
      messages: [],
      hasUnsavedChanges: false
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }
  
  const handleCloseTab = async (tabId: string) => {
    if (tabs.length === 1) return // Don't close last tab
    
    const tabToClose = tabs.find(t => t.id === tabId)
    
    // Delete from database if it has a conversationId
    if (tabToClose?.conversationId) {
      await deleteConversation({ conversationId: tabToClose.conversationId as any })
    }
    
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    
    // Switch to another tab if closing active tab
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
    
    setShowDeleteTabConfirm(null)
  }
  
  const handleRenameTab = async (tabId: string, newTitle: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, title: newTitle } : tab
    ))
    
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.conversationId) {
      await updateConversationTitle({
        conversationId: tab.conversationId as any,
        title: newTitle
      })
    }
    
    setIsEditingTab(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Delete Tab Confirmation Popover - Fixed Position */}
      {showDeleteTabConfirm && (
        <>
          {/* Backdrop to catch clicks */}
          <div 
            className="fixed inset-0 z-[99]"
            onClick={() => setShowDeleteTabConfirm(null)}
          />
          
          <div 
            className="fixed bg-white border-2 border-red-300 rounded-lg shadow-2xl p-3 w-64 z-[100]"
            style={{
              left: `${deleteTabPosition.x}px`,
              top: `${deleteTabPosition.y + 8}px`
            }}
          >
            {(() => {
              const tab = tabs.find(t => t.id === showDeleteTabConfirm)
              return (
                <>
                  <p className="text-xs font-semibold text-gray-900 mb-1">Delete "{tab?.title}"?</p>
                  <p className="text-xs text-gray-600 mb-3">This will permanently delete the conversation from the database.</p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => setShowDeleteTabConfirm(null)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleCloseTab(showDeleteTabConfirm)}
                      size="sm"
                      className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </>
      )}
      
      {/* Header */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Compliance Research</h2>
            <p className="text-sm text-gray-600 mt-1">Search employment laws, regulations, and news with AI-powered insights</p>
          </div>
          <div className="relative">
            <Button
              onClick={() => setShowClearConfirm(true)}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              disabled={researchMessages.length === 0}
            >
              <X className="w-4 h-4 mr-1" />
              Clear Chat
            </Button>
            
            {/* Clear Chat Confirmation Popover */}
            {showClearConfirm && (
              <div className="absolute top-full right-0 mt-2 bg-white border-2 border-red-300 rounded-lg shadow-xl p-4 w-72 z-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">Clear this chat?</p>
                <p className="text-xs text-gray-600 mb-3">Messages will be removed but the conversation stays saved in the database.</p>
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setShowClearConfirm(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleClearChat}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pb-2 overflow-x-auto overflow-y-visible scrollbar-hide">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`
                flex items-center justify-between gap-2 px-4 py-2 rounded-t-md border-b-2 cursor-pointer min-w-[140px]
                ${activeTabId === tab.id 
                  ? 'bg-purple-50 border-purple-500 text-purple-700' 
                  : 'bg-zinc-50 border-transparent text-zinc-600 hover:bg-zinc-100'
                }
              `}
              onClick={() => setActiveTabId(tab.id)}
            >
              {isEditingTab === tab.id ? (
                <input
                  type="text"
                  value={editingTabTitle}
                  onChange={(e) => setEditingTabTitle(e.target.value)}
                  onBlur={() => handleRenameTab(tab.id, editingTabTitle)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameTab(tab.id, editingTabTitle)
                    if (e.key === 'Escape') setIsEditingTab(null)
                  }}
                  className="flex-1 px-1 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
              ) : (
                <span 
                  className="text-xs font-medium flex-1"
                  onDoubleClick={() => {
                    setIsEditingTab(tab.id)
                    setEditingTabTitle(tab.title)
                  }}
                >
                  {tab.title}
                </span>
              )}
              
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDeleteTabPosition({ x: rect.left, y: rect.bottom })
                    setShowDeleteTabConfirm(tab.id)
                  }}
                  className="hover:bg-red-100 rounded p-0.5 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={handleAddTab}
            className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>
      </div>
      
      {/* Chat Messages Area */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={researchListRef} className="h-full overflow-y-auto py-6">
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
                            {m.content ? (
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
                            ) : (
                              <div className="flex items-center gap-2 text-gray-500">
                                <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                                <span>Analyzing sources and generating response...</span>
                              </div>
                            )}
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
                      onClick={() => handleCopyResearchMessage(m, m.id)} 
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
                        // Save research functionality (placeholder)
                      }}
                    >
                      <Save className="h-3 w-3" /> Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button
              onClick={() => {
                scrollToBottom('smooth')
                setShowScrollButton(false)
              }}
              size="sm"
              className="h-10 w-10 rounded-full p-0 shadow-lg bg-purple-600 hover:bg-purple-700 text-white border-0 transition-all duration-200 hover:scale-105"
              title="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Bottom composer */}
      <form onSubmit={handleResearchSubmit} className="flex-shrink-0">
        {/* Follow-up question chips */}
        {researchFollowUpQuestions.length > 0 && (
          <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2 py-3 mb-2">
            {researchFollowUpQuestions.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-3 text-xs leading-relaxed"
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
                onChange={(e) => updateJurisdiction(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                disabled={isResearching}
              >
                <option value="">None</option>
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
                onChange={(e) => updateTopic(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                disabled={isResearching}
              >
                <option value="">None</option>
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
                const defaultPrompt = `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Your role is to provide accurate, authoritative information about employment law based on the sources provided.

- Cite sources using inline [1], [2], [3] format
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed in your responses

If the user's question is extremely vague (like just "hello" or single word with no context), politely ask which jurisdiction and topic they're interested in. Otherwise, do your best to answer based on the sources and context available.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`;
                
                updateSelectedTemplate('');
                setResearchSystemPrompt(defaultPrompt);
                
                // Update parent state
                if (setResearchState && researchState) {
                  setResearchState({ ...researchState, systemPrompt: defaultPrompt, selectedTemplate: '' })
                }
                
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
                updateSelectedTemplate(selectedValue);
                
                // Find template and update system prompt with its structure
                const template = templates?.find((t: any) => t.templateId === selectedValue);
                if (template && template.markdownContent) {
                  const enhancedPrompt = `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Your role is to provide accurate, authoritative information about employment law based on the sources provided.

- Cite sources using inline [1], [2], [3] format
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed in your responses

If the user's question is extremely vague (like just "hello" or single word with no context), politely ask which jurisdiction and topic they're interested in. Otherwise, do your best to answer based on the sources and context available.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.

IMPORTANT: Structure your response using this template format:
${template.markdownContent}

Follow the template sections but adapt based on the query. Not all sections may be relevant for every query.`;
                  
                  setResearchSystemPrompt(enhancedPrompt);
                  
                  // Also update parent state
                  if (setResearchState && researchState) {
                    setResearchState({ ...researchState, systemPrompt: enhancedPrompt, selectedTemplate: selectedValue })
                  }
                  
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
                        updateUrls(newUrls);
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
                        updateUrls(newUrls);
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
                        updateUrls([...researchUrls, '']);
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
            <Button type="submit" disabled={!researchQuery.trim()} className="h-9 w-9 rounded-full p-0 bg-purple-500 hover:bg-purple-600">
              {isRefinementMode ? <Edit className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
