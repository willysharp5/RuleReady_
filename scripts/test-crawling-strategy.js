#!/usr/bin/env node

/**
 * Test Smart Crawling Strategy
 * 
 * This script tests the new jurisdiction-based crawling patterns
 * and shows how different rules get different crawling frequencies.
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud");

async function testCrawlingStrategy() {
  console.log("🧪 Testing Smart Crawling Strategy...\n");
  
  try {
    // Get sample rules to test strategy assignment
    const rules = await client.query("csvImport:getAllRules");
    console.log(`📋 Found ${rules.length} total compliance rules\n`);
    
    // Test strategy for different jurisdiction/topic combinations
    const testCases = [
      { jurisdiction: "Federal", topicKey: "minimum_wage", expected: "critical" },
      { jurisdiction: "California", topicKey: "harassment_training", expected: "high" },
      { jurisdiction: "Texas", topicKey: "overtime", expected: "high" },
      { jurisdiction: "New York", topicKey: "paid_sick_leave", expected: "high" },
      { jurisdiction: "Florida", topicKey: "posting_requirements", expected: "medium" },
      { jurisdiction: "Nevada", topicKey: "family_leave", expected: "low" },
    ];
    
    console.log("🎯 STRATEGY TEST RESULTS:");
    console.log("=".repeat(80));
    
    for (const testCase of testCases) {
      // Find a real rule matching this pattern
      const matchingRule = rules.find(r => 
        r.jurisdiction === testCase.jurisdiction && 
        r.topicKey === testCase.topicKey
      );
      
      if (matchingRule) {
        console.log(`\n📍 ${testCase.jurisdiction} - ${testCase.topicKey}`);
        console.log(`   Rule ID: ${matchingRule.ruleId}`);
        console.log(`   URL: ${matchingRule.sourceUrl}`);
        console.log(`   Expected Priority: ${testCase.expected}`);
        console.log(`   Actual Priority: ${matchingRule.priority || 'not set'}`);
        
        // Show what the new strategy would assign
        const strategyPreview = getStrategyPreview(testCase.jurisdiction, testCase.topicKey);
        console.log(`   New Strategy: ${strategyPreview.frequency} (${strategyPreview.priority} priority)`);
        console.log(`   Check Interval: ${strategyPreview.intervalHours} hours`);
      } else {
        console.log(`\n❌ No rule found for ${testCase.jurisdiction} - ${testCase.topicKey}`);
      }
    }
    
    // Show jurisdiction distribution
    console.log("\n\n📊 JURISDICTION DISTRIBUTION:");
    console.log("=".repeat(50));
    const jurisdictionCounts = {};
    rules.forEach(rule => {
      const j = rule.jurisdiction;
      jurisdictionCounts[j] = (jurisdictionCounts[j] || 0) + 1;
    });
    
    Object.entries(jurisdictionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([jurisdiction, count]) => {
        const strategy = getStrategyPreview(jurisdiction, "default");
        console.log(`${jurisdiction.padEnd(20)} ${count.toString().padStart(4)} rules → ${strategy.frequency} monitoring`);
      });
    
    // Show topic distribution
    console.log("\n\n🏷️ TOPIC PRIORITY DISTRIBUTION:");
    console.log("=".repeat(50));
    const topicCounts = {};
    rules.forEach(rule => {
      const t = rule.topicKey;
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
    
    Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([topicKey, count]) => {
        const strategy = getStrategyPreview("California", topicKey); // Use CA as example state
        console.log(`${topicKey.padEnd(25)} ${count.toString().padStart(4)} rules → ${strategy.priority} priority`);
      });
    
    console.log("\n\n🚀 NEXT STEPS:");
    console.log("1. Run dry-run update: node scripts/update-crawling-schedules.js --dry-run");
    console.log("2. Apply updates: node scripts/update-crawling-schedules.js");
    console.log("3. Monitor crawling performance in dashboard");
    
  } catch (error) {
    console.error("❌ Strategy test failed:", error);
    process.exit(1);
  }
}

// Preview what strategy would be assigned (mirrors the Convex function logic)
function getStrategyPreview(jurisdiction, topicKey) {
  const crawlingStrategies = {
    federal: { 
      frequency: "weekly", 
      priority: "critical",
      checkIntervalMinutes: 10080, // 1 week
    },
    state_labor_dept: { 
      frequency: "bi-weekly", 
      priority: "high",
      checkIntervalMinutes: 20160, // 2 weeks
    },
    municipal: { 
      frequency: "monthly", 
      priority: "medium",
      checkIntervalMinutes: 43200, // 1 month
    }
  };

  const topicPriorities = {
    minimum_wage: "critical",
    overtime: "high",
    paid_sick_leave: "high",
    harassment_training: "high",
    workers_comp: "medium",
    posting_requirements: "medium",
    background_checks: "medium",
    meal_rest_breaks: "medium",
    family_leave: "low",
    youth_employment: "low",
    default: "medium"
  };

  // Get base strategy
  let baseStrategy;
  if (jurisdiction === "Federal") {
    baseStrategy = crawlingStrategies.federal;
  } else if (jurisdiction.includes("City") || jurisdiction.includes("County")) {
    baseStrategy = crawlingStrategies.municipal;
  } else {
    baseStrategy = crawlingStrategies.state_labor_dept;
  }
  
  // Get topic priority
  const topicPriority = topicPriorities[topicKey] || topicPriorities.default;
  
  // Adjust interval
  let adjustedInterval = baseStrategy.checkIntervalMinutes;
  if (topicPriority === "critical") {
    adjustedInterval = Math.floor(adjustedInterval * 0.5);
  } else if (topicPriority === "high") {
    adjustedInterval = Math.floor(adjustedInterval * 0.75);
  } else if (topicPriority === "low") {
    adjustedInterval = Math.floor(adjustedInterval * 1.5);
  }
  
  return {
    frequency: baseStrategy.frequency,
    priority: topicPriority,
    intervalHours: Math.round(adjustedInterval / 60),
  };
}

// Run the test
testCrawlingStrategy().catch(console.error);
