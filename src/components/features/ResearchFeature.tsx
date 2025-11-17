'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, ExternalLink, Globe, FileText, Newspaper, Loader2, CheckCircle2, Info, User, Copy, Check, Edit, Save, ChevronLeft, ChevronRight, ArrowUp, Square, ArrowDown, BookmarkPlus, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, Undo, Redo, Underline as UnderlineIcon, Code, Strikethrough, Quote, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify, Superscript as SuperscriptIcon, Subscript as SubscriptIcon } from 'lucide-react'
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
import { TiptapEditorModal } from '@/components/TiptapEditorModal'
import { ResearchMetadataForm } from '@/components/ResearchMetadataForm'
import { ErrorPopover } from '@/components/ui/error-popover'

interface ResearchFeatureProps {
  researchState?: {
    systemPrompt: string
    firecrawlConfig: string
    model?: string
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
  
  // Track which conversations have had their settings loaded
  const settingsLoadedForConversation = useRef<Set<string>>(new Set())
  const previousActiveTabId = useRef<string | null>(null)
  const tabsInitialized = useRef(false)
  const conversationsCreatedThisSession = useRef<Set<string>>(new Set())
  const lastAppliedConversationId = useRef<string | null>(null)
  const lastPersistedSettings = useRef<Map<string, any>>(new Map())
  
  // Tab management
  const [tabs, setTabs] = useState<Array<{
    id: string
    title: string
    conversationId: string | null
    messages: any[]
    hasUnsavedChanges: boolean
    followUpQuestions: string[]
  }>>([{
    id: 'tab-1',
    title: 'Research 1',
    conversationId: null,
    messages: [],
    hasUnsavedChanges: false,
    followUpQuestions: []
  }])
  const tabsRef = useRef(tabs)
  const [activeTabId, setActiveTabId] = useState('tab-1')
  const [isEditingTab, setIsEditingTab] = useState<string | null>(null)
  const [editingTabTitle, setEditingTabTitle] = useState('')
  const [tabsLoaded, setTabsLoaded] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteTabConfirm, setShowDeleteTabConfirm] = useState<string | null>(null)
  const [deleteTabPosition, setDeleteTabPosition] = useState({ x: 0, y: 0 })
  const [showSaveMetadataPopover, setShowSaveMetadataPopover] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveModalContent, setSaveModalContent] = useState('')
  const [messageToSave, setMessageToSave] = useState<any>(null)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveJurisdiction, setSaveJurisdiction] = useState('')
  const [saveTopic, setSaveTopic] = useState('')
  const [saveTemplate, setSaveTemplate] = useState('')
  
  const researchListRef = useRef<HTMLDivElement | null>(null)
  const researchInputRef = useRef<HTMLTextAreaElement | null>(null)
  const hasScrolledForResearchConversation = useRef<string | null>(null)
  
  // Scroll to bottom function - defined early so useEffects can reference it
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
  
  // Sync tabs ref with state
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])
  
  // Sync tabs from the database and lazily load conversations on demand
  useEffect(() => {
    if (!allConversationsQuery) return
      
    const conversations = allConversationsQuery || []
    const mappedTabs = conversations.map((conv: any) => ({
      id: conv._id,
      title: conv.title,
      conversationId: conv._id,
      messages: [],
      hasUnsavedChanges: false,
      followUpQuestions: []
    }))
        
    if (!tabsInitialized.current) {
      const initialTabs = mappedTabs.length > 0 ? mappedTabs : [{
        id: 'tab-1',
        title: 'Research 1',
        conversationId: null,
        messages: [],
        hasUnsavedChanges: false,
        followUpQuestions: []
      }]
      
      tabsInitialized.current = true
      tabsRef.current = initialTabs
      setTabs(initialTabs)

      const firstTab = initialTabs[0]
      const firstId = firstTab ? firstTab.id : null
      setActiveTabId(firstId)

      if (firstTab?.conversationId) {
        setConversationToLoad(firstTab.conversationId)
      }
      return
    }

    setTabs((prevTabs) => {
      const nonConversationTabs = prevTabs.filter(tab => !tab.conversationId)
      
      // Merge database tabs with existing tabs, preserving in-memory messages and settings
      const merged = mappedTabs.map((dbTab: any) => {
        const existingTab = prevTabs.find(t => t.id === dbTab.id)
        if (existingTab) {
          // Preserve messages and other runtime state from existing tab
          return {
            ...dbTab,
            messages: existingTab.messages,
            followUpQuestions: existingTab.followUpQuestions || []
          }
        }
        return dbTab
      })

      nonConversationTabs.forEach(tab => {
        if (!merged.some(existing => existing.id === tab.id)) {
          merged.push(tab)
        }
      })

      tabsRef.current = merged
      return merged
    })
  }, [allConversationsQuery])
  
  // Track the last loaded conversation to prevent re-running
  const lastLoadedConversationId = useRef<string | null>(null)
  
  // Load conversation messages when tab changes or conversation loads
  useEffect(() => {
    if (loadedConversation && activeTab.conversationId === conversationToLoad) {
      const convId = activeTab.conversationId || 'new'
      
      // Skip if we've already processed this exact conversation load
      if (lastLoadedConversationId.current === convId) {
        return
      }
      
      // CRITICAL: Don't reload from database while actively researching - it would overwrite in-memory sources
      if (isResearching) {
        console.log('[ResearchFeature] Skipping conversation load - research in progress');
        return
      }
      
      // Skip if this conversation was just created in this session (has unsaved messages)
      if (conversationsCreatedThisSession.current.has(convId) && activeTab.messages.length > 0) {
        lastLoadedConversationId.current = convId
        return
      }
      
      lastLoadedConversationId.current = convId
      
      const shouldScroll = hasScrolledForResearchConversation.current !== convId
      
      setIsLoadingConversation(true)
      
      // Restore settings from this conversation's settingsSnapshot
      if (loadedConversation.settingsSnapshot && setResearchState) {
        const snapshot = loadedConversation.settingsSnapshot
        
        // Clean up system prompt - remove any template content that was baked in (old behavior)
        let cleanSystemPrompt = snapshot.systemPrompt || '';
        if (cleanSystemPrompt.includes('IMPORTANT: Structure your response using this template format:')) {
          // Remove everything from "IMPORTANT: Structure..." to the end
          cleanSystemPrompt = cleanSystemPrompt.split('IMPORTANT: Structure your response using this template format:')[0].trim();
        }
        
        // Mark this conversation as having loaded settings
        if (activeTab.conversationId) {
          settingsLoadedForConversation.current.add(activeTab.conversationId)
          conversationsCreatedThisSession.current.delete(activeTab.conversationId)
          
          // Store in lastPersistedSettings for comparison
          lastPersistedSettings.current.set(activeTab.conversationId, {
            jurisdiction: snapshot.jurisdiction || '',
            topic: snapshot.topic || '',
            selectedTemplate: snapshot.selectedTemplate || '',
            urls: snapshot.urls || [''],
            additionalContext: snapshot.additionalContext || ''
          })
        }
        
        // Set flag to enable sync
        isSyncingFromConversation.current = true
        
        setResearchState({
          systemPrompt: cleanSystemPrompt,
          firecrawlConfig: snapshot.firecrawlConfig || '',
          model: snapshot.model,
          jurisdiction: snapshot.jurisdiction || '',
          topic: snapshot.topic || '',
          selectedTemplate: snapshot.selectedTemplate || '',
          urls: snapshot.urls || [''],
          additionalContext: snapshot.additionalContext || '',
          configError: null,
          lastPromptSent: snapshot.lastPromptSent || ''
        })
      }
      
      // Update tab with loaded messages and follow-up questions
      setTabs(prev => {
        const nextTabs = prev.map(tab => 
          tab.id === activeTabId 
            ? { ...tab, messages: loadedConversation.messages || [], followUpQuestions: loadedConversation.followUpQuestions || [] }
            : tab
        )
        tabsRef.current = nextTabs
        return nextTabs
      })
      // Give a moment for state to settle, then clear loading flag and scroll to bottom once
      setTimeout(() => {
        setIsLoadingConversation(false)
        if (shouldScroll) {
          scrollToBottom('instant')
          hasScrolledForResearchConversation.current = convId
        }
      }, 100)
    }
  }, [loadedConversation, conversationToLoad, activeTabId, scrollToBottom, setResearchState])
  
  // When switching tabs, load from the database
  useEffect(() => {
    if (!tabsInitialized.current || !activeTabId) return

    const newActiveTab = tabsRef.current.find(t => t.id === activeTabId)
    if (!newActiveTab) return

    if (newActiveTab.conversationId) {
      if (lastAppliedConversationId.current === newActiveTab.conversationId && previousActiveTabId.current === activeTabId) {
        return
      }

      lastAppliedConversationId.current = newActiveTab.conversationId
      previousActiveTabId.current = activeTabId

      // Check if we have persisted settings for this conversation
      const persisted = lastPersistedSettings.current.get(newActiveTab.conversationId)
      
      if (persisted && setResearchState) {
        setResearchState((prev: any) => ({
          ...prev,
          jurisdiction: persisted.jurisdiction,
          topic: persisted.topic,
          selectedTemplate: persisted.selectedTemplate,
          urls: persisted.urls,
          additionalContext: persisted.additionalContext
        }))
        setResearchJurisdiction(persisted.jurisdiction)
        setResearchTopic(persisted.topic)
        setSelectedResearchTemplate(persisted.selectedTemplate)
        setResearchUrls(persisted.urls)
      } else if (!settingsLoadedForConversation.current.has(newActiveTab.conversationId)) {
        // Load this conversation's settings from database
        setConversationToLoad(newActiveTab.conversationId)
      }
    } else {
      setConversationToLoad(null)
      lastAppliedConversationId.current = null
      previousActiveTabId.current = activeTabId

      // Reset to defaults for new tabs
      if (setResearchState) {
        setResearchState((prev: any) => ({
          ...prev,
          jurisdiction: '',
          topic: '',
          selectedTemplate: '',
          urls: [''],
          additionalContext: '',
          lastPromptSent: ''
        }))
      }
      setResearchJurisdiction('')
      setResearchTopic('')
      setSelectedResearchTemplate('')
      setResearchUrls([''])
    }
  }, [activeTabId, setResearchState])
  
  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  
  // Sync researchMessages with active tab
  const [researchQuery, setResearchQuery] = useState('')
  const researchMessages = activeTab.messages
  
  const setResearchMessages = (messages: any) => {
    setTabs(prev => {
      const nextTabs = prev.map(tab => {
        if (tab.id !== activeTabId) return tab
        
        const nextMessages = typeof messages === 'function' ? messages(tab.messages) : messages
        
        return { ...tab, messages: nextMessages, hasUnsavedChanges: true }
      })
      tabsRef.current = nextTabs
      return nextTabs
    })
  }
  
  // Get follow-up questions from active tab
  const researchFollowUpQuestions = activeTab?.followUpQuestions || []
  const setResearchFollowUpQuestions = (questions: string[]) => {
    setTabs(prev => {
      const nextTabs = prev.map(tab => 
        tab.id === activeTabId ? { ...tab, followUpQuestions: questions } : tab
      )
      tabsRef.current = nextTabs
      return nextTabs
    })
  }
  
  const [isResearching, setIsResearching] = useState(false)
  const [researchJurisdiction, setResearchJurisdiction] = useState('')
  const [researchTopic, setResearchTopic] = useState('')
  const [selectedResearchTemplate, setSelectedResearchTemplate] = useState<string>('')
  
  // Track if we're currently loading a conversation to prevent sync during user edits
  const isSyncingFromConversation = useRef(false)
  
  // Only sync parent state to local state when loading a conversation (not during user edits)
  useEffect(() => {
    // Only sync when we're loading a conversation
    if (!isLoadingConversation || !isSyncingFromConversation.current) {
      return
    }
    
    if (researchState) {
      setResearchJurisdiction(researchState.jurisdiction || '')
      setResearchTopic(researchState.topic || '')
      setSelectedResearchTemplate(researchState.selectedTemplate || '')
      setResearchUrls(researchState.urls && researchState.urls.length > 0 ? researchState.urls : [''])
    }
    
    isSyncingFromConversation.current = false
  }, [isLoadingConversation])
  
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
  
  // Unified auto-save for both settings and messages
  const settingsSaveTimeout = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!researchState || !activeTabId) return
 
    const activeTab = tabsRef.current.find(t => t.id === activeTabId)
    if (!activeTab) return
 
    // Don't auto-save while actively researching or loading
    if (isLoadingConversation || isResearching) return

    const hasMessages = researchMessages.length > 0

    const hasMeaningfulSettings = Boolean(
      researchState.selectedTemplate ||
      researchState.jurisdiction ||
      researchState.topic ||
      (researchState.urls && researchState.urls.length > 0 && researchState.urls[0]) ||
      (researchState.additionalContext && researchState.additionalContext.trim().length > 0)
    )

    // Skip if no conversation ID and no meaningful content
    if (!activeTab.conversationId && !hasMeaningfulSettings && !hasMessages) {
      return
    }

    if (settingsSaveTimeout.current) {
      clearTimeout(settingsSaveTimeout.current)
    }

    settingsSaveTimeout.current = setTimeout(async () => {
      const tabLatest = tabsRef.current.find(t => t.id === activeTabId)
      if (!tabLatest) {
        settingsSaveTimeout.current = null
        return
      }

      try {
        const result = await saveConversation({
          conversationId: tabLatest.conversationId as any || undefined,
          title: tabLatest.title,
          messages: researchMessages,
          filters: {
            jurisdiction: researchState.jurisdiction || undefined,
            topic: researchState.topic || undefined,
            templateUsed: researchState.selectedTemplate || undefined,
          },
          settingsSnapshot: {
            systemPrompt: researchState.systemPrompt,
            firecrawlConfig: researchState.firecrawlConfig,
            model: researchState.model,
            jurisdiction: researchState.jurisdiction,
            topic: researchState.topic,
            selectedTemplate: researchState.selectedTemplate,
            urls: researchState.urls || [],
            additionalContext: researchState.additionalContext,
            lastPromptSent: researchState.lastPromptSent || '',
          },
          followUpQuestions: tabLatest.followUpQuestions || [],
          truncateSources: false
        })

        let conversationId = tabLatest.conversationId as string | null

        if (result?.conversationId && !tabLatest.conversationId) {
          conversationId = result.conversationId as string
          settingsLoadedForConversation.current.add(conversationId)
          conversationsCreatedThisSession.current.add(conversationId)
          
          // Mark this conversation as already loaded to prevent re-loading from DB
          lastLoadedConversationId.current = conversationId

          tabsRef.current = tabsRef.current.map(tab =>
            tab.id === tabLatest.id ? { ...tab, conversationId } : tab
          )
          setTabs(tabsRef.current)
          
          // Don't call setConversationToLoad - we don't want to reload from DB
          // Just update the tracking refs
          lastAppliedConversationId.current = conversationId
          previousActiveTabId.current = activeTabId
        }
        
        // Store the persisted settings
        if (conversationId) {
          lastPersistedSettings.current.set(conversationId, {
            jurisdiction: researchState.jurisdiction,
            topic: researchState.topic,
            selectedTemplate: researchState.selectedTemplate,
            urls: researchState.urls || [],
            additionalContext: researchState.additionalContext || ''
          })
        }
      } catch (error) {
        console.error('Failed to persist research:', error)
      } finally {
        settingsSaveTimeout.current = null
      }
    }, 500)

    return () => {
      if (settingsSaveTimeout.current) {
        clearTimeout(settingsSaveTimeout.current)
        settingsSaveTimeout.current = null
      }
    }
  }, [researchState, activeTabId, isLoadingConversation, isResearching, saveConversation, researchMessages])
  
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
  const [isRefinementMode, setIsRefinementMode] = useState(false)
  const [answerBeingRefined, setAnswerBeingRefined] = useState<any>(null)
  const [researchAbortController, setResearchAbortController] = useState<AbortController | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const MAX_RESEARCH_URLS = 5
  
  // Error popover state
  const [errorPopover, setErrorPopover] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'error' | 'warning' | 'info'
    icon?: 'flame' | 'clock' | 'wifi' | 'database' | 'alert' | 'x-circle'
    actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'error'
  })
  
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

  // Only update scroll button state when messages change, don't force scroll
  useEffect(() => {
    if (!isLoadingConversation) {
      setTimeout(() => checkScrollPosition(), 100)
    }
  }, [researchMessages.length, checkScrollPosition, isLoadingConversation])

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
  
  // Convert citation numeric markers to clickable links
  const makeSourceLinksClickable = (content: string, message: any) => {
    if (!content) return content
    
    // Build source URL map in the order shown to the user
    const sourceUrls: { [key: number]: string } = {}
    let currentIndex = 1
    
    if (message.scrapedUrlSources) {
      message.scrapedUrlSources.forEach((s: any) => {
        if (s?.url) sourceUrls[currentIndex++] = s.url
      })
    }
    if (message.internalSources) {
      // internal sources have no URLs; advance index to keep numbering aligned
      currentIndex += message.internalSources.length
    }
    if (message.webSources) {
      message.webSources.forEach((s: any) => {
        if (s?.url) sourceUrls[currentIndex++] = s.url
      })
    }
    
    // Single pass: replace [1] or (1) (with optional spaces) with links
    const citationRegex = /(\[|\()\s*(\d+)\s*(\]|\))/g
    const processedContent = content.replace(citationRegex, (match, _open, numStr, _close) => {
      const num = Number(numStr)
      const url = sourceUrls[num]
      return url ? `[[${num}]](${url})` : match
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
    
    // Allow empty queries for template generation and follow-ups with memory

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
    }
    
    // Create assistant message that will stream
    const assistantMessageId = (Date.now() + 1).toString()
    setResearchMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    }])
    
    // Scroll to bottom to show the generating indicator (wait for DOM update)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom('smooth'), 100)
      })
    })
    
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
          selectedTemplateId: researchState?.selectedTemplate || selectedResearchTemplate || undefined,
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
                
                // Log ALL events to see what's being received
                if (parsed && parsed.type) {
                  console.log('[ResearchFeature] SSE event received:', parsed.type, parsed.type === 'sources' ? {
                    hasSources: !!parsed.sources,
                    sourcesCount: parsed.sources?.length,
                    hasNews: !!parsed.newsResults,
                    newsCount: parsed.newsResults?.length
                  } : '');
                }
                
                if (!parsed || !parsed.type) continue
                
                if (parsed.type === 'firecrawl_error') {
                  // Show error popover for Firecrawl errors (credits, rate limits, etc.)
                  setErrorPopover({
                    isOpen: true,
                    title: parsed.title || 'Firecrawl API Error',
                    message: parsed.message || 'An error occurred with the Firecrawl API',
                    variant: 'error',
                    icon: parsed.icon || 'alert'
                  })
                  
                  // Also remove the empty assistant message since research failed
                  setResearchMessages(prev => prev.filter(m => m.id !== assistantMessageId))
                  
                  // Stop processing - no point continuing
                  break;
                } else if (parsed.type === 'warning') {
                  // Set config error state to show in right panel
                  let warningDetails;
                  try {
                    warningDetails = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
                  } catch {
                    warningDetails = { message: parsed.message };
                  }
                  
                  // Update parent state to show error in right panel
                  if (setResearchState) {
                    setResearchState((prev: any) => ({
                      ...prev,
                      configError: warningDetails
                    }))
                  }
                } else if (parsed.type === 'prompt') {
                  // Store the final prompt for debugging
                  if (setResearchState) {
                    setResearchState((prev: any) => ({
                      ...prev,
                      lastPromptSent: parsed.prompt
                    }))
                  }
                } else if (parsed.type === 'sources') {
                  sources = parsed
                  console.log('[ResearchFeature] Received sources:', {
                    scrapedCount: (parsed.scrapedUrlSources || []).length,
                    internalCount: (parsed.internalSources || []).length,
                    webCount: (parsed.sources || []).length,
                    newsCount: (parsed.newsResults || []).length,
                    hasWebSources: !!parsed.sources,
                    hasNewsResults: !!parsed.newsResults,
                    parsedKeys: Object.keys(parsed)
                  });
                  
                  const webSourcesToSet = parsed.sources || [];
                  const newsResultsToSet = parsed.newsResults || [];
                  
                  console.log('[ResearchFeature] Setting webSources:', webSourcesToSet.length, 'newsResults:', newsResultsToSet.length);
                  
                  // Update assistant message with sources
                  setResearchMessages(prev => {
                    const updated = prev.map(m => {
                      if (m.id === assistantMessageId) {
                        const updatedMessage = {
                          ...m,
                          scrapedUrlSources: parsed.scrapedUrlSources || [],
                          internalSources: parsed.internalSources || [],
                          webSources: webSourcesToSet,
                          newsResults: newsResultsToSet
                        };
                        console.log('[ResearchFeature] Updated message with sources:', {
                          messageId: updatedMessage.id,
                          hasWebSources: !!updatedMessage.webSources,
                          webSourcesCount: updatedMessage.webSources?.length,
                          hasNewsResults: !!updatedMessage.newsResults,
                          newsResultsCount: updatedMessage.newsResults?.length
                        });
                        return updatedMessage;
                      }
                      return m;
                    });
                    return updated;
                  })
                } else if (parsed.type === 'text') {
                  answer += parsed.content
                  // Update assistant message with streaming content
                  setResearchMessages(prev => prev.map(m => {
                    if (m.id === assistantMessageId) {
                      const updated = { ...m, content: answer };
                      // Log to verify sources are preserved during content updates
                      if (answer.length < 100) { // Only log early in the stream to avoid spam
                        console.log('[ResearchFeature] Updating content, sources preserved?', {
                          hasWebSources: !!updated.webSources,
                          webSourcesCount: updated.webSources?.length,
                          hasNewsResults: !!updated.newsResults,
                          newsResultsCount: updated.newsResults?.length
                        });
                      }
                      return updated;
                    }
                    return m;
                  }))
                } else if (parsed.type === 'followup') {
                  setResearchFollowUpQuestions(parsed.questions || [])
                  // Scroll to bottom after research completes and focus input
                  setTimeout(() => {
                    scrollToBottom('smooth')
                    researchInputRef.current?.focus()
                  }, 100)
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
        // Check if stream read was aborted
        if (readError.name === 'AbortError' || readError.message?.toLowerCase().includes('abort')) {
          // Update last message to show it was stopped
          setResearchMessages(prev => prev.map((m, idx) =>
            idx === prev.length - 1 && m.role === 'assistant'
              ? { ...m, content: (m.content || '') + '\n\n_[Research stopped by user]_' }
              : m
          ))
          // Don't throw - just return from the function
          return
        } else {
          throw readError
        }
      }

    } catch (error: any) {
      // Check if this is an abort/cancel (user stopped research)
      const isAbort = error.name === 'AbortError' || 
                      (error.message && error.message.toLowerCase().includes('abort')) ||
                      (error.message && error.message.toLowerCase().includes('cancel'))
      
      if (isAbort) {
        // User intentionally stopped - silently clean up
        setResearchMessages(prev => prev.filter(m => m.id !== assistantMessageId))
        return
      }
      
      // Only log actual errors, not user cancellations
      console.error('Research error:', error)
      addToast({
        variant: 'error',
        title: 'Research failed',
        description: error.message || 'Failed to complete research',
        duration: 5000
      })
      
      // Remove the empty assistant message
      setResearchMessages(prev => prev.filter(m => m.id !== assistantMessageId))
    } finally {
      setIsResearching(false)
      setResearchAbortController(null)
    }
  }
  
  const handleStopResearch = () => {
    if (researchAbortController) {
      // Abort without reason to avoid error messages
      researchAbortController.abort()
      setResearchAbortController(null)
      setIsResearching(false)
    }
  }


  const handleClearChat = async () => {
    // Clear messages in UI
    setTabs(prev => {
      const nextTabs = prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, messages: [] }
          : tab
      )
      tabsRef.current = nextTabs
      return nextTabs
    })
    
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
            model: researchState?.model,
            jurisdiction: researchState?.jurisdiction || researchJurisdiction,
            topic: researchState?.topic || researchTopic,
            selectedTemplate: researchState?.selectedTemplate || selectedResearchTemplate,
            urls: researchState?.urls || [],
            additionalContext: researchState?.additionalContext,
            lastPromptSent: researchState?.lastPromptSent || '',
          },
          followUpQuestions: []
        })
      } catch (error) {
        console.error('Failed to clear conversation in database:', error)
      }
    }
    
    setResearchFollowUpQuestions([])
    setIsRefinementMode(false)
    setAnswerBeingRefined(null)
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
        model: researchState.model || 'gemini-2.5-flash-lite',
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
      title: `Research ${newTabNumber}`,
      conversationId: null,
      messages: [],
      hasUnsavedChanges: false,
      followUpQuestions: []
    }
    const nextTabs = [...tabsRef.current, newTab]
    tabsRef.current = nextTabs
    setTabs(nextTabs)
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
    tabsRef.current = newTabs
    setTabs(newTabs)
    
    // Switch to another tab if closing active tab
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
    
    setShowDeleteTabConfirm(null)
  }
  
  const handleRenameTab = async (tabId: string, newTitle: string) => {
    setTabs(prev => {
      const nextTabs = prev.map(tab => 
        tab.id === tabId ? { ...tab, title: newTitle } : tab
      )
      tabsRef.current = nextTabs
      return nextTabs
    })
    
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.conversationId) {
      await updateConversationTitle({
        conversationId: tab.conversationId as any,
        title: newTitle
      })
    }
    
    setIsEditingTab(null)
  }

  const handleOpenSaveModal = (message: any) => {
    setMessageToSave(message)
    
    // Build source URL map for converting citations to links
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
    
    // Convert citation numbers [1], [2], [3] to clickable links in main content
    let fullMarkdown = message.content
    Object.entries(sourceUrls).forEach(([num, url]) => {
      const citationPattern = new RegExp(`\\[${num}\\]`, 'g')
      fullMarkdown = fullMarkdown.replace(citationPattern, `[[${num}]](${url})`)
    })
    
    // Add sources sections in markdown format
    
    // Scraped URLs
    if (message.scrapedUrlSources && message.scrapedUrlSources.length > 0) {
      fullMarkdown += '\n\n---\n\n## 🔗 Your URLs\n\n';
      message.scrapedUrlSources.forEach((s: any, idx: number) => {
        const domain = new URL(s.url).hostname;
        const num = idx + 1;
        fullMarkdown += `[[${num}](${s.url})] [${s.title}](${s.url}) (${domain})\n\n`;
      });
    }
    
    // Internal Database Sources
    if (message.internalSources && message.internalSources.length > 0) {
      fullMarkdown += '\n## 📚 Your Database\n\n';
      message.internalSources.forEach((s: any, idx: number) => {
        const num = (message.scrapedUrlSources?.length || 0) + idx + 1;
        fullMarkdown += `[${num}] ${s.title}\n\n`;
      });
    }
    
    // Web Sources  
    if (message.webSources && message.webSources.length > 0) {
      const count = message.webSources.length;
      fullMarkdown += `\n## 🌐 Web Search (${count})\n\n`;
      message.webSources.forEach((s: any, idx: number) => {
        const num = (message.scrapedUrlSources?.length || 0) + (message.internalSources?.length || 0) + idx + 1;
        const domain = s.siteName || (s.url ? new URL(s.url).hostname : '');
        fullMarkdown += `[[${num}](${s.url})] [${s.title}](${s.url}) (${domain})\n\n`;
      });
    }
    
    // News Results
    if (message.newsResults && message.newsResults.length > 0) {
      const count = message.newsResults.length;
      fullMarkdown += `\n## 📰 News (${count})\n\n`;
      message.newsResults.forEach((n: any, idx: number) => {
        fullMarkdown += `[${n.title}](${n.url})\n`;
        if (n.publishedDate || n.source) {
          const parts = [];
          if (n.publishedDate) parts.push(n.publishedDate);
          if (n.source) parts.push(n.source);
          fullMarkdown += `\n*${parts.join(' • ')}*\n`;
        }
        fullMarkdown += '\n';
      });
    }
    
    setSaveModalContent(fullMarkdown)
    setShowSaveModal(true)
  }
  
  const handleSaveButtonClick = (markdown: string) => {
    // When user clicks Save in Tiptap, show metadata popover first
    // Pre-populate metadata
    const jurisdiction = researchState?.jurisdiction || researchJurisdiction || ''
    const topic = researchState?.topic || researchTopic || ''
    const template = researchState?.selectedTemplate || selectedResearchTemplate || ''
    const date = new Date().toLocaleDateString()
    const titlePrefix = jurisdiction ? `${jurisdiction} - ` : ''
    setSaveTitle(`${titlePrefix}Research - ${date}`)
    setSaveJurisdiction(jurisdiction)
    setSaveTopic(topic)
    setSaveTemplate(template)
    setSaveModalContent(markdown) // Store the edited content
    setShowSaveModal(false) // Close Tiptap
    setShowSaveMetadataPopover(true) // Show metadata form
  }
  
  const handleSaveFromModal = async () => {
    try {
      // Combine web and news sources
      const allSources = [
        ...(messageToSave?.webSources || []),
        ...(messageToSave?.newsResults || [])
      ]
      
      await saveResearch({
        title: saveTitle,
        content: saveModalContent, // Already converted to markdown
        jurisdiction: saveJurisdiction || undefined,
        topic: saveTopic || undefined,
        templateUsed: saveTemplate || undefined,
        sources: allSources.length > 0 ? allSources : undefined,
      })
      
      addToast({
        variant: 'success',
        title: 'Research saved',
        description: `Saved as: ${saveTitle}`,
        duration: 3000
      })
      
      setShowSaveMetadataPopover(false)
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Save failed',
        description: 'Could not save research',
        duration: 3000
      })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Error Popover */}
      <ErrorPopover
        isOpen={errorPopover.isOpen}
        onClose={() => setErrorPopover({ ...errorPopover, isOpen: false })}
        title={errorPopover.title}
        message={errorPopover.message}
        variant={errorPopover.variant}
        icon={errorPopover.icon}
        actions={errorPopover.actions}
      />
      
      {/* Save Metadata Popover - First Step */}
      {showSaveMetadataPopover && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowSaveMetadataPopover(false)}
          />
          
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save to Library</h3>
            
            <ResearchMetadataForm
              title={saveTitle}
              onTitleChange={setSaveTitle}
              jurisdiction={saveJurisdiction}
              onJurisdictionChange={setSaveJurisdiction}
              topic={saveTopic}
              onTopicChange={setSaveTopic}
              template={saveTemplate}
              onTemplateChange={setSaveTemplate}
            />
            
            <div className="flex gap-2 justify-end mt-6">
              <Button
                onClick={() => setShowSaveMetadataPopover(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFromModal}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save to Library
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Save Modal - Reusable Component */}
      <TiptapEditorModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        initialContent={saveModalContent}
        title="Edit Research Result"
        onSave={handleSaveButtonClick}
      />
      
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
          <div className="flex items-center gap-2 relative">
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
                                    {s.url && (
                                      <span className="text-gray-500 ml-1">({(() => { try { return new URL(s.url).hostname } catch { return '' } })()})</span>
                                    )}
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
                          {(() => {
                            console.log('[ResearchFeature] Rendering message:', {
                              messageId: m.id,
                              role: m.role,
                              hasWebSources: !!m.webSources,
                              webSourcesLength: m.webSources?.length,
                              webSourcesType: typeof m.webSources,
                              webSourcesIsArray: Array.isArray(m.webSources),
                              hasNewsResults: !!m.newsResults,
                              newsResultsLength: m.newsResults?.length
                            });
                            return null;
                          })()}
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
                                    {s.url && (
                                      <span className="text-gray-500 ml-1">({s.siteName || (() => { try { return new URL(s.url).hostname } catch { return '' } })()})</span>
                                    )}
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
                                    {n.url && (
                                      <span className="text-gray-500 ml-1">({(() => { try { return new URL(n.url).hostname } catch { return '' } })()})</span>
                                    )}
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
                      onClick={() => handleOpenSaveModal(m)}
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
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setResearchQuery(q)
                  setResearchFollowUpQuestions([])
                }}
                disabled={isResearching}
                className="text-xs px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-full transition-colors"
              >
                {q}
              </button>
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
        
        {/* Text Composer - Always Visible */}
        <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border px-3 py-2">
          <Textarea
            ref={researchInputRef}
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
