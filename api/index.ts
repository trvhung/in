import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { put, list, del } from '@vercel/blob';

// ── Types ──────────────────────────────────────────────────────────

interface SapoVariant {
  id: number;
  barcode: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  title: string;
}

interface SapoProduct {
  id: number;
  name: string;
  variants: SapoVariant[];
  images: { src: string }[];
  product_type: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  price: number;
  comparePrice?: number;
  category?: string;
  image?: string;
}

interface SyncResult {
  count: number;
  lastUpdated: string;
}

// ── Config ─────────────────────────────────────────────────────────

const SAPO_BASE = process.env.SAPO_API_BASE_URL || '';
const SAPO_USER = process.env.SAPO_USERNAME || '';
const SAPO_PASS = process.env.SAPO_PASSWORD || '';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${SAPO_USER}:${SAPO_PASS}`).toString('base64');
const DATA_DIR = process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN
  ? '/tmp'
  : path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'sapo-products.json');
const META_FILE = path.join(DATA_DIR, 'sapo-meta.json');
const LIMIT = 250;
const BATCH_SIZE = 4;
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

// ── Storage abstraction (Blob on Vercel, fs locally) ───────────────

async function readJsonBlob(filename: string): Promise<any | null> {
  try {
    const { blobs } = await list({ prefix: filename });
    const latest = blobs
      .filter(b => b.pathname === filename)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
    if (!latest) return null;
    const res = await fetch(latest.url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function writeJsonBlob(filename: string, data: any): Promise<void> {
  // Clean up old blobs with the same pathname (put creates a new one each time)
  try {
    const { blobs } = await list({ prefix: filename });
    for (const b of blobs) {
      if (b.pathname === filename) {
        await del(b.url);
      }
    }
  } catch { /* best-effort cleanup */ }
  await put(filename, JSON.stringify(data), { access: 'public' });
}

async function readJson(filename: string): Promise<any | null> {
  if (useBlob) return readJsonBlob(filename);
  try {
    const raw = await fs.readFile(
      filename === 'sapo-products.json' ? PRODUCTS_FILE : META_FILE,
      'utf-8'
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(filename: string, data: any): Promise<void> {
  if (useBlob) return writeJsonBlob(filename, data);
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
  const filePath = filename === 'sapo-products.json' ? PRODUCTS_FILE : META_FILE;
  await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
}

// ── Helpers ────────────────────────────────────────────────────────

function mapVariantToProduct(sapoProduct: SapoProduct, variant: SapoVariant): Product {
  const suffix = variant.title && variant.title !== 'Default Title' ? ` - ${variant.title}` : '';
  return {
    id: `sapo-${sapoProduct.id}-${variant.id}`,
    name: `${sapoProduct.name}${suffix}`,
    sku: variant.sku || '',
    barcode: variant.barcode || '',
    quantity: 0,
    price: variant.price || 0,
    comparePrice: variant.compare_at_price || undefined,
    category: sapoProduct.product_type || undefined,
    image: sapoProduct.images?.[0]?.src || undefined,
  };
}

async function fetchPage(page: number): Promise<SapoProduct[]> {
  const url = `${SAPO_BASE}/products.json?limit=${LIMIT}&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
  if (!res.ok) throw new Error(`Sapo API error: page ${page} returned ${res.status}`);
  const data = await res.json();
  return data.products as SapoProduct[];
}

async function fetchTotalCount(): Promise<number> {
  const url = `${SAPO_BASE}/products/count.json`;
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
  if (!res.ok) throw new Error(`Sapo count API error: ${res.status}`);
  const data = await res.json();
  return data.count as number;
}

// ── In-memory cache (survives within warm instance) ────────────────

let cachedProducts: Product[] | null = null;
let cachedMeta: SyncResult | null = null;

// ── Express App ────────────────────────────────────────────────────

const app = express();
app.use(express.json());

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/api/sapo/products', async (_req, res) => {
  // Return from memory cache first (instant)
  if (cachedProducts) return res.json(cachedProducts);
  // Fall back to persistent storage (blob or file)
  const data = await readJson('sapo-products.json');
  if (data) {
    cachedProducts = data;
    return res.json(data);
  }
  res.json([]);
});

app.get('/api/sapo/meta', async (_req, res) => {
  if (cachedMeta) return res.json(cachedMeta);
  const data = await readJson('sapo-meta.json');
  if (data) {
    cachedMeta = data;
    return res.json(data);
  }
  res.json({ count: 0, lastUpdated: null });
});

app.post('/api/sapo/sync', async (_req, res) => {
  try {
    console.log('[sync] Starting Sapo sync...');
    const totalCount = await fetchTotalCount();
    const totalPages = Math.ceil(totalCount / LIMIT);
    console.log(`[sync] Total products: ${totalCount}, pages: ${totalPages}`);

    const allProducts: Product[] = [];
    const failedPages: number[] = [];

    for (let start = 1; start <= totalPages; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, totalPages);
      const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      console.log(`[sync] Fetching pages ${start}-${end} of ${totalPages}...`);

      const results = await Promise.allSettled(batch.map((page) => fetchPage(page)));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          for (const sapoProduct of r.value) {
            for (const variant of sapoProduct.variants) {
              allProducts.push(mapVariantToProduct(sapoProduct, variant));
            }
          }
        } else {
          failedPages.push(batch[i]);
        }
      });

      if (end < totalPages) await new Promise((r) => setTimeout(r, 200));
    }

    // Retry failed pages once
    if (failedPages.length > 0) {
      console.log(`[sync] Retrying ${failedPages.length} failed pages...`);
      const retryResults = await Promise.allSettled(failedPages.map((page) => fetchPage(page)));
      let stillFailed = 0;
      retryResults.forEach((r) => {
        if (r.status === 'fulfilled') {
          for (const sapoProduct of r.value) {
            for (const variant of sapoProduct.variants) {
              allProducts.push(mapVariantToProduct(sapoProduct, variant));
            }
          }
        } else {
          stillFailed++;
        }
      });
      if (stillFailed > 0) console.warn(`[sync] ${stillFailed} pages still failed after retry`);
    }

    const lastUpdated = new Date().toISOString();
    const meta: SyncResult = { count: allProducts.length, lastUpdated };
    await writeJson('sapo-products.json', allProducts);
    await writeJson('sapo-meta.json', meta);

    // Populate memory cache so GET /api/sapo/products returns instantly
    cachedProducts = allProducts;
    cachedMeta = meta;
    console.log(`[sync] Done! ${meta.count} products synced.`);
    res.json(meta);
  } catch (err: any) {
    console.error('[sync] Error:', err.message);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

export default app;
