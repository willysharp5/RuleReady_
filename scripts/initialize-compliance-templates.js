#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function initializeTemplates() {
  console.log("🏗️ Initializing compliance templates...");
  
  const convex = new ConvexHttpClient(CONVEX_URL);
  
  try {
    // Initialize default templates for all topics
    const result = await convex.action(api.complianceTemplates.initializeDefaultTemplates);
    
    if (result.success) {
      console.log(`✅ Successfully initialized ${result.templatesCreated} compliance templates`);
      console.log("🎉 Template initialization complete!");
    } else {
      console.error("❌ Template initialization failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error initializing templates:", error.message);
  }
}

// Run the initialization
initializeTemplates().catch(console.error);
