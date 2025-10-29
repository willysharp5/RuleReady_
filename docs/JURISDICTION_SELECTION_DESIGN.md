# 🗺️ Jurisdiction Selection System - Design Document

## 📋 Problem Statement

Users need to select jurisdictions when:
1. Creating compliance research
2. Creating compliance rules
3. Filtering search results

**Challenge:** Support hierarchical selection (Federal → State → City) while keeping it simple when users only want state-level.

---

## 🎯 Design Goals

✅ **Flexible:** Allow selecting just state OR state + city  
✅ **Not Crowded:** Clean, minimal UI  
✅ **Smart Defaults:** Federal is implicit if state not selected  
✅ **Easy to Use:** No complex multi-step wizards  

---

## 🗄️ Database Design

### Schema Structure
```typescript
jurisdictions: {
  code: string,           // "US" | "CA" | "CA-SF"
  name: string,           // "Federal" | "California" | "San Francisco"
  level: "federal" | "state" | "city",
  parentCode: string?,    // null for Federal, "US" for states, "CA" for CA cities
  stateCode: string?,     // null for Federal/States, "CA" for cities in CA
  
  // Display
  displayName: string,    // "California" | "San Francisco, CA"
  
  // Metadata
  hasEmploymentLaws: boolean,
  isActive: boolean,
  lastUpdated: number
}

Indexes:
- by_code: ["code"] (unique, primary lookup)
- by_level: ["level"] (filter by federal/state/city)
- by_parent: ["parentCode"] (get children)
- by_state: ["stateCode"] (all cities in a state)
```

### Example Data
```
code         | name              | level   | parentCode | stateCode | displayName
-------------|-------------------|---------|------------|-----------|-------------------
US           | Federal           | federal | null       | null      | Federal
CA           | California        | state   | US         | null      | California
CA-SF        | San Francisco     | city    | CA         | CA        | San Francisco, CA
CA-LA        | Los Angeles       | city    | CA         | CA        | Los Angeles, CA
NY           | New York          | state   | US         | null      | New York
NY-NYC       | New York City     | city    | NY         | NY        | New York City, NY
```

---

## 🎨 UI/UX Design - Progressive Disclosure

### Approach: **Single Dropdown with Smart Grouping**

```
┌────────────────────────────────────────┐
│  Jurisdiction (Optional)               │
├────────────────────────────────────────┤
│  [▼ Select jurisdiction...]            │
│                                        │
│  When clicked:                         │
│  ┌──────────────────────────────────┐ │
│  │ ○ Federal (all states)           │ │
│  │ ────────────────────────────────│ │
│  │ STATES                           │ │
│  │ ○ Alabama                        │ │
│  │ ○ Alaska                         │ │
│  │ ○ Arizona                        │ │
│  │ ○ California                     │ │
│  │   ├─ ○ Los Angeles, CA          │ │
│  │   ├─ ○ San Diego, CA            │ │
│  │   └─ ○ San Francisco, CA        │ │
│  │ ○ Colorado                       │ │
│  │   └─ ○ Denver, CO               │ │
│  │ ...                              │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘

Selected: "California"
Result: { code: "CA", level: "state" }

Selected: "San Francisco, CA"
Result: { code: "CA-SF", level: "city", parentState: "CA" }
```

### Alternative: **Two-Step Dropdown (Conditional)**

```
Step 1: Select State
┌────────────────────────────────────────┐
│  State (Optional)                      │
├────────────────────────────────────────┤
│  [▼ Select state...]                   │
│     ○ (None - Federal)                 │
│     ○ Alabama                          │
│     ○ California                       │
│     ○ New York                         │
│     ...                                │
└────────────────────────────────────────┘

Step 2: Select City (Only if cities exist)
┌────────────────────────────────────────┐
│  City in California (Optional)         │
├────────────────────────────────────────┤
│  [▼ Select city...]                    │
│     ○ (None - Entire State)            │
│     ○ Los Angeles                      │
│     ○ San Diego                        │
│     ○ San Francisco                    │
└────────────────────────────────────────┘

If no cities available:
  [No cities with specific laws]
```

---

## 🔄 Database Query Flow

### Scenario 1: User Selects State Only

