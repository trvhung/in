# Persistent Product Cache with Vercel Blob

**Date**: 2026-06-27
**Status**: Done

## Problem

Khi deploy trên Vercel serverless, file `/tmp/sapo-products.json` và `/tmp/sapo-meta.json` bị mất sau mỗi lần cold start. Điều này khiến API `/api/sapo/products` trả về `[]` và người dùng phải sync lại từ Sapo API mỗi khi function instance bị cold start.

Nguyên nhân: Vercel serverless functions có filesystem ephemeral — `/tmp` chỉ tồn tại trong lần chạy đó.

## Solution

Thay thế `/tmp` file storage bằng **Vercel Blob Storage** — persistent object storage tích hợp sẵn trong Vercel ecosystem.

### Architecture

```
GET /api/sapo/products
  ├── L1: Memory cache (instant, warm instance)
  ├── L2: Vercel Blob (~50-100ms, persistent qua cold start)
  └── Fallback: [] (chưa sync lần nào)

POST /api/sapo/sync
  ├── Fetch Sapo API → Transform → allProducts[]
  ├── Upload JSON → Vercel Blob (persistent)
  ├── Update memory cache (L1)
  └── Return result
```

### Cơ chế fallback

- **Có `BLOB_READ_WRITE_TOKEN`**: dùng Vercel Blob (production trên Vercel)
- **Không có token**: dùng `fs` local (development)

### Data flow

1. **Sync**: User bấm "Cập nhật sản phẩm Sapo" → POST `/api/sapo/sync`
   - Fetch toàn bộ sản phẩm từ Sapo API (batch 4 pages, retry failed)
   - Upload `sapo-products.json` và `sapo-meta.json` lên Vercel Blob
   - Populate memory cache

2. **Read**: Frontend gọi GET `/api/sapo/products`
   - Trả về memory cache nếu có (instant)
   - Nếu không, download từ Vercel Blob
   - Nếu blob cũng không có, trả về `[]`

## Files changed

| File | Change |
|---|---|
| `api/index.ts` | Thay `fs.readFile`/`fs.writeFile` bằng Vercel Blob SDK (`put`, `list`, `del`) |
| `.env.example` | Thêm biến `BLOB_READ_WRITE_TOKEN` |
| `package.json` | Thêm dependency `@vercel/blob` |

## Environment setup

Trên Vercel dashboard, thêm environment variable:
```
BLOB_READ_WRITE_TOKEN=<token từ Vercel Blob store>
```

Lấy token từ: `https://vercel.com/<team>/<project>/stores/blob`

## Trade-offs

- **Pros**: Persistent qua cold start, không cần database, tích hợp native với Vercel
- **Cons**: Thêm dependency `@vercel/blob`, cần setup token trên Vercel dashboard
