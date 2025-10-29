# UI Components

## JurisdictionSelect

**Location:** `src/components/ui/jurisdiction-select.tsx`

**Purpose:** Reusable searchable jurisdiction selector with hierarchical display

### Usage

```tsx
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'

function MyComponent() {
  const [selected, setSelected] = useState<any>(null)
  
  return (
    <JurisdictionSelect
      value={selected}
      onChange={setSelected}
      placeholder="Select jurisdiction..."
    />
  )
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `any` | Selected jurisdiction object |
| `onChange` | `(jurisdiction: any) => void` | Callback when selection changes |
| `placeholder` | `string?` | Placeholder text (default: "Select jurisdiction...") |
| `className` | `string?` | Additional CSS classes |

### Features

- ✅ **Searchable** - Built-in search that filters as you type
- ✅ **Hierarchical** - Cities nested under states when not searching
- ✅ **Flat when searching** - Shows all matches in flat list
- ✅ **Icons** - Visual indicators (Landmark, MapPin, Building2)
- ✅ **Clear button** - X to deselect
- ✅ **Click outside closes** - Smart UX
- ✅ **Shows codes** - Displays jurisdiction code when searching
- ✅ **Auto-closes** - Closes on selection

### What Gets Returned

When a jurisdiction is selected, `onChange` receives:

```typescript
{
  _id: "...",
  code: "CA-SF",              // Jurisdiction code
  name: "San Francisco",       // Short name
  level: "city",              // federal | state | city
  parentCode: "CA",           // Parent jurisdiction code
  stateCode: "CA",            // For cities: which state
  displayName: "San Francisco, CA",  // Formatted display name
  isActive: true,
  hasEmploymentLaws: true,
  lastUpdated: 1234567890
}
```

### Use Cases

**Research Panel:**
```tsx
<JurisdictionSelect
  value={researchJurisdiction}
  onChange={setResearchJurisdiction}
  placeholder="Filter by jurisdiction..."
/>
```

**Chat Filters:**
```tsx
<JurisdictionSelect
  value={chatJurisdiction}
  onChange={setChatJurisdiction}
/>
```

**Rule Creation:**
```tsx
<JurisdictionSelect
  value={ruleJurisdiction}
  onChange={setRuleJurisdiction}
  placeholder="Select rule jurisdiction..."
/>
```

### Example: Using in ResearchProperties

```tsx
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'

export function ResearchProperties({ researchState, setResearchState }) {
  const handleJurisdictionChange = (jurisdiction: any) => {
    if (setResearchState && researchState) {
      setResearchState({
        ...researchState,
        jurisdiction: jurisdiction?.displayName || jurisdiction?.name || '',
        jurisdictionCode: jurisdiction?.code || ''
      })
    }
  }
  
  return (
    <div>
      <Label>Jurisdiction</Label>
      <JurisdictionSelect
        value={null} // Or find by code from researchState
        onChange={handleJurisdictionChange}
      />
    </div>
  )
}
```

### Styling

The component uses Tailwind classes and matches the app's purple theme. It automatically:
- Adapts to container width
- Shows icons with proper colors
- Highlights on hover
- Handles responsive sizing

### Database Integration

The component automatically loads all active jurisdictions from:
```typescript
useQuery(api.complianceQueries.getJurisdictions)
```

Ensure jurisdictions are marked as `isActive: true` to appear in the dropdown.

