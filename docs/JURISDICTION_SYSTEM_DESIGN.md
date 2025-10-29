# 🗺️ Jurisdiction System - Complete Design Guide

## 📋 Overview

Design a comprehensive yet simple jurisdiction system for RuleReady that supports Federal, State, and City-level compliance research.

**Use Cases:**
1. Users selecting jurisdiction for research queries
2. Filtering saved research by jurisdiction
3. Creating jurisdiction-specific compliance rules

**Core Principle:** Keep it simple. Support full hierarchy (Federal → State → City) but don't force users through complex wizards.

---

## 🏛️ Jurisdiction Hierarchy

```
Federal (1)
  └─ States (51: 50 + DC)
      └─ Cities (15-20 major employment law cities)
```

**Scope Strategy:**
- **Phase 1:** Federal + 51 States = **52 jurisdictions** ✅ (Current)
- **Phase 2:** Add 15-20 major cities = **~70 total**
- **Phase 3:** Add more cities as needed (~100-200)

---

## 🗄️ Database Schema

### Current Schema (Simple)
```typescript
jurisdictions: {
  code: string,              // "federal" | "CA" | "NY"
  name: string,              // "Federal" | "California" | "New York"
  type: "federal" | "state" | "local",
  parentJurisdiction: string?,
  lastUpdated: number
}

Indexes:
- by_code: ["code"]
- by_type: ["type"]
```

### Enhanced Schema (Future)
```typescript
jurisdictions: {
  code: string,              // "US" | "CA" | "CA-SF"
  name: string,              // "Federal" | "California" | "San Francisco"
  level: "federal" | "state" | "city",
  parentCode: string?,       // null | "US" | "CA"
  stateCode: string?,        // null (for federal/state) | "CA" (for cities)
  
  // Display
  displayName: string,       // "California" | "San Francisco, CA"
  
  // Metadata
  hasEmploymentLaws: boolean,
  isActive: boolean,
  lastUpdated: number
}

Indexes:
- by_code: ["code"] (unique)
- by_level: ["level"]
- by_parent: ["parentCode"]
- by_state: ["stateCode"]
```

### Example Data
```
code    | name           | level   | parentCode | stateCode | displayName
--------|----------------|---------|------------|-----------|------------------
US      | Federal        | federal | null       | null      | Federal
CA      | California     | state   | US         | null      | California
CA-SF   | San Francisco  | city    | CA         | CA        | San Francisco, CA
CA-LA   | Los Angeles    | city    | CA         | CA        | Los Angeles, CA
NY      | New York       | state   | US         | null      | New York
NY-NYC  | New York City  | city    | NY         | NY        | New York City, NY
```

---

## 🎨 UI/UX Design - Single Smart Dropdown

### Recommended Design: **Nested Dropdown**

```
┌─────────────────────────────────────────────┐
│  📍 Jurisdiction (Optional)                  │
│  ┌─────────────────────────────────────────┐│
│  │ ▼ All jurisdictions (federal default)   ││
│  └─────────────────────────────────────────┘│
│                                             │
│  Dropdown Contents:                         │
│  ┌─────────────────────────────────────────┐│
│  │ 🔍 Search...                            ││
│  │ ─────────────────────────────────────── ││
│  │ 🏛️  Federal (nationwide)                ││
│  │ ─────────────────────────────────────── ││
│  │ 📍 STATES                               ││
│  │ ○ Alabama                               ││
│  │ ○ Alaska                                ││
│  │ ○ California                            ││
│  │    ├─ 🏙️ Los Angeles, CA               ││
│  │    ├─ 🏙️ San Diego, CA                 ││
│  │    └─ 🏙️ San Francisco, CA             ││
│  │ ○ Colorado                              ││
│  │    └─ 🏙️ Denver, CO                    ││
│  │ ○ New York                              ││
│  │    └─ 🏙️ New York City                 ││
│  │ ...                                     ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘

After State Selected:
┌─────────────────────────────────────────────┐
│  📍 California                          [×] │
└─────────────────────────────────────────────┘

After City Selected:
┌─────────────────────────────────────────────┐
│  📍 San Francisco, CA                   [×] │
└─────────────────────────────────────────────┘
```

### Why This Design?
✅ **Single interaction** - one dropdown, no wizard  
✅ **Visually organized** - clear hierarchy with indentation  
✅ **Searchable** - type to filter options  
✅ **Flexible** - select state OR city as needed  
✅ **Not crowded** - collapsed by default, expands on click  

---

## 🔄 Data Flow - How It Works

### Scenario 1: User Selects State Only

```
USER: Selects "California"
  ↓
FRONTEND: 
  jurisdiction = "California"
  jurisdictionCode = "CA"
  ↓
API CALL (/api/compliance-research):
  {
    query: "What are the overtime requirements?",
    jurisdiction: "California"
  }
  ↓
BACKEND:
  1. Enhance search: query + "California"
  2. Add to AI prompt: "Focus on jurisdiction: California"
  3. Search Firecrawl for CA-specific sources
  ↓
SAVE TO DATABASE:
  {
    title: "CA Overtime Requirements",
    content: "...",
    jurisdiction: "California",
    jurisdictionCode: "CA"  // For future filtering
  }
```

### Scenario 2: User Selects City

