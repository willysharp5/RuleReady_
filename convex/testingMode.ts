import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";

// Pause all compliance websites to stop over-scheduling
export const pauseAllComplianceWebsites = mutation({
  handler: async (ctx) => {
    console.log("⏸️ Pausing all compliance websites to stop over-scheduling...");
    
    // Get all websites
    const allWebsites = await ctx.db.query("websites").collect();
    const complianceWebsites = allWebsites.filter((w: any) => w.complianceMetadata?.isComplianceWebsite);
    
    console.log(`📊 Found ${complianceWebsites.length} compliance websites to pause`);
    
    let paused = 0;
    
    // Pause all compliance websites
    for (const website of complianceWebsites) {
      if (website.isActive || !website.isPaused) {
        await ctx.db.patch(website._id, {
          isActive: false,
          isPaused: true,
          updatedAt: Date.now(),
        });
        paused++;
      }
    }
    
    console.log(`✅ Paused ${paused} compliance websites`);
    
    return {
      success: true,
      totalComplianceWebsites: complianceWebsites.length,
      websitesPaused: paused,
      message: "All compliance websites paused to prevent over-scheduling",
    };
  },
});

// Enable testing mode with limited websites
export const enableTestingMode = mutation({
  args: {
    testWebsiteCount: v.optional(v.number()), // Default: 5
    testJurisdictions: v.optional(v.array(v.string())), // e.g., ["Federal", "California"]
    testTopics: v.optional(v.array(v.string())), // e.g., ["minimum_wage", "harassment_training"]
  },
  handler: async (ctx, args) => {
    const testCount = args.testWebsiteCount || 5;
    
    console.log(`🧪 Enabling testing mode with ${testCount} websites...`);
    
    // 1. First pause all websites
    await ctx.runMutation(api.testingMode.pauseAllComplianceWebsites);
    
    // 2. Select test websites based on criteria
    const testWebsites = await selectTestWebsites(ctx, {
      count: testCount,
      jurisdictions: args.testJurisdictions,
      topics: args.testTopics,
    });
    
    console.log(`📋 Selected ${testWebsites.length} websites for testing`);
    
    // 3. Activate only test websites with 15-second intervals
    let activated = 0;
    for (const website of testWebsites) {
      await ctx.db.patch(website._id, {
        isActive: true,
        isPaused: false,
        checkInterval: 0.25, // 15 seconds for testing
        updatedAt: Date.now(),
      });
      activated++;
    }
    
    console.log(`✅ Testing mode enabled: ${activated} websites active`);
    
    return {
      success: true,
      testingMode: true,
      websitesActivated: activated,
      testWebsites: testWebsites.map((w: any) => ({
        name: w.name,
        jurisdiction: w.complianceMetadata?.jurisdiction,
        topic: w.complianceMetadata?.topicKey,
        priority: w.complianceMetadata?.priority,
        url: w.url,
      })),
    };
  },
});

// Disable testing mode and restore production settings
export const disableTestingMode = mutation({
  handler: async (ctx) => {
    console.log("🔄 Disabling testing mode and restoring production settings...");
    
    // Get all websites
    const allWebsites = await ctx.db.query("websites").collect();
    const complianceWebsites = allWebsites.filter((w: any) => w.complianceMetadata?.isComplianceWebsite);
    
    let restored = 0;
    
    // Restore production settings for all compliance websites
    for (const website of complianceWebsites) {
      // Calculate production interval based on priority
      const productionIntervals = {
        testing: 0.25,    // Keep testing as 15 seconds
        critical: 1440,   // Daily
        high: 2880,       // Every 2 days
        medium: 10080,    // Weekly
        low: 43200        // Monthly
      };
      
      const priority = website.complianceMetadata?.priority || "medium";
      const productionInterval = productionIntervals[priority as keyof typeof productionIntervals];
      
      await ctx.db.patch(website._id, {
        isActive: true,
        isPaused: false,
        checkInterval: productionInterval,
        updatedAt: Date.now(),
      });
      restored++;
    }
    
    console.log(`✅ Restored ${restored} websites to production settings`);
    
    return {
      success: true,
      testingMode: false,
      websitesRestored: restored,
      message: "Production monitoring settings restored",
    };
  },
});

// Get current testing mode status
export const getTestingModeStatus = query({
  handler: async (ctx) => {
    const allWebsites = await ctx.db.query("websites").collect();
    const complianceWebsites = allWebsites.filter((w: any) => w.complianceMetadata?.isComplianceWebsite);
    
    const activeWebsites = complianceWebsites.filter(w => w.isActive && !w.isPaused);
    const testingWebsites = activeWebsites.filter(w => w.checkInterval === 0.25); // 15-second interval
    
    const isTestingMode = testingWebsites.length > 0 && activeWebsites.length <= 10; // Testing if ≤10 active
    
    return {
      isTestingMode,
      totalComplianceWebsites: complianceWebsites.length,
      activeWebsites: activeWebsites.length,
      testingWebsites: testingWebsites.length,
      pausedWebsites: complianceWebsites.length - activeWebsites.length,
      testWebsiteDetails: testingWebsites.map(w => ({
        name: w.name,
        jurisdiction: w.complianceMetadata?.jurisdiction,
        topic: w.complianceMetadata?.topicKey,
        priority: w.complianceMetadata?.priority,
        checkInterval: w.checkInterval,
      })),
    };
  },
});

// Select representative test websites
async function selectTestWebsites(ctx: any, criteria: any) {
  const allWebsites = await ctx.db.query("websites").collect();
  const complianceWebsites = allWebsites.filter((w: any) => w.complianceMetadata?.isComplianceWebsite);
  
  // Default test selection for comprehensive coverage
  const defaultTestCriteria = [
    { jurisdiction: "Federal", topicKey: "minimum_wage", priority: "critical" },
    { jurisdiction: "California", topicKey: "harassment_training", priority: "critical" },
    { jurisdiction: "Texas", topicKey: "overtime", priority: "high" },
    { jurisdiction: "New York", topicKey: "paid_sick_leave", priority: "high" },
    { jurisdiction: "Florida", topicKey: "posting_requirements", priority: "medium" },
  ];
  
  // If specific criteria provided, use those; otherwise use defaults
  let selectedWebsites = [];
  
  if (criteria.jurisdictions || criteria.topics) {
    // Filter by provided criteria
    let filtered = complianceWebsites;
    
    if (criteria.jurisdictions) {
      filtered = filtered.filter((w: any) => 
        criteria.jurisdictions.includes(w.complianceMetadata?.jurisdiction)
      );
    }
    
    if (criteria.topics) {
      filtered = filtered.filter((w: any) => 
        criteria.topics.includes(w.complianceMetadata?.topicKey)
      );
    }
    
    // Sort by priority and take top N
    selectedWebsites = filtered
      .sort((a: any, b: any) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.complianceMetadata?.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.complianceMetadata?.priority as keyof typeof priorityOrder] || 0;
        return bPriority - aPriority;
      })
      .slice(0, criteria.count);
  } else {
    // Use default test selection
    for (const testCriteria of defaultTestCriteria.slice(0, criteria.count)) {
      const website = complianceWebsites.find((w: any) => 
        w.complianceMetadata?.jurisdiction === testCriteria.jurisdiction &&
        w.complianceMetadata?.topicKey === testCriteria.topicKey
      );
      if (website) {
        selectedWebsites.push(website);
      }
    }
  }
  
  return selectedWebsites;
}


