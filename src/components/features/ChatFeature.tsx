'use client'

import { useState, useRef, useEffect, useCallback, Dispatch, SetStateAction } from 'react'
import { MessageCircle, Plus, X, FileText, User, Copy, Check, ArrowUp, Square, ArrowDown, Bot, ThumbsUp, ThumbsDown, BookOpen, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { TiptapEditorModal } from '@/components/TiptapEditorModal'

export type ChatFeatureState = {
  systemPrompt: string
  model?: string
  jurisdiction: string
  topic: string
  additionalContext?: string
  selectedResearchIds?: string[]
  savedResearchContent?: string
  lastPromptSent?: string
}

interface ChatFeatureProps {
  chatState?: ChatFeatureState
  setChatState?: Dispatch<SetStateAction<ChatFeatureState>>
  onHydrated?: () => void
}

export default function ChatFeature({ chatState, setChatState, onHydrated }: ChatFeatureProps = {}) {
  const { addToast } = useToast()
  
  const saveConversation = useMutation(api.chatConversations.saveConversation)
  const deleteConversation = useMutation(api.chatConversations.deleteConversation)
  const updateConversationTitle = useMutation(api.chatConversations.updateConversationTitle)
  const allConversationsQuery = useQuery(api.chatConversations.getAllConversations)
  
  // Query to load a specific conversation when tab is clicked
  const [conversationToLoad, setConversationToLoad] = useState<string | null>(null)
  const loadedConversation = useQuery(
    api.chatConversations.getConversation,
    conversationToLoad ? { conversationId: conversationToLoad as any } : 'skip'
  )
  
  // Track which conversations have had their settings loaded
  const settingsLoadedForConversation = useRef<Set<string>>(new Set())
  const previousActiveTabId = useRef<string | null>(null)
  
  type TabSettingsCacheEntry = {
    systemPrompt: string
    model?: string
    jurisdiction: string
    topic: string
    additionalContext: string
    selectedResearchIds: string[]
    savedResearchContent: string
    lastPromptSent: string
  }

type ChatTab = {
  id: string
  title: string
  conversationId: string | null
  messages: any[]
  hasUnsavedChanges: boolean
  followUpQuestions: string[]
}

const createChatTab = (id: string, title: string, conversationId: string | null = null): ChatTab => ({
  id,
  title,
  conversationId,
  messages: [],
  hasUnsavedChanges: false,
  followUpQuestions: []
})

  const buildCacheEntryFromState = (state?: ChatFeatureState): TabSettingsCacheEntry => ({
    systemPrompt: state?.systemPrompt || '',
    model: state?.model,
    jurisdiction: state?.jurisdiction || '',
    topic: state?.topic || '',
    additionalContext: state?.additionalContext || '',
    selectedResearchIds: Array.isArray(state?.selectedResearchIds)
      ? [...(state?.selectedResearchIds as string[])]
      : [],
    savedResearchContent: state?.savedResearchContent || '',
    lastPromptSent: state?.lastPromptSent || ''
  })

  const cloneCacheEntry = (entry: Partial<TabSettingsCacheEntry> | undefined): TabSettingsCacheEntry => ({
    systemPrompt: entry?.systemPrompt || '',
    model: entry?.model,
    jurisdiction: entry?.jurisdiction || '',
    topic: entry?.topic || '',
    additionalContext: entry?.additionalContext || '',
    selectedResearchIds: Array.isArray(entry?.selectedResearchIds)
      ? [...entry!.selectedResearchIds!]
      : [],
    savedResearchContent: entry?.savedResearchContent || '',
    lastPromptSent: entry?.lastPromptSent || ''
  })

  // Use ref-based cache for instant reads (state updates aren't synchronous)
  const tabSettingsCache = useRef<Map<string, TabSettingsCacheEntry>>(new Map())
  const lastPersistedSettings = useRef<Map<string, TabSettingsCacheEntry>>(new Map())
  const settingsSaveTimeout = useRef<NodeJS.Timeout | null>(null)

  const areSettingsEqual = (a: TabSettingsCacheEntry, b: TabSettingsCacheEntry) => {
    if (a === b) return true
    if (!a || !b) return false

    return (
      a.systemPrompt === b.systemPrompt &&
      a.model === b.model &&
      a.jurisdiction === b.jurisdiction &&
      a.topic === b.topic &&
      a.additionalContext === b.additionalContext &&
      a.savedResearchContent === b.savedResearchContent &&
      a.lastPromptSent === b.lastPromptSent &&
      a.selectedResearchIds.length === b.selectedResearchIds.length &&
      a.selectedResearchIds.every((id, index) => id === b.selectedResearchIds[index])
    )
  }

  const persistSettingsToSession = () => {
    if (typeof window === 'undefined') return
    const serialized: Record<string, TabSettingsCacheEntry> = {}
    tabSettingsCache.current.forEach((value, key) => {
      serialized[key] = {
        ...value,
        selectedResearchIds: [...value.selectedResearchIds]
      }
    })

    try {
      window.sessionStorage.setItem('rr-chat-tab-settings', JSON.stringify(serialized))
    } catch (error) {
      console.error('Failed to persist chat tab settings to session storage:', error)
    }
  }

const persistTabsToSession = (tabsToPersist: ChatTab[]) => {
  if (typeof window === 'undefined') return
  try {
    const serialized = tabsToPersist.map(tab => ({
      id: tab.id,
      title: tab.title,
      conversationId: tab.conversationId
    }))
    window.sessionStorage.setItem('rr-chat-tabs', JSON.stringify(serialized))
  } catch (error) {
    console.error('Failed to persist chat tabs to session storage:', error)
  }
}

const loadTabsFromSession = (): ChatTab[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const saved = window.sessionStorage.getItem('rr-chat-tabs')
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return null
    return parsed.map((tab: any, index: number) => ({
      id: typeof tab?.id === 'string' ? tab.id : `tab-${Date.now()}-${index}`,
      title: typeof tab?.title === 'string' ? tab.title : `Chat ${index + 1}`,
      conversationId: typeof tab?.conversationId === 'string' ? tab.conversationId : null,
      messages: [],
      hasUnsavedChanges: false,
      followUpQuestions: []
    }))
  } catch (error) {
    console.error('Failed to parse chat tabs from session storage:', error)
    return null
  }
}

const loadActiveTabFromSession = (fallbackId: string): string => {
  if (typeof window === 'undefined') return fallbackId
  const saved = window.sessionStorage.getItem('rr-chat-active-tab')
  return typeof saved === 'string' && saved.trim().length > 0 ? saved : fallbackId
}
  
// Tab management
const defaultTab: ChatTab = createChatTab('tab-1', 'Chat 1')

const [tabs, setTabs] = useState<ChatTab[]>([defaultTab])
const tabsRef = useRef(tabs)
const sessionHydrated = useRef(false)
const [tabsHydrated, setTabsHydrated] = useState(false)
const [activeTabId, setActiveTabId] = useState('tab-1')
  const [isEditingTab, setIsEditingTab] = useState<string | null>(null)
  const [editingTabTitle, setEditingTabTitle] = useState('')
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteTabConfirm, setShowDeleteTabConfirm] = useState<string | null>(null)
  const [deleteTabPosition, setDeleteTabPosition] = useState({ x: 0, y: 0 })
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down' | null>>({})
  const [viewingSavedResearch, setViewingSavedResearch] = useState<any>(null)

  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

