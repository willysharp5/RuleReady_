import { useState, useEffect, useRef } from 'react'
import { Settings, Zap, Info, ExternalLink, X, Globe, Plus, Tag, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { AccordionSection } from './AccordionSection'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ComplianceTemplateEditor } from '@/components/ComplianceTemplateEditor'
import { useToast } from '@/hooks/use-toast'
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'
import { TopicSelect } from '@/components/ui/topic-select'
import { TemplateSelect } from '@/components/ui/template-select'
import { AdminOnly } from '@/components/AdminOnly'

interface ResearchPropertiesProps {
  researchState?: {
    systemPrompt: string
    firecrawlConfig: string
    model?: string
    selectedTemplate: string
    jurisdiction: string
    topic: string
    urls: string[]
    additionalContext?: string
    configError?: { message: string; error: string; invalidJson?: string } | null
    lastPromptSent?: string
  }
  setResearchState?: (state: any) => void
  updateResearchSettings?: any
  onDismissError?: () => void
}

export function ResearchProperties({ researchState, setResearchState, updateResearchSettings, onDismissError }: ResearchPropertiesProps) {
  const { addToast } = useToast()
  
  // Queries to get template and topic names
  const templatesQuery = useQuery(api.complianceTemplates.getActiveTemplates)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  const templates = templatesQuery || []
  
  // Mutations
  const upsertTemplate = useMutation(api.complianceTemplates.upsertTemplate)
  
  // Template editor state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  
  // Template selection state (for component)
  const [selectedTemplateObj, setSelectedTemplateObj] = useState<any>(null)
  
  // Sync selected template object with researchState.selectedTemplate (templateId)
  useEffect(() => {
    if (researchState?.selectedTemplate && templates) {
      const template = templates.find((t: any) => t.templateId === researchState.selectedTemplate)
      if (template && template !== selectedTemplateObj) {
        setSelectedTemplateObj(template)
      }
    } else if (!researchState?.selectedTemplate && selectedTemplateObj) {
      setSelectedTemplateObj(null)
    }
  }, [researchState?.selectedTemplate, templates])
  
  // URL validation state
  const [urlValidation, setUrlValidation] = useState<{[index: number]: { isValid: boolean | null, isValidating: boolean, message: string }}>({})

  
  // Track validated URLs to prevent re-validation
  const validatedUrls = useRef<Map<string, { isValid: boolean, message: string }>>(new Map())
  const validatingUrls = useRef<Set<string>>(new Set())
  const lastUrlsRef = useRef<string>('')
  
  // Debounce URL validation with proper cleanup
  useEffect(() => {
    const urls = researchState?.urls || ['']
    const urlsString = JSON.stringify(urls)
    
    // Skip if URLs haven't actually changed
    if (urlsString === lastUrlsRef.current) {
      return
    }
    lastUrlsRef.current = urlsString
    
    const timers: NodeJS.Timeout[] = []
    
    // Clear validation for indices that no longer exist
    setUrlValidation(prev => {
      const newValidation: typeof prev = {}
      urls.forEach((_, index) => {
        if (prev[index]) {
          newValidation[index] = prev[index]
        }
      })
      return newValidation
    })
    
    urls.forEach((url, index) => {
      if (!url.trim()) {
        // Clear validation for empty URLs immediately
        setUrlValidation(prev => ({ ...prev, [index]: { isValid: null, isValidating: false, message: '' } }))
        return
      }
      
      // Check if we've already validated this exact URL
      const cachedResult = validatedUrls.current.get(url)
      if (cachedResult) {
        setUrlValidation(prev => ({ ...prev, [index]: { ...cachedResult, isValidating: false } }))
        return
      }
      
      // Skip if already validating this specific URL
      const urlKey = `${index}-${url}`
      if (validatingUrls.current.has(urlKey)) {
        return
      }
      
      // Debounce validation
      const timer = setTimeout(async () => {
        // Double-check URL still exists at this index before validating
        const currentUrls = researchState?.urls || ['']
        if (currentUrls[index] !== url) {
          return // URL changed, skip validation
        }
        
        // Check format
    try {
      new URL(url)
    } catch {
          const result = { isValid: false, message: 'Invalid URL format' }
          setUrlValidation(prev => ({ ...prev, [index]: { ...result, isValidating: false } }))
          validatedUrls.current.set(url, result)
      return
    }
    
        // Mark as validating
        validatingUrls.current.add(urlKey)
    setUrlValidation(prev => ({ ...prev, [index]: { isValid: null, isValidating: true, message: 'Checking URL...' } }))
    
    try {
      const response = await fetch(`/api/validate-url?url=${encodeURIComponent(url)}`)
      const data = await response.json()
      
          const result = {
            isValid: data.valid,
            message: data.valid ? (data.message || 'URL is accessible') : (data.message || 'URL not accessible')
          }
          
          setUrlValidation(prev => ({ ...prev, [index]: { ...result, isValidating: false } }))
          validatedUrls.current.set(url, result)
    } catch (error) {
          const result = { isValid: false, message: 'Could not validate URL' }
          setUrlValidation(prev => ({ ...prev, [index]: { ...result, isValidating: false } }))
          validatedUrls.current.set(url, result)
        } finally {
          validatingUrls.current.delete(urlKey)
        }
      }, 1500) // 1.5 second debounce
      
      timers.push(timer)
    })
    
    // Cleanup all timers
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [researchState?.urls])
  
  // Get display names
  const templateName = researchState?.selectedTemplate 
    ? templates?.find((t: any) => t.templateId === researchState.selectedTemplate)?.title || researchState.selectedTemplate
    : null
    
  const topicName = researchState?.topic
    ? topics?.find((t: any) => t.topicKey === researchState.topic)?.name || researchState.topic
    : null
  const [firecrawlOpen, setFirecrawlOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [systemPromptOpen, setSystemPromptOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false)

  const handleSystemPromptChange = (prompt: string) => {
    // Clean up - remove any template content that may have been pasted
    let cleanPrompt = prompt;
    if (cleanPrompt.includes('IMPORTANT: Structure your response using this template format:')) {
      cleanPrompt = cleanPrompt.split('IMPORTANT: Structure your response using this template format:')[0].trim();
      
      // Show warning that template content was removed
      addToast({
        variant: 'default',
        title: 'Template content removed',
        description: 'Template content is applied automatically in the backend. Keep system prompt clean.',
        duration: 3000
      })
    }
    
    // Update local state immediately using functional update to prevent stale state
    if (setResearchState) {
      setResearchState((prev: any) => ({ ...prev, systemPrompt: cleanPrompt }))
    }
  }
  
  const handleModelChange = (model: string) => {
    // Update local state immediately using functional update to prevent stale state
    if (setResearchState) {
      setResearchState((prev: any) => ({ ...prev, model }))
    }
  }

  const handleFirecrawlConfigChange = (config: string) => {
    // Update local state immediately using functional update to prevent stale state
    if (setResearchState) {
      setResearchState((prev: any) => ({ ...prev, firecrawlConfig: config }))
      }
  }
  
  const handleAdditionalContextChange = (context: string) => {
    // Update local state immediately using functional update to prevent stale state
    if (setResearchState) {
      setResearchState((prev: any) => ({ ...prev, additionalContext: context }))
    }
  }

  const handleResetFirecrawlConfig = () => {
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
    
    // Update local state using functional update to prevent stale state
    if (setResearchState) {
      setResearchState((prev: any) => ({ ...prev, firecrawlConfig: defaultConfig }))
    }
  }

  const handleResetPrompt = () => {
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
    
    // Update local state using functional update to prevent stale state
    if (setResearchState) {
      setResearchState((prev: any) => ({ ...prev, systemPrompt: defaultPrompt, selectedTemplate: '' }))
    }
  }

  return (
    <div className="space-y-2">
      {/* How Research Works - Always visible at top */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">How It Works</h5>
        <div className="text-xs text-blue-800 space-y-1.5">
          <div><strong>1. Your Input:</strong> Query + filters + optional context</div>
          <div><strong>2. Data Gathering:</strong> Firecrawl searches web/news + scrapes your URLs</div>
          <div><strong>3. AI Analysis:</strong> AI model analyzes all sources with your instructions</div>
          <div><strong>4. Formatted Answer:</strong> Markdown response with [1], [2] citations</div>
        </div>
      </div>
      
      {/* Filters - Template, Jurisdiction & Topic */}
      <div className="space-y-2">
        {/* Template Selection */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 mb-1">
            <FileText className="h-3 w-3" />
            Template (Optional)
          </label>
          <TemplateSelect
            value={selectedTemplateObj}
            onChange={(template: any) => {
              if (!template) {
                // No template selected - clear template ID using functional update
                if (setResearchState) {
                  setResearchState((prev: any) => ({ ...prev, selectedTemplate: '' }))
                }
              } else {
                // Template selected - save only the template ID using functional update
                if (setResearchState) {
                  setResearchState((prev: any) => ({ ...prev, selectedTemplate: template.templateId }))
                }
                
                // Show success message
                addToast({
                  variant: 'success',
                  title: 'Template selected',
                  description: `Using ${template.title} - template will be applied automatically in research queries`,
                  duration: 3000
                })
              }
            }}
            placeholder="No template selected"
            className="bg-purple-50 border-purple-300 text-purple-900"
          />
        </div>
        
        {/* Jurisdiction Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 mb-1">
            Jurisdiction (Optional)
          </label>
          <JurisdictionSelect
            value={researchState?.jurisdiction ? 
              jurisdictions.find((j: any) => 
                j.name === researchState.jurisdiction || 
                j.code === researchState.jurisdiction ||
                j.displayName === researchState.jurisdiction
              ) : null
            }
            onChange={(jurisdiction: any) => {
              if (setResearchState) {
                setResearchState((prev: any) => ({
                  ...prev,
                  jurisdiction: jurisdiction?.displayName || jurisdiction?.name || ''
                }))
              }
            }}
            placeholder="No jurisdiction selected"
            className="text-xs"
          />
        </div>
        
        {/* Topic Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 mb-1">
            <Tag className="h-3 w-3" />
            Topic (Optional)
          </label>
          <TopicSelect
            value={topics.find((t: any) => t.name === researchState?.topic) || null}
            onChange={(topic: any) => {
              if (setResearchState) {
                setResearchState((prev: any) => ({ ...prev, topic: topic?.name || '' }))
              }
            }}
            placeholder="No topic selected"
            className="text-xs"
          />
        </div>
        
        {/* Additional URLs */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1 text-xs font-medium text-orange-900">
              <Globe className="h-3 w-3" />
              Additional URLs (Optional)
            </label>
            <span className="text-xs text-orange-700 font-medium">
              {(researchState?.urls || ['']).filter((u: string) => u.trim()).length} / 5
            </span>
          </div>
          <div className="space-y-2">
            {(researchState?.urls || ['']).map((url: string, index: number) => (
              <div key={index} className="flex items-center gap-1">
                <div className="flex-1 relative">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => {
                      if (setResearchState) {
                        const newValue = e.target.value
                        setResearchState((prev: any) => {
                          const newUrls = [...(prev.urls || [''])]
                          newUrls[index] = newValue
                          return { ...prev, urls: newUrls }
                        })
                      }
                    }}
                    className={`h-8 text-xs pr-8 ${
                      urlValidation[index]?.isValid === true ? 'border-green-500' :
                      urlValidation[index]?.isValid === false ? 'border-red-500' :
                      ''
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                    {urlValidation[index]?.isValidating ? (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    ) : urlValidation[index]?.isValid === true ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : urlValidation[index]?.isValid === false ? (
                      <X className="h-3 w-3 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {(researchState?.urls || ['']).length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (setResearchState) {
                        setResearchState((prev: any) => {
                          const newUrls = (prev.urls || ['']).filter((_: string, i: number) => i !== index)
                        // If we removed the last URL, ensure at least one empty field remains
                          return { ...prev, urls: newUrls.length > 0 ? newUrls : [''] }
                        })
                      }
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                )}
                {index === (researchState?.urls || ['']).length - 1 && (researchState?.urls || ['']).length < 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (setResearchState) {
                        setResearchState((prev: any) => {
                          const newUrls = [...(prev.urls || ['']), '']
                          return { ...prev, urls: newUrls }
                        })
                      }
                    }}
                    className="h-8 w-8 p-0 bg-orange-100 hover:bg-orange-200"
                  >
                    <Plus className="h-3 w-3 text-orange-600" />
                  </Button>
                )}
              </div>
            ))}
            
            {/* Validation messages */}
            {Object.entries(urlValidation).map(([idx, validation]: [string, any]) => {
              const index = parseInt(idx);
              if (!validation.message || !(researchState?.urls || [''])[index]?.trim()) return null;
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
          <p className="text-xs text-orange-700 mt-2">
            💡 Tip: PDFs are supported - paste PDF URLs directly
          </p>
        </div>
      </div>

      <AccordionSection
        title="Additional Context"
        icon={Info}
        isOpen={contextOpen}
        onToggle={() => setContextOpen(!contextOpen)}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Reference Documents or Notes</label>
            <textarea
              rows={6}
              placeholder="Paste compliance documents, rules text, or any reference information you want the AI to consider..."
              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md resize-y min-h-[100px] max-h-[400px]"
              value={researchState?.additionalContext || ''}
              onChange={(e) => handleAdditionalContextChange(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Included in your next research query. Cleared when you refresh the page.
            </p>
          </div>
          <button
            type="button"
            className="text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50 text-red-600 w-full"
            onClick={() => handleAdditionalContextChange('')}
          >
            Clear Context
          </button>
        </div>
      </AccordionSection>

      <AdminOnly>
        <AccordionSection
          title="AI Settings"
          icon={Settings}
          isOpen={systemPromptOpen}
          onToggle={() => setSystemPromptOpen(!systemPromptOpen)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Model</label>
              <select 
                className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm"
                value={researchState?.model || 'gemini-2.5-flash-lite'}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite - Default (Best Quota)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash - Latest Stable</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro - Most Capable</option>
                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash Latest</option>
                <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro Latest</option>
              </select>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-zinc-700">System Prompt</label>
                <button
                  type="button"
                  className="text-xs px-2 py-1 border border-purple-300 rounded hover:bg-purple-50 text-purple-700"
                  onClick={handleResetPrompt}
                >
                  Reset to Default
                </button>
              </div>
              <textarea
                rows={8}
                placeholder="You are RuleReady Research AI..."
                className="w-full px-3 py-2 text-xs font-mono border border-zinc-200 rounded-md resize-y min-h-[120px] max-h-[400px]"
                value={researchState?.systemPrompt || ''}
                onChange={(e) => handleSystemPromptChange(e.target.value)}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Saved per-conversation automatically.
              </p>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Search Configuration (JSON)"
          icon={Zap}
          isOpen={firecrawlOpen}
          onToggle={() => setFirecrawlOpen(!firecrawlOpen)}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-600">Firecrawl API</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">v2</span>
              </div>
              <div className="flex gap-2">
                <a
                  href="https://docs.firecrawl.dev/api-reference/endpoint/search"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
                  title="API Documentation"
                >
                  <ExternalLink className="h-3 w-3" />
                  Docs
                </a>
                <button
                  type="button"
                  className="text-xs px-2 py-1 border border-purple-300 rounded hover:bg-purple-50 text-purple-700"
                  onClick={handleResetFirecrawlConfig}
                >
                  Reset to Default
                </button>
              </div>
            </div>
            <textarea
              rows={12}
              placeholder='{"sources": ["web", "news"], "limit": 8}'
              className="w-full px-3 py-2 text-xs font-mono border border-zinc-200 rounded-md resize-y min-h-[180px] max-h-[500px]"
              value={researchState?.firecrawlConfig || ''}
              onChange={(e) => handleFirecrawlConfigChange(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Saved per-conversation automatically.
            </p>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Current Configuration"
          icon={Info}
          isOpen={configOpen}
          onToggle={() => setConfigOpen(!configOpen)}
        >
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-zinc-600 flex-shrink-0">Template:</span>
              <span className="font-medium text-zinc-900 text-right">{templateName || 'None (default prompt)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Jurisdiction:</span>
              <span className="font-medium text-zinc-900">{researchState?.jurisdiction || 'None (searches all)'}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-zinc-600 flex-shrink-0">Topic:</span>
              <span className="font-medium text-zinc-900 text-right">{topicName || 'None (searches all)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">URLs to Scrape:</span>
              <span className="font-medium text-zinc-900">
                {(researchState?.urls?.filter((url: string) => url.trim()).length || 0) > 0 
                  ? `${researchState?.urls?.filter((url: string) => url.trim()).length} URL(s)` 
                  : 'None (web search only)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Additional Context:</span>
              <span className="font-medium text-zinc-900">
                {researchState?.additionalContext && researchState.additionalContext.trim() 
                  ? `${researchState.additionalContext.length} characters` 
                  : 'None'}
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-200">
              <span className="text-zinc-500 text-[10px]">Updates when you change filters in the research composer</span>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Final Prompt Preview"
          icon={Info}
          isOpen={promptPreviewOpen}
          onToggle={() => setPromptPreviewOpen(!promptPreviewOpen)}
        >
        <div className="space-y-2">
          <p className="text-xs text-zinc-600 mb-2">Shows the prompt structure (data summarized for clarity)</p>
          {researchState?.lastPromptSent ? (
            <div className="p-3 bg-zinc-100 border border-zinc-200 rounded overflow-auto max-h-96 space-y-2 text-xs">
              {(() => {
                const prompt = researchState.lastPromptSent;
                const parts: JSX.Element[] = [];
                
                // Parse sections - only match actual values before "Based on these sources", not examples in system prompt
                const beforeSources = prompt.split('Based on these sources:')[0];
                const queryMatch = beforeSources.match(/Answer this compliance research query: "(.+?)"/);
                const refinementMatch = beforeSources.match(/The user previously asked.+?USER'S REFINEMENT REQUEST:\s*(.+?)(?=\n\n)/s);
                const jurisdictionMatch = beforeSources.match(/Focus on jurisdiction: (.+?)(?=\n|$)/);
                const topicMatch = beforeSources.match(/Focus on topic: (.+?)(?=\n|$)/);
                const hasAdditionalContext = beforeSources.includes('ADDITIONAL CONTEXT PROVIDED BY USER:');
                const hasTemplate = prompt.includes('IMPORTANT: Structure your response using this template format:');
                const sourceCount = (prompt.match(/\[\d+\]/g) || []).length;
                
                // Main query - Purple bold label, gray italic value
                if (queryMatch) {
                  parts.push(
                    <div key="query" className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-bold text-sm text-purple-700">Answer this compliance research query:</span>
                      <span className="text-xs italic text-zinc-500">"{queryMatch[1]}" (your query)</span>
                    </div>
                  );
                } else if (refinementMatch) {
                  parts.push(
                    <div key="refine" className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-bold text-sm text-purple-700">[Refinement Mode]</span>
                      <span className="text-xs italic text-zinc-500">{refinementMatch[1]} (your refinement request)</span>
                    </div>
                  );
                }
                
                // Filters - Purple bold label, gray italic value
                if (jurisdictionMatch) {
                  parts.push(
                    <div key="jurisdiction" className="flex items-baseline gap-1">
                      <span className="font-bold text-sm text-purple-700">Focus on jurisdiction:</span>
                      <span className="text-xs italic text-zinc-500">{jurisdictionMatch[1]}</span>
                    </div>
                  );
                }
                
                if (topicMatch) {
                  // Format topic: replace underscores with spaces and capitalize each word
                  const formattedTopic = topicMatch[1]
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                  
                  parts.push(
                    <div key="topic" className="flex items-baseline gap-1">
                      <span className="font-bold text-sm text-purple-700">Focus on topic:</span>
                      <span className="text-xs italic text-zinc-500">{formattedTopic}</span>
                    </div>
                  );
                }
                
                // Additional context summary - Purple bold label, gray italic details (matching jurisdiction/topic styling)
                if (hasAdditionalContext) {
                  parts.push(
                    <div key="context" className="flex items-baseline gap-1 mt-1">
                      <span className="font-bold text-sm text-purple-700">Additional Context:</span>
                      <span className="text-xs italic text-zinc-500">{researchState.additionalContext?.length || 0} characters</span>
                    </div>
                  );
                }
                
                // Sources summary - Purple bold header + gray summary with breakdown
                parts.push(
                  <div key="sources-header" className="font-bold text-sm text-purple-700 mt-2">
                    Based on these sources:
                  </div>
                );
                
                // Calculate source breakdown
                const scrapedCount = (prompt.match(/URL: https?:\/\//g) || []).length;
                const webNewsCount = sourceCount - scrapedCount;
                
                parts.push(
                  <div key="sources" className="text-xs italic text-zinc-500 ml-2 space-y-0.5">
                    <div>[{sourceCount} total sources injected here:]</div>
                    {scrapedCount > 0 && (
                      <div>• {scrapedCount} from URLs you provided (scraped via Firecrawl API)</div>
                    )}
                    {webNewsCount > 0 && (
                      <div>• {webNewsCount} from web/news (Firecrawl Search API based on your query)</div>
                    )}
                  </div>
                );
                
                // System instructions summary
                parts.push(
                  <div key="system-summary" className="font-bold text-sm text-blue-700 mt-3">
                    System instructions: [View in AI Settings accordion above]
                  </div>
                );
                
                // Template used (if any)
                if (researchState?.selectedTemplate) {
                  const templateName = templates?.find((t: any) => t.templateId === researchState.selectedTemplate)?.title || researchState.selectedTemplate;
                  parts.push(
                    <div key="template-used" className="flex items-baseline gap-1 mt-1">
                      <span className="font-bold text-sm text-purple-700">Template Used:</span>
                      <span className="text-xs italic text-zinc-500">{templateName}</span>
                    </div>
                  );
                }
                
                return <>{parts}</>;
              })()}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No research query sent yet</p>
          )}
        </div>
      </AccordionSection>
      </AdminOnly>
      
      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <ComplianceTemplateEditor
          isOpen={showTemplateEditor}
          onClose={() => {
            setShowTemplateEditor(false)
          }}
          onSave={async (templateData) => {
            try {
              await upsertTemplate(templateData)
              addToast({
                variant: 'success',
                title: 'Template saved',
                description: 'Template has been saved successfully',
                duration: 3000
              })
              setShowTemplateEditor(false)
            } catch (error) {
              addToast({
                variant: 'error',
                title: 'Error saving template',
                description: error instanceof Error ? error.message : 'Unknown error',
                duration: 5000
              })
            }
          }}
        />
      )}
    </div>
  )
}

