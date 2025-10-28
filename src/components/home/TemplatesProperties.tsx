import { useState } from 'react'
import { Info } from 'lucide-react'
import { AccordionSection } from './AccordionSection'

export function TemplatesProperties() {
  const [infoOpen, setInfoOpen] = useState(true)

  return (
    <div className="space-y-2">
      <AccordionSection
        title="Template Info"
        icon={Info}
        isOpen={infoOpen}
        onToggle={() => setInfoOpen(!infoOpen)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Topic</span>
            <span className="font-medium">Selected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Last Updated</span>
            <span className="font-medium">2 days ago</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Active</span>
            <span className="font-medium text-green-600">Yes</span>
          </div>
        </div>
      </AccordionSection>
    </div>
  )
}

