#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from 'convex/browser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://friendly-octopus-467.convex.cloud';
const CSV_PATH = process.env.EMBEDDINGS_CSV_PATH || path.join(__dirname, '../data/compliance_embeddings_versioned_rows.csv');
const BATCH_SIZE = Number(process.env.EMBEDDINGS_BATCH_SIZE || 25);
const LIMIT = process.env.EMBEDDINGS_LIMIT ? Number(process.env.EMBEDDINGS_LIMIT) : undefined;
const OFFSET = process.env.EMBEDDINGS_OFFSET ? Number(process.env.EMBEDDINGS_OFFSET) : 0;

function parseCSV(text) {
  const rows = [];
  const len = text.length;
  let i = 0;
  let row = [];
  let field = '';
  let inQuotes = false;
  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      if (char === '\r') {
        i++;
        continue;
      }
      field += char;
      i++;
    }
  }
  // last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function safeJSONParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

async function main() {
  console.log('📄 Reading embeddings CSV:', CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) {
    console.error('❌ CSV file not found');
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  if (rows.length === 0) {
    console.error('❌ CSV is empty');
    process.exit(1);
  }

  const headers = rows[0];
  let dataRows = rows.slice(1);
  if (OFFSET) dataRows = dataRows.slice(OFFSET);
  if (LIMIT) dataRows = dataRows.slice(0, LIMIT);
  console.log(`📊 Rows detected: ${dataRows.length}`);

  const idx = (name) => headers.indexOf(name);
  const col = {
    entity_type: idx('entity_type'),
    entity_id: idx('entity_id'),
    content: idx('content'),
    content_hash: idx('content_hash'),
    embedding: idx('embedding'),
    chunk_index: idx('chunk_index'),
    total_chunks: idx('total_chunks'),
    metadata: idx('metadata'),
    created_at: idx('created_at'),
  };

  // Basic header validation
  for (const k of Object.keys(col)) {
    if (col[k] === -1) {
      console.error(`❌ Missing required column in CSV: ${k}`);
      process.exit(1);
    }
  }

  const client = new ConvexHttpClient(CONVEX_URL);
  let processed = 0;
  let errors = 0;

  console.log('🚀 Starting migration to Convex...');
  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const batchRows = dataRows.slice(i, i + BATCH_SIZE);
    const batch = batchRows.map((r) => {
      const embeddingStr = r[col.embedding] || '[]';
      const embedding = safeJSONParse(embeddingStr, []);
      const metadataStr = r[col.metadata] || '{}';
      const rawMeta = safeJSONParse(metadataStr, {});
      const metadata = {
        // map expected keys only
        contentLength: typeof rawMeta.content_length === 'number' ? rawMeta.content_length : (r[col.content]?.length || undefined),
        jurisdiction: rawMeta.jurisdiction_name || rawMeta.jurisdiction_code || undefined,
        topicKey: rawMeta.topic_key || undefined,
        processingMethod: rawMeta.processing_method || 'imported_from_existing',
      };
      return {
        entity_type: r[col.entity_type],
        entity_id: r[col.entity_id],
        content: r[col.content] || '',
        content_hash: r[col.content_hash] || '',
        chunk_index: Number(r[col.chunk_index] || 0),
        total_chunks: Number(r[col.total_chunks] || 1),
        metadata,
        embedding,
        created_at: r[col.created_at] || new Date().toISOString(),
      };
    });

    try {
      const res = await client.action('migrateEmbeddings:migrateEmbeddingsFromSupabase', {
        embeddings: batch,
        batch_size: Math.min(BATCH_SIZE, 50),
      });
      processed += res.processed || 0;
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: processed=${res.processed}, errors=${res.errors}`);
    } catch (e) {
      errors += batch.length;
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, e?.message || e);
    }

    // small delay
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('🎉 Migration complete.');
  console.log(`   Processed: ${processed}`);
  console.log(`   Errors:    ${errors}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('❌ Migration crashed:', e);
    process.exit(1);
  });
}


