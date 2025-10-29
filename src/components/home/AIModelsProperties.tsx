import { Info } from 'lucide-react'

export function AIModelsProperties() {
  return (
    <div className="space-y-2">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">AI Models</h5>
        <div className="text-xs text-blue-800 space-y-1.5">
          <div>Configure AI providers and model assignments for different tasks</div>
          <div className="mt-2"><strong>Current Provider:</strong> Google (Gemini)</div>
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
    </div>
  )
}

