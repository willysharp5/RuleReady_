import crypto from 'crypto';

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDqStdWHMXM0XQa
jsJAxXnrQp7KDcYJvX6UJwA60ClvmmEpsdrQe3oLP5KyWw515Q8od0BHrwyUM9tP
EuJHeqVCyJkN6enJf7LzQAEICf5ccqT4vUqjKyiIihVkEBS6Q62TQ3HmBUQS3DVf
7r8KZdALajTZWrgairoNfwQ7t76y9ndiXSyzKhPUUqg3Db1HSySMf7iRYgPr9hy0
8ldL4FR8k5av9pMgryHDFk4EhhY1Ct7mjA5XVeMIyrI9kEV530X1pfYMftXVxCbY
mZOG1I8YzNrSMe2dsisUn48lqtxLYjXDZFCeoLSVm7O0IvX7eRdbPum0Za/mRNnw
PwX+n4WvAgMBAAECggEAOH82oQXMLuE9MaBGOG9GQJRujQO4QyYGTXyAIi6LJ2Xf
UzoXrVlxKyA35Dlv6b8EIjprbj3Idz5v/ofrt9fb3RhZTBEhdp0MDntbJFCgnTNq
E681vdYM7qv5j4kPLoFebFoBr7mKWk/usQT13XCCtBX2y4kERyY3ykRcRXhADJBL
Mg4502TTTafhI9yfM1GzwXX9Jt2a6EF+hr4LxBjjSu4ravekur5qrTQrsDYSgy35
iP4P74ei0NMS0IEVkn2ni5MnLEiGLyuVH5UQO/ds6t/W4un6CEmgQiMQAtQ/rYL4
ju3YMsQ8GrPc5PMwzM4wZz9emQ42eROj4PECIXAkVQKBgQD+tI5R57e99Ep7Pse/
dAmE2zzTrSUtgoMCwdysLyCrxMWj4sYITs0gsXENKkMKl4phlOG2hHlgvo87i09G
GFMX/v3hLZcrG2Wnbs8sY75+M26jpzLYcMzhRgLqJGziKUybNFNIGIxf/1INhT7Y
wQqK+oJM+9cBp2zoR9t8F85+fQKBgQDre7jf505tY2DLmBRwHBafW5KyRa+zKDv4
x0PsonwSHHtFgMUl70YAZQxabsDd9mj3FkU46iNZc/yiQQZhZk5vytO95DswblGh
iJ08L2DsVpQKVVGA+Z2GuAy27DIJ0U5SvhHAiKoLC3zR7nNGwRoXftR5ygPIR9UF
UmxApp+wmwKBgQC2OyZsMVZD4Ml9PiCZuQKqfFUbuZCU7ACh82PYCWvdmU4ygChh
f0fB8VJKMgd/R4bpZCTNeiCBeDVwS66vHu4sh/LKrdyvKc3kKiKtxrte/ZtWGWUG
eEYNkxK4xNDmStgVXy2Kso2UjU7+f2vElvDdGHgrbi+Zblk8I1VEhp/l3QKBgQC3
UIco9l3dVgGiPG+cnqEVySm30fvnEiktj6HW8t53Euj7wDS5RT1PTVqCg7lskUhB
IXsdxVdjaaF/hfM7m3LwIAsZxjQ1jYvKnhkZIyDmmreAG87pAmiY2Wo8dD632dKJ
IyGaqkkFdBnlKyVeLTDsnXU2ogazwQeZrwJKievChQKBgFmVBJFcJalYjmjI6vOy
+WnMHfsOfastHd0fOQEKy54HvpgKTL9ZVsUhirunqHUKyp3TP263Md4RVPQwY8Wm
QpI2sGPs05k4oH8r6S9TtF0qQohFMwMSNDNt1A5wR885LrkHy6DRrCaxGU9TlVEM
pPIc7/us5VtvKTQA6SuXSSSY
-----END PRIVATE KEY-----`;

// Convert private key to base64
const privateKeyBase64 = Buffer.from(privateKeyPem).toString('base64');

// Extract public key components
const privateKey = crypto.createPrivateKey(privateKeyPem);
const publicKey = crypto.createPublicKey(privateKey);
const publicKeyObject = publicKey.export({ type: 'pkcs1', format: 'jwk' });

// Create JWKS format
const jwks = {
  keys: [{
    kty: publicKeyObject.kty,
    n: publicKeyObject.n,
    e: publicKeyObject.e,
    alg: "RS256",
    use: "sig",
    kid: "default-kid"
  }]
};

console.log('=== JWT_PRIVATE_KEY (base64 encoded) ===');
console.log('Run this command:');
console.log(`npx convex env set JWT_PRIVATE_KEY "${privateKeyBase64}"`);
console.log('\n=== JWKS ===');
console.log('Also set this:');
console.log(`npx convex env set JWKS '${JSON.stringify(jwks)}'`);