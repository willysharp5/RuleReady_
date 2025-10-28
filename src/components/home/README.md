# Home Page Components

This directory contains modular, reusable components for the `/home` page of RuleReady.

## Component Architecture

```
/home
├── Layout Components (Navigation & Panels)
│   ├── LeftNavigation.tsx       - Left sidebar with feature navigation
│   └── RightPropertiesPanel.tsx - Right sidebar container
│
├── Properties Components (Feature-specific settings)
│   ├── ChatProperties.tsx         - Chat settings & debug info
│   ├── ResearchProperties.tsx     - Research AI & Firecrawl config
│   ├── TemplatesProperties.tsx    - Template metadata
│   ├── JurisdictionsProperties.tsx - Jurisdiction filters
│   └── TopicsProperties.tsx       - Topic statistics
│
└── Shared Components
    └── AccordionSection.tsx      - Reusable accordion UI
```

## Component Responsibilities

### Layout Components

#### `LeftNavigation`
- **Purpose**: Feature switcher navigation
- **Props**: 
  - `navItems`: Array of navigation items
  - `activeFeature`: Currently selected feature
  - `onFeatureChange`: Callback when feature changes
- **State**: Stateless (controlled component)

#### `RightPropertiesPanel`
- **Purpose**: Container for feature-specific properties
- **Props**:
  - `activeFeature`: Current feature to display properties for
  - `isOpen`: Panel open/closed state
  - `onToggle`: Toggle callback
- **Features**: Auto-renders correct properties component based on active feature

### Properties Components

Each properties component manages settings and information for its respective feature:

#### `ChatProperties`
- Chat model selection
- Debug information (sources, response time, tokens)
- Filters (jurisdiction, topic)

#### `ResearchProperties`
- **How Research Works** info box
- AI settings (model, system prompt)
- Firecrawl search configuration (JSON)
- Current configuration status

#### `TemplatesProperties`
- Template metadata display
- Last updated timestamp
- Active status

#### `JurisdictionsProperties`
- Search/filter controls
- Statistics (total, active counts)

#### `TopicsProperties`
- Topic statistics
- Total rules count

### Shared Components

#### `AccordionSection`
- **Purpose**: Reusable collapsible section
- **Props**:
  - `title`: Section title
  - `icon`: Lucide icon component
  - `isOpen`: Expansion state
  - `onToggle`: Toggle callback
  - `children`: Section content
- **Used by**: All properties components

## Usage Example

```tsx
import { LeftNavigation, RightPropertiesPanel } from '@/components/home'

function MyPage() {
  const [activeFeature, setActiveFeature] = useState('chat')
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <div className="flex">
      <LeftNavigation 
        navItems={navItems}
        activeFeature={activeFeature}
        onFeatureChange={setActiveFeature}
      />
      
      <main>{/* Content */}</main>
      
      <RightPropertiesPanel 
        activeFeature={activeFeature}
        isOpen={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
      />
    </div>
  )
}
```

## Benefits of This Architecture

✅ **Separation of Concerns**: Each component has a single, clear responsibility
✅ **Reusability**: Components can be easily reused or tested independently
✅ **Maintainability**: Changes to one feature's properties don't affect others
✅ **Type Safety**: Proper TypeScript interfaces for all components
✅ **Clean Imports**: Centralized exports through index.ts
✅ **Scalability**: Easy to add new features or properties

## Adding a New Feature

1. Create feature component in `/components/features/`
2. Create properties component in `/components/home/`
3. Add feature to `navItems` array
4. Update `FeatureType` type
5. Add case in main content area
6. Export from `index.ts`

## File Sizes

Each component is purposefully kept small (< 150 lines) for:
- Easy comprehension
- Faster load times
- Better Git diffs
- Simpler testing

