import { useState } from 'react'
import { Filter, Info } from 'lucide-react'
import { AccordionSection } from './AccordionSection'

export function JurisdictionsProperties() {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [statsOpen, setStatsOpen] = useState(true)

  return (
    <div className="space-y-2">
      <AccordionSection
        title="Filters"
        icon={Filter}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      >
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-zinc-600 mb-1">Search</label>
            <input 
              type="text" 
              placeholder="Search jurisdictions..."
              className="w-full px-3 py-1.5 border border-zinc-200 rounded-md"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Active Only</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Statistics"
        icon={Info}
        isOpen={statsOpen}
        onToggle={() => setStatsOpen(!statsOpen)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Total</span>
            <span className="font-medium">52</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Active</span>
            <span className="font-medium">48</span>
          </div>
        </div>
      </AccordionSection>
    </div>
  )
}

