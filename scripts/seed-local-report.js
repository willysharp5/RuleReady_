#!/usr/bin/env node

/**
 * Seed a local compliance report file into Convex as a versioned report
 * Usage: node scripts/seed-local-report.js <filename> <ruleId>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { ConvexHttpClient } from 'convex/browser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://friendly-octopus-467.convex.cloud';

async function main() {
  const [filename, ruleIdArg] = process.argv.slice(2);
  if (!filename || !ruleIdArg) {
    console.error('Usage: node scripts/seed-local-report.js <filename> <ruleId>');
    process.exit(1);
  }

  const reportPath = path.join(__dirname, '..', 'data', 'compliance_reports', filename);
  if (!fs.existsSync(reportPath)) {
    console.error(`File not found: ${reportPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(reportPath, 'utf8');
  const contentHash = createHash('sha256').update(content).digest('hex');
  const reportId = `${ruleIdArg}_${Date.now()}`;

  const convex = new ConvexHttpClient(CONVEX_URL);

  console.log(`Seeding report for ruleId=${ruleIdArg} from ${filename} → ${CONVEX_URL}`);
  const extractedSections = {
    overview: undefined,
    coveredEmployers: undefined,
    coveredEmployees: undefined,
    employerResponsibilities: undefined,
    trainingRequirements: undefined,
    postingRequirements: undefined,
    penalties: undefined,
    sources: undefined,
  };

  await convex.mutation('reportImport:createReport', {
    reportId,
    ruleId: ruleIdArg,
    reportContent: content,
    contentHash,
    contentLength: content.length,
    extractedSections,
    processingMethod: 'local_seed',
  });

  console.log(`✅ Seeded reportId=${reportId} (length=${content.length})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}



