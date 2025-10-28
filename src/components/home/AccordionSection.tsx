import { ChevronRight } from 'lucide-react'

interface AccordionSectionProps {
  title: string
  icon: React.ElementType
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function AccordionSection({ title, icon: Icon, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="border border-zinc-200 rounded-md bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-500" />
          <span className="font-medium text-sm text-zinc-900">{title}</span>
        </div>
        <ChevronRight 
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-3 py-3 border-t border-zinc-100">
          {children}
        </div>
      )}
    </div>
  )
}

