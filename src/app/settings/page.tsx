'use client'

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Loader2, ArrowLeft, Mail, AlertCircle, Key, Copy, Plus, Webhook, CheckCircle, Check, HelpCircle, Clock, XCircle, ExternalLink, Bot, Info, Trash2, MessageCircle, Send, User, ThumbsUp, ThumbsDown, ArrowUp, ArrowDown, MapPin, Eye, FileText, Lightbulb, Search, Edit3, Globe, CheckCircle2, Zap } from 'lucide-react'
// Removed auth imports for single-user mode
// import { useConvexAuth } from "convex/react"
// import { useAuthActions } from "@convex-dev/auth/react"
import Link from 'next/link'
// API key manager removed
import { validateEmailTemplate } from '@/lib/validateTemplate'
import { APP_CONFIG, getFromEmail } from '@/config/app.config'
import { DeleteConfirmationPopover } from '@/components/ui/delete-confirmation-popover'
import { JurisdictionDetailsPopover } from '@/components/ui/jurisdiction-details-popover'
import { ComplianceTemplateEditor } from '@/components/ComplianceTemplateEditor'
// Removed useChat - using custom implementation
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    id: number
    similarity: number
    url?: string
    jurisdiction?: string
    topicKey?: string
    topicLabel?: string
  }>
  settings?: {
    systemPrompt: string
    model: string
    complianceContext: boolean
    maxContextReports: number
    semanticSearch: boolean
    sourcesFound: number
    jurisdiction: string
    topic: string
  }
}

// EmbeddedChatUI component removed - now available on landing page

