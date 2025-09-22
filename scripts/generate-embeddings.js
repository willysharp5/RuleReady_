#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://friendly-octopus-467.convex.cloud";

async function main() {
  console.log("🚀 Generating embeddings for compliance reports (batched)...");
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Process enough batches to cover all reports (batchSize=20 inside action)
    const totalBatches = Number(process.env.EMBEDDING_BATCHES || 120);
    const result = await client.action("generateEmbeddings:generateAllEmbeddings", { totalBatches });
    console.log("✅ Embedding generation finished:", result);
  } catch (err) {
    console.error("❌ Embedding generation failed:", err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


