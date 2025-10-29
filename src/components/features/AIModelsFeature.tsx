'use client'

import { useState } from 'react'
import { Plus, Zap, Bot, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AIModelsFeature() {
  const [configPurpose, setConfigPurpose] = useState<string | null>(null)
  const [showAddModel, setShowAddModel] = useState(false)

  const getEnvironmentStatus = () => {
    return [
      { name: 'GEMINI_API_KEY', status: 'set', provider: 'Google' },
      { name: 'FIRECRAWL_API_KEY', status: 'set', provider: 'Firecrawl' },
    ]
  }

  const handleAddModel = () => {
    setShowAddModel(true)
  }

  const handleConfigureModel = (purpose: string) => {
    setConfigPurpose(purpose)
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
  )
}