```
USER: Selects "San Francisco, CA"
  ↓
FRONTEND:
  jurisdiction = "San Francisco, CA"
  jurisdictionCode = "CA-SF"
  stateCode = "CA"
  ↓
API CALL:
  {
    query: "What are the paid sick leave requirements?",
    jurisdiction: "San Francisco, CA"
  }
  ↓
BACKEND:
  1. Detect city (code contains hyphen)
  2. Extract state code: "CA"
  3. Search for SF ordinances + CA state law
  4. Prompt: "Focus on San Francisco, California. 
             Prioritize city ordinances, include state law."
  ↓
SAVE TO DATABASE:
  {
    title: "SF Paid Sick Leave",
    content: "...",
    jurisdiction: "San Francisco, CA",
    jurisdictionCode: "CA-SF"
  }
```

### Scenario 3: User Leaves Blank (Federal Default)

```
USER: No jurisdiction selected
  ↓
FRONTEND:
  jurisdiction = ""  // or "Federal"
  ↓
BACKEND:
  - Search federal law only (FLSA, FMLA, etc.)
  - Prompt: "Focus on federal law (nationwide)"
```

---

## 📊 Population Strategy

### Phase 1: Core (Current - 52 jurisdictions)
✅ **Already Implemented**
- 1 Federal
- 51 States (50 + DC)

### Phase 2: Major Cities (~18 cities)
**Cities with unique employment laws:**
- **California:** San Francisco, Los Angeles, San Diego, Oakland
- **New York:** New York City
- **Washington:** Seattle
- **Illinois:** Chicago
- **Colorado:** Denver
- **Oregon:** Portland
- **Minnesota:** Minneapolis
- **Pennsylvania:** Philadelphia
- **Texas:** Austin
- **Massachusetts:** Boston
- **Others:** As needed

**Total Phase 2:** ~70 jurisdictions

### Phase 3: Expansion (As Needed)
- Add cities when users request them
- Add counties only if specific ordinances exist
- On-demand growth based on actual usage

---

## 💻 Component Implementation

### JurisdictionSelector Component

```tsx
interface JurisdictionSelectorProps {
  value: string                    // Current jurisdiction name
  onChange: (name: string) => void // Callback with selected name
  placeholder?: string
}

export function JurisdictionSelector({ value, onChange }: Props) {
  const jurisdictions = useQuery(api.complianceQueries.getJurisdictions)
  
  return (
    <select 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      className="..."
    >
      <option value="">All Jurisdictions (Federal)</option>
      
      {/* States */}
      {jurisdictions
        ?.filter(j => j.type === 'state')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(j => (
          <option key={j.code} value={j.name}>
            {j.name}
          </option>
        ))
      }
    </select>
  )
}
```

**Current Implementation:** Simple, works great!

**Future Enhancement:** Add city grouping under states when cities are added to database.

---

## 🔍 Filtering & Querying

### Filter Saved Research by Jurisdiction

```typescript
// Get all California research
const caResearch = await ctx.db
  .query("savedResearch")
  .withIndex("by_jurisdiction")
  .filter(q => q.eq(q.field("jurisdiction"), "California"))
  .collect()

// Future: With jurisdictionCode
const caResearch = await ctx.db
  .query("savedResearch")
  .filter(q => q.eq(q.field("jurisdictionCode"), "CA"))
  .collect()
```

### Get Cities in a State (Future)

```typescript
// Get all cities in California
const caCities = await ctx.db
  .query("jurisdictions")
  .filter(q => 
    q.and(
      q.eq(q.field("level"), "city"),
      q.eq(q.field("stateCode"), "CA")
    )
  )
  .collect()
```

---

## 🎯 Implementation Checklist

### Current State (✅ Complete)
- [x] jurisdictions table with Federal + 51 states
- [x] Simple dropdown in research panel
- [x] Saves jurisdiction as string
- [x] API uses jurisdiction for search enhancement

### Phase 2: City Support (When Needed)
- [ ] Add `level`, `stateCode`, `displayName` fields to schema
- [ ] Populate 15-20 major cities
- [ ] Update dropdown to show cities under states
- [ ] Add `jurisdictionCode` to savedResearch
- [ ] Enhance backend to handle city-level ordinances

### Phase 3: Advanced (Future)
- [ ] Add 100+ cities
- [ ] County support (optional)
- [ ] Multi-jurisdiction rules
- [ ] Auto-detection from content

---

## 📐 Major Cities to Add (Phase 2)

**Priority 1 - Employment Law Hotspots:**
| State | Cities | Why |
|-------|--------|-----|
| CA | San Francisco, Los Angeles, San Diego, Oakland | Extensive local ordinances |
| NY | New York City | Comprehensive city labor laws |
| WA | Seattle | Min wage, scheduling laws |
| IL | Chicago | Paid sick leave, scheduling |
| CO | Denver | Paid sick leave laws |
| OR | Portland | Sick time, scheduling |
| MN | Minneapolis | Sick time, scheduling |
| TX | Austin | Paid sick leave pilot |
| PA | Philadelphia | Wage equity laws |
| MA | Boston | Paid sick time |

**Priority 2 - Large Cities:**
- Houston, Phoenix, San Antonio, Dallas, San Jose (add as requested)

---

## ✅ Recommendation

**For Now (Recommended):**
- Keep current simple implementation
- 52 jurisdictions (Federal + 51 states)
- Works perfectly for 90% of use cases
- Add cities only when you have city-specific content

**When to Add Cities:**
- User requests SF-specific information
- You start tracking city ordinances
- Research content includes city laws

**Keep It Simple:** Current dropdown is clean and functional. Don't over-engineer!

---

## 🚀 Quick Start Guide

**Current Usage:**
1. User opens research
2. Selects "California" from dropdown
3. Asks question
4. Gets CA-focused results

**That's it!** No complexity, works great.

---

**TL;DR:** Current system is perfect. Add cities later only if needed. Single dropdown = best UX.

