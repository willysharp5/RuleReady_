type FeatureType = 'chat' | 'research' | 'templates' | 'jurisdictions' | 'topics'

interface NavItem {
  id: FeatureType
  label: string
  icon: React.ElementType
}

interface LeftNavigationProps {
  navItems: NavItem[]
  activeFeature: FeatureType
  onFeatureChange: (feature: FeatureType) => void
}

export function LeftNavigation({ navItems, activeFeature, onFeatureChange }: LeftNavigationProps) {
  return (
    <nav className="w-20 lg:w-20 border-r border-zinc-200 bg-white flex flex-col py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeFeature === item.id
        
        return (
          <button
            key={item.id}
            onClick={() => onFeatureChange(item.id)}
            className={`
              flex flex-col items-center justify-center py-4 px-2 gap-1.5
              transition-colors duration-200
              ${isActive 
                ? 'bg-purple-500 text-white' 
                : 'text-zinc-600 hover:bg-purple-50 hover:text-purple-600'
              }
            `}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[11px] font-medium text-center leading-tight">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

