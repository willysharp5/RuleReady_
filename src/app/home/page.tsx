'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Search, FileText, MapPin, Layers } from 'lucide-react'
import { LeftNavigation } from '@/components/home/LeftNavigation'
import { RightPropertiesPanel } from '@/components/home/RightPropertiesPanel'
import ChatFeature from '@/components/features/ChatFeature'
import ResearchFeature from '@/components/features/ResearchFeature'
import TemplatesFeature from '@/components/features/TemplatesFeature'
import JurisdictionsFeature from '@/components/features/JurisdictionsFeature'
import TopicsFeature from '@/components/features/TopicsFeature'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"

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
  
  // Load research settings from database
  const researchSettingsQuery = useQuery(api.researchSettings.getResearchSettings)
  const updateResearchSettings = useMutation(api.researchSettings.updateResearchSettings)
  
  // Research state - lifted to share between feature and properties
  const [researchState, setResearchState] = useState({
    systemPrompt: '',
    firecrawlConfig: '',
    model: 'gemini-2.0-flash-exp',
    selectedTemplate: '',
    jurisdiction: '',
    topic: '',
    urls: ['']
  })
  
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  
  // Load research settings from database on mount
  useEffect(() => {
    if (researchSettingsQuery && !settingsLoaded) {
      console.log('📚 Loading research settings from database:', {
        hasSystemPrompt: !!researchSettingsQuery.researchSystemPrompt,
        hasFirecrawlConfig: !!researchSettingsQuery.researchFirecrawlConfig,
        model: researchSettingsQuery.researchModel
      })
      
      setResearchState(prev => ({
        ...prev,
        systemPrompt: researchSettingsQuery.researchSystemPrompt,
        firecrawlConfig: researchSettingsQuery.researchFirecrawlConfig,
        model: researchSettingsQuery.researchModel
      }))
      setSettingsLoaded(true)
    }
  }, [researchSettingsQuery, settingsLoaded])

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
          updateResearchSettings={updateResearchSettings}
        />
      </div>
    </div>
  )
}
