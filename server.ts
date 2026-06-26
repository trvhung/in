import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

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
const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);
const AUTH_HEADER = 'Basic ' + Buffer.from(`${SAPO_USER}:${SAPO_PASS}`).toString('base64');
const DATA_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'sapo-products.json');
const META_FILE = path.join(DATA_DIR, 'sapo-meta.json');
const LIMIT = 250;
const BATCH_SIZE = 4; // concurrent page fetches

// ── Helpers ────────────────────────────────────────────────────────

function mapVariantToProduct(sapoProduct: SapoProduct, variant: SapoVariant): Product {
  const suffix = variant.title && variant.title !== 'Default Title'
    ? ` - ${variant.title}`
    : '';
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
  const res = await fetch(url, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) {
    throw new Error(`Sapo API error: page ${page} returned ${res.status}`);
  }
  const data = await res.json();
  return data.products as SapoProduct[];
}

async function fetchTotalCount(): Promise<number> {
  const url = `${SAPO_BASE}/products/count.json`;
  const res = await fetch(url, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) {
    throw new Error(`Sapo count API error: ${res.status}`);
  }
  const data = await res.json();
  return data.count as number;
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory exists
  }
}

// ── Express App ────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS for Vite dev server
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// GET /api/sapo/products — return cached products
app.get('/api/sapo/products', async (_req, res) => {
  try {
    const raw = await fs.readFile(PRODUCTS_FILE, 'utf-8');
    const products: Product[] = JSON.parse(raw);
    res.json(products);
  } catch {
    // No cached data yet — return empty array
    res.json([]);
  }
});

// GET /api/sapo/meta — return sync metadata
app.get('/api/sapo/meta', async (_req, res) => {
  try {
    const raw = await fs.readFile(META_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.json({ count: 0, lastUpdated: null });
  }
});

// POST /api/sapo/sync — full sync from Sapo
app.post('/api/sapo/sync', async (_req, res) => {
  try {
    console.log('[sync] Starting Sapo sync...');

    // 1. Get total count
    const totalCount = await fetchTotalCount();
    const totalPages = Math.ceil(totalCount / LIMIT);
    console.log(`[sync] Total products: ${totalCount}, pages: ${totalPages}`);

    // 2. Fetch all pages in batches
    const allProducts: Product[] = [];
    let failedPages: number[] = [];

    for (let start = 1; start <= totalPages; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, totalPages);
      const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      console.log(`[sync] Fetching pages ${start}-${end} of ${totalPages}...`);

      const results = await Promise.allSettled(
        batch.map((page) => fetchPage(page))
      );

      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          for (const sapoProduct of r.value) {
            for (const variant of sapoProduct.variants) {
              allProducts.push(mapVariantToProduct(sapoProduct, variant));
            }
          }
        } else {
          const pageNum = batch[i];
          console.error(`[sync] Failed page ${pageNum}:`, r.reason);
          failedPages.push(pageNum);
        }
      });

      // Small delay between batches to avoid rate limiting
      if (end < totalPages) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // 3. Retry failed pages once
    if (failedPages.length > 0) {
      console.log(`[sync] Retrying ${failedPages.length} failed pages...`);
      const retryResults = await Promise.allSettled(
        failedPages.map((page) => fetchPage(page))
      );

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

      if (stillFailed > 0) {
        console.warn(`[sync] ${stillFailed} pages still failed after retry`);
      }
    }

    // 4. Save to file
    await ensureDataDir();
    const lastUpdated = new Date().toISOString();
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(allProducts), 'utf-8');
    await fs.writeFile(META_FILE, JSON.stringify({
      count: allProducts.length,
      lastUpdated,
    }), 'utf-8');

    const result: SyncResult = {
      count: allProducts.length,
      lastUpdated,
    };

    console.log(`[sync] Done! ${result.count} products synced.`);
    res.json(result);
  } catch (err: any) {
    console.error('[sync] Error:', err.message);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// Start server locally (Vercel imports the app directly — no listen needed)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Sapo API server running on http://localhost:${PORT}`);
    console.log(`  GET  /api/sapo/products  — cached products`);
    console.log(`  POST /api/sapo/sync      — trigger full sync`);
  });
}

export default app;
