# 🧹 **LEGACY DECOMMISSION EXECUTION PLAN**

## **📊 CURRENT STATE INVENTORY**

### **✅ Feature Flags Active:**
- `complianceMode: true` - App operates in compliance-only mode
- `freezeLegacyWrites: true` - Blocks writes to non-compliance websites

### **🗄️ Legacy Tables Identified:**
1. **`websites`** - Hybrid table (compliance + legacy websites)
2. **`scrapeResults`** - Legacy scraping data → replaced by `complianceReports`
3. **`changeAlerts`** - Legacy alerts → replaced by `complianceChanges`

### **📱 UI Components Using Legacy Data:**
- `src/app/page.tsx` - Main dashboard (shimmed reads)
- `src/components/MonitoringStatus.tsx` - Status display (shimmed reads)
- `src/app/api/websites/route.ts` - Website API endpoints

### **✅ Existing Compatibility Shims:**
- `getAllScrapeHistory()` - Returns compliance reports as scrape history
- `getLatestScrapeForWebsites()` - Returns latest compliance reports per rule
- `freezeIfLegacy()` - Blocks writes to non-compliance websites

---

## **🎯 DECOMMISSION PHASES**

### **Phase A: Enhanced Legacy Freeze** ✅ READY
- [x] Feature flags implemented
- [x] Legacy writes blocked
- [x] Compatibility shims in place

### **Phase B: Data Migration Verification** 
- [ ] Verify all compliance data is properly imported
- [ ] Check for any orphaned legacy data
- [ ] Ensure compliance tables have full coverage

### **Phase C: UI Cleanup**
- [ ] Update components to use compliance queries directly
- [ ] Remove legacy type imports
- [ ] Test all UI functionality

### **Phase D: Safe Table Removal**
- [ ] Remove legacy table definitions from schema
- [ ] Deploy with feature flag protection
- [ ] Monitor for 24-48 hours
- [ ] Complete removal

---

## **🚀 EXECUTION STEPS**

### **Step 1: Data Verification** (5 minutes)
```bash
# Check compliance data coverage
node scripts/verify-compliance-data.js
```

### **Step 2: UI Component Updates** (15 minutes)
- Update `src/app/page.tsx` to use compliance queries
- Update `src/components/MonitoringStatus.tsx`
- Remove legacy type references

### **Step 3: Schema Cleanup** (10 minutes)
- Comment out legacy table definitions
- Deploy behind feature flag
- Test all functionality

### **Step 4: Final Removal** (5 minutes)
- Remove legacy tables completely
- Clean up unused imports
- Update documentation

---

## **⚠️ SAFETY MEASURES**

### **Rollback Plan:**
1. Keep feature flags as kill switches
2. Maintain schema backup
3. Monitor Convex logs for errors
4. 24-hour observation period

### **Verification Checklist:**
- [ ] App boots without errors
- [ ] Dashboard shows compliance data
- [ ] Chat system works with embeddings
- [ ] No legacy table references in logs

---

## **📋 DETAILED TASK LIST**

### **A. Enhanced Legacy Freeze** ✅ COMPLETE
- [x] Feature flags active in `convex/websites.ts`
- [x] Legacy writes blocked via `freezeIfLegacy()`
- [x] Compatibility shims working

### **B. Data Migration Verification**
- [ ] Run data verification script
- [ ] Check compliance rules count (should be 1,305)
- [ ] Check compliance reports count (should be 1,175)
- [ ] Check embeddings count (should be 2,759)

### **C. UI Cleanup**
- [ ] Update main dashboard queries
- [ ] Update monitoring status component
- [ ] Remove legacy API endpoints
- [ ] Test all user flows

### **D. Schema Cleanup**
- [ ] Comment out `websites`, `scrapeResults`, `changeAlerts` tables
- [ ] Deploy with feature flag protection
- [ ] Monitor for 24 hours
- [ ] Remove completely

---

## **🎯 SUCCESS CRITERIA**

### **Technical:**
- [ ] Zero references to legacy tables in active code
- [ ] All UI functionality preserved
- [ ] Chat system uses compliance embeddings
- [ ] No runtime errors in Convex logs

### **Functional:**
- [ ] Dashboard shows 1,305 compliance rules
- [ ] Chat returns relevant compliance sources
- [ ] Monitoring status accurate
- [ ] No user-facing disruptions

---

## **📅 TIMELINE**

- **Total Time:** ~35 minutes
- **Phase B:** 5 minutes (verification)
- **Phase C:** 15 minutes (UI updates)  
- **Phase D:** 10 minutes (schema cleanup)
- **Testing:** 5 minutes (verification)

---

*This plan ensures safe removal of legacy tables while preserving all compliance functionality.*
