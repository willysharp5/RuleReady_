'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Search, FileText, MapPin, Layers, Zap, BookOpen } from 'lucide-react'
import { LeftNavigation } from '@/components/home/LeftNavigation'
import { RightPropertiesPanel } from '@/components/home/RightPropertiesPanel'
import ChatFeature from '@/components/features/ChatFeature'
import ResearchFeature from '@/components/features/ResearchFeature'
import SavedResearchFeature from '@/components/features/SavedResearchFeature'
import TemplatesFeature from '@/components/features/TemplatesFeature'
import JurisdictionsFeature from '@/components/features/JurisdictionsFeature'
import TopicsFeature from '@/components/features/TopicsFeature'
import AIModelsFeature from '@/components/features/AIModelsFeature'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useRouter, useSearchParams } from 'next/navigation'

type FeatureType = 'chat' | 'research' | 'saved-research' | 'templates' | 'jurisdictions' | 'topics' | 'ai-models'

interface NavItem {
  id: FeatureType
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'saved-research', label: 'Saved Research', icon: BookOpen },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'jurisdictions', label: 'Jurisdictions', icon: MapPin },
  { id: 'topics', label: 'Topics', icon: Layers },
  { id: 'ai-models', label: 'AI Models', icon: Zap },
]

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as FeatureType | null
  const featureParam = searchParams.get('feature') as FeatureType | null
  
  const initialFeature = featureParam || tabParam || 'chat'
  const [activeFeature, setActiveFeature] = useState<FeatureType>(initialFeature)
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true)
  
  // Update URL when feature changes
  const handleFeatureChange = (feature: FeatureType) => {
    setActiveFeature(feature)
    router.push(`/home?tab=${feature}`)
  }
  
  // Sync with URL parameter
  useEffect(() => {
    const urlFeature = featureParam || tabParam
    if (urlFeature && urlFeature !== activeFeature) {
      setActiveFeature(urlFeature)
    }
  }, [tabParam, featureParam])
  
  // Load research settings from database
  const researchSettingsQuery = useQuery(api.researchSettings.getResearchSettings)
  const updateResearchSettings = useMutation(api.researchSettings.updateResearchSettings)
  
  // Load chat settings from database
  const chatSettingsQuery = useQuery(api.chatSettings.getChatSettings)
  const updateChatSettings = useMutation(api.chatSettings.updateChatSettings)
  
  // Research state - lifted to share between feature and properties
  const [researchState, setResearchState] = useState({
    systemPrompt: '',
    firecrawlConfig: '',
    model: 'gemini-2.0-flash-exp',
    selectedTemplate: '',
    jurisdiction: '',
    topic: '',
    urls: [''],
    additionalContext: '',
    configError: null as { message: string; error: string; invalidJson?: string } | null,
    lastPromptSent: '' // For debugging - shows what was sent to AI
  })
  
  // Chat state - lifted to share between feature and properties
  const [chatState, setChatState] = useState({
    systemPrompt: `You are RuleReady Compliance Chat AI. Your role is to answer questions STRICTLY based on the compliance data in the internal database.

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

You are a database query tool, not a general compliance advisor.`,
    model: 'gemini-2.0-flash-exp',
    jurisdiction: '',
    topic: '',
    additionalContext: '',
    selectedResearchId: undefined,
    lastPromptSent: '',
  })
  
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [chatSettingsLoaded, setChatSettingsLoaded] = useState(false)
  
  // Load research settings from database on mount
  useEffect(() => {
    if (researchSettingsQuery && !settingsLoaded) {
      setResearchState(prev => ({
        ...prev,
        systemPrompt: researchSettingsQuery.researchSystemPrompt,
        firecrawlConfig: researchSettingsQuery.researchFirecrawlConfig,
        model: researchSettingsQuery.researchModel,
        additionalContext: ''
      }))
      setSettingsLoaded(true)
    }
  }, [researchSettingsQuery, settingsLoaded])
  
  // Load chat settings from database on mount
  useEffect(() => {
    if (chatSettingsQuery && !chatSettingsLoaded) {
      setChatState(prev => ({
        ...prev,
        systemPrompt: chatSettingsQuery.chatSystemPrompt,
        model: chatSettingsQuery.chatModel,
      }))
      setChatSettingsLoaded(true)
    }
  }, [chatSettingsQuery, chatSettingsLoaded])

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
          onFeatureChange={handleFeatureChange}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-white">
          <div className="max-w-[800px] mx-auto p-6">
            {activeFeature === 'chat' && (
              <ChatFeature chatState={chatState} setChatState={setChatState} />
            )}
            {activeFeature === 'research' && (
              <ResearchFeature researchState={researchState} setResearchState={setResearchState} />
            )}
            {activeFeature === 'saved-research' && <SavedResearchFeature />}
            {activeFeature === 'templates' && <TemplatesFeature />}
            {activeFeature === 'jurisdictions' && <JurisdictionsFeature />}
            {activeFeature === 'topics' && <TopicsFeature />}
            {activeFeature === 'ai-models' && <AIModelsFeature />}
          </div>
        </main>

        {/* Right Properties Panel */}
        <RightPropertiesPanel 
          activeFeature={activeFeature}
          isOpen={propertiesPanelOpen}
          onToggle={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
          researchState={researchState}
          setResearchState={setResearchState}
          chatState={chatState}
          setChatState={setChatState}
          updateResearchSettings={updateResearchSettings}
          updateChatSettings={updateChatSettings}
          onDismissError={() => setResearchState(prev => ({ ...prev, configError: null }))}
        />
      </div>
    </div>
  )
}
