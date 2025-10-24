import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';

const convex = new ConvexHttpClient('https://friendly-octopus-467.convex.cloud');

async function importMissingReports() {
  try {
    console.log('🔍 Checking for missing compliance reports...');
    
    // Get all rules from database
    const rules = await convex.query('csvImport:getAllRules');
    console.log(`Found ${rules.length} rules in database`);
    
    // Check which rules are missing report content
    const missingReports = [];
    
    for (const rule of rules.slice(0, 10)) { // Test with first 10 rules
      try {
        const details = await convex.query('ruleDetails:getRuleDetails', { 
          ruleId: rule.ruleId 
        });
        
        if (!details.stats.hasContent) {
          // Try to find the corresponding file
          const jurisdiction = rule.jurisdiction.replace(/\s+/g, '_');
          const topic = rule.topicKey.replace(/_/g, '_');
          
          // Try different filename patterns
          const possibleFilenames = [
            `${jurisdiction}_${topic}.txt`,
            `${jurisdiction}_${rule.topicLabel.replace(/\s+/g, '_').replace(/&/g, 'and')}.txt`,
            `${rule.jurisdiction}_${rule.topicLabel.replace(/\s+/g, '_').replace(/&/g, 'and')}.txt`,
          ];
          
          for (const filename of possibleFilenames) {
            const filePath = path.join('/Users/edo.williams/Desktop/RuleReady_/data/compliance_reports', filename);
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf8');
              missingReports.push({
                ruleId: rule.ruleId,
                filename,
                content,
                jurisdiction: rule.jurisdiction,
                topic: rule.topicLabel
              });
              console.log(`✅ Found file for ${rule.ruleId}: ${filename}`);
              break;
            }
          }
        }
      } catch (e) {
        console.log(`❌ Could not check rule ${rule.ruleId}: ${e.message}`);
      }
    }
    
    console.log(`\n📊 Found ${missingReports.length} reports to import`);
    
    if (missingReports.length > 0) {
      console.log('\nSample missing reports:');
      missingReports.slice(0, 3).forEach(r => {
        console.log(`- ${r.ruleId} (${r.jurisdiction} - ${r.topic})`);
        console.log(`  File: ${r.filename}`);
        console.log(`  Content length: ${r.content.length} chars`);
        console.log(`  Preview: ${r.content.substring(0, 100)}...`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

importMissingReports();