// Load tabs and active tab from session storage on mount
useEffect(() => {
  const storedTabs = loadTabsFromSession()
  if (storedTabs && storedTabs.length > 0) {
    setTabs(storedTabs)
    tabsRef.current = storedTabs
    const savedActive = loadActiveTabFromSession(storedTabs[0].id)
    if (storedTabs.some(tab => tab.id === savedActive)) {
      setActiveTabId(savedActive)
    } else {
      setActiveTabId(storedTabs[0].id)
    }
  } else {
    if (typeof window !== 'undefined') {
      const savedActive = loadActiveTabFromSession(defaultTab.id)
      setActiveTabId(savedActive)
    }
  }
  sessionHydrated.current = true
  setTabsHydrated(true)
}, [])

// Persist tabs metadata to session storage when they change
useEffect(() => {
  if (!sessionHydrated.current || !tabsHydrated) return
  persistTabsToSession(tabs)
}, [tabs, tabsHydrated])

// Persist active tab id
useEffect(() => {
  if (!sessionHydrated.current || !tabsHydrated || typeof window === 'undefined') return
  window.sessionStorage.setItem('rr-chat-active-tab', activeTabId)
}, [activeTabId, tabsHydrated])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const saved = window.sessionStorage.getItem('rr-chat-tab-settings')
      if (!saved) return

      const parsed = JSON.parse(saved)
      if (!parsed || typeof parsed !== 'object') return

      Object.entries(parsed as Record<string, Partial<TabSettingsCacheEntry>>).forEach(([tabId, entry]) => {
        const normalized = cloneCacheEntry(entry)
        tabSettingsCache.current.set(tabId, normalized)
        lastPersistedSettings.current.set(tabId, normalized)
      })
    } catch (error) {
      console.error('Failed to load chat tab settings from session storage:', error)
    }
  }, [])
  
  const chatListRef = useRef<HTMLDivElement | null>(null)
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null)
  const hasScrolledForConversation = useRef<string | null>(null)
  
  // Scroll to bottom function - defined early so useEffects can reference it
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    const el = chatListRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior
        })
      })
    }
  }, [])
  
const tabsAreEqual = (a: ChatTab[], b: ChatTab[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const tabA = a[i]
    const tabB = b[i]
    if (
      tabA.id !== tabB.id ||
      tabA.title !== tabB.title ||
      tabA.conversationId !== tabB.conversationId
    ) {
      return false
    }
  }
  return true
}

