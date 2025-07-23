import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';

async function generateKeys() {
  console.log('Generating JWT keys for Convex Auth...\n');
  
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  
  const privateKeyPKCS8 = await exportPKCS8(privateKey);
  const publicKeyJWK = await exportJWK(publicKey);
  publicKeyJWK.alg = 'RS256';
  publicKeyJWK.use = 'sig';
  publicKeyJWK.kid = 'default-kid';
  
  // Keep the private key as one string with escaped newlines
  const privateKeyForEnv = privateKeyPKCS8.replace(/\n/g, '\\n');
  
  console.log('=== JWT_PRIVATE_KEY ===');
  console.log('Copy and run this command:');
  console.log(`npx convex env set JWT_PRIVATE_KEY "${privateKeyForEnv}"`);
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