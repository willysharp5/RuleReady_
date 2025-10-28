import { useState, useEffect, useRef } from 'react'
import { Settings, Zap, Info, ExternalLink, X, AlertCircle, Globe, Plus, MapPin, Tag } from 'lucide-react'
import { AccordionSection } from './AccordionSection'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import ReactMarkdown from 'remark-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  // Queries to get template and topic names
  const templatesQuery = useQuery(api.complianceTemplates.getActiveTemplates)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  const templates = templatesQuery || []
  
  // Get display names
  const templateName = researchState?.selectedTemplate 
    ? templates?.find((t: any) => t.templateId === researchState.selectedTemplate)?.title || researchState.selectedTemplate
    : null
    
  const topicName = researchState?.topic
    ? topics?.find((t: any) => t.topicKey === researchState.topic)?.name || researchState.topic
    : null
  const [firecrawlOpen, setFirecrawlOpen] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [systemPromptOpen, setSystemPromptOpen] = useState(true)
  const [contextOpen, setContextOpen] = useState(true)
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false)
  
  // Debounce timer refs
  const promptSaveTimerRef = useRef<NodeJS.Timeout>()
  const configSaveTimerRef = useRef<NodeJS.Timeout>()
  
  // Saving indicators
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  const handleSystemPromptChange = (prompt: string) => {
    // Update local state immediately
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, systemPrompt: prompt })
    }
    
    setPromptSaved(false)
    setIsSavingPrompt(true)
    
    // Debounce database save
    if (promptSaveTimerRef.current) {
      clearTimeout(promptSaveTimerRef.current)
    }
    promptSaveTimerRef.current = setTimeout(async () => {
      if (updateResearchSettings) {
        await updateResearchSettings({
          researchSystemPrompt: prompt,
          researchModel: researchState?.model,
          researchFirecrawlConfig: researchState?.firecrawlConfig
        })
        setIsSavingPrompt(false)
        setPromptSaved(true)
        setTimeout(() => setPromptSaved(false), 2000)
      }
    }, 1000) // Save 1 second after user stops typing
  }
  
  const handleModelChange = (model: string) => {
    // Update local state immediately
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, model })
    }
    
    // Save to database immediately
    if (updateResearchSettings) {
      updateResearchSettings({
        researchSystemPrompt: researchState?.systemPrompt,
        researchModel: model,
        researchFirecrawlConfig: researchState?.firecrawlConfig
      })
    }
  }

  const handleFirecrawlConfigChange = (config: string) => {
    // Update local state immediately
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, firecrawlConfig: config })
    }
    
    setConfigSaved(false)
    setIsSavingConfig(true)
    
    // Debounce database save
    if (configSaveTimerRef.current) {
      clearTimeout(configSaveTimerRef.current)
    }
    configSaveTimerRef.current = setTimeout(async () => {
      if (updateResearchSettings) {
        await updateResearchSettings({
          researchSystemPrompt: researchState?.systemPrompt,
          researchModel: researchState?.model,
          researchFirecrawlConfig: config
        })
        setIsSavingConfig(false)
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 2000)
      }
    }, 1000) // Save 1 second after user stops typing
  }
  
  const handleAdditionalContextChange = (context: string) => {
    // Update local state only (not saved to database)
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, additionalContext: context })
    }
  }
  
  // Cleanup timers
  useEffect(() => {
    return () => {
      if (promptSaveTimerRef.current) clearTimeout(promptSaveTimerRef.current)
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current)
    }
  }, [])

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
    
    // Update local state
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, firecrawlConfig: defaultConfig })
    }
    
    // Save to database
    if (updateResearchSettings) {
      updateResearchSettings({
        researchSystemPrompt: researchState?.systemPrompt,
        researchModel: researchState?.model,
        researchFirecrawlConfig: defaultConfig
      })
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
    
    // Update local state
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, systemPrompt: defaultPrompt, selectedTemplate: '' })
    }
    
    // Save to database
    if (updateResearchSettings) {
      updateResearchSettings({
        researchSystemPrompt: defaultPrompt,
        researchModel: researchState?.model,
        researchFirecrawlConfig: researchState?.firecrawlConfig
      })
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
      
      {/* Filters - Jurisdiction & Topic */}
      <div className="space-y-2">
        {/* Jurisdiction Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 mb-1">
            <MapPin className="h-3 w-3" />
            Jurisdiction (Optional)
          </label>
          <select
            className="w-full px-2 py-1.5 border border-zinc-200 rounded-md text-xs"
            value={researchState?.jurisdiction || ''}
            onChange={(e) => {
              if (setResearchState && researchState) {
                setResearchState({ ...researchState, jurisdiction: e.target.value })
              }
            }}
          >
            <option value="">All Jurisdictions</option>
            {jurisdictions.map((j: any) => (
              <option key={j.code} value={j.name}>{j.name}</option>
            ))}
          </select>
        </div>
        
        {/* Topic Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 mb-1">
            <Tag className="h-3 w-3" />
            Topic (Optional)
          </label>
          <select
            className="w-full px-2 py-1.5 border border-zinc-200 rounded-md text-xs"
            value={researchState?.topic || ''}
            onChange={(e) => {
              if (setResearchState && researchState) {
                setResearchState({ ...researchState, topic: e.target.value })
              }
            }}
          >
            <option value="">All Topics</option>
            {topics.map((t: any) => (
              <option key={t.topicKey} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        
        {/* Additional URLs */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <label className="flex items-center gap-1 text-xs font-medium text-orange-900 mb-2">
            <Globe className="h-3 w-3" />
            Additional URLs (Optional)
          </label>
          <div className="space-y-2">
            {(researchState?.urls || ['']).map((url: string, index: number) => (
              <div key={index} className="flex items-center gap-1">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => {
                    if (setResearchState && researchState) {
                      const newUrls = [...(researchState.urls || [''])]
                      newUrls[index] = e.target.value
                      setResearchState({ ...researchState, urls: newUrls })
                    }
                  }}
                  className="h-8 text-xs"
                />
                {(researchState?.urls || ['']).length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (setResearchState && researchState) {
                        const newUrls = (researchState.urls || ['']).filter((_: string, i: number) => i !== index)
                        setResearchState({ ...researchState, urls: newUrls })
                      }
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                {index === (researchState?.urls || ['']).length - 1 && (researchState?.urls || ['']).length < 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (setResearchState && researchState) {
                        const newUrls = [...(researchState.urls || ['']), '']
                        setResearchState({ ...researchState, urls: newUrls })
                      }
                    }}
                    className="h-8 w-8 p-0 bg-orange-100 hover:bg-orange-200"
                  >
                    <Plus className="h-3 w-3 text-orange-600" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-700 mt-2">
            💡 PDFs supported - Firecrawl will extract text
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
              value={researchState?.model || 'gemini-2.0-flash-exp'}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </select>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-medium text-zinc-700">System Prompt</label>
                {isSavingPrompt && (
                  <span className="text-xs text-zinc-500">Saving...</span>
                )}
                {promptSaved && (
                  <span className="text-xs text-green-600">✓ Saved</span>
                )}
              </div>
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
              Auto-saves as you type. Template selection auto-updates this prompt.
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
              {isSavingConfig && (
                <span className="text-xs text-zinc-500">Saving...</span>
              )}
              {configSaved && (
                <span className="text-xs text-green-600">✓ Saved</span>
              )}
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
            Auto-saves as you type. Changes apply to your next research query.
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
                const sourceCount = (prompt.match(/\[\d+\]/g) || []).length;
                const templateMatch = prompt.match(/IMPORTANT: Structure your response using this template format:\s*#\s*(.+?)\s*Compliance Template/);
                const systemMatch = prompt.match(/System instructions:\s*(.+?)(?=\n\nIMPORTANT:|$)/s);
                
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
                
                // Template summary - Purple bold label, gray italic details (matching jurisdiction/topic styling)
                if (templateMatch) {
                  parts.push(
                    <div key="template" className="flex items-baseline gap-1 mt-2">
                      <span className="font-bold text-sm text-purple-700">Template:</span>
                      <span className="text-xs italic text-zinc-500">{templateMatch[1]}</span>
                    </div>
                  );
                }
                
                // System instructions - Blue header
                parts.push(
                  <div key="system-header" className="font-bold text-sm text-blue-700 mt-3">
                    System instructions:
                  </div>
                );
                
                // System instructions content - Regular text
                if (systemMatch) {
                  const systemLines = systemMatch[1].trim().split('\n');
                  systemLines.forEach((line, idx) => {
                    if (line.trim()) {
                      parts.push(
                        <div key={`sys-${idx}`} className="text-xs text-zinc-700">
                          {line}
                        </div>
                      );
                    }
                  });
                }
                
                return <>{parts}</>;
              })()}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No research query sent yet</p>
          )}
        </div>
      </AccordionSection>
    </div>
  )
}
