import { Info, Loader2, Bot, CheckCircle2, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function AIModelsProperties() {
  const [providers, setProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Test state
  const [testPopoverOpen, setTestPopoverOpen] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [selectedTestModel, setSelectedTestModel] = useState('gemini-2.0-flash-exp')
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    latency?: number
    modelInfo?: string
  } | null>(null)

  // Available Gemini models
  const geminiModels = [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', description: 'Fast, efficient, current default' },
    { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash Latest', description: 'Stable, fast' },
    { id: 'gemini-1.5-flash-8b-latest', name: 'Gemini 1.5 Flash 8B Latest', description: 'Lightweight, cost-effective' },
    { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro Latest', description: 'Advanced reasoning' },
    { id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Gemini 2.0 Flash Thinking', description: 'Extended reasoning' },
  ]

  // Fetch active providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/env-status')
        if (response.ok) {
          const data = await response.json()
          const activeProviders = (data.envStatus as Array<{ status: string; provider: string }>)
            .filter((env) => env.status === 'set')
            .map((env) => env.provider)
          
          // Remove duplicates and format
          const uniqueProviders = Array.from(new Set(activeProviders))
          setProviders(uniqueProviders)
        }
      } catch (error) {
        console.error('Error fetching providers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [])

  const handleTestModel = async (modelId?: string) => {
    const modelToTest = modelId || selectedTestModel
    setTestLoading(true)
    setTestResult(null)
    
    try {
      const startTime = Date.now()
      
      const response = await fetch('/api/test-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToTest,
        }),
      })
      
      const latency = Date.now() - startTime
      
      if (response.ok) {
        await response.json()
        const modelName = geminiModels.find(m => m.id === modelToTest)?.name || modelToTest
        setTestResult({
          success: true,
          message: 'Model is responding correctly',
          latency,
          modelInfo: modelName,
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setTestResult({
          success: false,
          message: errorData.error || 'Model test failed',
          latency,
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">AI Models</h5>
        <div className="text-xs text-blue-800 space-y-1.5">
          <div>Configure AI providers and model assignments for different tasks</div>
          <div className="mt-2">
            <strong>Active Providers:</strong>
            {loading ? (
              <span className="inline-flex items-center gap-1 ml-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking...
              </span>
            ) : providers.length > 0 ? (
              <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                {providers.map((provider) => (
                  <li key={provider}>{provider}</li>
                ))}
              </ul>
            ) : (
              <div className="text-red-600 ml-1">None configured</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-green-600 mt-0.5" />
          <div className="text-xs text-green-800">
            <div className="font-medium mb-1">All models are configured via environment variables</div>
            <div>API keys are set in your .env.local file</div>
          </div>
        </div>
      </div>

      {/* Available Models */}
      <div className="border border-gray-200 rounded-lg p-3">
        <h5 className="font-medium text-gray-900 mb-3 text-sm">Test AI Model</h5>
        <div className="border border-green-200 bg-green-50 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-xs">Gemini 2.0 Flash</h4>
              <p className="text-xs text-gray-600">Fast, efficient model for chat and research</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">Chat</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Research</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600 font-medium">✓ Active</span>
            <Popover open={testPopoverOpen} onOpenChange={setTestPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => {
                    setTestPopoverOpen(true)
                    setTestResult(null)
                  }}
                >
                  Test
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 max-h-[600px] overflow-y-auto" align="end" side="left" sideOffset={10}>
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm sticky top-0 bg-white pb-2">Test Gemini Model</h4>
                  
                  {/* Model Selector */}
                  {!testLoading && !testResult && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-600">Select Model to Test</Label>
                        <select
                          value={selectedTestModel}
                          onChange={(e) => setSelectedTestModel(e.target.value)}
                          className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {geminiModels.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name} - {model.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <Button 
                        onClick={() => handleTestModel()}
                        className="w-full bg-purple-500 hover:bg-purple-600"
                        size="sm"
                      >
                        Run Test
                      </Button>
                    </div>
                  )}
                  
                  {/* Loading State */}
                  {testLoading && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-3" />
                      <p className="text-sm text-gray-600">Testing {geminiModels.find(m => m.id === selectedTestModel)?.name}...</p>
                    </div>
                  )}
                  
                  {/* Test Results */}
                  {!testLoading && testResult && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        {testResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                            {testResult.success ? 'Success' : 'Failed'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {testResult.success ? testResult.message : 'Model test failed. See details below.'}
                          </p>
                        </div>
                      </div>
                      
                      {testResult.success ? (
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                          {testResult.modelInfo && (
                            <div>
                              <span className="font-medium text-gray-700">Model:</span>
                              <span className="text-gray-600 ml-2">{testResult.modelInfo}</span>
                            </div>
                          )}
                          {testResult.latency !== undefined && (
                            <div>
                              <span className="font-medium text-gray-700">Latency:</span>
                              <span className="text-gray-600 ml-2">{testResult.latency}ms</span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-700">Status:</span>
                            <span className="text-green-600 ml-2">✓ Operational</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 rounded-lg p-3 text-xs text-red-800 space-y-2 max-h-80 overflow-y-auto">
                          <div>
                            <div className="font-semibold mb-1">Error Details:</div>
                            <div className="break-words whitespace-pre-wrap text-xs leading-relaxed">{testResult.message}</div>
                          </div>
                          {testResult.message.includes('quota') && (
                            <div className="pt-2 border-t border-red-200">
                              <strong>Quota Limit:</strong> You&apos;ve exceeded your API quota. Try again later or use Gemini 2.0 Flash instead.
                            </div>
                          )}
                          {testResult.message.includes('not found') && (
                            <div className="pt-2 border-t border-red-200">
                              <strong>Model Unavailable:</strong> This model may not be available with your API key. Try Gemini 2.0 Flash instead.
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setTestResult(null)
                          }}
                        >
                          Test Another
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setTestPopoverOpen(false)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
}

