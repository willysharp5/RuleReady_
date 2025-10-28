'use client'

import { useState } from 'react'
import { MessageCircle, Search, FileText, MapPin, Layers } from 'lucide-react'
import { LeftNavigation } from '@/components/home/LeftNavigation'
import { RightPropertiesPanel } from '@/components/home/RightPropertiesPanel'
import ChatFeature from '@/components/features/ChatFeature'
import ResearchFeature from '@/components/features/ResearchFeature'
import TemplatesFeature from '@/components/features/TemplatesFeature'
import JurisdictionsFeature from '@/components/features/JurisdictionsFeature'
import TopicsFeature from '@/components/features/TopicsFeature'

type FeatureType = 'chat' | 'research' | 'templates' | 'jurisdictions' | 'topics'

interface NavItem {
  id: FeatureType
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'jurisdictions', label: 'Jurisdictions', icon: MapPin },
  { id: 'topics', label: 'Topics', icon: Layers },
]

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState<FeatureType>('chat')
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true)
  
  // Research state - lifted to share between feature and properties
  const [researchState, setResearchState] = useState({
    systemPrompt: `You are RuleReady Research AI, an expert assistant for US employment law compliance research.

Your role is to provide accurate, authoritative information about employment law based on the sources provided.

- Cite sources using inline [1], [2], [3] format
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed in your responses

If the user's question is extremely vague (like just "hello" or single word with no context), politely ask which jurisdiction and topic they're interested in. Otherwise, do your best to answer based on the sources and context available.

Note: If jurisdiction/topic filters are selected, you will receive additional instructions like:
"Focus on jurisdiction: California" or "Focus on topic: Harassment Training"
These appear AFTER "Based on these sources:" in your prompt.`,
    firecrawlConfig: JSON.stringify({
      sources: ['web', 'news'],
      limit: 8,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
        maxAge: 86400000,
        removeBase64Images: true,
        timeout: 60000
      }
    }, null, 2),
    selectedTemplate: '',
    jurisdiction: '',
    topic: '',
    urls: ['']
  })

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-zinc-200 bg-white px-6 flex items-center">
        <h1 className="text-xl font-semibold text-purple-500">RuleReady</h1>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation */}
        <LeftNavigation 
          navItems={navItems}
          activeFeature={activeFeature}
          onFeatureChange={setActiveFeature}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-white">
          <div className="max-w-[800px] mx-auto p-6">
            {activeFeature === 'chat' && <ChatFeature />}
            {activeFeature === 'research' && (
              <ResearchFeature researchState={researchState} setResearchState={setResearchState} />
            )}
            {activeFeature === 'templates' && <TemplatesFeature />}
            {activeFeature === 'jurisdictions' && <JurisdictionsFeature />}
            {activeFeature === 'topics' && <TopicsFeature />}
          </div>
        </main>

        {/* Right Properties Panel */}
        <RightPropertiesPanel 
          activeFeature={activeFeature}
          isOpen={propertiesPanelOpen}
          onToggle={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
          researchState={researchState}
          setResearchState={setResearchState}
        />
      </div>
    </div>
  )
}
