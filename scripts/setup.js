#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Firecrawl Observer Setup\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.local.example');

async function setup() {
  // Step 1: Create .env.local
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

  // Step 2: Generate encryption key if not present
  const envContent = fs.readFileSync(envPath, 'utf8');
  let encryptionKey = '';
  
  if (!envContent.includes('ENCRYPTION_KEY=') || envContent.match(/ENCRYPTION_KEY=\s*$/m)) {
    console.log('\nGenerating encryption key...');
    encryptionKey = crypto.randomBytes(32).toString('base64');
    
    const updatedEnv = envContent.replace(
      /ENCRYPTION_KEY=.*$/m,
      `ENCRYPTION_KEY=${encryptionKey}`
    );
    
    fs.writeFileSync(envPath, updatedEnv);
    console.log('Generated and saved encryption key');
  } else {
    // Extract existing encryption key
    const match = envContent.match(/ENCRYPTION_KEY=(.+)$/m);
    if (match) {
      encryptionKey = match[1].trim();
    }
  }

  // Step 3: Initialize Convex
  console.log('\nInitializing Convex...');
  console.log('This will open your browser to authenticate with Convex.\n');
  
  try {
    // First, try to deploy to initialize the project
    console.log('Attempting to initialize Convex project...');
    execSync('npx convex deploy --cmd "npx convex env list" 2>/dev/null', { stdio: 'pipe' });
    console.log('Convex project already initialized!');
  } catch (error) {
    // If that fails, we need to run convex dev to set up the project
    console.log('Setting up new Convex project...');
    console.log('Note: This will open your browser for authentication.');
    try {
      execSync('npx convex dev --until-success --run "npx convex dashboard"', { stdio: 'inherit' });
    } catch (e) {
      // Ignore errors here as convex dev might exit after setup
    }
    console.log('\nConvex initialized!');
  }

  // Step 4: Generate JWT keys
  console.log('\nGenerating JWT keys for authentication...');
  
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  
  const privateKeyPKCS8 = await exportPKCS8(privateKey);
  const publicKeyJWK = await exportJWK(publicKey);
  publicKeyJWK.alg = 'RS256';
  publicKeyJWK.use = 'sig';
  publicKeyJWK.kid = 'default-kid';
  
  // Keep the private key as one string with escaped newlines
  const privateKeyForEnv = privateKeyPKCS8.replace(/\n/g, '\\n');
  const jwks = JSON.stringify({ keys: [publicKeyJWK] });

  console.log('Generated JWT keys successfully!');

  // Step 5: Set Convex environment variables
  console.log('\nSetting Convex environment variables...');
  
  // Wait a moment for Convex to be fully initialized
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const envVarsToSet = [
    { name: 'ENCRYPTION_KEY', value: encryptionKey },
    { name: 'JWT_PRIVATE_KEY', value: privateKeyForEnv },
    { name: 'JWKS', value: jwks },
    { name: 'SITE_URL', value: 'http://localhost:3000' }
  ];
  
  let failedVars = [];
  
  for (const { name, value } of envVarsToSet) {
    try {
      console.log(`Setting ${name}...`);
      // Use stdio: 'ignore' to suppress output but still get errors
      execSync(`npx convex env set ${name} '${value}'`, { 
        stdio: 'ignore',
        shell: true 
      });
      console.log(`Successfully set ${name}`);
    } catch (error) {
      console.log(`Failed to set ${name}`);
      failedVars.push({ name, value });
    }
  }
  
  if (failedVars.length > 0) {
    console.log('\nSome environment variables failed to set automatically.');
    console.log('Please run these commands manually:\n');
    
    for (const { name, value } of failedVars) {
      if (name === 'JWKS') {
        console.log(`npx convex env set ${name} '${value}'`);
      } else {
        console.log(`npx convex env set ${name} "${value}"`);
      }
    }
  } else {
    console.log('\nAll environment variables set successfully!');
  }

  console.log('\nSetup Complete!');
  console.log('\nNext Steps:');
  console.log('1. Run "npm run dev" to start the development server');
  console.log('2. Visit http://localhost:3000');
  console.log('3. (Optional) Set up email notifications:');
  console.log('   npx convex env set RESEND_API_KEY "your_resend_api_key"');
  console.log('\nFull documentation: https://github.com/mendableai/firecrawl-observer#quick-start');
  console.log('\nHappy monitoring!');
}

// Run the setup
setup().catch(console.error);