// Sync tabs with saved conversations from database
useEffect(() => {
  if (!allConversationsQuery) return

  const conversations = allConversationsQuery || []
  const existingTabs = tabsRef.current
  const existingById = new Map(existingTabs.map(tab => [tab.id, tab]))
  const mergedTabs: ChatTab[] = []

  conversations.forEach((conv: any) => {
    const existing = existingById.get(conv._id)
    if (existing) {
      mergedTabs.push({
        ...existing,
        id: conv._id,
        title: conv.title,
        conversationId: conv._id
      })
      existingById.delete(conv._id)
    } else {
      mergedTabs.push(createChatTab(conv._id, conv.title, conv._id))
    }
  })

  existingTabs.forEach(tab => {
    if (!mergedTabs.some(t => t.id === tab.id)) {
      const shouldKeepPlaceholder =
        mergedTabs.length === 0 ||
        Boolean(tab.conversationId) ||
        tab.messages.length > 0 ||
        tab.hasUnsavedChanges ||
        tab.followUpQuestions.length > 0

      if (shouldKeepPlaceholder) {
        mergedTabs.push(tab)
      }
    }
  })

  if (mergedTabs.length === 0) {
    mergedTabs.push(defaultTab)
  }

  if (!tabsAreEqual(mergedTabs, existingTabs)) {
    setTabs(mergedTabs)
  }

  const activeExists = mergedTabs.some(tab => tab.id === activeTabId)
  const nextActiveId = activeExists ? activeTabId : mergedTabs[0].id

  if (nextActiveId !== activeTabId) {
    setActiveTabId(nextActiveId)
  }

  const activeTab = mergedTabs.find(tab => tab.id === nextActiveId)
  if (activeTab?.conversationId) {
    setConversationToLoad(activeTab.conversationId)
  } else {
    setConversationToLoad(null)
  }
}, [allConversationsQuery])
  
  // Track the last loaded conversation to prevent re-running
  const lastLoadedConversationId = useRef<string | null>(null)
  
  // Load conversation messages when tab changes or conversation loads
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (loadedConversation && activeTab && activeTab.conversationId === conversationToLoad) {
      const convId = activeTab.conversationId || 'new'
      
      // Skip if we've already processed this exact conversation load
      if (lastLoadedConversationId.current === convId) {
        return
      }
      
      lastLoadedConversationId.current = convId
      
      // Only scroll if we haven't already scrolled for this conversation
      const shouldScroll = hasScrolledForConversation.current !== convId
      
      setIsLoadingConversation(true)
      
      // Restore settings from this conversation's settingsSnapshot
      if (loadedConversation.settingsSnapshot && setChatState) {
        const snapshot = loadedConversation.settingsSnapshot
        const tabCacheKey = activeTab.id

        // Mark this conversation as having loaded settings
        if (activeTab.conversationId) {
          settingsLoadedForConversation.current.add(activeTab.conversationId)
        }

        const loadedSnapshot: TabSettingsCacheEntry = {
          systemPrompt: snapshot.systemPrompt || '',
          model: snapshot.model,
          jurisdiction: snapshot.jurisdiction || '',
          topic: snapshot.topic || '',
          additionalContext: snapshot.additionalContext || '',
          selectedResearchIds: Array.isArray(snapshot.selectedResearchIds) ? [...snapshot.selectedResearchIds] : [],
          savedResearchContent: snapshot.savedResearchContent || '',
          lastPromptSent: snapshot.lastPromptSent || ''
        }

        // Cache in refs for instant tab switching and persistence comparison
        tabSettingsCache.current.set(tabCacheKey, loadedSnapshot)
        lastPersistedSettings.current.set(tabCacheKey, loadedSnapshot)
        persistSettingsToSession()

        setChatState(prev => ({
          ...prev,
          systemPrompt: loadedSnapshot.systemPrompt,
          model: loadedSnapshot.model,
          jurisdiction: loadedSnapshot.jurisdiction,
          topic: loadedSnapshot.topic,
          additionalContext: loadedSnapshot.additionalContext,
          selectedResearchIds: [...loadedSnapshot.selectedResearchIds],
          savedResearchContent: loadedSnapshot.savedResearchContent,
          lastPromptSent: loadedSnapshot.lastPromptSent
        }))

        // Also update local state
        setChatJurisdiction(loadedSnapshot.jurisdiction)
        setChatTopic(loadedSnapshot.topic)
        if (loadedSnapshot.systemPrompt) {
          setChatSystemPrompt(loadedSnapshot.systemPrompt)
        }

        onHydrated?.()
      }
      
      // Update tab with loaded messages and follow-up questions
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, messages: loadedConversation.messages || [], followUpQuestions: loadedConversation.followUpQuestions || [] }
          : tab
      ))
      // Give a moment for state to settle, then clear loading flag and scroll to bottom once
      setTimeout(() => {
        setIsLoadingConversation(false)
        if (shouldScroll) {
          scrollToBottom('instant')
          hasScrolledForConversation.current = convId
        }
      }, 100)
    }
  }, [loadedConversation, conversationToLoad, activeTabId, scrollToBottom, setChatState])
  
  // When switching tabs, restore settings from tab cache or load from database
  useEffect(() => {
    if (!tabsHydrated) return

    // Only run when actually switching tabs (not on every render)
    if (previousActiveTabId.current === activeTabId) {
      return
    }

    // Before switching, save current settings to ref-based cache (instant, no async state issues)
    if (previousActiveTabId.current && chatState) {
      tabSettingsCache.current.set(previousActiveTabId.current, buildCacheEntryFromState(chatState))
    }

    // Get the tab we're switching TO
    const newActiveTab = tabs.find(t => t.id === activeTabId)

    previousActiveTabId.current = activeTabId

    // Check ref cache first (instant reads)
    const cachedSettings = tabSettingsCache.current.get(activeTabId)

    if (cachedSettings) {
      // Restore from ref cache
      if (setChatState) {
        setChatState(prev => ({
          ...prev,
          systemPrompt: cachedSettings.systemPrompt,
          model: cachedSettings.model,
          jurisdiction: cachedSettings.jurisdiction,
          topic: cachedSettings.topic,
          additionalContext: cachedSettings.additionalContext,
          selectedResearchIds: cachedSettings.selectedResearchIds,
          savedResearchContent: cachedSettings.savedResearchContent,
          lastPromptSent: cachedSettings.lastPromptSent
        }))
      }
      setChatJurisdiction(cachedSettings.jurisdiction)
      setChatTopic(cachedSettings.topic)
      if (cachedSettings.systemPrompt) {
        setChatSystemPrompt(cachedSettings.systemPrompt)
      }

      if (
        newActiveTab?.conversationId &&
        !settingsLoadedForConversation.current.has(newActiveTab.conversationId)
      ) {
        setConversationToLoad(newActiveTab.conversationId)
      }
    } else if (newActiveTab?.conversationId) {
      // No cached settings - load from database if not already loaded
      if (!settingsLoadedForConversation.current.has(newActiveTab.conversationId)) {
        setConversationToLoad(newActiveTab.conversationId)
      }
    } else {
      // New tab without saved conversation - reset to defaults
      setConversationToLoad(null)
      if (setChatState) {
        setChatState(prev => ({
          ...prev,
          jurisdiction: '',
          topic: '',
          additionalContext: '',
          selectedResearchIds: [],
          savedResearchContent: '',
          lastPromptSent: ''
        }))
      }
      setChatJurisdiction('')
      setChatTopic('')
    }
  }, [activeTabId, chatState, setChatState, tabs, tabsHydrated])
  
  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  
  // Sync messages with active tab
  const [chatQuery, setChatQuery] = useState('')
  const chatMessages = activeTab.messages
  const setChatMessages = (messages: any) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, messages: typeof messages === 'function' ? messages(tab.messages) : messages, hasUnsavedChanges: true }
        : tab
    ))
  }
  
  const [isChatting, setIsChatting] = useState(false)
  const [chatJurisdiction, setChatJurisdiction] = useState('')
  const [chatTopic, setChatTopic] = useState('')
  
  useEffect(() => {
    if (!chatState) return

    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return

    let tabId = activeTab.id
    const snapshot = buildCacheEntryFromState(chatState)
    const cachedSnapshot: TabSettingsCacheEntry = {
      ...snapshot,
      selectedResearchIds: [...snapshot.selectedResearchIds]
    }

    tabSettingsCache.current.set(tabId, cachedSnapshot)
    persistSettingsToSession()

    const lastSaved = lastPersistedSettings.current.get(tabId)
    if (lastSaved && areSettingsEqual(lastSaved, snapshot)) {
      return
    }

    if (isLoadingConversation) {
      return
    }

    const activeConversationId = activeTab.conversationId
    if (
      activeConversationId &&
      !settingsLoadedForConversation.current.has(activeConversationId)
    ) {
      return
    }

    const hasMeaningfulSettings = Boolean(
      snapshot.selectedResearchIds.length > 0 ||
      (snapshot.additionalContext && snapshot.additionalContext.trim().length > 0) ||
      snapshot.jurisdiction ||
      snapshot.topic ||
      snapshot.lastPromptSent
    )

    if (!activeTab.conversationId && !hasMeaningfulSettings) {
      return
    }

    if (settingsSaveTimeout.current) {
      clearTimeout(settingsSaveTimeout.current)
    }

    settingsSaveTimeout.current = setTimeout(async () => {
      const tabLatest = tabsRef.current.find(t => t.id === tabId)
      if (!tabLatest) {
        settingsSaveTimeout.current = null
        return
      }

      try {
        const result = await saveConversation({
          conversationId: tabLatest.conversationId as any || undefined,
          title: tabLatest.title,
          messages: tabLatest.messages,
          filters: {
            jurisdiction: snapshot.jurisdiction || undefined,
            topic: snapshot.topic || undefined,
          },
          settingsSnapshot: {
            systemPrompt: snapshot.systemPrompt,
            model: snapshot.model,
            jurisdiction: snapshot.jurisdiction,
            topic: snapshot.topic,
            additionalContext: snapshot.additionalContext,
            selectedResearchIds: snapshot.selectedResearchIds,
            savedResearchContent: snapshot.savedResearchContent,
            lastPromptSent: snapshot.lastPromptSent,
          },
          followUpQuestions: tabLatest.followUpQuestions || []
        })

        if (result?.conversationId && !tabLatest.conversationId) {
          const newConversationId = result.conversationId as string
          settingsLoadedForConversation.current.add(newConversationId)

          const previousTabId = tabLatest.id

          setTabs(prev => prev.map(tab =>
            tab.id === previousTabId
              ? { ...tab, id: newConversationId, conversationId: newConversationId }
              : tab
          ))

          setActiveTabId(prevId => (prevId === previousTabId ? newConversationId : prevId))

          const cacheEntry = tabSettingsCache.current.get(previousTabId)
          if (cacheEntry) {
            tabSettingsCache.current.delete(previousTabId)
            tabSettingsCache.current.set(newConversationId, cacheEntry)
          }

          const persistedEntry = lastPersistedSettings.current.get(previousTabId)
          if (persistedEntry) {
            lastPersistedSettings.current.delete(previousTabId)
            lastPersistedSettings.current.set(newConversationId, persistedEntry)
          }

          persistSettingsToSession()

          tabId = newConversationId
        }

        lastPersistedSettings.current.set(tabId, {
          ...snapshot,
          selectedResearchIds: [...snapshot.selectedResearchIds]
        })
        persistSettingsToSession()
      } catch (error) {
        console.error('Failed to persist chat settings:', error)
      } finally {
        settingsSaveTimeout.current = null
      }
    }, 800)

    return () => {
      if (settingsSaveTimeout.current) {
        clearTimeout(settingsSaveTimeout.current)
        settingsSaveTimeout.current = null
      }
    }
  }, [chatState, activeTabId, isLoadingConversation, saveConversation, tabs])

  // Sync local state changes back to parent
  const updateJurisdiction = (value: string) => {
    setChatJurisdiction(value)
    if (setChatState) {
      setChatState(prev => ({
        ...prev,
        jurisdiction: value
      }))
    }
  }
  
  const updateTopic = (value: string) => {
    setChatTopic(value)
    if (setChatState) {
      setChatState(prev => ({
        ...prev,
        topic: value
      }))
    }
  }
  
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [chatAbortController, setChatAbortController] = useState<AbortController | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  
  // Get follow-up questions from active tab
  const chatFollowUpQuestions = activeTab?.followUpQuestions || []
  const setChatFollowUpQuestions = (questions: string[]) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, followUpQuestions: questions } : tab
    ))
  }
  
  // Chat configuration state (loaded from DB, this is just initial fallback)
  const [chatSystemPrompt, setChatSystemPrompt] = useState(`You are RuleReady Compliance Chat AI - a smart, conversational assistant.

Use **bold** for key facts, ## headers for sections, and - bullets for lists. Be direct and well-formatted.`)

  // Check if user is near bottom of chat
  const checkScrollPosition = useCallback(() => {
    const el = chatListRef.current
    if (el && chatMessages.length > 1) {
      const { scrollTop, scrollHeight, clientHeight } = el
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      const shouldShowButton = distanceFromBottom > 50
      setShowScrollButton(shouldShowButton)
    } else {
      setShowScrollButton(false)
    }
  }, [chatMessages.length])

  // Add scroll event listener
  useEffect(() => {
    const el = chatListRef.current
    if (el) {
      el.addEventListener('scroll', checkScrollPosition, { passive: true })
      checkScrollPosition()
      return () => el.removeEventListener('scroll', checkScrollPosition)
    }
  }, [chatMessages.length, checkScrollPosition])

  // Only update scroll button state when messages change, don't force scroll
  useEffect(() => {
    if (!isLoadingConversation) {
      setTimeout(() => checkScrollPosition(), 100)
    }
  }, [chatMessages.length, checkScrollPosition, isLoadingConversation])

  // Copy message handler
  const handleCopyMessage = async (message: any, messageId: string) => {
    let fullContent = message.content;
    
    // Add sources section in markdown format
    if (message.savedResearchSources && message.savedResearchSources.length > 0) {
      fullContent += '\n\n---\n\n## Sources - Saved Research\n\n';
      message.savedResearchSources.forEach((s: any) => {
        fullContent += `${s.id}. **${s.title}**`;
        if (s.jurisdiction || s.topic) {
          fullContent += ` (${[s.jurisdiction, s.topic].filter(Boolean).join(' • ')})`;
        }
        fullContent += '\n';
      });
    }
    
    try {
      await navigator.clipboard.writeText(fullContent)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }
  
  // Handle chat submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!chatQuery.trim()) {
      addToast({
        variant: 'error',
        title: 'Empty query',
        description: 'Please enter a question',
        duration: 3000
      })
      return
    }

    // Add user message to chat
    const userMessageId = Date.now().toString()
    setChatMessages(prev => [...prev, {
      id: userMessageId,
      role: 'user',
      content: chatQuery
    }])
    
    const currentQuery = chatQuery
    
    setChatQuery('')
    setIsChatting(true)
    
    // Create assistant message that will stream
    const assistantMessageId = (Date.now() + 1).toString()
    setChatMessages(prev => [...prev, {
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
    setChatAbortController(controller)
    
    try {
      // Build the prompt that will be sent (for preview purposes)
      const messages = [...chatMessages, { role: 'user', content: currentQuery }]
      const lastUserMessage = messages[messages.length - 1]?.content || ''
      const promptPreview = `${chatState?.systemPrompt || chatSystemPrompt}\n\nUser: ${lastUserMessage}\n\nAssistant:`
      
      // Update parent state with prompt preview
      if (setChatState) {
        setChatState(prev => ({
          ...prev,
          lastPromptSent: promptPreview
        }))
      }
      
      const response = await fetch('/api/compliance-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages,
          model: chatState?.model || 'gemini-2.5-flash-lite',
          jurisdiction: chatState?.jurisdiction || chatJurisdiction || undefined,
          topic: chatState?.topic || chatTopic || undefined,
          systemPrompt: chatState?.systemPrompt || chatSystemPrompt,
          savedResearchContent: chatState?.savedResearchContent || undefined,
          additionalContext: chatState?.additionalContext || undefined,
          selectedResearchIds: chatState?.selectedResearchIds || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Update assistant message with response
      setChatMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? {
              ...m,
              content: data.content,
              savedResearchSources: data.savedResearchSources || []
            }
          : m
      ))
      
      // Set follow-up questions if provided
      if (data.followUpQuestions && Array.isArray(data.followUpQuestions)) {
        setChatFollowUpQuestions(data.followUpQuestions)
      }
      
      // Scroll to bottom after receiving response and focus input
      setTimeout(() => {
        scrollToBottom('smooth')
        chatInputRef.current?.focus()
      }, 100)

    } catch (error: any) {
      const isAbort = error.name === 'AbortError' || 
                      (error.message && error.message.toLowerCase().includes('abort'))
      
      if (isAbort) {
        setChatMessages(prev => prev.filter(m => m.id !== assistantMessageId))
        return
      }
      
      console.error('Chat error:', error)
      addToast({
        variant: 'error',
        title: 'Chat failed',
        description: error.message || 'Failed to complete chat',
        duration: 5000
      })
      
      setChatMessages(prev => prev.filter(m => m.id !== assistantMessageId))
    } finally {
      setIsChatting(false)
      setChatAbortController(null)
    }
  }
  
  const handleStopChat = () => {
    if (chatAbortController) {
      chatAbortController.abort()
      setChatAbortController(null)
      setIsChatting(false)
    }
  }

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
            jurisdiction: chatState?.jurisdiction || chatJurisdiction,
            topic: chatState?.topic || chatTopic,
          },
          settingsSnapshot: {
            systemPrompt: chatState?.systemPrompt,
            model: chatState?.model,
            jurisdiction: chatState?.jurisdiction || chatJurisdiction,
            topic: chatState?.topic || chatTopic,
            additionalContext: chatState?.additionalContext,
            selectedResearchIds: chatState?.selectedResearchIds,
            savedResearchContent: (chatState as any)?.savedResearchContent,
            lastPromptSent: chatState?.lastPromptSent || '',
          }
        })
      } catch (error) {
        console.error('Failed to clear conversation in database:', error)
      }
    }
    
    setShowClearConfirm(false)
    
    // Reset to default system prompt
    const defaultPrompt = `You are RuleReady Compliance Chat AI. Your role is to answer questions STRICTLY based on the compliance data in the internal database.

CRITICAL RULES:
1. ONLY use information that exists in the provided database sources
2. DO NOT use your general knowledge or training data
3. If the database has NO relevant information, say: "I don't have information about [topic] in the database" and STOP
4. DO NOT attempt to answer questions when database sources are missing or insufficient
5. DO NOT make assumptions or inferences beyond what the database explicitly states

WHEN DATABASE HAS INFORMATION:
- Cite which jurisdiction and topic the information comes from
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed based on database content

WHEN DATABASE LACKS INFORMATION:
- Clearly state what information is missing
- Do NOT provide general compliance advice
- Do NOT suggest what "typically" or "usually" applies
- Simply acknowledge the limitation and stop

You are a database query tool, not a general compliance advisor.`
    
    setChatSystemPrompt(defaultPrompt)
    updateJurisdiction('')
    updateTopic('')
    
    if (setChatState) {
      setChatState(prev => ({
        ...prev,
        systemPrompt: defaultPrompt,
        jurisdiction: '',
        topic: '',
        additionalContext: '',
        savedResearchContent: '',
        selectedResearchIds: [],
        lastPromptSent: ''
      }))
    }
  }

  // Auto-save active tab conversation after messages update (debounced)
  useEffect(() => {
    // Only auto-save if we have at least one complete exchange (user + assistant)
    const hasCompleteExchange = chatMessages.length >= 2 && 
                                chatMessages.some(m => m.role === 'assistant');
    
    // Don't save if we're loading an existing conversation or actively chatting
    if (!hasCompleteExchange || isChatting || isLoadingConversation) return;
    
    const autoSaveTimer = setTimeout(async () => {
      try {
        // Pass existing conversationId if tab already has one
        const currentTab = tabs.find(t => t.id === activeTabId)
        
        const result = await saveConversation({
          conversationId: currentTab?.conversationId as any || undefined,
          title: currentTab?.title,
          messages: chatMessages,
          filters: {
            jurisdiction: chatState?.jurisdiction || chatJurisdiction,
            topic: chatState?.topic || chatTopic,
          },
          settingsSnapshot: {
            systemPrompt: chatState?.systemPrompt,
            model: chatState?.model,
            jurisdiction: chatState?.jurisdiction || chatJurisdiction,
            topic: chatState?.topic || chatTopic,
            additionalContext: chatState?.additionalContext,
            selectedResearchIds: chatState?.selectedResearchIds,
            savedResearchContent: (chatState as any)?.savedResearchContent,
            lastPromptSent: chatState?.lastPromptSent || '',
          },
          followUpQuestions: currentTab?.followUpQuestions || []
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
  }, [chatMessages, isChatting, isLoadingConversation, activeTabId])

  const handleAddTab = () => {
    const newTabNumber = tabs.length + 1
  const newTabId = `tab-${Date.now()}`
  const newTab = createChatTab(newTabId, `Chat ${newTabNumber}`)
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }
  
  const handleCloseTab = async (tabId: string) => {
    if (tabs.length === 1) return
    
    const tabToClose = tabs.find(t => t.id === tabId)
    
    // Delete from database if it has a conversationId
    if (tabToClose?.conversationId) {
      await deleteConversation({ conversationId: tabToClose.conversationId as any })
    }
    
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
    
  tabSettingsCache.current.delete(tabId)
  lastPersistedSettings.current.delete(tabId)
  persistSettingsToSession()
  if (sessionHydrated.current) {
    persistTabsToSession(newTabs)
  }
  
    setShowDeleteTabConfirm(null)
  }
  
  const handleRenameTab = async (tabId: string, newTitle: string) => {
    const existingTab = tabs.find(t => t.id === tabId)
    if (!existingTab) {
      setIsEditingTab(null)
      return
    }

    const trimmedTitle = newTitle.trim()
    const safeTitle = trimmedTitle.length > 0 ? trimmedTitle : existingTab.title

    if (safeTitle !== existingTab.title) {
      setTabs(prev => prev.map(tab => 
        tab.id === tabId ? { ...tab, title: safeTitle } : tab
      ))

      if (existingTab.conversationId) {
        await updateConversationTitle({
          conversationId: existingTab.conversationId as any,
          title: safeTitle
        })
      }
    }

    if (trimmedTitle.length === 0) {
      setEditingTabTitle(existingTab.title)
    }

    setIsEditingTab(null)
  }

  const handleFeedback = (messageId: string, feedback: 'up' | 'down') => {
    setFeedbackGiven(prev => ({
      ...prev,
      [messageId]: prev[messageId] === feedback ? null : feedback
    }))
    
    // Show toast with feedback
    addToast({
      variant: 'success',
      title: feedback === 'up' ? '👍 Helpful!' : '👎 Not helpful',
      description: 'Thanks for your feedback',
      duration: 2000
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Delete Tab Confirmation Popover */}
      {showDeleteTabConfirm && (
        <>
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
                  <p className="text-xs font-semibold text-gray-900 mb-1">Delete &ldquo;{tab?.title}&rdquo;?</p>
                  <p className="text-xs text-gray-600 mb-3">This will permanently delete the conversation.</p>
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
            <h2 className="text-2xl font-semibold text-gray-900">Compliance Chat</h2>
            <p className="text-sm text-gray-600 mt-1">Chat with your compliance database - filter by jurisdiction and topic</p>
          </div>
          <div className="relative">
            <Button
              onClick={() => setShowClearConfirm(true)}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              disabled={chatMessages.length === 0}
            >
              <X className="w-4 h-4 mr-1" />
              Clear Chat
            </Button>
            
            {/* Clear Chat Confirmation Popover */}
            {showClearConfirm && (
              <div className="absolute top-full right-0 mt-2 bg-white border-2 border-red-300 rounded-lg shadow-xl p-4 w-72 z-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">Clear this chat?</p>
                <p className="text-xs text-gray-600 mb-3">All messages will be removed.</p>
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
                  onBlur={() => {
                    const pendingTitle = editingTabTitle
                    setTimeout(() => handleRenameTab(tab.id, pendingTitle), 10)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleRenameTab(tab.id, editingTabTitle)
                    }
                    if (e.key === 'Escape') {
                      setEditingTabTitle(tab.title)
                      setIsEditingTab(null)
                    }
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
        <div ref={chatListRef} className="h-full overflow-y-auto py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Ask anything about employment law</p>
                <p className="text-sm mt-1">Chat with your compliance database</p>
              </div>
            )}
            
            {chatMessages.map((m) => (
              <div key={m.id}>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-3 w-full ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-purple-100 text-purple-700'}`}>
                      {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl leading-relaxed shadow-sm max-w-[85%] ${m.role === 'user' ? 'bg-zinc-900 text-white text-base font-medium' : 'bg-gray-50 border border-gray-200 text-gray-900 text-sm'}`}>
                      {m.role === 'user' ? (
                        <p className="text-base font-medium">{m.content}</p>
                      ) : (
                        <>
                          <div className="compliance-chat-content">
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
                                {m.content || 'Processing...'}
                              </ReactMarkdown>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-500">
                                <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                                <span>Generating response...</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Sources - Saved Research */}
                          {m.savedResearchSources && m.savedResearchSources.length > 0 && (
                            <div className="mt-4 pt-4 border-t-2 border-gray-200">
                              <div className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Saved Research ({m.savedResearchSources.length})
                              </div>
                              <div className="space-y-3">
                                {m.savedResearchSources.map((s: any) => (
                                  <div key={s._id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <button
                                      onClick={() => setViewingSavedResearch(s)}
                                      className="w-full text-left hover:bg-purple-100 -m-3 p-3 rounded-lg transition-colors"
                                    >
                                      <div className="flex items-start gap-2 mb-2">
                                        <span className="font-mono text-sm font-bold text-purple-700 flex-shrink-0">[{s.id}]</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-sm text-purple-900 mb-1">{s.title}</div>
                                          {(s.jurisdiction || s.topic) && (
                                            <div className="flex items-center gap-2 text-xs text-purple-600 mb-2">
                                              {s.jurisdiction && (
                                                <span className="flex items-center gap-1">
                                                  <MapPin className="h-3 w-3" />
                                                  {s.jurisdiction}
                                                </span>
                                              )}
                                              {s.topic && (
                                                <span className="flex items-center gap-1">
                                                  <Tag className="h-3 w-3" />
                                                  {s.topic}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-700 line-clamp-2">
                                            {s.content.substring(0, 200)}...
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-xs text-purple-700 font-medium mt-2">
                                        Click to view full content →
                                      </div>
                                    </button>
                                  </div>
                                ))}
                              </div>
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
                        copiedMessageId === m.id ? 'text-green-600' : ''
                      }`} 
                      onClick={() => handleCopyMessage(m, m.id)} 
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
                    <button 
                      className={`inline-flex items-center gap-1 text-xs transition-colors ${
                        feedbackGiven[m.id] === 'up' ? 'text-green-600' : 'hover:text-green-600'
                      }`} 
                      type="button"
                      onClick={() => handleFeedback(m.id, 'up')}
                      title="Helpful"
                    >
                      <ThumbsUp className={`h-3 w-3 ${feedbackGiven[m.id] === 'up' ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      className={`inline-flex items-center gap-1 text-xs transition-colors ${
                        feedbackGiven[m.id] === 'down' ? 'text-red-600' : 'hover:text-red-600'
                      }`} 
                      type="button"
                      onClick={() => handleFeedback(m.id, 'down')}
                      title="Not helpful"
                    >
                      <ThumbsDown className={`h-3 w-3 ${feedbackGiven[m.id] === 'down' ? 'fill-current' : ''}`} />
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
      <form onSubmit={handleChatSubmit} className="flex-shrink-0">
        {/* Follow-up Questions */}
        {chatFollowUpQuestions.length > 0 && (
          <div className="max-w-3xl mx-auto mb-3 px-4">
            <div className="text-xs font-medium text-gray-600 mb-2">Suggested questions:</div>
            <div className="flex flex-wrap gap-2">
              {chatFollowUpQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setChatQuery(q)
                    setChatFollowUpQuestions([])
                  }}
                  className="text-xs px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Text Composer */}
        <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border px-3 py-2">
          <Textarea
            ref={chatInputRef}
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!isChatting && chatQuery.trim()) {
                  handleChatSubmit(e)
                }
              }
            }}
            rows={2}
            placeholder="Ask about employment law compliance..."
            disabled={isChatting}
            className="resize-none border-0 focus-visible:ring-0"
          />
          {isChatting ? (
            <Button 
              type="button" 
              onClick={handleStopChat} 
              className="h-9 w-9 rounded-full p-0 bg-red-600 hover:bg-red-700"
              title="Stop chat"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button type="submit" disabled={!chatQuery.trim()} className="h-9 w-9 rounded-full p-0 bg-purple-500 hover:bg-purple-600">
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
      
      {/* View Saved Research Modal */}
      {viewingSavedResearch && (
        <TiptapEditorModal
          isOpen={true}
          onClose={() => setViewingSavedResearch(null)}
          initialContent={viewingSavedResearch.content}
          title={
            <div className="space-y-2">
              <div className="text-lg font-semibold text-gray-900">{viewingSavedResearch.title}</div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {viewingSavedResearch.jurisdiction && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    {viewingSavedResearch.jurisdiction}
                  </span>
                )}
                {viewingSavedResearch.topic && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-green-600" />
                    {viewingSavedResearch.topic}
                  </span>
                )}
              </div>
            </div>
          }
          showSaveButton={false}
        />
      )}
    </div>
  )
}

