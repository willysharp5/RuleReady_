#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Firecrawl Observer Setup - JWT Configuration\n');

async function setup() {
  // Check if Convex is initialized
  try {
    execSync('npx convex env list', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: Convex is not initialized!');
    console.log('\nPlease run "npx convex dev" first to initialize your Convex project.');
    console.log('After Convex is set up, run this setup script again.');
    process.exit(1);
  }

  // Check if .env.local exists and create if needed
  const envPath = path.join(process.cwd(), '.env.local');
  let encryptionKey = '';
  
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env.local file...');
    const basicEnv = `# Convex deployment URL (set by Convex)
NEXT_PUBLIC_CONVEX_URL=

# Encryption key for securing API keys in database
ENCRYPTION_KEY=
`;
    fs.writeFileSync(envPath, basicEnv);
  }

  // Generate or get encryption key
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (!envContent.includes('ENCRYPTION_KEY=') || envContent.match(/ENCRYPTION_KEY=\s*$/m)) {
    console.log('Generating encryption key...');
    encryptionKey = crypto.randomBytes(32).toString('base64');
    
    const updatedEnv = envContent.replace(
      /ENCRYPTION_KEY=.*$/m,
      `ENCRYPTION_KEY=${encryptionKey}`
    );
    
    fs.writeFileSync(envPath, updatedEnv);
    console.log('Generated and saved encryption key to .env.local');
  } else {
    // Extract existing encryption key
    const match = envContent.match(/ENCRYPTION_KEY=(.+)$/m);
    if (match) {
      encryptionKey = match[1].trim();
    }
  }

  // Generate JWT keys
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

  // Set Convex environment variables
  console.log('\nSetting Convex environment variables...\n');
  
  const commands = [
    { name: 'ENCRYPTION_KEY', value: encryptionKey, quotes: '"' },
    { name: 'JWT_PRIVATE_KEY', value: privateKeyForEnv, quotes: '"' },
    { name: 'JWKS', value: jwks, quotes: "'" },
    { name: 'SITE_URL', value: 'http://localhost:3000', quotes: '"' }
  ];
  
  let success = true;
  
  for (const { name, value, quotes } of commands) {
    try {
      console.log(`Setting ${name}...`);
      const cmd = `npx convex env set ${name} ${quotes}${value}${quotes}`;
      execSync(cmd, { stdio: 'ignore' });
      console.log(`Successfully set ${name}`);
    } catch (error) {
      console.error(`Failed to set ${name}`);
      console.log(`Run manually: npx convex env set ${name} ${quotes}${value}${quotes}\n`);
      success = false;
    }
  }
  
  if (success) {
    console.log('\nAll environment variables set successfully!');
    console.log('\nSetup complete! You can now run:');
    console.log('  npm run dev');
  } else {
    console.log('\nSome environment variables failed to set.');
    console.log('Please run the commands shown above manually.');
  }
}

// Run the setup
setup().catch(console.error);