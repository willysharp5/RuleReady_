#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Firecrawl Observer Setup\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.local.example');

if (!fs.existsSync(envPath)) {
  console.log('Creating .env.local file...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('Copied .env.local.example to .env.local');
  } else {
    // Create a basic .env.local
    const basicEnv = `# Convex deployment URL (will be set after deployment)
NEXT_PUBLIC_CONVEX_URL=

# Email provider (Resend)
RESEND_API_KEY=

# Encryption key for securing API keys in database
ENCRYPTION_KEY=
`;
    fs.writeFileSync(envPath, basicEnv);
    console.log('Created .env.local file');
  }
}

// Generate encryption key if not present
const envContent = fs.readFileSync(envPath, 'utf8');
if (!envContent.includes('ENCRYPTION_KEY=') || envContent.match(/ENCRYPTION_KEY=\s*$/m)) {
  console.log('\nGenerating encryption key...');
  const encryptionKey = crypto.randomBytes(32).toString('base64');
  
  const updatedEnv = envContent.replace(
    /ENCRYPTION_KEY=.*$/m,
    `ENCRYPTION_KEY=${encryptionKey}`
  );
  
  fs.writeFileSync(envPath, updatedEnv);
  console.log('Generated and saved encryption key');
}

// Check for JWT keys
console.log('\nChecking JWT keys...');
const jwtKeyPath = path.join(process.cwd(), 'jwt-private-key.txt');
if (!fs.existsSync(jwtKeyPath)) {
  console.log('JWT keys not found. Generating...');
  try {
    execSync('node scripts/generate-jwt-keys.js', { stdio: 'inherit' });
  } catch (error) {
    console.log('Warning: JWT key generation requires manual setup. Run: node scripts/generate-jwt-keys.js');
  }
} else {
  console.log('JWT keys already generated');
}

console.log('\nNext Steps:');
console.log('1. Run "npx convex dev" in one terminal');
console.log('2. Set Convex environment variables:');
console.log('   npx convex env set ENCRYPTION_KEY "$(grep ENCRYPTION_KEY .env.local | cut -d\'=\' -f2)"');
console.log('   npx convex env set RESEND_API_KEY "your_resend_api_key" (if you have one)');
console.log('3. Run "npm run dev" in another terminal');
console.log('4. Visit http://localhost:3000');
console.log('\nFull setup guide: https://github.com/yourusername/firecrawl-observer#quick-start');
console.log('\nHappy monitoring!');