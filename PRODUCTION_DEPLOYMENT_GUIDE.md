# PUMPSQUARE SYSTEMS LLP — PRODUCTION DEPLOYMENT GUIDE

**Version:** 1.1  
**Date:** 2026-11-09  
**Status:** Production Ready (with fixes applied)

---

## 1. PROJECT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION DEPLOYMENT                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐        ┌──────────────┐        ┌───────────┐ │
│  │   VERCEL     │◄──────►│   RENDER     │◄──────►│  SUPABASE │ │
│  │  (Frontend)  │  API   │  (Backend)   │  DB/   │ (Postgres │ │
│  │  Next.js 16  │ Calls  │  Express API │ Storage│  + Auth)  │ │
│  │  + Admin UI  │        │  + Chatbot   │        │           │ │
│  └──────────────┘        └──────────────┘        └───────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Technology | Deployment |
|-----------|------------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS | Vercel |
| **Backend** | Node.js/Express, TypeScript (ESM) | Render |
| **Database** | PostgreSQL (Supabase) | Supabase Cloud |
| **Storage** | Supabase Storage (product-uploads bucket) | Supabase Cloud |
| **Auth** | JWT + HttpOnly cookies, bcrypt | Backend + Frontend proxy |
| **Chatbot** | Sarvam AI | Backend |

---

## 2. ROOT DIRECTORIES

| Application | Root Directory |
|-------------|----------------|
| Frontend | `frontend/` |
| Backend | `backend/` |

---

## 3. REQUIRED NODE.JS VERSION

**Node.js >= 18.0.0** (specified in backend `package.json` engines field)

---

## 4. FRONTEND ENVIRONMENT VARIABLES (Vercel)

