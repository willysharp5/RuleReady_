import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';

async function generateKeys() {
  console.log('Generating JWT keys for Convex Auth...\n');
  
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  
  const privateKeyPKCS8 = await exportPKCS8(privateKey);
  const publicKeyJWK = await exportJWK(publicKey);
  publicKeyJWK.alg = 'RS256';
  publicKeyJWK.use = 'sig';
  publicKeyJWK.kid = 'default-kid';
  
  // Replace newlines with spaces for environment variable
  const privateKeyForEnv = privateKeyPKCS8.replace(/\n/g, ' ');
  
  // Also provide base64 version as alternative
  const privateKeyBase64 = Buffer.from(privateKeyPKCS8).toString('base64');
  
  console.log('=== JWT_PRIVATE_KEY (with spaces) ===');
  console.log('Run this command:');
  console.log(`npx convex env set JWT_PRIVATE_KEY "${privateKeyForEnv}"`);
  console.log();
  
  console.log('=== JWT_PRIVATE_KEY (base64 encoded) ===');
  console.log('Alternative - if the above doesn\'t work, try:');
  console.log(`npx convex env set JWT_PRIVATE_KEY "${privateKeyBase64}"`);
  console.log();
  
  console.log('=== JWKS ===');
  console.log('Also set this:');
  console.log(`npx convex env set JWKS '${JSON.stringify({ keys: [publicKeyJWK] })}'`);
  console.log();
  
  console.log('=== Additional Setup ===');
  console.log('Make sure to also set:');
  console.log('npx convex env set SITE_URL http://localhost:3000');
  console.log();
}

generateKeys().catch(console.error);