# 🧪 End-to-End Workflow Test Plan

## 📍 Test Case: California Sexual Harassment Training

### 🌐 URLs to Scrape:
1. **Primary**: `https://www.dir.ca.gov/dlse/sexual-harassment.htm`
   - California Department of Industrial Relations
   - Official state guidance on sexual harassment training requirements

2. **Secondary**: `https://www.eeoc.gov/sexual-harassment`
   - Federal EEOC Guidelines
   - Federal baseline requirements and best practices

### 📋 Test Steps:

#### **Step 1: Add Websites to Track**
1. Go to main page → "Add Website to Track" form
2. Add first URL:
   - **URL**: `https://www.dir.ca.gov/dlse/sexual-harassment.htm`
   - **Name**: `California Sexual Harassment Training Requirements`
   - **Jurisdiction**: `California`
   - **Topic**: `sexual_harassment`
   - **Priority**: `Critical`
   - **Monitor Type**: `Single Page`
3. Add second URL:
   - **URL**: `https://www.eeoc.gov/sexual-harassment`
   - **Name**: `Federal EEOC Sexual Harassment Guidelines`
   - **Jurisdiction**: `Federal`
   - **Topic**: `sexual_harassment`
   - **Priority**: `High`
   - **Monitor Type**: `Single Page`

#### **Step 2: Verify Firecrawl Scraping**
- Check that both websites appear in "Currently Tracked Websites"
- Wait for initial scraping to complete
- Verify scrape results in database

#### **Step 3: Compliance Generation**
1. Go to Settings → Compliance Generation
2. Select both scraped sources
3. Choose a compliance template
4. Generate rule using LLM synthesis
5. Review and edit generated rule
6. Approve and publish

#### **Step 4: Generate Embeddings**
1. Generate embeddings for the published rule
2. Verify embeddings are saved to database
3. Check embedding dimensions and metadata

#### **Step 5: Test Chat Integration**
1. Go to chat system
2. Ask: "What are the sexual harassment training requirements in California?"
3. Verify chat finds and uses the generated rule
4. Check that sources are properly cited

### 🗄️ Database Tables to Check:

#### **After Step 1-2 (Website Scraping):**
- `websites` table: 2 new entries
- `scrapeResults` table: 2 new scrape results
- `changeAlerts` table: 2 new alerts (for initial scrapes)

#### **After Step 3 (Rule Generation):**
- `complianceReports` table: 1 new generated rule
- `reportSources` table: 2 source mappings

#### **After Step 4 (Embeddings):**
- `complianceEmbeddings` table: Multiple embedding chunks

#### **After Step 5 (Chat):**
- Chat should retrieve embeddings and provide response with citations

### 🔍 What to Monitor:

#### **Console Logs to Watch For:**
- `🌐 Creating website: https://www.dir.ca.gov/dlse/sexual-harassment.htm`
- `🔥 Firecrawl scraping: [URL]`
- `🤖 Generating compliance rule from 2 sources`
- `⚡ Generating embeddings for rule: [title]`
- `💬 Chat query: sexual harassment training requirements`

#### **Success Indicators:**
- ✅ Websites created successfully
- ✅ Firecrawl returns markdown content
- ✅ Rule generation produces coherent compliance rule
- ✅ Embeddings generated with proper dimensions
- ✅ Chat finds and cites the generated rule

### 🚨 Potential Issues to Watch For:
- Firecrawl API rate limits or failures
- Empty or malformed scrape results
- LLM generation errors or timeouts
- Embedding generation failures
- Chat system not finding generated content

### 🧹 Cleanup After Testing:
- Remove test websites from tracking
- Clear test logs
- Remove generated test rule (optional)
- Reset any test state
