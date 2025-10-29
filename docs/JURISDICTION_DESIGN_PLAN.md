# 🗺️ Jurisdiction System Design Plan

## 📊 Overview
Design a comprehensive jurisdiction hierarchy for linking compliance rules and research across Federal, State, County, and City levels in the USA.

## 🏛️ Jurisdiction Hierarchy

```
Federal (1)
  └─ States (50 + DC + 5 territories = 56)
      ├─ Counties (~3,143 counties nationwide)
      └─ Cities (Major cities: ~300-500 for employment law purposes)
```

## 📋 Current Schema Analysis

**Existing `jurisdictions` table:**
```typescript
jurisdictions: {
  code: string,           // "CA", "TX", "FED"
  name: string,          // "California", "Texas", "Federal"
  type: "federal" | "state" | "local",
  parentJurisdiction: string?,
  lastUpdated: number
}
```

## 🎯 Proposed Enhanced Schema

### Option 1: Single Hierarchical Table (Recommended)

```typescript
jurisdictions: {
  // Identification
  code: string,                    // "US", "CA", "CA-SF", "CA-LA-CITY"
  name: string,                    // "United States", "California", "San Francisco", "Los Angeles"
  fullName: string,                // "San Francisco, California, United States"
  
  // Hierarchy
  level: "federal" | "state" | "county" | "city",
  parentCode: string?,             // "CA" for SF, "US" for CA, null for US
  
  // Geographic Data
  stateCode: string?,              // "CA" (for counties/cities)
  countyCode: string?,             // "CA-SF" (for cities within counties)
  fipsCode: string?,               // Official FIPS code for US jurisdictions
  
  // Employment Law Metadata
  hasEmploymentLaws: boolean,      // Does this jurisdiction have its own employment laws?
  significanceLevel: "critical" | "high" | "medium" | "low",
  population: number?,             // For prioritization
  
  // Linking
  researchCount: number,           // Count of linked savedResearch items
  ruleCount: number,               // Count of linked complianceReports
  
  // Status
  isActive: boolean,               // Show in UI?
  lastUpdated: number,
  createdAt: number,
  updatedAt: number
}

Indexes:
- by_level: ["level"]
- by_parent: ["parentCode"]
- by_state: ["stateCode"]
- by_code: ["code"] (unique)
- by_active: ["isActive"]
- by_significance: ["significanceLevel"]
```

### Option 2: Separate Tables by Level (More Normalized)

```typescript
// Federal level (1 record)
federalJurisdiction: {
  code: "US",
  name: "United States",
  researchCount: number,
  ruleCount: number
}

// State level (~56 records)
states: {
  code: "CA",
  name: "California", 
  fipsCode: "06",
  parentCode: "US",
  researchCount: number,
  ruleCount: number
}

// County level (~3,143 records)
counties: {
  code: "CA-SF",
  name: "San Francisco County",
  fipsCode: "06075",
  stateCode: "CA",
  researchCount: number,
  ruleCount: number
}

// City level (~300-500 major cities)
cities: {
  code: "CA-SF-CITY",
  name: "San Francisco",
  stateCode: "CA",
  countyCode: "CA-SF",
  population: number,
  researchCount: number,
  ruleCount: number
}
```

## 📈 Population Strategy

### Phase 1: Essential Jurisdictions (Priority 1)
**~60 records total**

1. **Federal** (1)
   - Code: "US"
   - Name: "United States"
   - Type: federal

2. **All 50 States + DC** (51)
   - Alabama (AL), Alaska (AK), Arizona (AZ)... Wyoming (WY)
   - District of Columbia (DC)
   - Use official 2-letter postal codes

3. **US Territories** (5) - Optional
   - Puerto Rico (PR)
   - Guam (GU)
   - US Virgin Islands (VI)
   - American Samoa (AS)
   - Northern Mariana Islands (MP)

4. **Major Employment Law Cities** (~12-15)
   - Cities with unique employment laws
   - Examples:
     * San Francisco, CA (paid sick leave pioneer)
     * New York City, NY (extensive local laws)
     * Seattle, WA (minimum wage, scheduling)
     * Los Angeles, CA (fair work week, hotel worker protections)
     * Chicago, IL (paid sick leave)
     * Philadelphia, PA
     * Portland, OR
     * Minneapolis, MN
     * Austin, TX
     * Denver, CO

### Phase 2: Expanded Cities (Priority 2)
**~100-200 additional cities**

Add cities with population > 100,000 OR that have enacted local employment ordinances:
- Focus on cities known for progressive employment laws
- Cities in states that allow local regulation (CA, NY, IL, WA, OR, CO, etc.)

### Phase 3: Counties (Optional - Priority 3)
**~50-100 counties with unique laws**

Only add counties that have specific employment regulations:
- King County, WA (Seattle area)
- Los Angeles County, CA
- Cook County, IL (Chicago area)
- etc.