```
USER ACTION:
  Selects "California" from dropdown
  
DATABASE QUERY:
  1. Get jurisdiction where code = "CA"
     → { code: "CA", name: "California", level: "state" }
  
SAVED TO RESEARCH:
  {
    jurisdiction: "California",
    jurisdictionCode: "CA",
    jurisdictionLevel: "state"
  }
  
RESEARCH SCOPE:
  - Search focuses on California state law
  - May include city ordinances as supplementary
  - Prompt: "Focus on jurisdiction: California"
```

### Scenario 2: User Selects City

```
USER ACTION:
  Selects "San Francisco, CA" from dropdown
  
DATABASE QUERY:
  1. Get jurisdiction where code = "CA-SF"
     → { code: "CA-SF", name: "San Francisco", 
         level: "city", parentCode: "CA", stateCode: "CA" }
  2. Get parent state where code = "CA"
     → { code: "CA", name: "California", level: "state" }
  
SAVED TO RESEARCH:
  {
    jurisdiction: "San Francisco, CA",
    jurisdictionCode: "CA-SF",
    jurisdictionLevel: "city",
    parentState: "California",
    parentStateCode: "CA"
  }
  
RESEARCH SCOPE:
  - Search for SF-specific ordinances FIRST
  - Include CA state law as context
  - Prompt: "Focus on jurisdiction: San Francisco, California. 
            Prioritize San Francisco city ordinances, include California 
            state law as context."
```

### Scenario 3: User Selects Federal

```
USER ACTION:
  Selects "Federal" or leaves blank
  
SAVED TO RESEARCH:
  {
    jurisdiction: "Federal",
    jurisdictionCode: "US",
    jurisdictionLevel: "federal"
  }
  
RESEARCH SCOPE:
  - Federal laws only (FLSA, FMLA, etc.)
  - Prompt: "Focus on jurisdiction: Federal (nationwide)"
```

---

## 🎯 Recommended UI Solution: **Smart Single Dropdown**

### Visual Design

```
┌─────────────────────────────────────────────┐
│  📍 Jurisdiction (Optional)                  │
│  ┌─────────────────────────────────────────┐│
│  │ ▼ All jurisdictions (federal default)   ││
│  └─────────────────────────────────────────┘│
│                                             │
│  Dropdown Contents:                         │
│  ┌─────────────────────────────────────────┐│
│  │ Search: [_____________]                 ││
│  │ ─────────────────────────────────────── ││
│  │ 🏛️  Federal (nationwide)                ││
│  │ ─────────────────────────────────────── ││
│  │ 📍 STATES                               ││
│  │ ○ Alabama                               ││
│  │ ○ Alaska                                ││
│  │ ○ Arizona                               ││
│  │ ○ Arkansas                              ││
│  │ ○ California                            ││
│  │    ├─ 🏙️ Los Angeles, CA               ││
│  │    ├─ 🏙️ San Diego, CA                 ││
│  │    └─ 🏙️ San Francisco, CA             ││
│  │ ○ Colorado                              ││
│  │    └─ 🏙️ Denver, CO                    ││
│  │ ○ Connecticut                           ││
│  │ ...                                     ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘

Selected State Visual:
┌─────────────────────────────────────────────┐
│  📍 Jurisdiction: California                 │
│  [Clear ×]                                  │
└─────────────────────────────────────────────┘

Selected City Visual:
┌─────────────────────────────────────────────┐
│  📍 Jurisdiction: San Francisco, CA          │
│  [Clear ×]                                  │
└─────────────────────────────────────────────┘
```

### Benefits of This Approach:
✅ **Single interaction** - no multi-step wizard  
✅ **Visually organized** - states grouped, cities indented  
✅ **Searchable** - type to filter  
✅ **Flexible** - pick state OR city  
✅ **Clear hierarchy** - visual indent shows parent relationship  

---

## 🔍 Search & Filter Logic

### Database Queries

```typescript
// Get all jurisdictions for dropdown
const allJurisdictions = await ctx.db
  .query("jurisdictions")
  .filter(q => q.eq(q.field("isActive"), true))
  .collect()

// Organize hierarchically
const organized = {
  federal: allJurisdictions.find(j => j.level === 'federal'),
  states: allJurisdictions
    .filter(j => j.level === 'state')
    .sort((a, b) => a.name.localeCompare(b.name)),
  cities: allJurisdictions
    .filter(j => j.level === 'city')
    .reduce((acc, city) => {
      if (!acc[city.stateCode]) acc[city.stateCode] = []
      acc[city.stateCode].push(city)
      return acc
    }, {})
}

// Render structure:
// 1. Federal at top
// 2. Each state
//    └─ Cities under their state (if any)
```

