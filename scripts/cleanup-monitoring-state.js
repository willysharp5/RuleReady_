import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

console.log('🧹 Cleaning up monitoring-related state and code...\n');

// Remove monitoring state variables (lines 103-246 approximately)
// We'll do this by removing specific blocks

// 1. Remove website monitoring state block (lines 103-107)
content = content.replace(/  \/\/ Website monitoring state\n  const \[url, setUrl\] = useState\(''\)\n  const \[error, setError\] = useState\(''\)\n  const \[isAdding, setIsAdding\] = useState\(false\)\n  const \[isMonitoringOnce, setIsMonitoringOnce\] = useState\(false\)\n  \n/g, '  \n');

// 2. Remove website queries
content = content.replace(/  const websitesQuery = useQuery\(api\.websites\.getUserWebsites\)\n/g, '');
content = content.replace(/  const allScrapeHistoryQuery = useQuery\(api\.websites\.getAllScrapeHistory\)\n/g, '');
content = content.replace(/  const websites = websitesQuery \|\| \[\]\n/g, '');
content = content.replace(/  const allScrapeHistory = allScrapeHistoryQuery \|\| \[\]\n/g, '');

// 3. Remove website mutations
content = content.replace(/  const createWebsite = useMutation\(api\.websites\.createWebsite\)\n/g, '');
content = content.replace(/  const deleteWebsite = useMutation\(api\.websites\.deleteWebsite\)\n/g, '');
content = content.replace(/  const pauseWebsite = useMutation\(api\.websites\.pauseWebsite\)\n/g, '');
content = content.replace(/  const updateWebsite = useMutation\(api\.websites\.updateWebsite\)\n/g, '');
content = content.replace(/  const triggerScrape = useAction\(api\.firecrawl\.triggerScrape\)\n/g, '');
content = content.replace(/  const crawlWebsite = useAction\(api\.firecrawl\.crawlWebsite\)\n/g, '');

// 4. Remove scrape tracking state
content = content.replace(/  \/\/ Track scrape results\n  const \[selectedWebsiteId, setSelectedWebsiteId\] = useState<string \| null>\(null\)\n  const \[viewingSpecificScrape, setViewingSpecificScrape\] = useState<string \| null>\(null\)\n  const \[checkLogFilter, setCheckLogFilter\] = useState<'all' \| 'changed' \| 'meaningful'>\('all'\)\n  const \[processingWebsites, setProcessingWebsites\] = useState<Set<string>>\(new Set\(\)\)\n  const \[deletingWebsites, setDeletingWebsites\] = useState<Set<string>>\(new Set\(\)\)\n  const \[newlyCreatedWebsites, setNewlyCreatedWebsites\] = useState<Set<string>>\(new Set\(\)\)\n  const \[showAddedLines, setShowAddedLines\] = useState\(true\)\n  const \[showRemovedLines, setShowRemovedLines\] = useState\(true\)\n  const \[onlyShowDiff, setOnlyShowDiff\] = useState\(true\)\n  \n/g, '  \n');

// 5. Remove pagination state
content = content.replace(/  \/\/ Pagination states\n  const \[websitesPage, setWebsitesPage\] = useState\(1\)\n  const \[changesPage, setChangesPage\] = useState\(1\)\n  const \[modalWebsitesPage, setModalWebsitesPage\] = useState\(1\)\n  const ITEMS_PER_PAGE_WEBSITES = 5\n  const ITEMS_PER_PAGE_CHANGES = 10\n  const ITEMS_PER_PAGE_MODAL = 10 \/\/ For expanded modal\n  \n/g, '  \n');

// 6. Remove expanded panel state
content = content.replace(/  \/\/ Expanded panel state\n  const \[expandedPanel, setExpandedPanel\] = useState<'websites' \| 'changes' \| null>\(null\)\n  \n/g, '  \n');

// 7. Remove webhook modal state
content = content.replace(/  \/\/ Webhook configuration modal state\n  const \[showWebhookModal, setShowWebhookModal\] = useState\(false\)\n  const \[editingWebsiteId, setEditingWebsiteId\] = useState<string \| null>\(null\)\n  const \[pendingWebsite, setPendingWebsite\] = useState<{\n    url: string\n    name: string\n  } \| null>\(null\)\n  const \[searchQuery, setSearchQuery\] = useState\(''\)\n  const \[changesSearchQuery, setChangesSearchQuery\] = useState\(''\)\n  \n/g, '  \n');

// 8. Remove compliance filtering state (website-specific)
content = content.replace(/  \/\/ Compliance filtering state\n  const \[selectedJurisdiction, setSelectedJurisdiction\] = useState<string>\(''\)\n  const \[selectedPriority, setSelectedPriority\] = useState<string>\(''\)\n  const \[selectedTopic, setSelectedTopic\] = useState<string>\(''\)\n  const \[selectedStatus, setSelectedStatus\] = useState<string>\(''\)\n  \n  \n/g, '  \n');

// 9. Remove modal filter states
content = content.replace(/  \/\/ Modal filter states\n  const \[modalSelectedJurisdiction, setModalSelectedJurisdiction\] = useState<string>\(''\)\n  const \[modalSelectedPriority, setModalSelectedPriority\] = useState<string>\(''\)\n  const \[modalSelectedTopic, setModalSelectedTopic\] = useState<string>\(''\)\n  const \[modalSelectedStatus, setModalSelectedStatus\] = useState<string>\(''\)\n  \n  \n/g, '  \n');

// 10. Remove bulk selection state
content = content.replace(/  \/\/ Bulk selection state\n  const \[selectedWebsiteIds, setSelectedWebsiteIds\] = useState<Set<string>>\(new Set\(\)\)\n  \n/g, '  \n');

// 11. Remove advanced add website form state
content = content.replace(/  \/\/ Advanced add website form state[\s\S]*?const \[complianceTemplate, setComplianceTemplate\] = useState\(''\)\n  \n/g, '  \n');

// 12. Remove URL validation state
content = content.replace(/  \/\/ URL validation state[\s\S]*?  }\)\n  \n/g, '  \n');

// 13. Remove Firecrawl config state
content = content.replace(/  \/\/ Firecrawl options state[\s\S]*?  }\)\n  \n/g, '  \n');

// 14. Remove AI Analysis settings
content = content.replace(/  \/\/ AI Analysis settings state[\s\S]*?  const \[meaningfulChangeThreshold, setMeaningfulChangeThreshold\] = useState\(70\)[\s\S]*?\n  \n/g, '  \n');

// 15. Remove getLatestScrapeForWebsites query
content = content.replace(/  \/\/ Get latest scrape for each website\n  const latestScrapes = useQuery\(api\.websites\.getLatestScrapeForWebsites\)\n\n  \/\/ Get all scrape results for check log\n/g, '  \n');

// 16. Remove createAllWebsites mutation
content = content.replace(/  const createAllWebsites = useMutation\(api\.singleUserSetup\.createAllComplianceWebsites\)\n/g, '');

// 17. Remove monitoring-related comments
content = content.replace(/      \/\/ Create website entry for one-time scrape so it shows in "Currently Tracked Websites"\n/g, '');
content = content.replace(/AI-powered employment law monitoring across all US jurisdictions/g, 'AI-powered compliance research assistant');

// Write the cleaned content
fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Monitoring state variables removed!');
console.log(`File has ${content.split('\n').length} lines`);

