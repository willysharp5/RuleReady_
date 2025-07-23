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
    // Run convex dev in a way that allows it to initialize but then we can continue
    execSync('npx convex dev --once', { stdio: 'inherit' });
    console.log('\nConvex initialized successfully!');
  } catch (error) {
    console.log('\nNote: If Convex is already initialized, you can ignore the above error.');
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
  
  try {
    // Set encryption key
    if (encryptionKey) {
      execSync(`npx convex env set ENCRYPTION_KEY "${encryptionKey}"`, { stdio: 'pipe' });
      console.log('Set ENCRYPTION_KEY');
    }
    
    // Set JWT keys
    execSync(`npx convex env set JWT_PRIVATE_KEY "${privateKeyForEnv}"`, { stdio: 'pipe' });
    console.log('Set JWT_PRIVATE_KEY');
    
    execSync(`npx convex env set JWKS '${jwks}'`, { stdio: 'pipe' });
    console.log('Set JWKS');
    
    // Set site URL
    execSync('npx convex env set SITE_URL "http://localhost:3000"', { stdio: 'pipe' });
    console.log('Set SITE_URL');
    
    console.log('\nAll environment variables set successfully!');
  } catch (error) {
    console.error('\nError setting environment variables:', error.message);
    console.log('\nIf the above failed, you can manually set them:');
    console.log(`npx convex env set ENCRYPTION_KEY "${encryptionKey}"`);
    console.log(`npx convex env set JWT_PRIVATE_KEY "${privateKeyForEnv}"`);
    console.log(`npx convex env set JWKS '${jwks}'`);
    console.log('npx convex env set SITE_URL "http://localhost:3000"');
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