| Variable | Required | Public/Secret | Description |
|----------|----------|---------------|-------------|
| `BACKEND_URL` | Yes | Secret | Render backend URL (e.g., `https://pumpsquare-api.onrender.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Supabase project URL (e.g., `https://vqzuvjubeohfsixguzpa.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | Supabase anon/publishable key |
| `NEXT_PUBLIC_CHAT_API_URL` | Yes | Public | Backend chat endpoint (e.g., `https://pumpsquare-api.onrender.com/api`) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No | Public | WhatsApp Business number (international format, no +/spaces) |
| `S3_ENDPOINT` | No | Secret | S3-compatible storage endpoint (optional) |
| `S3_REGION` | No | Secret | S3 region (optional) |
| `S3_BUCKET` | No | Secret | S3 bucket name (optional) |
| `S3_ACCESS_KEY_ID` | No | Secret | S3 access key (optional) |
| `S3_SECRET_ACCESS_KEY` | No | Secret | S3 secret key (optional) |
| `S3_PUBLIC_BASE_URL` | No | Secret | S3 public base URL (optional) |

---

## 5. BACKEND ENVIRONMENT VARIABLES (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Render provides this automatically (default: 4000) |
| `NODE_ENV` | Yes | Set to `production` |
| `SARVAM_API_KEY` | Yes | Sarvam AI API key for chatbot |
| `SARVAM_MODEL` | No | Sarvam model name (default: `sarvam-105b`) |
| `FRONTEND_ORIGIN` | Yes | Primary Vercel frontend URL (e.g., `https://pumpsquare.vercel.app`) — **exact origin, no trailing slash** |
| `FRONTEND_ORIGINS` | No | Additional frontend origins, comma-separated (e.g., `https://pumpsquare-git-main.vercel.app,https://pumpsquare-git-feature.vercel.app`) for preview deployments |
| `CHAT_MAX_HISTORY` | No | Max chat history messages (default: 12) |
| `CHAT_RATE_LIMIT` | No | Chat rate limit per window (default: 10) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `JWT_SECRET` | Yes | Strong random string for session signing (generate: `openssl rand -base64 32`) — **must be at least 32 characters** |

---

## 6. VERCEL DEPLOYMENT SETTINGS

### Build Configuration
```
Framework Preset: Next.js
Root Directory: frontend/
Build Command: npm run build
Install Command: npm install
Output Directory: .next (default)
```

### Environment Variables
Add all variables from **Section 4** in Vercel Dashboard → Settings → Environment Variables.

### Deployment Settings
- **Node.js Version**: 20.x (or 18.x+)
- **Auto-deploy**: Enabled on push to main branch
- **Build Cache**: Enabled

---

## 7. RENDER DEPLOYMENT SETTINGS

### Service Configuration
```
Service Type: Web Service
Root Directory: backend/
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### Environment Variables
Add all variables from **Section 5** in Render Dashboard → Environment.

### Health Check
- **Path**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds

### Auto-deploy
- **Enabled**: Yes (on push to main branch)

### Important Notes
- The backend uses `process.env.PORT || 4000` — Render automatically sets `PORT`
- Do **not** use `npm run dev` or `nodemon` in production
- The `start` script runs `node src/server.js` (correct entry point)

---

## 8. CORS CONFIGURATION

### Backend CORS (Render)
Configured in `backend/src/server.js`:

```javascript
// Parse allowed origins from FRONTEND_ORIGINS (comma-separated) or fall back to FRONTEND_ORIGIN
function getAllowedOrigins() {
  const origins = new Set();
  if (env.FRONTEND_ORIGINS) {
    for (const o of env.FRONTEND_ORIGINS.split(",")) {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  origins.add(env.FRONTEND_ORIGIN);
  return Array.from(origins);
}

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, health checks, curl)
    if (!origin) return callback(null, true);
    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.some((allowed) => allowed.replace(/\/$/, "") === normalizedOrigin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

**Production Requirements:**
- `FRONTEND_ORIGIN` must be the **exact** Vercel deployment URL (e.g., `https://pumpsquare.vercel.app`)
- `FRONTEND_ORIGINS` (optional) can contain additional comma-separated origins for preview deployments
- **No wildcard origins** with credentials (`origin: "*"` is forbidden)
- Must match exactly including protocol (https) and no trailing slash
- Trailing slashes are normalized for comparison

---

## 9. SUPABASE PRODUCTION REQUIREMENTS

### Database
- Project must have all migrations applied:
  - Core schema: `frontend/lib/db/schema.sql` (includes all technical tables: `product_review_tabs`, `product_review_features`, `product_performance_columns`, `product_performance_rows`, `product_performance_cells`, `product_materials`, `product_explanation_paragraphs`)
  - Dynamic tabs: `frontend/migration-dynamic-review-tabs.sql`
  - Category seed: run `npm run db:seed:categories` (or apply manually)

### Row Level Security (RLS)
All tables have RLS enabled with policies:
- **Public read**: Only published products (`status = 'published' AND deleted_at IS NULL`)
- **Admin write**: Service role only (no anon/authenticated write access)
- **Admin tables**: Service role only (no public access)

### Storage
- **Bucket**: `product-uploads` (private by default)
- **Upload path pattern**: `products/{productId}/images/{slot}-{uuid}.{ext}` or `products/{productId}/documents/{slot}-{uuid}.pdf`
- **Public access**: Only via signed URLs or backend proxy (`/api/files/...`)
- **MIME types**: JPEG, PNG, WebP (max 5 MB); PDF (max 10 MB)

### Keys
- **Anon key**: Used in frontend (public)
- **Service role key**: Used in backend only (never exposed to browser)

---

## 10. DATABASE MIGRATION INSTRUCTIONS

### Order of Execution
Run migrations in Supabase SQL Editor in this order:

1. **Core schema** (`frontend/lib/db/schema.sql`)
   - Creates: `admin_users`, `admin_sessions`, `admin_login_attempts`, `product_categories`, `products`
   - Creates technical tables: `product_review_tabs`, `product_review_features`, `product_performance_columns`, `product_performance_rows`, `product_performance_cells`, `product_materials`, `product_explanation_paragraphs`
   - Enables RLS with base policies

2. **Dynamic tabs migration** (`frontend/migration-dynamic-review-tabs.sql`)
   - Adds: `label`, `is_custom`, `sort_order` columns to `product_review_tabs`
   - Updates sort_order for standard tabs
   - Adds public read RLS policies

3. **Seed categories** (run once)
   ```bash
   cd frontend && npm run db:seed:categories
   ```
   Or apply manually from `frontend/lib/db/category-seed.ts`

### Verification
After migrations, verify in Supabase Dashboard → Table Editor:
- All 12 tables exist
- RLS enabled on all tables
- Policies present
- Indexes created

---

## 11. STORAGE VERIFICATION

### Bucket Configuration
In Supabase Dashboard → Storage:
- **Bucket name**: `product-uploads`
- **Public**: No (private bucket)
- **File size limit**: 10 MB (enforced by backend)
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

### Path Structure
```
product-uploads/
└── products/
    └── {product-uuid}/
        ├── images/
        │   ├── main-{uuid}.{ext}
        │   └── gallery-{uuid}.{ext}
        └── documents/
            ├── catalogue-{uuid}.pdf
            └── datasheet-{uuid}.pdf
```

### Test Checklist
- [ ] Upload main product image → appears in product editor
- [ ] Upload gallery images → multiple images display
- [ ] Upload catalogue PDF → download button appears on public page
- [ ] Upload datasheet PDF → download button appears on public page
- [ ] Replace PDF → old file removed, new file linked
- [ ] Remove PDF → download button disappears
- [ ] Draft product files → not accessible via public proxy

---

## 12. ADMIN LOGIN VERIFICATION

### Test Checklist
- [ ] Navigate to `/admin/login` on production Vercel URL
- [ ] Enter valid admin credentials
- [ ] Session cookie set (`psq_admin_session`, HttpOnly, Secure, SameSite=Lax)
- [ ] Redirect to `/admin` dashboard
- [ ] Refresh page → session persists
- [ ] Access `/admin/products` → loads product list
- [ ] Access `/admin/products/new` → create product
- [ ] Access `/admin/products/{id}/edit` → edit product
- [ ] Publish product → appears on public `/products`
- [ ] Logout → cookie cleared, redirect to login
- [ ] Expired session → redirected to login

### Cross-Origin Cookie Notes
- Frontend (Vercel) → Backend (Render) communication uses Next.js API route proxies
- Session cookie set by backend, forwarded through frontend proxy routes
- Cookie settings: `secure: true` (production), `sameSite: "lax"`, `httpOnly: true`
- Works across `vercel.app` → `onrender.com` with proper CORS

---

## 13. PDF DOWNLOAD VERIFICATION

### Test Checklist
- [ ] Published product with catalogue → "Download Catalogue" button visible
- [ ] Published product with datasheet → "Technical Datasheet" button visible
- [ ] Draft product → no download buttons
- [ ] Catalogue click → opens PDF in new tab (Supabase public URL)
- [ ] Datasheet click → downloads via `/api/files/...` proxy (access-checked)
- [ ] Direct `/api/files/...` URL without published product → 404
- [ ] PDF filename → matches uploaded name

---

## 14. PRODUCTION SMOKE TESTS

### Public Website
- [ ] Homepage loads (`/`)
- [ ] About page loads (`/about`)
- [ ] Industries page loads (`/industries`)
- [ ] Products catalogue loads (`/products`)
- [ ] Category filtering works
- [ ] Search works
- [ ] Individual product pages load (`/products/{slug}`)
- [ ] Product images display
- [ ] Technical tabs render with content
- [ ] Automatic tab rotation works (pause on hover)
- [ ] Performance tables display
- [ ] Materials of Construction display
- [ ] Technical paragraphs display
- [ ] Catalogue PDF download works
- [ ] Datasheet PDF download works
- [ ] Navigation links work
- [ ] Request a Quote form submits (shows "not configured" message)
- [ ] Chatbot widget opens and sends message
- [ ] WhatsApp button links correctly
- [ ] Footer links work

### Admin Dashboard
- [ ] Admin login works
- [ ] Session persists after refresh
- [ ] Protected routes require auth
- [ ] Product creation works (draft + publish)
- [ ] Product editing works
- [ ] Product publishing/unpublishing works
- [ ] Custom technical tabs save correctly
- [ ] Tab names preserve capitalization
- [ ] Tab ordering works
- [ ] Category selection works
- [ ] Product image upload works
- [ ] Additional image upload works
- [ ] Catalogue PDF upload works
- [ ] Datasheet PDF upload works
- [ ] Replace PDF works
- [ ] Remove PDF works
- [ ] Published products appear publicly
- [ ] Unpublished products hidden
- [ ] Logout works

### Backend API
- [ ] Health endpoint: `GET /api/health` → 200 OK
- [ ] Chat endpoint: `POST /api/chat` → responds
- [ ] Welcome endpoint: `GET /api/welcome` → responds
- [ ] Public products: `GET /api/products` → returns published
- [ ] Public product: `GET /api/products/{slug}` → returns detail
- [ ] Categories: `GET /api/categories` → returns active
- [ ] Files: `GET /api/files/...` → serves PDFs
- [ ] Admin auth: login/logout/me/session endpoints
- [ ] Admin products CRUD
- [ ] Admin categories CRUD
- [ ] Admin users management (superadmin only)
- [ ] CORS headers present on all responses
- [ ] Rate limiting active

---

## 15. ROLLBACK INSTRUCTIONS

### Vercel (Frontend)
1. Go to Vercel Dashboard → Deployments
2. Click "..." on previous working deployment
3. Select "Promote to Production"
4. Or: `vercel rollback` from CLI

### Render (Backend)
1. Go to Render Dashboard → Service → Deploys
2. Click "Rollback" on previous successful deploy
3. Or: Trigger manual deploy from previous commit

### Supabase (Database)
1. **Do not** rollback database automatically
2. If migration failed: restore from Supabase Point-in-Time Recovery
3. Go to Supabase Dashboard → Database → Backups
4. Select restore point before migration
5. **Warning**: This restores ALL data to that point

### Emergency Contacts
- Vercel: Check status at `vercel-status.com`
- Render: Check status at `status.render.com`
- Supabase: Check status at `status.supabase.com`

---

## 16. MONITORING & ALERTING

### Health Endpoints
- **Frontend**: Vercel provides built-in analytics
- **Backend**: `GET /api/health` (used by Render health checks)
- **Database**: Supabase Dashboard → Database → Health

### Key Metrics to Watch
- API response times (p95 < 500ms)
- Error rates (< 1%)
- Database connection pool usage
- Storage usage (Supabase Storage)
- Chatbot API latency (Sarvam)

### Logging
- Backend: Console logs (Render captures stdout/stderr)
- Frontend: Vercel Function Logs
- Supabase: Dashboard → Logs

---

## 17. FILES CREATED/UPDATED FOR DEPLOYMENT

| File | Purpose |
|------|---------|
| `frontend/.env.example` | Frontend environment variable template |
| `backend/.env.example` | Backend environment variable template |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | This document |

### Code Changes (No Functional Changes)
- Removed `localhost` fallback from `frontend/next.config.ts` (BACKEND_URL now required, no default)
- Fixed `/api/admin/auth/me` route to use `headers()` from `next/headers` for proper dynamic rendering
- Added `JWT_SECRET` to backend env validation (required, min 32 characters)
- Removed unsafe `dev-secret-change-in-production` JWT_SECRET fallback
- Updated CORS to support multiple origins via `FRONTEND_ORIGINS` (comma-separated) with trailing-slash normalization
- Added `product_explanation_paragraphs` table to core schema (`frontend/lib/db/schema.sql`) with RLS and policies
- API proxy routes validate `BACKEND_URL` exists
- TypeScript/ESLint errors fixed
- Production build passes

---

## 18. CHECKLIST SUMMARY

### Pre-Deployment
- [ ] Supabase project created and accessible
- [ ] All migrations applied in order
- [ ] Categories seeded
- [ ] Admin user created (`npm run admin:create`)
- [ ] Storage bucket `product-uploads` exists
- [ ] Vercel project connected to repo
- [ ] Render service connected to repo
- [ ] All environment variables set in both platforms

### Deployment
- [ ] Frontend deploys successfully on Vercel
- [ ] Backend deploys successfully on Render
- [ ] Health checks pass
- [ ] CORS works (admin login successful)

### Post-Deployment
- [ ] All smoke tests pass (Section 14)
- [ ] Admin can create/edit/publish products
- [ ] PDF uploads/downloads work
- [ ] Chatbot responds
- [ ] WhatsApp link works
- [ ] Sitemap/robots.txt accessible
- [ ] Analytics configured (optional)

---

## 19. SUPPORT

For deployment issues:
1. Check platform status pages
2. Review build/deploy logs
3. Verify environment variables
4. Check Supabase connection/RLS policies
5. Review this guide for missed steps

**Production Domain Configuration:**
- Frontend: Set custom domain in Vercel → Settings → Domains
- Backend: Update `FRONTEND_ORIGIN` in Render when custom domain is live
- Supabase: No changes needed (uses project URL)

---

*End of Deployment Guide*