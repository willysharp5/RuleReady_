'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Search, FileText, MapPin, Layers, Zap, BookOpen, LogOut } from 'lucide-react'
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
    model: 'gemini-2.5-flash-lite',
    selectedTemplate: '',
    jurisdiction: '',
    topic: '',
    urls: [''],
    additionalContext: '',
    configError: null as { message: string; error: string; invalidJson?: string } | null,
    lastPromptSent: '' // For debugging - shows what was sent to AI
  })
  
  // Chat state - lifted to share between feature and properties
  const [chatState, setChatState] = useState<{
    systemPrompt: string
    model: string
    jurisdiction: string
    topic: string
    additionalContext: string
    selectedResearchIds: string[]
    savedResearchContent?: string
    lastPromptSent: string
  }>({
    systemPrompt: `You are RuleReady Compliance Chat AI - a smart, conversational assistant that helps evaluate compliance using saved research and company data.

CORE PRINCIPLES:
1. ONLY use SAVED RESEARCH for legal requirements - NO general AI knowledge
2. Use ADDITIONAL CONTEXT for company facts (locations, employee counts, names)
3. Chat has MEMORY - you remember the entire conversation in this tab
4. Be intelligent: validate data, catch inconsistencies, use actual counts over stated numbers

RESPONSE FORMATTING (MANDATORY):
- Use **bold** for ALL: numbers, deadlines, employee names, dollar amounts, requirements
- Multi-part answers: use ## section headers and - bullet points
- Simple answers: 2-3 sentences with bold on key facts
- Lists: use - bullets with **bold names**
- NEVER start with "Okay,", "Well,", "So," or filler words
- For yes/no questions: start with "Yes" or "No"
- For when/what/how: start directly with the answer

APPLICABILITY INTELLIGENCE:
- Validate employee counts: if stated "400 employees" but only 4 names listed, use 4
- Parse locations carefully: "John (Seattle, WA)" is Washington, not California
- Check thresholds using ACTUAL employee counts, not stated numbers
- If data conflicts or is missing, say so explicitly

IF NO SAVED RESEARCH:
"I don't have any saved research selected. Please select saved research from the knowledge base."

IF INFORMATION IS IN SAVED RESEARCH:
Always check the saved research content carefully. If penalties, deadlines, or other details are mentioned anywhere in the research (even briefly), provide that information. Only say "not specified" if it's truly absent.

Remember: You're chatting with your user's data. Be smart, conversational, and well-formatted. Use ALL available information from the saved research.`,
    model: 'gemini-2.5-flash-lite',
    jurisdiction: '',
    topic: '',
    additionalContext: '',
    selectedResearchIds: [],
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
        additionalContext: chatSettingsQuery.chatAdditionalContext || '',
        selectedResearchIds: chatSettingsQuery.chatSelectedResearchIds || []
      }))
      setChatSettingsLoaded(true)
    }
  }, [chatSettingsQuery, chatSettingsLoaded])
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-zinc-200 bg-white px-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-purple-500">RuleReady</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
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