### Search Implementation

```typescript
// User types "francisco"
const searchTerm = "francisco".toLowerCase()

const filtered = allJurisdictions.filter(j => 
  j.name.toLowerCase().includes(searchTerm) ||
  j.code.toLowerCase().includes(searchTerm) ||
  j.displayName.toLowerCase().includes(searchTerm)
)

// Returns: San Francisco, CA
```

---

## 💾 Saving Research with Jurisdiction

### When User Selects "California"

```
┌──────────────────────────────────────┐
│  FRONTEND                            │
└──────────────────────────────────────┘
         │
         │ User selects "California"
         ├─ selectedJurisdiction = {
         │    _id: "...",
         │    code: "CA",
         │    name: "California",
         │    level: "state",
         │    displayName: "California"
         │  }
         │
         ▼
┌──────────────────────────────────────┐
│  API CALL: saveResearch              │
│  {                                   │
│    title: "Research Title",          │
│    content: "Research content...",   │
│    jurisdiction: "California",       │
│    jurisdictionCode: "CA"            │
│  }                                   │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  CONVEX DATABASE                     │
│  savedResearch table:                │
│  {                                   │
│    _id: "...",                       │
│    title: "Research Title",          │
│    content: "...",                   │
│    jurisdiction: "California",       │
│    jurisdictionCode: "CA", ← Simple │
│    createdAt: 123456789             │
│  }                                   │
└──────────────────────────────────────┘
```

### When User Selects "San Francisco, CA"

```
┌──────────────────────────────────────┐
│  FRONTEND                            │
└──────────────────────────────────────┘
         │
         │ User selects "San Francisco, CA"
         ├─ selectedJurisdiction = {
         │    code: "CA-SF",
         │    name: "San Francisco",
         │    level: "city",
         │    stateCode: "CA",
         │    displayName: "San Francisco, CA"
         │  }
         │
         ▼
┌──────────────────────────────────────┐
│  API CALL: saveResearch              │
│  {                                   │
│    jurisdiction: "San Francisco, CA",│
│    jurisdictionCode: "CA-SF"         │
│  }                                   │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  RESEARCH PROCESSING                 │
│  Backend checks jurisdictionCode:    │
│                                      │
│  if (code.includes('-')) {           │
│    // It's a city                    │
│    const stateCode = code.split('-')[0]│
│    // Load both city AND state laws │
│  } else if (code === 'US') {         │
│    // Federal only                   │
│  } else {                            │
│    // State level                    │
│  }                                   │
└──────────────────────────────────────┘
```

---

## 🖼️ UI Component Designs

### Design Option 1: **Nested Dropdown (Recommended)**

```
┌─────────────────────────────────────────────────────┐
│  Research Filters                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📍 Jurisdiction                                    │
│  ┌───────────────────────────────────────────────┐ │
│  │ Select jurisdiction...                    [▼] │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Dropdown opened:                                  │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🔍 Search...                                  │ │
│  ├───────────────────────────────────────────────┤ │
│  │ 🏛️ Federal (nationwide)                       │ │
│  ├───────────────────────────────────────────────┤ │
│  │ STATES                                        │ │
│  │                                               │ │
│  │ ○ California                                  │ │
│  │   ├─ 🏙️ Los Angeles                          │ │
│  │   ├─ 🏙️ San Diego                            │ │
│  │   └─ 🏙️ San Francisco                        │ │
│  │                                               │ │
│  │ ○ Colorado                                    │ │
│  │   └─ 🏙️ Denver                               │ │
│  │                                               │ │
│  │ ○ Illinois                                    │ │
│  │   └─ 🏙️ Chicago                              │ │
│  │                                               │ │
│  │ ○ New York                                    │ │
│  │   └─ 🏙️ New York City                        │ │
│  │                                               │ │
│  │ ○ Texas                                       │ │
│  │   ├─ 🏙️ Austin                               │ │
│  │   └─ 🏙️ Houston                              │ │
│  │                                               │ │
│  │ ○ Washington                                  │ │
│  │   └─ 🏙️ Seattle                              │ │
│  │                                               │ │
│  │ ...all other states...                        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  After selection:                                  │
│  ┌───────────────────────────────────────────────┐ │
│  │ 📍 California                            [×]  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Design Option 2: **Cascading Dropdowns** (More Complex)

```
┌─────────────────────────────────────────────────────┐
│  Jurisdiction Selection                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Level                                              │
│  ┌───────────────────────────────────┐             │
│  │ ● State-level                     │             │
│  │ ○ City-level                      │             │
│  │ ○ Federal                         │             │
│  └───────────────────────────────────┘             │
│                                                     │
│  ↓ (if State or City selected)                     │
│                                                     │
│  State                                              │
│  ┌───────────────────────────────────────────────┐ │
│  │ Select state...                           [▼] │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ↓ (if City-level selected AND state has cities)   │
│                                                     │
│  City (Optional - leave empty for entire state)    │
│  ┌───────────────────────────────────────────────┐ │
│  │ Select city...                            [▼] │ │
│  │ ○ (Entire State)                              │ │
│  │ ○ Los Angeles                                 │ │
│  │ ○ San Diego                                   │ │
│  │ ○ San Francisco                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Result: 📍 San Francisco, California              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Why NOT recommended:**
- ❌ Too many steps
- ❌ Confusing when you just want a state
- ❌ Extra clicks

