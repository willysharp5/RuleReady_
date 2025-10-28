import { useState } from 'react'
import { Settings, Info, Filter } from 'lucide-react'
import { AccordionSection } from './AccordionSection'

export function ChatProperties() {
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [debugOpen, setDebugOpen] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="space-y-2">
      <AccordionSection
        title="Chat Settings"
        icon={Settings}
        isOpen={settingsOpen}
        onToggle={() => setSettingsOpen(!settingsOpen)}
      >
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-zinc-600 mb-1">Model</label>
            <select className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-zinc-900">
              <option>Gemini 2.0 Flash</option>
              <option>Gemini 1.5 Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-zinc-600 mb-1">Max Reports</label>
            <input type="number" defaultValue={5} className="w-full px-3 py-1.5 border border-zinc-200 rounded-md" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Compliance Context</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Semantic Search</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Debug Info"
        icon={Info}
        isOpen={debugOpen}
        onToggle={() => setDebugOpen(!debugOpen)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Sources Found</span>
            <span className="font-medium">3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Response Time</span>
            <span className="font-medium">2.3s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Tokens Used</span>
            <span className="font-medium">1,245</span>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Filters"
        icon={Filter}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      >
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-zinc-600 mb-1">Jurisdiction</label>
            <select className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-zinc-900">
              <option>All</option>
              <option>California</option>
              <option>New York</option>
            </select>
          </div>
          <div>
            <label className="block text-zinc-600 mb-1">Topic</label>
            <select className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-zinc-900">
              <option>All</option>
              <option>Minimum Wage</option>
              <option>Paid Leave</option>
            </select>
          </div>
        </div>
      </AccordionSection>
    </div>
  )
}

