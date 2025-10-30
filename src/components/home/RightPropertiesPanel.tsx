import { ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react'
import { ChatProperties } from './ChatProperties'
import { ResearchProperties } from './ResearchProperties'
import { SavedResearchProperties } from './SavedResearchProperties'
import { TemplatesProperties } from './TemplatesProperties'
import { JurisdictionsProperties } from './JurisdictionsProperties'
import { TopicsProperties } from './TopicsProperties'
import { AIModelsProperties } from './AIModelsProperties'

type FeatureType = 'chat' | 'research' | 'saved-research' | 'templates' | 'jurisdictions' | 'topics' | 'ai-models'

interface RightPropertiesPanelProps {
  activeFeature: FeatureType
  isOpen: boolean
  onToggle: () => void
  researchState?: any
  setResearchState?: (state: any) => void
  updateResearchSettings?: any
  onDismissError?: () => void
}

export function RightPropertiesPanel({ activeFeature, isOpen, onToggle, researchState, setResearchState, updateResearchSettings, onDismissError }: RightPropertiesPanelProps) {
  return (
    <>
      {/* Floating Config Error Popover */}
      {activeFeature === 'research' && researchState?.configError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4">
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 shadow-xl">
            <button
              onClick={onDismissError}
              className="absolute top-3 right-3 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full p-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div className="text-sm space-y-2">
                <p className="font-bold text-red-900">{researchState.configError.message}</p>
                <p className="text-red-800 text-xs">{researchState.configError.error}</p>
                {researchState.configError.invalidJson && (
                  <div className="mt-2 p-2 bg-red-900/20 rounded font-mono text-[10px] overflow-auto max-h-32 text-red-900 whitespace-pre-wrap break-all">
                    {researchState.configError.invalidJson}
                  </div>
                )}
                <p className="text-red-700 text-xs italic">→ Using default configuration for this search</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <aside 
        className={`
          relative border-l border-zinc-200 bg-zinc-50 transition-all duration-300
          ${isOpen ? 'w-96' : 'w-0'}
        `}
      >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          absolute top-4 -left-8 z-10
          w-8 h-8 rounded-l-md border border-r-0 border-zinc-200
          bg-white hover:bg-zinc-50
          flex items-center justify-center
          transition-colors
        `}
      >
        {isOpen ? (
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-zinc-600" />
        )}
      </button>

      {/* Properties Content */}
      {isOpen && (
        <div className="p-4 h-full overflow-auto">
          {activeFeature === 'chat' && <ChatProperties />}
          {activeFeature === 'research' && (
            <ResearchProperties 
              researchState={researchState}
              setResearchState={setResearchState}
              updateResearchSettings={updateResearchSettings}
              onDismissError={onDismissError}
            />
          )}
          {activeFeature === 'saved-research' && <SavedResearchProperties />}
          {activeFeature === 'templates' && <TemplatesProperties />}
          {activeFeature === 'jurisdictions' && <JurisdictionsProperties />}
          {activeFeature === 'topics' && <TopicsProperties />}
          {activeFeature === 'ai-models' && <AIModelsProperties />}
        </div>
      )}
    </aside>
    </>
  )
}

