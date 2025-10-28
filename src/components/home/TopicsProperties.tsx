import { useState } from 'react'
import { Info } from 'lucide-react'
import { AccordionSection } from './AccordionSection'

export function TopicsProperties() {
  const [statsOpen, setStatsOpen] = useState(true)

  return (
    <div className="space-y-2">
      <AccordionSection
        title="Statistics"
        icon={Info}
        isOpen={statsOpen}
        onToggle={() => setStatsOpen(!statsOpen)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Total Topics</span>
            <span className="font-medium">12</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Total Rules</span>
            <span className="font-medium">1,247</span>
          </div>
        </div>
      </AccordionSection>
    </div>
  )
}

