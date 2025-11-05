'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Search, FileText, MapPin, Layers, Zap, BookOpen, LogOut, Shield } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'

type FeatureType = 'chat' | 'research' | 'saved-research' | 'templates' | 'jurisdictions' | 'topics' | 'ai-models'

interface NavItem {
  id: FeatureType
  label: string
  icon: React.ElementType
}

const allNavItems: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'saved-research', label: 'Saved Research', icon: BookOpen },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'jurisdictions', label: 'Jurisdictions', icon: MapPin },
  { id: 'topics', label: 'Topics', icon: Layers },
  { id: 'ai-models', label: 'AI Models', icon: Zap },
]

// Admin-only features
const adminOnlyFeatures: FeatureType[] = ['ai-models']

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as FeatureType | null
  const featureParam = searchParams.get('feature') as FeatureType | null
  const { isAdmin, isLoading } = useAuth()
  
  // Filter navigation items based on user role
  const navItems = isAdmin 
    ? allNavItems 
    : allNavItems.filter(item => !adminOnlyFeatures.includes(item.id))
  
  // Validate initial feature - if user tries to access admin-only feature without permission, redirect to chat
  const validateFeature = (feature: FeatureType): FeatureType => {
    if (!isAdmin && adminOnlyFeatures.includes(feature)) {
      return 'chat'
    }
    return feature
  }
  
  const initialFeature = validateFeature(featureParam || tabParam || 'chat')
  const [activeFeature, setActiveFeature] = useState<FeatureType>(initialFeature)
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true)
  
  // Update URL when feature changes
  const handleFeatureChange = (feature: FeatureType) => {
    setActiveFeature(feature)
    router.push(`/home?tab=${feature}`)
  }
  
  // Validate and redirect if user loses admin access or tries to access admin feature
  useEffect(() => {
    if (!isLoading && !isAdmin && adminOnlyFeatures.includes(activeFeature)) {
      setActiveFeature('chat')
      router.push('/home?tab=chat')
    }
  }, [isAdmin, isLoading, activeFeature, router])
  
  // Sync with URL parameter
  useEffect(() => {
    const urlFeature = featureParam || tabParam
    if (urlFeature && urlFeature !== activeFeature) {
      setActiveFeature(urlFeature)
    }
  }, [tabParam, featureParam, activeFeature])
  
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
      // Clean up system prompt - remove any template content that was baked in (old behavior)
      let cleanSystemPrompt = researchSettingsQuery.researchSystemPrompt || '';
      if (cleanSystemPrompt.includes('IMPORTANT: Structure your response using this template format:')) {
        // Remove everything from "IMPORTANT: Structure..." to the end
        cleanSystemPrompt = cleanSystemPrompt.split('IMPORTANT: Structure your response using this template format:')[0].trim();
      }
      
      setResearchState(prev => ({
        ...prev,
        systemPrompt: cleanSystemPrompt,
        firecrawlConfig: researchSettingsQuery.researchFirecrawlConfig,
        model: researchSettingsQuery.researchModel,
        selectedTemplate: researchSettingsQuery.researchSelectedTemplateId || '', // Load template ID
        additionalContext: ''
      }))
      setSettingsLoaded(true)
    }
  }, [researchSettingsQuery, settingsLoaded])
  
  // Query all saved research to rebuild content from IDs
  const allSavedResearchQuery = useQuery(api.savedResearch.getAllSavedResearch)
  
  // Load chat settings from database on mount
  useEffect(() => {
    if (chatSettingsQuery && !chatSettingsLoaded) {
      const loadedIds = chatSettingsQuery.chatSelectedResearchIds || [];
      
       // Rebuild savedResearchContent from IDs if we have research data
       let rebuiltContent = '';
       if (loadedIds.length > 0 && allSavedResearchQuery) {
         const selectedItems = (allSavedResearchQuery || []).filter((r) => loadedIds.includes(r._id));
         if (selectedItems.length > 0) {
           rebuiltContent = selectedItems.map((item) => 
             `[SAVED RESEARCH] ${item.title}\n${item.jurisdiction ? `Jurisdiction: ${item.jurisdiction}\n` : ''}${item.topic ? `Topic: ${item.topic}\n` : ''}\n${item.content}`
           ).join('\n\n---\n\n');
         }
       }
      
      setChatState(prev => ({
        ...prev,
        systemPrompt: chatSettingsQuery.chatSystemPrompt,
        model: chatSettingsQuery.chatModel,
        additionalContext: chatSettingsQuery.chatAdditionalContext || '',
        selectedResearchIds: loadedIds,
        savedResearchContent: rebuiltContent
      }))
      setChatSettingsLoaded(true)
    }
  }, [chatSettingsQuery, chatSettingsLoaded, allSavedResearchQuery])
  
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-zinc-200 bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-purple-500">RuleReady</h1>
          {isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              <Shield className="h-3 w-3" />
              Admin
            </div>
          )}
        </div>
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