## 🔗 Linking Strategy: Saved Research ↔ Jurisdictions

### Current State
```typescript
savedResearch: {
  jurisdiction: string?  // Free text: "California", "San Francisco", etc.
}
```

### Proposed Enhancement

**Option A: String Matching (Simpler)**
- Keep `jurisdiction` as string
- Match against `jurisdictions.name` or `jurisdictions.code`
- Flexible but less structured
- Example: "California", "San Francisco", "Federal"

**Option B: ID Reference (More Structured)**
```typescript
savedResearch: {
  jurisdictionId: Id<"jurisdictions">?,
  jurisdictionCode: string?,  // Denormalized for quick access: "CA", "CA-SF-CITY"
}
```

**Option C: Hybrid (Recommended)**
```typescript
savedResearch: {
  jurisdiction: string?,        // Human-readable: "California"
  jurisdictionCode: string?,    // Machine-readable: "CA"
  jurisdictionLevel: "federal" | "state" | "county" | "city"?
}
```

## 📊 Data Sources for Population

### 1. **Federal + States** (Easy)
- Hardcode all 50 states + DC
- Use official postal codes
- Reference: USPS state abbreviations

### 2. **Major Cities** (Medium)
- US Census Bureau - Cities by population
- NELP (National Employment Law Project) - Cities with employment ordinances
- Manual curation of employment law hotspots

### 3. **Counties** (Complex)
- US Census FIPS codes
- Only add as needed (start with 0, add when research mentions them)

### 4. **API Options**
- **Census Bureau API** - Official government data
- **Google Places API** - City data with population
- **OpenStreetMap** - Free geographic data
- **Static CSV/JSON** - One-time import from curated list

## 🎨 UI/UX Design Considerations

### Jurisdiction Picker Component
```
┌─────────────────────────────────┐
│ Select Jurisdiction             │
├─────────────────────────────────┤
│ ○ Federal                       │
│ ○ State                         │
│   └─ [Dropdown: All 50 States]  │
│ ○ City                          │
│   └─ [Search: Type city name]   │
└─────────────────────────────────┘
```

### Hierarchical Display
```
📍 San Francisco, California
   └─ State: California (100 rules)
   └─ City: San Francisco (25 local ordinances)
```

### Smart Matching
- User types "San Francisco" → Match both city AND state
- Show combined rules from CA state + SF city
- Display hierarchy in results

## 🔧 Implementation Phases

### Phase 1: Foundation (Immediate)
1. ✅ Keep existing schema structure
2. ✅ Populate Federal + 50 States + DC (56 records)
3. ✅ Add 10-15 major employment law cities
4. ✅ Use simple string matching for savedResearch

### Phase 2: Enhancement (Future)
1. Add top 100 cities by population
2. Add jurisdiction hierarchy breadcrumbs in UI
3. Add "scope" concept (state law applies to cities within it)
4. Add county support for specific cases

### Phase 3: Advanced (Optional)
1. Full county database (~3,143 records)
2. Comprehensive city list (~500-1000)
3. Automatic jurisdiction detection from research content
4. Multi-jurisdiction rules (applies to CA + all CA cities)

## 💡 Recommended Approach

### **Start Simple:**
1. **Populate ~70 jurisdictions:**
   - 1 Federal
   - 51 States (50 + DC)
   - 15-20 major employment law cities

2. **Use String Matching:**
   - Keep `savedResearch.jurisdiction` as string
   - Match against `jurisdictions.name`
   - No complex foreign keys yet

3. **Curated List:**
   - Create CSV/JSON with hand-picked jurisdictions
   - Focus on quality over quantity
   - Only add jurisdictions that actually have unique employment laws

### **Data Structure Example:**
```csv
code,name,level,parentCode,hasEmploymentLaws,significanceLevel,population
US,United States,federal,,true,critical,330000000
CA,California,state,US,true,critical,39000000
NY,New York,state,US,true,critical,19000000
CA-SF-CITY,San Francisco,city,CA,true,high,875000
NY-NYC-CITY,New York City,city,NY,true,critical,8300000
```

## ✅ Decision Points

**You Need to Decide:**

1. **Scope:** Start with 70 jurisdictions or go big with 500+?
2. **Counties:** Include them or skip for now?
3. **Data Source:** Manual CSV or API integration?
4. **Linking:** Keep simple string matching or use IDs?
5. **UI:** Simple dropdown or hierarchical selector?

## 🎯 My Recommendation

**MVP Approach:**
- ✅ 1 Federal + 51 States + 20 Cities = **72 total jurisdictions**
- ✅ Simple string matching
- ✅ Manual CSV import (one-time)
- ✅ Focus on quality: only jurisdictions with actual employment laws
- ✅ Expand later based on actual usage

This gives you comprehensive state coverage + the most important local jurisdictions without overwhelming the system.

---

**Ready to implement?** Let me know which approach you prefer and I'll build it!

