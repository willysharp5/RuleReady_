'use client'

import { useState, useEffect } from 'react'
import { Plus, Zap, Edit3, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useToast } from '@/hooks/use-toast'

export default function AIModelsFeature() {
  const { addToast } = useToast()
  const updateChatSettings = useMutation(api.chatSettings.updateChatSettings)
  const updateResearchSettings = useMutation(api.researchSettings.updateResearchSettings)
  const chatSettings = useQuery(api.chatSettings.getChatSettings)
  const researchSettings = useQuery(api.researchSettings.getResearchSettings)
  
  // AI Models configuration state
  const [showModelConfig, setShowModelConfig] = useState(false)
  const [configPurpose, setConfigPurpose] = useState('')
  const [configTemperature, setConfigTemperature] = useState(0.7)
  const [configMaxTokens, setConfigMaxTokens] = useState(8192)
  
  // Add model state
  const [showAddModel, setShowAddModel] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelProvider, setNewModelProvider] = useState('')
  const [newModelId, setNewModelId] = useState('')
  const [newModelApiKey, setNewModelApiKey] = useState('')
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('')
  const [newModelCapabilities, setNewModelCapabilities] = useState<string[]>([])
  const [newModelDescription, setNewModelDescription] = useState('')

  // Environment status state
  const [envStatus, setEnvStatus] = useState<Array<{
    name: string
    status: string
    provider: string
  }>>([])
  const [envLoading, setEnvLoading] = useState(true)

  // Fetch environment status on mount
  useEffect(() => {
    const fetchEnvStatus = async () => {
      try {
        const response = await fetch('/api/env-status')
        if (response.ok) {
          const data = await response.json()
          setEnvStatus(data.envStatus)
        } else {
          console.error('Failed to fetch environment status')
        }
      } catch (error) {
        console.error('Error fetching environment status:', error)
      } finally {
        setEnvLoading(false)
      }
    }

    fetchEnvStatus()
  }, [])

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

  const handleConfigureModel = (purpose: string) => {
    setConfigPurpose(purpose)
    
    // Load settings from database
    if (purpose === 'chat' && chatSettings) {
      setConfigTemperature(chatSettings.chatTemperature ?? 0.7)
      setConfigMaxTokens(chatSettings.chatMaxTokens ?? 8192)
    } else if (purpose === 'research' && researchSettings) {
      setConfigTemperature(researchSettings.researchTemperature ?? 0.5)
      setConfigMaxTokens(researchSettings.researchMaxTokens ?? 8192)
    }
    
    setShowModelConfig(true)
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
    if (newModelCapabilities.includes('research')) {
      conflictWarnings.push('This will replace Google Gemini 2.0 Flash as the research model')
    }

    // Show confirmation if there are conflicts
    if (conflictWarnings.length > 0) {
      const confirmMessage = `Adding this model will make the following changes:\n\n${conflictWarnings.map(w => `• ${w}`).join('\n')}\n\nDo you want to continue?`
      if (!confirm(confirmMessage)) {
        return
      }
    }

    alert(`Model added successfully! 

Next steps:
1. Add ${newModelApiKey} to your .env.local file
2. The new model will be assigned to: ${newModelCapabilities.join(', ')}
3. Previous models for these purposes will be replaced`)
    
    setShowAddModel(false)
  }

  const handleSaveModelConfig = async () => {
    try {
      if (configPurpose === 'chat') {
        await updateChatSettings({
          chatTemperature: configTemperature,
          chatMaxTokens: configMaxTokens,
        })
      } else if (configPurpose === 'research') {
        await updateResearchSettings({
          researchTemperature: configTemperature,
          researchMaxTokens: configMaxTokens,
        })
      }
      
      addToast({
        title: 'Settings Saved',
        description: `${configPurpose === 'chat' ? 'Chat' : 'Research'} model configuration has been updated.`,
        variant: 'success',
        duration: 3000
      })
      setShowModelConfig(false)
    } catch (error: any) {
      addToast({
        title: 'Failed to Save',
        description: error.message || 'Could not save configuration',
        variant: 'error',
        duration: 5000
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            AI Models
          </h2>
          <p className="text-gray-600 mt-1">
            Manage AI providers and assign models to different tasks
          </p>
        </div>
        <Button onClick={handleAddModel} className="bg-purple-500 hover:bg-purple-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Model
        </Button>
      </div>
      
      {/* Environment Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-3">Environment Variables Status</h3>
        {envLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-blue-800">Checking environment variables...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {envStatus.map(env => (
              <div key={env.name} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${env.status === 'set' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-700">{env.name}</span>
                <span className={`flex-shrink-0 whitespace-nowrap ml-auto ${env.status === 'set' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}`}>
                  {env.status === 'set' ? '✓ Set' : '✗ Not set'}
                </span>
              </div>
            ))}
          </div>
        )}
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
              <h4 className="font-medium text-gray-900">Research</h4>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Model:</strong> Google Gemini 2.0 Flash</p>
              <p><strong>Provider:</strong> Google</p>
              <p><strong>Purpose:</strong> Research and document analysis</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => handleConfigureModel('research')}
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Configure
            </Button>
          </div>
        </div>
      </div>
      
      {/* Add Model Modal */}
      {showAddModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">Add New AI Model</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <Label>Model Name *</Label>
                <Input
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g., GPT-4 Turbo"
                />
              </div>
              
              <div>
                <Label>Provider *</Label>
                <select
                  value={newModelProvider}
                  onChange={(e) => setNewModelProvider(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select provider...</option>
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                  <option value="Google">Google</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              
              <div>
                <Label>Model ID *</Label>
                <Input
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="e.g., gpt-4-turbo, claude-3-opus"
                />
              </div>
              
              <div>
                <Label>API Key Environment Variable *</Label>
                <Input
                  value={newModelApiKey}
                  onChange={(e) => setNewModelApiKey(e.target.value)}
                  placeholder="e.g., OPENAI_API_KEY"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You&apos;ll need to add this to your .env.local file
                </p>
              </div>
              
              <div>
                <Label>Base URL (optional)</Label>
                <Input
                  value={newModelBaseUrl}
                  onChange={(e) => setNewModelBaseUrl(e.target.value)}
                  placeholder="e.g., https://api.openai.com/v1"
                />
              </div>
              
              <div>
                <Label>Capabilities *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['chat', 'research'].map(cap => (
                    <label key={cap} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={newModelCapabilities.includes(cap)}
                        onChange={() => handleCapabilityToggle(cap)}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{cap}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newModelDescription}
                  onChange={(e) => setNewModelDescription(e.target.value)}
                  placeholder="Brief description of this model..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowAddModel(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveNewModel} className="flex-1 bg-purple-500 hover:bg-purple-600">
                Add Model
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Configure Model Modal */}
      {showModelConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">
                Configure {configPurpose.charAt(0).toUpperCase() + configPurpose.slice(1)} Model
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowModelConfig(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                System prompts are managed in their respective feature sections for per-use customization.
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Temperature</Label>
                  <span className="text-sm font-medium text-purple-600">{configTemperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={configTemperature}
                  onChange={(e) => setConfigTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>0 (Focused)</span>
                  <span>0.5 (Balanced)</span>
                  <span>1 (Creative)</span>
                </div>
              </div>
              
                  <div>
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={configMaxTokens}
                      onChange={(e) => setConfigMaxTokens(parseInt(e.target.value))}
                      min={100}
                      max={65536}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum output tokens (check your model&apos;s documentation for limits)
                    </p>
                  </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowModelConfig(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveModelConfig} className="flex-1 bg-purple-500 hover:bg-purple-600">
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