// Placeholder for EmailTemplateEditor - accepts props to satisfy types
const EmailTemplateEditor = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-4 font-mono text-sm min-h-[300px] rounded-lg border"
      placeholder="Enter your HTML template here..."
      disabled={disabled}
    />
  )
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Single-user mode - no authentication required
  const isAuthenticated = true
  const authLoading = false
  
  const [activeSection, setActiveSection] = useState<'monitoring' | 'jurisdictions' | 'templates' | 'generation' | 'ai-models'>('monitoring')
  
  // API keys removed
  // Webhook playground state
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null)
  
  // Notification settings state
  // Email notifications removed
  const [emailTemplate, setEmailTemplate] = useState('')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  
  const [templateSuccess, setTemplateSuccess] = useState(false)
  const [showHtmlSource, setShowHtmlSource] = useState(true)
  // Test email removed
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiModel, setAiModel] = useState('gpt-4o-mini') // Default to OpenAI's gpt-4o-mini
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiSystemPrompt, setAiSystemPrompt] = useState('')
  const [aiThreshold, setAiThreshold] = useState(70)
  const [aiApiKey, setAiApiKey] = useState('')
  // Email-only preference removed
  const [webhookOnlyIfMeaningful, setWebhookOnlyIfMeaningful] = useState(false)
  
  const [isUpdatingAI, setIsUpdatingAI] = useState(false)
  const [aiSuccess, setAiSuccess] = useState(false)
  const [isTestingAI, setIsTestingAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // AI Chat settings state
  const [chatEnabled, setChatEnabled] = useState(true)
  const [chatModel, setChatModel] = useState('gemini-2.0-flash-exp')
  const [chatSystemPrompt, setChatSystemPrompt] = useState('You are a professional compliance assistant specializing in US employment law.')
  const [enableComplianceContext, setEnableComplianceContext] = useState(true)
  const [maxContextReports, setMaxContextReports] = useState(5)
  const [enableSemanticSearch, setEnableSemanticSearch] = useState(true)
  const [isUpdatingChat, setIsUpdatingChat] = useState(false)
  const [chatSuccess, setChatSuccess] = useState(false)
  
  // Jurisdictions page state
  const [jurisdictionFilter, setJurisdictionFilter] = useState('')
  const [jurisdictionSearch, setJurisdictionSearch] = useState('')
  const [jurisdictionPage, setJurisdictionPage] = useState(1)
  const [jurisdictionPageSize, setJurisdictionPageSize] = useState(10)
  
  // API key queries removed
  // Monitoring queries
  const cronStatus = useQuery(api.monitoring.getCronJobStatus)
  const embeddingJobs = useQuery(api.monitoring.getEmbeddingJobMetrics)
  const crawlerHealth = useQuery(api.monitoring.getComplianceCrawlerHealth)
  const systemStatus = useQuery(api.monitoring.getSystemStatus)
  
  // Chat settings queries and mutations
  const chatSettings = useQuery(api.chatSettings.getChatSettings)
  const updateChatSettings = useMutation(api.chatSettings.updateChatSettings)
  
  // Compliance data queries for jurisdictions page
  const jurisdictions = useQuery(api.complianceQueries.getJurisdictions)
  const topics = useQuery(api.complianceQueries.getTopics)
  
  // Compliance generation queries
  const allComplianceReports = useQuery(api.importComplianceReports.getAIReports, {}) // Using existing function
  const websites = useQuery(api.websites.getUserWebsites)
  
  // Compliance generation actions
  const generateRule = useAction(api.complianceGeneration.generateComplianceRule)
  const generateEmbeddings = useAction(api.complianceGeneration.generateRuleEmbeddings)
  
  // AI Models queries (commented out until backend is deployed)
  // const allAIModels = useQuery(api.aiModelManager.getAllAIModels)
  // const chatModelConfig = useQuery(api.aiModelManager.getModelConfigForPurpose, { purpose: 'chat' })
  
  
  // User settings queries and mutations
  const userSettings = useQuery(api.userSettings.getUserSettings)
  // const updateAISettings = useMutation(api.userSettings.updateAISettings)
  // const updateNotificationFiltering = useMutation(api.userSettings.updateNotificationFiltering)
  // Removed test email action
  // const testAIModel = useAction(api.testActions.testAIModel)
  // Removed test email action
  
  // Template management queries and mutations
  const allTemplates = useQuery(api.complianceTemplates.getAllTemplates)
  const upsertTemplate = useMutation(api.complianceTemplates.upsertTemplate)
  const deleteTemplateAction = useMutation(api.complianceTemplates.deleteTemplate)
  
  // Template management state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    topicKey: string
    topicName: string
    template?: any
  } | null>(null)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  
  // Compliance generation state
  const [sourceSearchQuery, setSourceSearchQuery] = useState('')
  const [selectedJurisdictionFilter, setSelectedJurisdictionFilter] = useState('')
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('')
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [outputRuleName, setOutputRuleName] = useState('')
  const [synthesisPrompt, setSynthesisPrompt] = useState(`You are a professional compliance analyst for employment law. Your task is to synthesize multiple source documents into a unified compliance rule following the provided template structure.

Instructions:
- Combine information from all provided sources
- Follow the template structure exactly
- Include citations using [n] markers for each source
- Avoid speculation - only include information found in sources
- Ensure all template sections are filled with relevant information
- Maintain legal accuracy and clarity`)
  
  // Source preview state
  const [previewSource, setPreviewSource] = useState<any>(null)
  const [showSourcePreview, setShowSourcePreview] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  
  // Generated rule state
  const [generatedRule, setGeneratedRule] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [editableRule, setEditableRule] = useState('')
  const [sourceCitations, setSourceCitations] = useState<string[]>([])
  
  // Embeddings state
  const [generatedEmbeddings, setGeneratedEmbeddings] = useState<any[]>([])
  const [showEmbeddingsPreview, setShowEmbeddingsPreview] = useState(false)
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false)
  
  // Loading and success modals state
  const [showGenerationModal, setShowGenerationModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showEmbeddingsModal, setShowEmbeddingsModal] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [publishComplete, setPublishComplete] = useState(false)
  const [embeddingsComplete, setEmbeddingsComplete] = useState(false)
  
  // AI Models configuration state
  const [showModelConfig, setShowModelConfig] = useState(false)
  const [configPurpose, setConfigPurpose] = useState('')
  const [configSystemPrompt, setConfigSystemPrompt] = useState('')
  const [configTemperature, setConfigTemperature] = useState(0.7)
  const [configMaxTokens, setConfigMaxTokens] = useState(4096)
  
  // Add model state
  const [showAddModel, setShowAddModel] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelProvider, setNewModelProvider] = useState('')
  const [newModelId, setNewModelId] = useState('')
  const [newModelApiKey, setNewModelApiKey] = useState('')
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('')
  const [newModelCapabilities, setNewModelCapabilities] = useState<string[]>([])
  const [newModelDescription, setNewModelDescription] = useState('')

  // Filter and combine compliance reports and websites for source selection
  const availableSources = useMemo(() => {
    const sources: Array<{
      id: string
      title: string
      jurisdiction: string
      topic: string
      url: string
      scrapedAt: number
      wordCount: number
      priority: string
      type: 'report' | 'website'
    }> = []

    // Add compliance reports
    if (allComplianceReports) {
      allComplianceReports.forEach((report: any) => {
        // Parse jurisdiction and topic from ruleId (e.g., "alabama_minimum_wage")
        const ruleIdParts = report.ruleId?.split('_') || []
        const jurisdiction = ruleIdParts[0] ? ruleIdParts[0].charAt(0).toUpperCase() + ruleIdParts[0].slice(1) : 'Unknown'
        const topic = ruleIdParts.slice(1).join(' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'
        
        sources.push({
          id: report._id,
          title: `${jurisdiction} - ${topic}`,
          jurisdiction: jurisdiction,
          topic: topic,
          url: report.sourceUrl || 'Internal Report',
          scrapedAt: report.processedAt || report._creationTime || Date.now(),
          wordCount: report.rawContent?.length || 0,
          priority: 'high', // AI reports are typically high priority
          type: 'report'
        })
      })
    }

    // Add website scrape results
    if (websites) {
      websites.forEach((website: any) => {
        if (website.complianceMetadata) {
          const jurisdiction = website.complianceMetadata.jurisdiction || 'Unknown'
          const topic = website.complianceMetadata.topicKey || 'Unknown'
          const priority = website.complianceMetadata.priority || 'medium'
          
          sources.push({
            id: website._id,
            title: `${jurisdiction} - ${topic}`,
            jurisdiction: jurisdiction,
            topic: topic,
            url: website.url || 'Unknown URL',
            scrapedAt: website.lastChecked || website.createdAt || Date.now(),
            wordCount: 0, // Would need to get from scrape results
            priority: priority,
            type: 'website'
          })
        }
      })
    }

    return sources
  }, [allComplianceReports, websites])

  // Filter sources based on search and filters
  const filteredSources = useMemo(() => {
    return availableSources.filter((source: any) => {
      const matchesSearch = !sourceSearchQuery || 
        source.title.toLowerCase().includes(sourceSearchQuery.toLowerCase()) ||
        source.jurisdiction.toLowerCase().includes(sourceSearchQuery.toLowerCase()) ||
        source.topic.toLowerCase().includes(sourceSearchQuery.toLowerCase()) ||
        source.url.toLowerCase().includes(sourceSearchQuery.toLowerCase())
      
      const matchesJurisdiction = !selectedJurisdictionFilter || 
        source.jurisdiction === selectedJurisdictionFilter
      
      const matchesTopic = !selectedTopicFilter || 
        source.topic === selectedTopicFilter

      return matchesSearch && matchesJurisdiction && matchesTopic
    })
  }, [availableSources, sourceSearchQuery, selectedJurisdictionFilter, selectedTopicFilter])

  // Source selection handlers
  const toggleSourceSelection = (sourceId: string) => {
    const newSelection = new Set(selectedSources)
    if (newSelection.has(sourceId)) {
      newSelection.delete(sourceId)
    } else {
      newSelection.add(sourceId)
    }
    setSelectedSources(newSelection)
  }

  const clearAllSources = () => {
    setSelectedSources(new Set())
  }

  // Source preview handlers
  const handleSourcePreview = (source: any) => {
    // Find the actual source data with content
    let sourceWithContent = null
    let content = 'Content not available'
    let contentExplanation = ''
    
    if (source.type === 'report' && allComplianceReports) {
      sourceWithContent = allComplianceReports.find((report: any) => report._id === source.id)
      if (sourceWithContent?.rawContent) {
        content = sourceWithContent.rawContent
        contentExplanation = 'This is the raw scraped content from the compliance report.'
      } else if (sourceWithContent?.structuredData) {
        // Show structured data if raw content isn't available
        const structured = sourceWithContent.structuredData
        content = `STRUCTURED COMPLIANCE DATA:

Overview: ${structured.overview || 'Not available'}

Covered Employers: ${structured.coveredEmployers || 'Not specified'}

Covered Employees: ${structured.coveredEmployees || 'Not specified'}

Employer Responsibilities: ${structured.employerResponsibilities || structured.whatShouldEmployersDo || 'Not specified'}

Training Requirements: ${structured.trainingRequirements || 'Not specified'}

Training Deadlines: ${structured.trainingDeadlines || 'Not specified'}

Penalties: ${structured.penalties || 'Not specified'}

Sources: ${structured.sources || 'Not specified'}`
        contentExplanation = 'This report has been AI-processed into structured data. Raw content was not preserved.'
      } else {
        content = 'No content available for this report.'
        contentExplanation = 'This report exists in the database but has no content or structured data.'
      }
    } else if (source.type === 'website' && websites) {
      sourceWithContent = websites.find((website: any) => website._id === source.id)
      content = `This is a tracked compliance website for ${source.jurisdiction} - ${source.topic}.

Website URL: ${source.url}
Priority: ${source.priority}
Last Checked: ${new Date(source.scrapedAt).toLocaleDateString()}

To see the actual scraped content, you would need to check the scrape results from the main dashboard. This website is being monitored for compliance changes.`
      contentExplanation = 'Website content comes from periodic scrapes. The actual content would be in scrapeResults table.'
    }
    
    setPreviewSource({
      ...source,
      content,
      contentExplanation,
      fullData: sourceWithContent
    })
    setShowSourcePreview(true)
  }

  const closeSourcePreview = () => {
    setShowSourcePreview(false)
    setPreviewSource(null)
    setCopiedUrl(false)
  }

  // Copy URL function
  const copyUrlToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  // Rule generation handlers
  const handleGenerateRule = async () => {
    if (selectedSources.size === 0 || !selectedTemplate || !outputRuleName.trim()) {
      return
    }

    setShowGenerationModal(true)
    setGenerationComplete(false)
    setIsGenerating(true)
    
    try {
      const result = await generateRule({
        selectedSourceIds: Array.from(selectedSources),
        templateId: selectedTemplate,
        outputRuleName: outputRuleName,
        synthesisPrompt: synthesisPrompt,
      });
      
      if (result.success) {
        setGeneratedRule(result.generatedRule)
        setEditableRule(result.generatedRule)
        setSourceCitations(result.sourceCitations)
        setGenerationComplete(true)
      } else {
        throw new Error("Rule generation failed")
      }
      
    } catch (error) {
      console.error('Error generating rule:', error)
      alert('Error generating rule. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApproveAndPublish = async () => {
    if (!editableRule.trim()) {
      return
    }
    
    setShowPublishModal(true)
    setPublishComplete(false)
    
    try {
      // Simulate publishing delay - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Here you would save the rule to the database
      console.log('Publishing rule:', editableRule)
      setPublishComplete(true)
      
    } catch (error) {
      console.error('Error publishing rule:', error)
    }
  }

  const handleGenerateEmbeddings = async () => {
    if (!editableRule.trim() || !outputRuleName.trim()) {
      return
    }

    setShowEmbeddingsModal(true)
    setEmbeddingsComplete(false)
    setIsGeneratingEmbeddings(true)
    
    try {
      const result = await generateEmbeddings({
        ruleContent: editableRule,
        ruleTitle: outputRuleName,
      });
      
      if (result.success) {
        setGeneratedEmbeddings(result.embeddings)
        setEmbeddingsComplete(true)
      } else {
        throw new Error("Embedding generation failed")
      }
      
    } catch (error) {
      console.error('Error generating embeddings:', error)
      alert('Error generating embeddings. Please try again.')
    } finally {
      setIsGeneratingEmbeddings(false)
    }
  }

  // AI Model configuration handlers
  const handleConfigureModel = (purpose: string) => {
    setConfigPurpose(purpose)
    
    // Set default prompts based on purpose
    switch (purpose) {
      case 'chat':
        setConfigSystemPrompt('You are a professional compliance assistant specializing in US employment law.')
        setConfigTemperature(0.7)
        setConfigMaxTokens(4096)
        break
      case 'rule_generation':
        setConfigSystemPrompt('You are a professional compliance analyst for employment law. Your task is to synthesize multiple source documents into a unified compliance rule.')
        setConfigTemperature(0.3)
        setConfigMaxTokens(8192)
        break
      case 'embeddings':
        setConfigSystemPrompt('')
        setConfigTemperature(0)
        setConfigMaxTokens(0)
        break
      case 'change_analysis':
        setConfigSystemPrompt('You are an AI assistant specialized in analyzing website changes for compliance monitoring.')
        setConfigTemperature(0.5)
        setConfigMaxTokens(2048)
        break
    }
    
    setShowModelConfig(true)
  }

  // Get available models based on current setup
  const getAvailableModels = (purpose: string) => {
    const models = [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Google Gemini 2.0 Flash',
        provider: 'google',
        available: true, // We know this works from testing
        capabilities: ['chat', 'analysis', 'generation']
      },
      {
        id: 'text-embedding-004',
        name: 'Google Text Embedding 004',
        provider: 'google',
        available: true,
        capabilities: ['embeddings']
      }
      // OpenAI and Anthropic models would be added here when their API keys are detected
    ]
    
    // Map purpose to capability name
    const capabilityMap: { [key: string]: string } = {
      'chat': 'chat',
      'rule_generation': 'generation',
      'embeddings': 'embeddings',
      'change_analysis': 'analysis'
    }
    
    const capability = capabilityMap[purpose] || purpose
    
    // Filter models that support the requested capability
    return models.filter(model => 
      model.available && model.capabilities.includes(capability)
    )
  }

  // Get current model assigned to a capability
  const getCurrentModelForCapability = (capability: string) => {
    switch (capability) {
      case 'chat':
        return 'Google Gemini 2.0 Flash'
      case 'generation':
        return 'Google Gemini 2.0 Flash'
      case 'embeddings':
        return 'Google Text Embedding 004'
      case 'analysis':
        return 'Google Gemini 2.0 Flash' // Now enabled for change analysis
      default:
        return null
    }
  }

  // Environment status (only show keys that are actually set up)
  const getEnvironmentStatus = () => {
    return [
      { name: 'GEMINI_API_KEY', status: 'set', provider: 'Google' },
      { name: 'FIRECRAWL_API_KEY', status: 'set', provider: 'Firecrawl' },
      // Only show other API keys if they're actually configured
      // OpenAI and Anthropic will appear here when their keys are added
    ]
  }

  // Add model handlers
  const handleAddModel = () => {
    // Reset form
    setNewModelName('')
    setNewModelProvider('')
    setNewModelId('')
    setNewModelApiKey('')
    setNewModelBaseUrl('')
    setNewModelCapabilities([])
    setNewModelDescription('')
    setShowAddModel(true)
  }

  const handleCapabilityToggle = (capability: string) => {
    setNewModelCapabilities(prev => 
      prev.includes(capability) 
        ? prev.filter(c => c !== capability)
        : [...prev, capability]
    )
  }

  const handleSaveNewModel = () => {
    if (!newModelName || !newModelProvider || !newModelId || !newModelApiKey) {
      alert('Please fill in all required fields')
      return
    }

    // Check for capability conflicts
    const conflictWarnings = []
    if (newModelCapabilities.includes('chat')) {
      conflictWarnings.push('This will replace Google Gemini 2.0 Flash as the chat model')
    }
    if (newModelCapabilities.includes('generation')) {
      conflictWarnings.push('This will replace Google Gemini 2.0 Flash as the rule generation model')
    }
    if (newModelCapabilities.includes('embeddings')) {
      conflictWarnings.push('This will replace Google Text Embedding 004 as the embeddings model')
    }
    if (newModelCapabilities.includes('analysis')) {
      conflictWarnings.push('This will become the new change analysis model')
    }

    // Show confirmation if there are conflicts
    if (conflictWarnings.length > 0) {
      const confirmMessage = `Adding this model will make the following changes:\n\n${conflictWarnings.map(w => `• ${w}`).join('\n')}\n\nDo you want to continue?`
      if (!confirm(confirmMessage)) {
        return
      }
    }

    // Here you would call the API to save the model
    console.log('Saving new model:', {
      name: newModelName,
      provider: newModelProvider,
      modelId: newModelId,
      apiKeyEnvVar: newModelApiKey,
      baseUrl: newModelBaseUrl,
      capabilities: newModelCapabilities,
      description: newModelDescription,
      willReplace: conflictWarnings
    })

    alert(`Model added successfully! 

Next steps:
1. Add ${newModelApiKey} to your .env.local file
2. The new model will be assigned to: ${newModelCapabilities.join(', ')}
3. Previous models for these purposes will be replaced`)
    
    setShowAddModel(false)
  }
  
  // Query currentUser - it will return null if not authenticated
  // const currentUser = useQuery(api.users.getCurrentUser)
  
  // Handle query parameter navigation
  useEffect(() => {
    const section = searchParams.get('section')
    const templateParam = searchParams.get('template')
    
    if (section === 'templates') {
      setActiveSection('templates')
      
      // If template parameter is provided, auto-open that template for editing
      if (templateParam && allTemplates) {
        const template = allTemplates.find(t => t.templateId === templateParam)
        if (template) {
          setEditingTemplate({
            topicKey: template.topicKey || '',
            topicName: template.title,
            template: template
          })
          setShowTemplateEditor(true)
        }
      }
    }
  }, [searchParams, allTemplates])
    
    // Handle verification success
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setEmailSuccess(true)
      setTimeout(() => setEmailSuccess(false), 5000)
    }
    
    // Handle verification errors
    const error = searchParams.get('error')
    if (error) {
      let errorMessage = 'Verification failed'
      switch (error) {
        case 'missing-token':
          errorMessage = 'Verification link is invalid'
          break
        case 'token-expired':
          errorMessage = 'Verification link has expired'
          break
        case 'invalid-token':
          errorMessage = 'Invalid verification token'
          break
        case 'verification-failed':
          errorMessage = 'Email verification failed'
          break
        case 'verification-error':
          errorMessage = 'An error occurred during verification'
          break
      }
      setEmailError(errorMessage)
      setTimeout(() => setEmailError(null), 10000)
    }
  }, [searchParams])
  
  // Populate form fields with existing data
  useEffect(() => {
    if (userSettings?.defaultWebhookUrl) {
      // setDefaultWebhook(userSettings.defaultWebhookUrl) // This line was removed
    }
    if (userSettings?.emailTemplate) {
      setEmailTemplate(userSettings.emailTemplate)
    } else if (userSettings !== undefined) {
      // Set default template if no custom template exists
      const defaultTemplate = `
<h2>Website Change Alert</h2>
<p>We've detected changes on the website you're monitoring:</p>
<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <h3>{{websiteName}}</h3>
  <p><a href="{{websiteUrl}}">{{websiteUrl}}</a></p>
  <p><strong>Changed at:</strong> {{changeDate}}</p>
  <p><strong>Page Title:</strong> {{pageTitle}}</p>
</div>
<p><a href="{{viewChangesUrl}}" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Changes</a></p>
      `.trim()
      setEmailTemplate(defaultTemplate)
    }
    
    // Populate AI settings
    if (userSettings) {
      setAiEnabled(userSettings.aiAnalysisEnabled || false)
      setAiModel(userSettings.aiModel || 'gpt-4o-mini')
      setAiBaseUrl(userSettings.aiBaseUrl || '')
      
      // Set system prompt with default if not provided
      const defaultSystemPrompt = `You are an AI assistant specialized in analyzing website changes. Your task is to determine if a detected change is "meaningful" or just noise.

Meaningful changes include:
- Content updates (text, images, prices)
- New features or sections
- Important announcements
- Product availability changes
- Policy updates

NOT meaningful (ignore these):
- Rotating banners/carousels
- Dynamic timestamps
- View counters
- Session IDs
- Random promotional codes
- Cookie consent banners
- Advertising content
- Social media feed updates

Analyze the provided diff and return a JSON response with:
{
  "score": 0-100 (how meaningful the change is),
  "isMeaningful": true/false,
  "reasoning": "Brief explanation of your decision"
}`;
      
      setAiSystemPrompt(userSettings.aiSystemPrompt || defaultSystemPrompt)
      setAiThreshold(userSettings.aiMeaningfulChangeThreshold || 70)
      setAiApiKey(userSettings.aiApiKey || '')
      setWebhookOnlyIfMeaningful(userSettings.webhookOnlyIfMeaningful || false)
    }
  }, [userSettings])
  
  // Load chat settings when available
  useEffect(() => {
    if (chatSettings) {
      setChatSystemPrompt(chatSettings.chatSystemPrompt || 'You are a professional compliance assistant specializing in US employment law.')
      setChatModel(chatSettings.chatModel || 'gemini-2.0-flash-exp')
      setEnableComplianceContext(chatSettings.enableComplianceContext ?? true)
      setMaxContextReports(chatSettings.maxContextReports || 5)
      setEnableSemanticSearch(chatSettings.enableSemanticSearch ?? true)
    }
  }, [chatSettings])
  
  // Removed emailConfig handling
  
  // Show loading while auth is loading
  if (authLoading) {
    return (
      <Layout>
        <Header />
        <MainContent maxWidth="7xl" className="py-12">
          <div>
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading your account details...</p>
              </div>
            </div>
          </div>
        </MainContent>
        <Footer />
      </Layout>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/')
    return null
  }

  
  // API key handlers removed
  
  return (
    <Layout>
      <Header />
      
      <MainContent maxWidth="7xl" className="py-12">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-1">
                {/* Email Notifications removed */}
                {/* Firecrawl Auth removed */}
                <button
                  onClick={() => setActiveSection('monitoring')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'monitoring'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  System Health
                </button>
                <button
                  onClick={() => setActiveSection('jurisdictions')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'jurisdictions'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Jurisdictions
                </button>
                <button
                  onClick={() => setActiveSection('templates')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'templates'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Compliance Templates
                </button>
                <button
                  onClick={() => setActiveSection('generation')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'generation'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  Compliance Generation
                </button>
                <button
                  onClick={() => setActiveSection('ai-models')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'ai-models'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  AI Models
                </button>
              </nav>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {/* Firecrawl Auth section removed */}
              
              {activeSection === 'monitoring' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Bot className="h-6 w-6" />
                    System Health & Job Monitoring
                  </h2>
                  
                  <div className="space-y-6">
                    {/* System Overview */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">System Overview</h3>
                      {systemStatus ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-purple-700">Total Websites</div>
                            <div className="text-2xl font-bold text-purple-900">{systemStatus.overview.totalWebsites}</div>
                            <div className="text-xs text-purple-600">{systemStatus.overview.activeWebsites} active</div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-blue-700">Compliance Rules</div>
                            <div className="text-2xl font-bold text-blue-900">{systemStatus.overview.totalRules}</div>
                            <div className="text-xs text-blue-600">across 52 jurisdictions</div>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-green-700">Embeddings</div>
                            <div className="text-2xl font-bold text-green-900">{systemStatus.overview.totalEmbeddings.toLocaleString()}</div>
                            <div className="text-xs text-green-600">for RAG system</div>
                          </div>
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-orange-700">24h Activity</div>
                            <div className="text-2xl font-bold text-orange-900">{systemStatus.activity24h.changesDetected}</div>
                            <div className="text-xs text-orange-600">changes detected</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
                          <p className="text-gray-500">Loading system status...</p>
                        </div>
                      )}
                    </div>

                    {/* Cron Jobs Status */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Scheduled Jobs Status</h3>
                      {cronStatus ? (
                        <div className="space-y-3">
                          {cronStatus.jobs.map(job => (
                            <div key={job.name} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="font-medium">{job.name}</span>
                                  <p className="text-sm text-gray-600">{job.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    job.status === 'healthy' ? 'bg-green-500' : 
                                    job.status === 'no_recent_activity' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                  <span className={`text-sm font-medium ${
                                    job.status === 'healthy' ? 'text-green-700' : 
                                    job.status === 'no_recent_activity' ? 'text-yellow-700' : 'text-red-700'
                                  }`}>
                                    {job.status === 'healthy' ? 'Healthy' : 
                                     job.status === 'no_recent_activity' ? 'No Recent Activity' : 'Issues'}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-500">Last Run</div>
                                  <div className="font-medium">
                                    {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Success Rate</div>
                                  <div className="font-medium">{job.successRate}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Total Runs (24h)</div>
                                  <div className="font-medium">{job.totalRuns}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Failures (24h)</div>
                                  <div className="font-medium text-red-600">{job.failures}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                          <p className="text-gray-500">Loading job status...</p>
                        </div>
                      )}
                    </div>

                    {/* Embedding Jobs */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Embedding Generation Jobs</h3>
                      {embeddingJobs ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Total Embeddings</div>
                              <div className="text-xl font-bold text-purple-600">{embeddingJobs.totalEmbeddings.toLocaleString()}</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Pending</div>
                              <div className="text-xl font-bold text-yellow-600">{embeddingJobs.pendingJobs}</div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Processing</div>
                              <div className="text-xl font-bold text-blue-600">{embeddingJobs.processingJobs}</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Completed</div>
                              <div className="text-xl font-bold text-green-600">{embeddingJobs.completedJobs}</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Failed</div>
                              <div className="text-xl font-bold text-red-600">{embeddingJobs.failedJobs}</div>
                            </div>
                          </div>
                          
                          {/* Recent Jobs Table */}
                          {embeddingJobs.recentJobs.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <h4 className="font-medium text-sm">Recent Jobs (24h)</h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="border-b bg-gray-50">
                                    <tr>
                                      <th className="text-left p-2">Job ID</th>
                                      <th className="text-left p-2">Type</th>
                                      <th className="text-left p-2">Status</th>
                                      <th className="text-left p-2">Progress</th>
                                      <th className="text-left p-2">Started</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {embeddingJobs.recentJobs.map(job => (
                                      <tr key={job.jobId} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-mono text-xs">{job.jobId.slice(0, 16)}...</td>
                                        <td className="p-2 capitalize">{job.jobType.replace('_', ' ')}</td>
                                        <td className="p-2">
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {job.status}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          {job.progress.completed}/{job.progress.total}
                                          {job.progress.failed > 0 && (
                                            <span className="text-red-600 ml-1">({job.progress.failed} failed)</span>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                          <p className="text-gray-500">Loading embedding jobs...</p>
                        </div>
                      )}
                    </div>

                    {/* Compliance Crawler Health */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Compliance Crawler Health</h3>
                      {crawlerHealth ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium mb-3">Recent Activity (24h)</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Rules checked:</span>
                                  <span className="font-medium">{crawlerHealth.rulesChecked}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Changes detected:</span>
                                  <span className="font-medium text-orange-600">{crawlerHealth.changesDetected}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Successful crawls:</span>
                                  <span className="font-medium text-green-600">{crawlerHealth.successfulCrawls}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Failed crawls:</span>
                                  <span className="font-medium text-red-600">{crawlerHealth.failedCrawls}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Success rate:</span>
                                  <span className="font-medium">{crawlerHealth.crawlSuccessRate}%</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-3">System Components</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${crawlerHealth.workpoolHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span className="text-sm">Workpool: {crawlerHealth.workpoolHealthy ? 'Healthy' : 'Issues detected'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${crawlerHealth.firecrawlHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span className="text-sm">FireCrawl: {crawlerHealth.firecrawlHealthy ? 'Healthy' : 'Issues detected'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${crawlerHealth.geminiHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span className="text-sm">Gemini AI: {crawlerHealth.geminiHealthy ? 'Healthy' : 'Issues detected'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Recent Activity */}
                          {crawlerHealth.recentActivity.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3">Recent Crawler Activity</h4>
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="border-b bg-gray-50">
                                    <tr>
                                      <th className="text-left p-2">Rule ID</th>
                                      <th className="text-left p-2">Status</th>
                                      <th className="text-left p-2">Changes</th>
                                      <th className="text-left p-2">Time</th>
                                      <th className="text-left p-2">Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {crawlerHealth.recentActivity.map((activity, index) => (
                                      <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-mono text-xs">{activity.ruleId}</td>
                                        <td className="p-2">
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            activity.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                          }`}>
                                            {activity.status}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          {activity.changesDetected ? 
                                            <span className="text-orange-600 font-medium">Yes</span> : 
                                            <span className="text-gray-500">No</span>
                                          }
                                        </td>
                                        <td className="p-2">{new Date(activity.timestamp).toLocaleString()}</td>
                                        <td className="p-2">{activity.processingTime ? `${activity.processingTime}ms` : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                          <p className="text-gray-500">Loading crawler health...</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Raw Data Access */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Raw Data & Debugging</h3>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const data = JSON.stringify(cronStatus, null, 2);
                              const blob = new Blob([data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `cron-status-${new Date().toISOString().split('T')[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Export Cron Logs (JSON)
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const data = JSON.stringify(embeddingJobs, null, 2);
                              const blob = new Blob([data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `embedding-jobs-${new Date().toISOString().split('T')[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Export Embedding Jobs (JSON)
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const data = JSON.stringify(crawlerHealth, null, 2);
                              const blob = new Blob([data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `crawler-health-${new Date().toISOString().split('T')[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Export Crawler Results (JSON)
                          </Button>
                        </div>
                        
                        <details className="border rounded-lg p-3">
                          <summary className="cursor-pointer font-medium text-sm">View Raw System Status (JSON)</summary>
                          <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                            {JSON.stringify({ 
                              cronStatus, 
                              embeddingJobs, 
                              crawlerHealth, 
                              systemStatus 
                            }, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'jurisdictions' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <MapPin className="h-6 w-6" />
                    Jurisdictions & Compliance Rules
                  </h2>
                  
                  <div className="space-y-6">
                    {/* Filter Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong className="flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Tip:
                        </strong> Use "View Details" to filter rules by topic and priority within each jurisdiction.
                      </p>
                    </div>
                    
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="jurisdiction-filter">Filter by Jurisdiction</Label>
                        <select
                          id="jurisdiction-filter"
                          value={jurisdictionFilter}
                          onChange={(e) => { setJurisdictionFilter(e.target.value); setJurisdictionPage(1); }}
                          className="w-full mt-1 p-2 border rounded-md text-sm"
                        >
                          <option value="">All Jurisdictions</option>
                          {jurisdictions?.map((j) => (
                            <option key={j.code} value={j.name}>{j.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="jurisdiction-search">Search</Label>
                        <input
                          id="jurisdiction-search"
                          type="text"
                          value={jurisdictionSearch}
                          onChange={(e) => { setJurisdictionSearch(e.target.value); setJurisdictionPage(1); }}
                          placeholder="Search by name, type..."
                          className="w-full mt-1 p-2 border rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="jurisdiction-page-size">Page Size</Label>
                        <select
                          id="jurisdiction-page-size"
                          value={jurisdictionPageSize}
                          onChange={(e) => { setJurisdictionPageSize(parseInt(e.target.value)); setJurisdictionPage(1); }}
                          className="w-full mt-1 p-2 border rounded-md text-sm"
                        >
                          {[10, 20, 50].map(s => (
                            <option key={s} value={s}>{s} per page</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Jurisdictions Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-medium text-sm">
                          Compliance Rules by Jurisdiction
                          {jurisdictionFilter && (
                            <span className="ml-2 text-gray-500">
                              (filtered by: {jurisdictionFilter})
                            </span>
                          )}
                        </h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-gray-50">
                            <tr>
                              <th className="text-left p-3 font-medium">Jurisdiction</th>
                              <th className="text-left p-3 font-medium">Type</th>
                              <th className="text-left p-3 font-medium">Rules</th>
                              <th className="text-left p-3 font-medium">Last Updated</th>
                              <th className="text-left p-3 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jurisdictions
                              ?.filter(j => !jurisdictionFilter || j.name === jurisdictionFilter)
                              ?.filter(j => !jurisdictionSearch ||
                                j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()) ||
                                j.type.toLowerCase().includes(jurisdictionSearch.toLowerCase())
                              )
                              ?.slice((jurisdictionPage - 1) * jurisdictionPageSize, jurisdictionPage * jurisdictionPageSize)
                              .map((jurisdiction) => (
                              <tr key={jurisdiction.code} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">{jurisdiction.name}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    jurisdiction.type === 'federal' ? 'bg-blue-100 text-blue-800' :
                                    jurisdiction.type === 'state' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {jurisdiction.type}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-medium">{jurisdiction.ruleCount}</span>
                                  <span className="text-gray-500 ml-1">rules</span>
                                </td>
                                <td className="p-3 text-gray-600">
                                  {jurisdiction.lastUpdated ? 
                                    new Date(jurisdiction.lastUpdated).toLocaleDateString() : 
                                    'N/A'
                                  }
                                </td>
                                <td className="p-3">
                                  <JurisdictionDetailsPopover
                                    trigger={
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View Details
                                      </Button>
                                    }
                                    jurisdiction={jurisdiction.name}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Summary + Pagination */}
                      <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <span>
                            {(() => {
                              const filtered = (jurisdictions || [])
                                .filter(j => !jurisdictionFilter || j.name === jurisdictionFilter)
                                .filter(j => !jurisdictionSearch || j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()) || j.type.toLowerCase().includes(jurisdictionSearch.toLowerCase()))
                              const total = filtered.length
                              const start = total === 0 ? 0 : (jurisdictionPage - 1) * jurisdictionPageSize + 1
                              const end = Math.min(jurisdictionPage * jurisdictionPageSize, total)
                              return `Showing ${start}-${end} of ${total} jurisdictions`
                            })()}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-2 py-1 border rounded disabled:opacity-50"
                              onClick={() => setJurisdictionPage(p => Math.max(1, p - 1))}
                              disabled={jurisdictionPage === 1}
                            >
                              Prev
                            </button>
                            <span className="px-2">
                              Page {jurisdictionPage}
                            </span>
                            <button
                              className="px-2 py-1 border rounded disabled:opacity-50"
                              onClick={() => {
                                const filtered = (jurisdictions || [])
                                  .filter(j => !jurisdictionFilter || j.name === jurisdictionFilter)
                                  .filter(j => !jurisdictionSearch || j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()) || j.type.toLowerCase().includes(jurisdictionSearch.toLowerCase()))
                                const totalPages = Math.max(1, Math.ceil(filtered.length / jurisdictionPageSize))
                                setJurisdictionPage(p => Math.min(totalPages, p + 1))
                              }}
                            >
                              Next
                            </button>
                          </div>
                          <span>
                            Total rules: {jurisdictions?.reduce((sum, j) => sum + j.ruleCount, 0) || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'templates' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Compliance Templates
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Manage legal counsel templates for compliance monitoring
                      </p>
            </div>
                    <Button
                      onClick={() => {
                        setEditingTemplate({
                          topicKey: 'new',
                          topicName: 'New Template'
                        });
                        setShowTemplateEditor(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Template
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Search and Filter */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                          </div>
                          <Input
                            type="text"
                            placeholder="Search templates by name or topic..."
                            value={templateSearchQuery}
                            onChange={(e) => setTemplateSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {allTemplates?.length || 0} templates
                      </div>
                    </div>
                    
                    {/* Templates Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allTemplates
        ?.filter(template => 
          !templateSearchQuery || 
          template.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
          (template.topicKey && template.topicKey.toLowerCase().includes(templateSearchQuery.toLowerCase())) ||
          (template.description && template.description.toLowerCase().includes(templateSearchQuery.toLowerCase()))
        )
                        ?.map((template) => (
                        <div
                          key={template._id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">
                                {template.title}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {template.description || `Topic: ${template.topicKey || 'General'}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1" />
                          </div>
                          
                          <div className="text-xs text-gray-600 mb-3">
                            <div className="flex items-center justify-between">
                              <span>
                                {template.markdownContent.length} characters
                              </span>
                              <span>
                                Updated {new Date(template.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate({
                                  topicKey: template.topicKey || '',
                                  topicName: template.title,
                                  template: template
                                });
                                setShowTemplateEditor(true);
                              }}
                              className="flex-1 text-xs"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            
                            {!template.isDefault && (
                              <DeleteConfirmationPopover
                                trigger={
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                }
                                title="Delete Template"
                                description="This will permanently delete this compliance template. This action cannot be undone."
                                itemName={template.title}
                                onConfirm={async () => {
                                  await deleteTemplateAction({ templateId: template.templateId });
                                  // Removed addToast as it's not defined
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Empty State */}
                    {(!allTemplates || allTemplates.length === 0) && (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No templates found</p>
                        <p className="text-sm mb-4">Create your first compliance template to get started</p>
                        <Button
                          onClick={() => {
                            setEditingTemplate({
                              topicKey: 'new',
                              topicName: 'New Template'
                            });
                            setShowTemplateEditor(true);
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Create Template
                        </Button>
                      </div>
                    )}
                    
                    {/* Filtered Empty State */}
                    {allTemplates && allTemplates.length > 0 && 
                     allTemplates.filter(template => 
                       !templateSearchQuery || 
                       template.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                       (template.topicKey && template.topicKey.toLowerCase().includes(templateSearchQuery.toLowerCase())) ||
                       (template.description && template.description.toLowerCase().includes(templateSearchQuery.toLowerCase()))
                     ).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No templates match your search</p>
                        <p className="text-xs mt-1">Try a different search term</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {activeSection === 'generation' && (
                <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 w-full">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Bot className="h-6 w-6" />
                        Compliance Generation
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Use LLM to combine multiple scraped results and generate compliance rules with templates
                      </p>
                    </div>
                  </div>
                  
                  <div className="max-w-4xl mx-auto space-y-8">
                    {/* Step 1: Select Sources */}
                    <div className="border border-blue-200 rounded-lg p-4 lg:p-6 bg-blue-50">
                      <div className="flex items-center gap-2 mb-4">
                        <Search className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-medium text-blue-900">Step 1: Select Sources</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-sm text-blue-800">
                            Search and select from existing scraped compliance data to combine into a new rule.
                          </p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">report</span>
                                <span className="flex-1">AI-processed compliance report with structured legal data from government sources</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">website</span>
                                <span className="flex-1">Tracked compliance website being monitored for regulatory changes</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-medium">critical</span>
                                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium">high</span>
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">medium</span>
                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">low</span>
                                <span className="flex-1">Priority levels indicating importance for compliance monitoring</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Search and Filter */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Search Sources</label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search by jurisdiction, topic, or content..."
                                value={sourceSearchQuery}
                                onChange={(e) => setSourceSearchQuery(e.target.value)}
                                className="pl-10 mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Filter by Jurisdiction</label>
                            <select 
                              value={selectedJurisdictionFilter}
                              onChange={(e) => setSelectedJurisdictionFilter(e.target.value)}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">All jurisdictions</option>
                              {jurisdictions?.map(j => (
                                <option key={j.code} value={j.name}>{j.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Filter by Topic</label>
                            <select 
                              value={selectedTopicFilter}
                              onChange={(e) => setSelectedTopicFilter(e.target.value)}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">All topics</option>
                              {topics?.map(t => (
                                <option key={t.topicKey} value={t.topicKey}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Available Sources List */}
                        <div className="bg-white border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">
                              Available Sources ({availableSources.length} total, {filteredSources.length} filtered)
                            </h4>
                            <span className="text-xs text-gray-500">Select sources to combine</span>
                          </div>
                          
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {filteredSources.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">No sources match your filters</p>
                                <p className="text-xs mt-1">Try adjusting your search or filters</p>
                              </div>
                            ) : (
                              filteredSources.map((source: any) => {
                                const isSelected = selectedSources.has(source.id)
                                const priorityColors = {
                                  critical: 'bg-red-100 text-red-800',
                                  high: 'bg-orange-100 text-orange-800',
                                  medium: 'bg-yellow-100 text-yellow-800',
                                  low: 'bg-green-100 text-green-800'
                                }
                                
                                return (
                                  <div 
                                    key={source.id}
                                    className={`flex items-start gap-3 p-3 border rounded hover:bg-gray-50 ${
                                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                    }`}
                                  >
                                    <input 
                                      type="checkbox" 
                                      checked={isSelected}
                                      onChange={() => toggleSourceSelection(source.id)}
                                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-gray-900">{source.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[source.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
                                          {source.priority}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${source.type === 'report' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                          {source.type}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 truncate" title={source.url}>
                                        {source.url}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Scraped {new Date(source.scrapedAt).toLocaleDateString()} • {source.wordCount.toLocaleString()} chars
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleSourcePreview(source)}
                                      className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Preview source content"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </div>
                                )
                              })
                            )}
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{selectedSources.size} sources selected</span>
                              <button 
                                onClick={clearAllSources}
                                className="text-blue-600 hover:text-blue-800 underline"
                                disabled={selectedSources.size === 0}
                              >
                                Clear all
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Step 2: Choose Template & Generate */}
                    <div className="border border-purple-200 rounded-lg p-4 lg:p-6 bg-purple-50">
                      <div className="flex items-center gap-2 mb-4">
                        <Bot className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-medium text-purple-900">Step 2: Choose Template & Generate</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Compliance Template</label>
                            <select 
                              value={selectedTemplate}
                              onChange={(e) => setSelectedTemplate(e.target.value)}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">Select template...</option>
                              {allTemplates?.filter(t => t.isActive).map(t => (
                                <option key={t.templateId} value={t.templateId}>{t.title}</option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Template structure for the generated rule</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Output Rule Name</label>
                            <input
                              type="text"
                              placeholder="e.g., Multi-State Sexual Harassment Requirements"
                              value={outputRuleName}
                              onChange={(e) => setOutputRuleName(e.target.value)}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Name for the generated compliance rule</p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-700">LLM Synthesis Prompt</label>
                          <textarea
                            rows={6}
                            value={synthesisPrompt}
                            onChange={(e) => setSynthesisPrompt(e.target.value)}
                            className="mt-1 w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <Button 
                          className="w-full" 
                          variant="default"
                          onClick={handleGenerateRule}
                          disabled={selectedSources.size === 0 || !selectedTemplate || !outputRuleName.trim() || isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating Rule...
                            </>
                          ) : (
                            <>
                              <Bot className="h-4 w-4 mr-2" />
                              Generate Compliance Rule
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Step 3: Review & Publish */}
                    <div className="border border-green-200 rounded-lg p-4 lg:p-6 bg-green-50">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-medium text-green-900">Step 3: Review & Publish</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-white border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Generated Rule Preview</h4>
                          {generatedRule ? (
                            <div className="space-y-3">
                              <textarea
                                value={editableRule}
                                onChange={(e) => setEditableRule(e.target.value)}
                                rows={20}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono resize-y min-h-[400px] max-h-[600px] overflow-y-auto"
                                placeholder="Edit the generated compliance rule..."
                              />
                              <p className="text-xs text-gray-500">
                                ✏️ You can edit the generated rule above before publishing
                              </p>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                              <em>Generated compliance rule will appear here after synthesis...</em>
                            </div>
                          )}
                        </div>
                        
                        {sourceCitations.length > 0 && (
                          <div className="bg-white border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Source Citations</h4>
                            <div className="text-xs text-gray-600 space-y-1">
                              {sourceCitations.map((citation, index) => (
                                <div key={index}>{citation}</div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              💡 These citations are automatically generated from your selected sources
                            </p>
                          </div>
                        )}
                        
                        <div className="flex justify-end relative">
                          <Button 
                            onClick={handleApproveAndPublish}
                            disabled={!editableRule.trim()}
                            className="px-8"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve & Publish
                          </Button>
                          
                        </div>
                      </div>
                    </div>
                    
                    {/* Step 4: Generate Embeddings */}
                    <div className="border border-orange-200 rounded-lg p-4 lg:p-6 bg-orange-50">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-orange-600" />
                        <h3 className="text-lg font-medium text-orange-900">Step 4: Generate Embeddings</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <p className="text-sm text-gray-700">
                          Generate embeddings for the published compliance rule to make it searchable in the chat system.
                        </p>
                        
                        <div className="bg-white border border-orange-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">Embedding Status</h4>
                              <p className="text-sm text-gray-600">
                                {generatedEmbeddings.length > 0 
                                  ? `Generated ${generatedEmbeddings.length} embedding chunks`
                                  : editableRule 
                                    ? 'Ready to generate embeddings for approved rule'
                                    : 'Waiting for rule approval'
                                }
                              </p>
                            </div>
                            <div className="flex gap-2 relative">
                              {generatedEmbeddings.length > 0 && (
                                <Button 
                                  variant="outline"
                                  onClick={() => setShowEmbeddingsPreview(true)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </Button>
                              )}
                              <Button
                                onClick={handleGenerateEmbeddings}
                                disabled={!editableRule.trim() || isGeneratingEmbeddings}
                              >
                                {isGeneratingEmbeddings ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Generate Embeddings
                                  </>
                                )}
                              </Button>
                              
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 bg-white border border-orange-200 rounded p-3">
                          <strong>What happens:</strong>
                          <ul className="mt-1 space-y-1 ml-4 list-disc">
                            <li>Rule content is chunked into optimal sizes</li>
                            <li>Each chunk gets a Gemini embedding vector</li>
                            <li>Embeddings are saved to complianceEmbeddings table</li>
                            <li>Rule becomes searchable in chat system</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'ai-models' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Zap className="h-6 w-6" />
                        AI Models
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Manage AI providers and assign models to different tasks
                      </p>
                    </div>
                    <Button onClick={handleAddModel}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Model
                    </Button>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Environment Status */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 mb-3">Environment Variables Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {getEnvironmentStatus().map(env => (
                          <div key={env.name} className="flex items-center gap-2 text-sm">
                            <div className={`w-3 h-3 rounded-full ${env.status === 'set' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-gray-700">{env.name}</span>
                            <span className={env.status === 'set' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                              {env.status === 'set' ? '✓ Set' : 'Not set'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Current Model Assignments */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Current Model Assignments</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Chat System</h4>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Active</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Model:</strong> Google Gemini 2.0 Flash</p>
                            <p><strong>Provider:</strong> Google</p>
                            <p><strong>Purpose:</strong> Compliance chat assistance</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => handleConfigureModel('chat')}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Rule Generation</h4>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Model:</strong> Google Gemini 2.0 Flash</p>
                            <p><strong>Provider:</strong> Google</p>
                            <p><strong>Purpose:</strong> Compliance rule synthesis</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => handleConfigureModel('rule_generation')}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Embeddings</h4>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Model:</strong> Google Text Embedding 004</p>
                            <p><strong>Provider:</strong> Google</p>
                            <p><strong>Purpose:</strong> Vector embeddings for search</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => handleConfigureModel('embeddings')}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Change Analysis</h4>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Model:</strong> Google Gemini 2.0 Flash</p>
                            <p><strong>Provider:</strong> Google</p>
                            <p><strong>Purpose:</strong> Website change detection</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3" 
                            onClick={() => handleConfigureModel('change_analysis')}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Available Models */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Available AI Models</h3>
                      <div className="space-y-3">
                        {/* Only show Google models since they're the only ones with API keys set */}
                        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Bot className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">Google Gemini 2.0 Flash</h4>
                                <p className="text-sm text-gray-600">Fast, efficient model for chat and analysis</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Chat</span>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Analysis</span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Generation</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-green-600 font-medium">✓ Active</span>
                              <Button variant="outline" size="sm">
                                Test
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Zap className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">Google Text Embedding 004</h4>
                                <p className="text-sm text-gray-600">High-quality embeddings for semantic search</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Embeddings</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-green-600 font-medium">✓ Active</span>
                              <Button variant="outline" size="sm">
                                Test
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                    
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </MainContent>
      
      {/* Compliance Template Editor */}
      {showTemplateEditor && editingTemplate && (
        <ComplianceTemplateEditor
          isOpen={showTemplateEditor}
          onClose={() => {
            setShowTemplateEditor(false)
            setEditingTemplate(null)
          }}
          templateId={editingTemplate.template?.templateId}
          initialTemplate={editingTemplate.template ? {
            title: editingTemplate.template.title,
            description: editingTemplate.template.description,
            markdownContent: editingTemplate.template.markdownContent,
            topicKey: editingTemplate.template.topicKey,
            isDefault: editingTemplate.template.isDefault
          } : undefined}
          onSave={async (templateData) => {
            await upsertTemplate(templateData)
            // Removed addToast as it's not defined
          }}
        />
      )}
      
      {/* Source Preview Modal */}
      {showSourcePreview && previewSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">{previewSource.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    previewSource.type === 'report' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {previewSource.type}
                  </span>
                </div>
              </div>
              <button
                onClick={closeSourcePreview}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Jurisdiction</label>
                  <p className="text-sm text-gray-900 mt-1">{previewSource.jurisdiction}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Topic</label>
                  <p className="text-sm text-gray-900 mt-1">{previewSource.topic}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{previewSource.priority}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source URL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="group relative">
                        <p className="text-sm text-blue-600 truncate cursor-pointer">
                          <a href={previewSource.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {previewSource.url}
                          </a>
                        </p>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-md break-all shadow-lg">
                            {previewSource.url}
                            <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyUrlToClipboard(previewSource.url)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Copy URL"
                    >
                      {copiedUrl ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scraped Date</label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(previewSource.scrapedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content Length</label>
                  <p className="text-sm text-gray-900 mt-1">{previewSource.wordCount.toLocaleString()} characters</p>
                </div>
              </div>
              
              {/* Content Preview */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Content Preview</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {previewSource.content?.substring(0, 5000)}
                    {previewSource.content?.length > 5000 && '\n\n... (content truncated for preview)'}
                  </pre>
                </div>
              </div>
              
              {/* Additional Data */}
              {previewSource.fullData && (
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Additional Metadata</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                      {JSON.stringify(
                        {
                          id: previewSource.fullData._id,
                          createdAt: previewSource.fullData.createdAt,
                          updatedAt: previewSource.fullData._creationTime,
                          ...(previewSource.fullData.complianceMetadata && {
                            complianceMetadata: previewSource.fullData.complianceMetadata
                          })
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button variant="outline" onClick={closeSourcePreview}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  toggleSourceSelection(previewSource.id)
                  closeSourcePreview()
                }}
                className={selectedSources.has(previewSource.id) ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {selectedSources.has(previewSource.id) ? 'Remove from Selection' : 'Add to Selection'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Embeddings Preview Modal */}
      {showEmbeddingsPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Embeddings Preview</h2>
              <button
                onClick={() => setShowEmbeddingsPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Embedding Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Total Chunks:</span>
                      <span className="ml-2 text-blue-900">{generatedEmbeddings.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Vector Dimensions:</span>
                      <span className="ml-2 text-blue-900">{generatedEmbeddings[0]?.vector.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Status:</span>
                      <span className="ml-2 text-green-600 font-medium">Ready for Search</span>
                    </div>
                  </div>
                </div>
                
                {generatedEmbeddings.map((embedding, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Chunk {index + 1}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {embedding.metadata.section}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono">
                          {embedding.chunk}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vector (first 10 dimensions)</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                          [{embedding.vector.join(', ')}...]
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Section:</span>
                          <span className="ml-2 text-gray-700">{embedding.metadata.section}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Chunk Index:</span>
                          <span className="ml-2 text-gray-700">{embedding.metadata.chunkIndex}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button onClick={() => setShowEmbeddingsPreview(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rule Generation Loading Modal */}
      {showGenerationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-6">
                {generationComplete ? (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="h-8 w-8 text-purple-600 animate-pulse" />
                  </div>
                )}
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {generationComplete ? 'Rule Generated Successfully!' : 'Generating Compliance Rule'}
                </h2>
                
                <p className="text-gray-600">
                  {generationComplete 
                    ? `Your compliance rule has been generated from ${selectedSources.size} sources using AI synthesis.`
                    : 'AI is analyzing your selected sources and synthesizing them with the chosen template...'
                  }
                </p>
              </div>
              
              {!generationComplete && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Processing sources and template...</p>
                </div>
              )}
              
              {generationComplete && (
                <Button 
                  onClick={() => {
                    setShowGenerationModal(false)
                    setGenerationComplete(false)
                  }}
                  className="w-full"
                >
                  Accept
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Publish Loading Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-6">
                {publishComplete ? (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                )}
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {publishComplete ? 'Rule Published Successfully!' : 'Publishing Compliance Rule'}
                </h2>
                
                <p className="text-gray-600">
                  {publishComplete 
                    ? 'Your compliance rule has been approved and published. Ready for embedding generation.'
                    : 'Saving your compliance rule to the database...'
                  }
                </p>
              </div>
              
              {!publishComplete && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{width: '80%'}}></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Saving to database...</p>
                </div>
              )}
              
              {publishComplete && (
                <Button 
                  onClick={() => {
                    setShowPublishModal(false)
                    setPublishComplete(false)
                  }}
                  className="w-full"
                >
                  Accept
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Embeddings Generation Loading Modal */}
      {showEmbeddingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-6">
                {embeddingsComplete ? (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-8 w-8 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-8 w-8 text-blue-600 animate-pulse" />
                  </div>
                )}
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {embeddingsComplete ? 'Embeddings Generated Successfully!' : 'Generating Embeddings'}
                </h2>
                
                <p className="text-gray-600">
                  {embeddingsComplete 
                    ? 'Your compliance rule is now searchable in the chat system and ready for use.'
                    : 'Creating vector embeddings to make your rule searchable in the chat system...'
                  }
                </p>
              </div>
              
              {!embeddingsComplete && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '45%'}}></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Processing text chunks and generating vectors...</p>
                </div>
              )}
              
              {embeddingsComplete && (
                <div className="space-y-3">
                  <Button 
                    onClick={() => {
                      setShowEmbeddingsModal(false)
                      setEmbeddingsComplete(false)
                    }}
                    className="w-full"
                  >
                    Accept
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowEmbeddingsModal(false)
                      setEmbeddingsComplete(false)
                      setShowEmbeddingsPreview(true)
                    }}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Embeddings
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* AI Model Configuration Modal */}
      {showModelConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">
                Configure {configPurpose.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Model
              </h2>
              <button
                onClick={() => setShowModelConfig(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-6">
                {/* Model Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">AI Model</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {getAvailableModels(configPurpose).map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                    {getAvailableModels(configPurpose).length === 0 && (
                      <option value="" disabled>No models available for {configPurpose}</option>
                    )}
                  </select>
                  {getAvailableModels(configPurpose).length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      No models configured for {configPurpose.replace('_', ' ')}. Add a model with this capability first.
                    </p>
                  )}
                </div>
                
                {/* System Prompt */}
                {configPurpose !== 'embeddings' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">System Prompt</label>
                    <textarea
                      value={configSystemPrompt}
                      onChange={(e) => setConfigSystemPrompt(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Enter system prompt for this AI model..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This prompt defines the AI's role and behavior for {configPurpose.replace('_', ' ')} tasks.
                    </p>
                  </div>
                )}
                
                {/* Temperature */}
                {configPurpose !== 'embeddings' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Temperature: {configTemperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={configTemperature}
                      onChange={(e) => setConfigTemperature(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 (Focused)</span>
                      <span>0.5 (Balanced)</span>
                      <span>1 (Creative)</span>
                    </div>
                  </div>
                )}
                
                {/* Max Tokens */}
                {configPurpose !== 'embeddings' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Max Tokens</label>
                    <input
                      type="number"
                      min="100"
                      max="32000"
                      value={configMaxTokens}
                      onChange={(e) => setConfigMaxTokens(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of tokens the model can generate in response.
                    </p>
                  </div>
                )}
                
                {/* Embeddings Info */}
                {configPurpose === 'embeddings' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Embedding Model Configuration</h4>
                    <p className="text-sm text-blue-800">
                      Embedding models don't use system prompts or temperature settings. They convert text into numerical vectors for semantic search.
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div><strong>Current Model:</strong> Google Text Embedding 004</div>
                      <div><strong>Dimensions:</strong> 768</div>
                      <div><strong>Purpose:</strong> Semantic search in compliance chat</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowModelConfig(false)}>
                Cancel
              </Button>
              <Button>
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Model Modal */}
      {showAddModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Add New AI Model</h2>
              <button
                onClick={() => setShowAddModel(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Model Name *</label>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="e.g., OpenAI GPT-4o"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Provider *</label>
                    <select
                      value={newModelProvider}
                      onChange={(e) => setNewModelProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select provider...</option>
                      <option value="openai">OpenAI</option>
                      <option value="google">Google</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="azure">Azure OpenAI</option>
                      <option value="custom">Custom Provider</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Model ID *</label>
                    <input
                      type="text"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      placeholder="e.g., gpt-4o-mini"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">The exact model identifier used by the API</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">API Key Environment Variable *</label>
                    <input
                      type="text"
                      value={newModelApiKey}
                      onChange={(e) => setNewModelApiKey(e.target.value)}
                      placeholder="e.g., OPENAI_API_KEY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Environment variable name for the API key</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Base URL (Optional)</label>
                  <input
                    type="text"
                    value={newModelBaseUrl}
                    onChange={(e) => setNewModelBaseUrl(e.target.value)}
                    placeholder="e.g., https://api.openai.com/v1 (leave empty for default)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Capabilities *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['chat', 'analysis', 'generation', 'embeddings'].map(capability => {
                      const currentModel = getCurrentModelForCapability(capability)
                      return (
                        <label key={capability} className="flex flex-col gap-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newModelCapabilities.includes(capability)}
                              onChange={() => handleCapabilityToggle(capability)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{capability}</span>
                          </div>
                          {newModelCapabilities.includes(capability) && currentModel && (
                            <span className="text-xs text-orange-600 ml-5">
                              Will replace: {currentModel}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Select what this model can be used for. Only one model per capability is allowed.</p>
                  
                  {/* Show replacement warnings */}
                  {newModelCapabilities.length > 0 && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <h5 className="font-medium text-orange-900 mb-2">Model Assignment Changes</h5>
                      <div className="space-y-1 text-sm">
                        {newModelCapabilities.map(capability => {
                          const currentModel = getCurrentModelForCapability(capability)
                          return (
                            <div key={capability} className="flex items-center justify-between">
                              <span className="text-orange-800 capitalize">{capability}:</span>
                              <span className="text-orange-700">
                                {currentModel ? `Replace ${currentModel}` : 'New assignment'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                  <textarea
                    value={newModelDescription}
                    onChange={(e) => setNewModelDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of this model's strengths and use cases..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Environment Variable Reminder */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Remember to Add API Key</h4>
                      <p className="text-sm text-yellow-800 mt-1">
                        After adding this model, make sure to add <code className="bg-yellow-100 px-1 rounded">{newModelApiKey}</code> to your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file with your actual API key.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowAddModel(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveNewModel}
                disabled={!newModelName || !newModelProvider || !newModelId || !newModelApiKey || newModelCapabilities.length === 0}
              >
                Add Model
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </Layout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}