import { useState } from 'react'
import { Settings, Zap, Info, ExternalLink } from 'lucide-react'
import { AccordionSection } from './AccordionSection'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

interface ResearchPropertiesProps {
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

export function ResearchProperties({ researchState, setResearchState }: ResearchPropertiesProps) {
  // Queries to get template and topic names
  const templatesQuery = useQuery(api.complianceTemplates.getActiveTemplates)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  
  const templates = templatesQuery || []
  const topics = topicsQuery || []
  
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

  const handleSystemPromptChange = (prompt: string) => {
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, systemPrompt: prompt })
    }
  }

  const handleFirecrawlConfigChange = (config: string) => {
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, firecrawlConfig: config })
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
    
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, firecrawlConfig: defaultConfig })
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
    
    if (setResearchState && researchState) {
      setResearchState({ ...researchState, systemPrompt: defaultPrompt, selectedTemplate: '' })
    }
  }

  return (
    <div className="space-y-2">
      {/* How Research Works - Always visible at top */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">How Research Works:</h5>
        <div className="text-xs text-blue-800 space-y-1">
          <div>1. <strong>Search Phase:</strong> Firecrawl searches web and news sources</div>
          <div>2. <strong>Filter Phase:</strong> Jurisdiction/topic enhance search relevance</div>
          <div>3. <strong>AI Phase:</strong> AI model analyzes sources and generates answer</div>
          <div>4. <strong>Citation Phase:</strong> Sources numbered [1], [2], [3] for reference</div>
        </div>
      </div>

      <AccordionSection
        title="AI Settings"
        icon={Settings}
        isOpen={systemPromptOpen}
        onToggle={() => setSystemPromptOpen(!systemPromptOpen)}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Model</label>
            <select className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm">
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </select>
            <p className="text-xs text-zinc-500 mt-1">Model selection coming soon</p>
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
              Template selection auto-updates this prompt. Edit freely - click "Reset to Default" to restore.
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
            <strong>Note:</strong> Changes to this config apply to your next research query
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
          <div className="pt-2 border-t border-zinc-200">
            <span className="text-zinc-500 text-[10px]">Updates when you change filters in the research composer</span>
          </div>
        </div>
      </AccordionSection>
    </div>
  )
}