---

## 🎨 Final Recommended Design: **Single Smart Dropdown**

### Component Structure

```tsx
<JurisdictionSelector
  value={selectedJurisdiction}
  onChange={(jurisdiction) => {
    setSelectedJurisdiction(jurisdiction)
    // Auto-saves: { jurisdiction: string, jurisdictionCode: string }
  }}
  placeholder="All jurisdictions (federal default)"
  showClearButton={true}
/>
```

### Visual States

#### State 1: Empty (Default = Federal)
```
┌─────────────────────────────────────┐
│ 📍 All jurisdictions (federal)  [▼] │
└─────────────────────────────────────┘
```

#### State 2: State Selected
```
┌─────────────────────────────────────┐
│ 📍 California                   [×] │
└─────────────────────────────────────┘
```

#### State 3: City Selected
```
┌─────────────────────────────────────┐
│ 📍 San Francisco, CA            [×] │
└─────────────────────────────────────┘
```

---

## 📊 Data Flow Architecture

### Creating Research with Jurisdiction

```
USER JOURNEY:
┌─────────────┐
│ User opens  │
│ Research    │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────────────────────┐
│ Selects     │────>│ Frontend State Update:       │
│ "California"│     │ jurisdiction: "California"   │
└─────────────┘     │ jurisdictionCode: "CA"       │
       │            └──────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────────────────────┐
│ Asks        │────>│ API Call:                    │
│ Question    │     │ /api/compliance-research     │
└─────────────┘     │ {                            │
       │            │   query: "...",              │
       │            │   jurisdiction: "California" │
       │            │ }                            │
       │            └──────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────────────────────┐
│ Gets Answer │<────│ Backend:                     │
│ with        │     │ 1. Search Firecrawl with     │
│ Sources     │     │    "query + California"      │
└─────────────┘     │ 2. Add to prompt:            │
       │            │    "Focus on jurisdiction:   │
       │            │     California"              │
       │            └──────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────────────────────┐
│ Saves to    │────>│ Convex saveResearch:         │
│ Library     │     │ {                            │
└─────────────┘     │   title: "...",              │
                    │   content: "...",            │
                    │   jurisdiction: "California",│
                    │   jurisdictionCode: "CA"     │
                    │ }                            │
                    └──────────────────────────────┘
```

---

## 🔎 Filtering Saved Research by Jurisdiction

### Query Pattern

```typescript
// Get all research for California (state-level)
const caResearch = await ctx.db
  .query("savedResearch")
  .withIndex("by_jurisdiction")
  .filter(q => q.eq(q.field("jurisdictionCode"), "CA"))
  .collect()

// Get all research for San Francisco (city-level)
const sfResearch = await ctx.db
  .query("savedResearch")
  .withIndex("by_jurisdiction")
  .filter(q => q.eq(q.field("jurisdictionCode"), "CA-SF"))
  .collect()

// Get all research in California (state + all CA cities)
const allCAResearch = await ctx.db
  .query("savedResearch")
  .filter(q => 
    q.or(
      q.eq(q.field("jurisdictionCode"), "CA"),
      q.eq(q.field("jurisdiction"), "California")
    )
  )
  .collect()
```

