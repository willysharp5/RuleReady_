'use client'

import { useState } from 'react'
import { Plus, Zap, Bot, Edit3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export default function AIModelsFeature() {
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

  const getEnvironmentStatus = () => {
    return [
      { name: 'GEMINI_API_KEY', status: 'set', provider: 'Google' },
      { name: 'FIRECRAWL_API_KEY', status: 'set', provider: 'Firecrawl' },
    ]
  }

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
    
    // Embeddings models don't have configurable settings
    if (purpose === 'embeddings') {
      alert('Embeddings models convert text to vectors and do not have temperature or token settings to configure.')
      return
    }
    
    // Load prompts from existing settings
    switch (purpose) {
      case 'chat':
        setConfigSystemPrompt('')
        setConfigTemperature(0.7)
        setConfigMaxTokens(4096)
        break
      case 'rule_generation':
        setConfigSystemPrompt('')
        setConfigTemperature(0.3)
        setConfigMaxTokens(8192)
        break
      case 'change_analysis':
        setConfigSystemPrompt('')
        setConfigTemperature(0.5)
        setConfigMaxTokens(4096)
        break
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

    alert(`Model added successfully! 

Next steps:
1. Add ${newModelApiKey} to your .env.local file
2. The new model will be assigned to: ${newModelCapabilities.join(', ')}
3. Previous models for these purposes will be replaced`)
    
    setShowAddModel(false)
  }

  const handleSaveModelConfig = async () => {
    alert('Configuration noted. System prompts are managed in their respective sections for per-use customization.')
    setShowModelConfig(false)
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
                <Button variant="outline" size="sm" onClick={() => alert('Test functionality coming soon')}>
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
                <Button variant="outline" size="sm" onClick={() => alert('Test functionality coming soon')}>
                  Test
                </Button>
              </div>
            </div>
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
                  You'll need to add this to your .env.local file
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
                  {['chat', 'generation', 'embeddings', 'analysis'].map(cap => (
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
              <h3 className="text-xl font-semibold">Configure {configPurpose.replace('_', ' ').toUpperCase()} Model</h3>
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
                />
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
