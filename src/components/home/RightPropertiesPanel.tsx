import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ChatProperties } from './ChatProperties'
import { ResearchProperties } from './ResearchProperties'
import { TemplatesProperties } from './TemplatesProperties'
import { JurisdictionsProperties } from './JurisdictionsProperties'
import { TopicsProperties } from './TopicsProperties'

type FeatureType = 'chat' | 'research' | 'templates' | 'jurisdictions' | 'topics'

interface RightPropertiesPanelProps {
  activeFeature: FeatureType
  isOpen: boolean
  onToggle: () => void
  researchState?: any
  setResearchState?: (state: any) => void
  updateResearchSettings?: any
}

export function RightPropertiesPanel({ activeFeature, isOpen, onToggle, researchState, setResearchState, updateResearchSettings }: RightPropertiesPanelProps) {
  return (
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
            />
          )}
          {activeFeature === 'templates' && <TemplatesProperties />}
          {activeFeature === 'jurisdictions' && <JurisdictionsProperties />}
          {activeFeature === 'topics' && <TopicsProperties />}
        </div>
      )}
    </aside>
  )
}

