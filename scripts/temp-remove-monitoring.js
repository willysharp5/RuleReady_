import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

// Remove section 1: Lines 2088-2577 (Advanced Add Website Form) - 0-indexed so 2087-2576
// Remove section 2: Lines 3428-5869 (Two Column Layout) - after first removal, this shifts

// First, remove the Add Website section (lines 2087-2576 in 0-indexed)
const beforeAddWebsite = lines.slice(0, 2087);
const afterAddWebsite = lines.slice(2577);

console.log(`After removing Add Website section: ${beforeAddWebsite.length + afterAddWebsite.length} lines`);

const step1 = [...beforeAddWebsite, ...afterAddWebsite];

// Now find the Two Column Layout comment in the modified array
let twoColumnIndex = -1;
for (let i = 0; i < step1.length; i++) {
  if (step1[i].trim() === '{/* Two Column Layout */}') {
    twoColumnIndex = i;
    break;
  }
}
console.log(`Two Column Layout starts at line ${twoColumnIndex + 1} (1-indexed)`);

// Find the LAST Footer line (there are multiple)
let footerIndex = -1;
for (let i = step1.length - 1; i >= 0; i--) {
  if (step1[i].trim() === '<Footer />') {
    footerIndex = i;
    break;
  }
}
console.log(`Footer starts at line ${footerIndex + 1} (1-indexed)`);

// Remove from line before Two Column Layout comment to line before Footer (keep blank lines)
const beforeTwoColumn = step1.slice(0, twoColumnIndex - 1); // Keep blank line before comment
const afterTwoColumn = step1.slice(footerIndex - 1); // Keep blank line before Footer

console.log(`After removing Two Column Layout: ${beforeTwoColumn.length + afterTwoColumn.length} lines`);

const finalContent = [...beforeTwoColumn, ...afterTwoColumn].join('\n');

// Write the result
fs.writeFileSync(filePath, finalContent, 'utf-8');

console.log('✅ Monitoring sections removed successfully!');
console.log(`Final file has ${finalContent.split('\n').length} lines`);

