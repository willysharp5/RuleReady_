# New Home Page Design

## Overview
Created a modern three-section layout at `/home` route with the following structure:

```
┌──────────┬────────────────────────────────┬──────────────────────┐
│  Left    │      Main Content              │   Right Properties   │
│  Nav     │         (~600px)               │      Panel           │
│  (80px)  │                                │    (280px toggle)    │
└──────────┴────────────────────────────────┴──────────────────────┘
```

## Files Created

### Main Page
- `/src/app/home/page.tsx` - Main layout with three sections

### Feature Components
- `/src/components/features/ChatFeature.tsx` - Chat interface
- `/src/components/features/ResearchFeature.tsx` - Research with URL inputs
- `/src/components/features/TemplatesFeature.tsx` - Template management
- `/src/components/features/JurisdictionsFeature.tsx` - Jurisdictions grid
- `/src/components/features/TopicsFeature.tsx` - Topics grid

## Design Specifications

### Left Navigation (80px)
- Icon + text label below
- Active state: purple-500 background
- Hover state: purple-50 background
- Features:
  - Chat (MessageCircle icon)
  - Research (Search icon)
  - Templates (FileText icon)
  - Jurisdictions (MapPin icon)
  - Topics (Layers icon)

### Main Content (~600px)
- Max-width: 600px, centered
- Dynamic content based on active feature
- Clean, modern interface for each feature

### Right Properties Panel (280px)
- Toggleable with chevron button
- Collapsible accordion sections
- Context-aware content per feature
- Light gray background (zinc-50)

### Color Scheme
- **Primary Purple**: `#a855f7` (purple-500)
- **Purple Hover**: `#9333ea` (purple-600)
- **Purple Light**: `#faf5ff` (purple-50)
- **Background**: White + zinc-50
- **Borders**: zinc-200
- **Text**: zinc-900, zinc-600, zinc-500

### Features

#### 1. Chat
- Message bubbles (user right, assistant left)
- Sources display with clickable links
- Real-time typing indicator
- Send button with keyboard shortcut

**Properties Panel:**
- Chat Settings (model, max reports, context options)
- Debug Info (sources, response time, tokens)
- Filters (jurisdiction, topic)

#### 2. Research
- Query input
- Multiple URL inputs (add/remove)
- Research button with loading state
- Results display

**Properties Panel:**
- Firecrawl Settings (mode, depth, format)
- AI Settings (model, system prompt)

#### 3. Templates
- Template list with edit/delete
- Add new template button
- Topic-based organization

**Properties Panel:**
- Template Info (topic, last updated, status)

#### 4. Jurisdictions
- Grid layout with search
- State cards with rule counts
- Status badges

**Properties Panel:**
- Filters (search, active only)
- Statistics (total, active)

#### 5. Topics
- Grid layout with colored badges
- Rule counts per topic
- Summary statistics

**Properties Panel:**
- Statistics (total topics, total rules)

## Key Features

### Accordion Component
- Smooth expand/collapse animations
- Icon + title header
- Chevron rotation indicator
- Border and padding for clean look

### Responsive Design
- Desktop (>1024px): Full three-column layout
- Tablet/Mobile (<1024px): Collapsed left nav (icons only)
- Properties panel remains toggleable

### Flat Design
- No box shadows on buttons (shadcn style)
- Clean borders and spacing
- Focus on content, not decoration

## Next Steps

To integrate with your existing backend:

1. **Chat Feature**: Connect to `/api/compliance-chat` endpoint
2. **Research Feature**: Integrate Firecrawl MCP tools
3. **Templates**: Connect to Convex `complianceTemplates` queries
4. **Jurisdictions**: Connect to `complianceQueries.getJurisdictions`
5. **Topics**: Connect to `complianceQueries.getTopics`

## Access

Visit: `http://localhost:3000/home`

The original page at `/` remains unchanged.