---

## 🎯 Implementation Checklist

### Database Changes
- [x] jurisdictions table already has code, name, level
- [ ] Add `displayName` field (e.g., "San Francisco, CA")
- [ ] Add `stateCode` field for cities
- [ ] Add `parentCode` field for hierarchy
- [ ] Populate ~70 jurisdictions (Federal + 51 states + ~18 major cities)

### Component Changes  
- [ ] Create `JurisdictionSelector.tsx` component
- [ ] Implement search/filter within dropdown
- [ ] Add visual indent for cities under states
- [ ] Add clear button (×)
- [ ] Handle selection and pass to parent

### Integration Points
- [x] Research panel already accepts jurisdiction
- [x] API already uses jurisdiction for search enhancement
- [x] savedResearch already stores jurisdiction
- [ ] Update to also store `jurisdictionCode` for better filtering

---

## 📝 Code Example

### JurisdictionSelector Component

```tsx
export function JurisdictionSelector({ value, onChange }: Props) {
  const jurisdictions = useQuery(api.complianceQueries.getJurisdictions)
  const [search, setSearch] = useState('')
  
  // Organize hierarchically
  const federal = jurisdictions?.find(j => j.level === 'federal')
  const states = jurisdictions
    ?.filter(j => j.level === 'state')
    .sort((a, b) => a.name.localeCompare(b.name))
  
  const citiesByState = jurisdictions
    ?.filter(j => j.level === 'city')
    .reduce((acc, city) => {
      if (!acc[city.stateCode]) acc[city.stateCode] = []
      acc[city.stateCode].push(city)
      return acc
    }, {})
  
  return (
    <select 
      value={value?.code || ''} 
      onChange={(e) => {
        const selected = jurisdictions?.find(j => j.code === e.target.value)
        onChange(selected)
      }}
    >
      <option value="">All jurisdictions (federal)</option>
      
      {/* Federal */}
      {federal && (
        <option value={federal.code}>🏛️ {federal.name}</option>
      )}
      
      {/* States with their cities */}
      <optgroup label="STATES">
        {states?.map(state => (
          <>
            <option value={state.code}>{state.name}</option>
            
            {/* Cities under this state */}
            {citiesByState[state.code]?.map(city => (
              <option value={city.code} key={city.code}>
                &nbsp;&nbsp;🏙️ {city.name}
              </option>
            ))}
          </>
        ))}
      </optgroup>
    </select>
  )
}
```

---

## 🚀 Implementation Priority

### Phase 1: Minimal (Now)
- Keep current simple string jurisdiction
- Works fine for 90% of use cases
- Just state names

### Phase 2: Enhanced (Later)
- Add `jurisdictionCode` to savedResearch
- Populate major cities (~15-20)
- Add smart dropdown with hierarchy
- Better filtering capabilities

### Phase 3: Full (Future)
- Add all major cities (~100)
- Add counties for specific jurisdictions
- Multi-jurisdiction support (applies to CA + all cities)
- Auto-detection from research content

---

## ✅ Recommendation: **Keep It Simple**

**Current Implementation Works Well:**
```
User picks: "California" (from list of 52 jurisdictions)
Saves as: jurisdiction: "California"
Search uses: "query + California"
```

**Only enhance if you need:**
- City-level ordinances (SF, NYC, LA, etc.)
- Complex jurisdiction hierarchies
- Multi-jurisdiction rules

**For now:** Current dropdown is perfect! Only add cities when you actually need them.

---

## 📐 Visual Design Summary

```
SIMPLE (CURRENT):
[State Dropdown ▼]
  ○ Federal
  ○ Alabama
  ○ California
  ○ New York
  ...

ENHANCED (FUTURE):
[Smart Dropdown ▼]
  🏛️ Federal
  ─────────────
  📍 Alabama
  📍 California
    ├─ 🏙️ Los Angeles
    ├─ 🏙️ San Diego  
    └─ 🏙️ San Francisco
  📍 New York
    └─ 🏙️ New York City
  ...

Selection shows:
┌─────────────────────────┐
│ 📍 San Francisco, CA [×]│
└─────────────────────────┘
```

---

**TL;DR:** Start simple with states only. Add cities later only if needed. Single dropdown is cleanest UX.

