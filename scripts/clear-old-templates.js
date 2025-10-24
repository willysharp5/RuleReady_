#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function clearOldTemplates() {
  console.log("🧹 Clearing old template format...");
  
  const convex = new ConvexHttpClient(CONVEX_URL);
  
  try {
    // Get all templates
    const templates = await convex.query(api.complianceTemplates.getAllTemplates);
    
    console.log(`Found ${templates.length} templates to clear`);
    
    // Delete each template
    for (const template of templates) {
      await convex.mutation(api.complianceTemplates.deleteTemplate, {
        templateId: template.templateId
      });
      console.log(`✅ Deleted template: ${template.templateId}`);
    }
    
    console.log("🎉 Old templates cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing templates:", error.message);
  }
}

// Run the clearing
clearOldTemplates().catch(console.error);
