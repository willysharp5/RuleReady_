'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Plus, X, FileText, User, Copy, Check, ArrowUp, Square, ArrowDown, Bot, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface ChatFeatureProps {
  chatState?: {
    systemPrompt: string
    model?: string
    jurisdiction: string
    topic: string
    additionalContext?: string
    selectedResearchIds?: string[]
    lastPromptSent?: string
  }
  setChatState?: (state: any) => void
}

export default function ChatFeature({ chatState, setChatState }: ChatFeatureProps = {}) {
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
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down' | null>>({})
  
  // Load saved conversations as tabs on mount
  useEffect(() => {
    if (allConversationsQuery && !tabsLoaded) {
      const conversations = allConversationsQuery || []
      
      if (conversations.length > 0) {
        // Create tabs from saved conversations
        const loadedTabs = conversations.map((conv) => ({
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
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (loadedConversation && activeTab && activeTab.conversationId === conversationToLoad) {
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
  
  // Sync local state changes back to parent
  const updateJurisdiction = (value: string) => {
    setChatJurisdiction(value)
    if (setChatState && chatState) {
      setChatState({ ...chatState, jurisdiction: value })
    }
  }
  
  const updateTopic = (value: string) => {
    setChatTopic(value)
    if (setChatState && chatState) {
      setChatState({ ...chatState, topic: value })
    }
  }
  
  const chatListRef = useRef<HTMLDivElement | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [chatAbortController, setChatAbortController] = useState<AbortController | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  
  // Chat configuration state
  const [chatSystemPrompt, setChatSystemPrompt] = useState(`You are RuleReady Compliance Chat AI. Your role is to answer questions STRICTLY based on the compliance data in the internal database.

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

You are a database query tool, not a general compliance advisor.`)
  
  // Scroll to bottom function
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = chatListRef.current
    if (!el) return
    
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    
    if (isNearBottom) {
      scrollToBottom('instant')
      setShowScrollButton(false)
    } else {
      setShowScrollButton(true)
    }
    
    setTimeout(() => checkScrollPosition(), 100)
  }, [chatMessages, checkScrollPosition, scrollToBottom])

  // Copy message handler
  const handleCopyMessage = async (message: any, messageId: string) => {
    let fullContent = message.content;
    
    // Add sources section in markdown format
    if (message.internalSources && message.internalSources.length > 0) {
      fullContent += '\n\n---\n\n## Sources - Your Database\n\n';
      message.internalSources.forEach((s: any, idx: number) => {
        fullContent += `${idx + 1}. **${s.title}**\n`;
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
    
    // Create abort controller for this request
    const controller = new AbortController()
    setChatAbortController(controller)
    
    try {
      // Build the prompt that will be sent (for preview purposes)
      const messages = [...chatMessages, { role: 'user', content: currentQuery }]
      const lastUserMessage = messages[messages.length - 1]?.content || ''
      const promptPreview = `${chatState?.systemPrompt || chatSystemPrompt}\n\nUser: ${lastUserMessage}\n\nAssistant:`
      
      // Update parent state with prompt preview
      if (setChatState && chatState) {
        setChatState({ ...chatState, lastPromptSent: promptPreview })
      }
      
      const response = await fetch('/api/compliance-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages,
          model: chatState?.model || 'gemini-2.0-flash-exp',
          jurisdiction: chatState?.jurisdiction || chatJurisdiction || undefined,
          topic: chatState?.topic || chatTopic || undefined,
          systemPrompt: chatState?.systemPrompt || chatSystemPrompt,
          additionalContext: chatState?.additionalContext || undefined,
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
              internalSources: data.sources || []
            }
          : m
      ))

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
            additionalContext: chatState?.additionalContext,
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
    
    if (setChatState && chatState) {
      setChatState({
        systemPrompt: defaultPrompt,
        jurisdiction: '',
        topic: '',
        additionalContext: '',
      })
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
            additionalContext: chatState?.additionalContext,
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
  }, [chatMessages, isChatting, isLoadingConversation, activeTabId])

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
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[85%] ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                      {m.role === 'user' ? (
                        <p>{m.content}</p>
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
                                    <span className="font-mono mr-1">[{idx + 1}]</span>
                                    <span className="font-medium">{s.title}</span>
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
        {/* Text Composer */}
        <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border px-3 py-2">
          <Textarea
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
    </div>
  )
}

