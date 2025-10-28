'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, ExternalLink, Globe, FileText, Newspaper, Loader2, CheckCircle2, Info, User, Copy, Check, Edit, Save, ChevronLeft, ChevronRight, ArrowUp, Square, ArrowDown } from 'lucide-react'
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
  
  // Research state
  const [researchQuery, setResearchQuery] = useState('')
  const [researchMessages, setResearchMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    scrapedUrlSources?: any[]
    internalSources?: any[]
    webSources?: any[]
    newsResults?: any[]
  }>>([])
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

  // Copy message handler
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
          jurisdiction: researchState?.jurisdiction || researchJurisdiction || undefined,
          topic: researchState?.topic || researchTopic || undefined,
          systemPrompt: researchState?.systemPrompt || researchSystemPrompt,
          firecrawlConfig: researchState?.firecrawlConfig || researchFirecrawlConfig,
          urls: (researchState?.urls || researchUrls).filter((url: string) => url.trim()).length > 0 
            ? (researchState?.urls || researchUrls).filter((url: string) => url.trim()).map((url: string) => url.trim())
            : undefined,
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
          if (done) {
            console.log('📭 Stream done, total answer length:', answer.length)
            break
          }
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          console.log(`📦 Received chunk with ${lines.length} lines`)
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                console.log('🏁 Received [DONE] signal')
                break
              }
              
              try {
                const parsed = JSON.parse(data)
                
                if (!parsed || !parsed.type) {
                  console.warn('⚠️ Received data without type field:', data.substring(0, 100))
                  continue
                }
                
                if (parsed.type === 'sources') {
                  sources = parsed
                  console.log('📊 Sources received:', {
                    scrapedUrls: parsed.scrapedUrlSources?.length || 0,
                    internal: parsed.internalSources?.length || 0,
                    web: parsed.sources?.length || 0,
                    news: parsed.newsResults?.length || 0
                  })
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
                  console.log('📝 Text received:', parsed.content?.substring(0, 50))
                  answer += parsed.content
                  console.log('💬 Answer length now:', answer.length)
                  // Update assistant message with streaming content
                  setResearchMessages(prev => prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, content: answer }
                      : m
                  ))
                } else if (parsed.type === 'followup') {
                  console.log('❓ Follow-up questions received:', parsed.questions)
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
          console.log('Research aborted by user')
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
      if (error.name === 'AbortError') {
        console.log('Research was aborted')
      } else {
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="border-b border-gray-200 flex-shrink-0 pb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Compliance Research</h2>
        <p className="text-sm text-gray-600 mt-1">Search employment laws, regulations, and news with AI-powered insights</p>
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
                                {makeSourceLinksClickable(m.content, m)}
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
                        // Save research functionality (simplified - you can expand this)
                        console.log('Save research:', m)
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
                onChange={(e) => updateJurisdiction(e.target.value)}
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
                onChange={(e) => updateTopic(e.target.value)}
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
