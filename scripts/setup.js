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
  
  // Keep the private key in its original format
  const jwks = JSON.stringify({ keys: [publicKeyJWK] });

  console.log('Generated JWT keys successfully!');

  // Set Convex environment variables
  console.log('\nSetting Convex environment variables...\n');
  
  let success = true;
  
  // Set each environment variable
  try {
    console.log('Setting ENCRYPTION_KEY...');
    execSync(`npx convex env set ENCRYPTION_KEY "${encryptionKey}"`, { stdio: 'ignore' });
    console.log('Successfully set ENCRYPTION_KEY');
  } catch (error) {
    console.error('Failed to set ENCRYPTION_KEY');
    console.log(`Run manually: npx convex env set ENCRYPTION_KEY "${encryptionKey}"\n`);
    success = false;
  }
  
  try {
    console.log('Setting JWT_PRIVATE_KEY...');
    // Save private key to a file, then use stdin to set it
    const tempFile = path.join(process.cwd(), '.jwt-private-key-temp.txt');
    fs.writeFileSync(tempFile, privateKeyPKCS8);
    
    // Use stdin to pass the key to avoid escaping issues
    const keyContent = fs.readFileSync(tempFile, 'utf8');
    execSync('npx convex env set JWT_PRIVATE_KEY', {
      input: keyContent,
      stdio: ['pipe', 'ignore', 'ignore']
    });
    
    fs.unlinkSync(tempFile);
    console.log('Successfully set JWT_PRIVATE_KEY');
  } catch (error) {
    console.error('Failed to set JWT_PRIVATE_KEY');
    console.log('The private key contains special characters that need manual handling.');
    console.log('\nOption 1 - Save to file and use:');
    console.log('1. Create a file called jwt-key.txt with the private key');
    console.log('2. Run: npx convex env set JWT_PRIVATE_KEY "$(cat jwt-key.txt)"');
    console.log('3. Delete jwt-key.txt\n');
    console.log('Option 2 - Use the escaped version:');
    const escapedKey = privateKeyPKCS8.replace(/\n/g, '\\n');
    console.log(`npx convex env set JWT_PRIVATE_KEY "${escapedKey}"\n`);
    success = false;
  }
  
  try {
    console.log('Setting JWKS...');
    execSync(`npx convex env set JWKS '${jwks}'`, { stdio: 'ignore' });
    console.log('Successfully set JWKS');
  } catch (error) {
    console.error('Failed to set JWKS');
    console.log(`Run manually: npx convex env set JWKS '${jwks}'\n`);
    success = false;
  }
  
  try {
    console.log('Setting SITE_URL...');
    execSync('npx convex env set SITE_URL "http://localhost:3000"', { stdio: 'ignore' });
    console.log('Successfully set SITE_URL');
  } catch (error) {
    console.error('Failed to set SITE_URL');
    console.log('Run manually: npx convex env set SITE_URL "http://localhost:3000"\n');
    success = false;
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