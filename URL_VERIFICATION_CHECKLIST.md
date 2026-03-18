# URL & Variable Verification: GoDaddy ↔ Vercel ↔ Railway

Use this checklist to verify all URLs and environment variables are correctly configured.

---

## Quick Fix: "Preview URL Points Somewhere Different Than Custom Domain"

**Cause:** Vercel serves two deployment types. The custom domain (`annotator.perfectpixels.com`) uses **Production**; the `*.vercel.app` URL is a **Preview** deployment. They can have different env vars.

**Fix:** Vercel → Settings → Environment Variables → `VITE_API_URL` must be enabled for **Production AND Preview**. If it's only on Production, preview builds use the broken fallback. Add for both, then redeploy.

---

## Architecture Overview

```
User → annotator.perfectpixels.com (GoDaddy DNS)
         ↓ CNAME
       Vercel (serves React frontend)
         ├─ VITE_API_URL → Railway (API, socket)
         └─ /api/video-proxy → Railway (video proxy) [same-origin, fixes Safari/Firefox]
         ↓ AWS credentials
       S3 (video storage)
```

**Why video proxy through Vercel?** Safari and Firefox can fail on cross-origin video (thumbnails, canvas screenshot). Proxying video through the same domain (`annotator.perfectpixels.com/api/video-proxy`) makes it same-origin, so thumbnails and screenshots work. The `vercel.json` rewrite must point to your Railway URL.

---

## 1. GoDaddy DNS (perfectpixels.com)

| Record Type | Name | Value | Notes |
|-------------|------|-------|-------|
| **CNAME** | `annotator` | `cname.vercel-dns.com` | Points subdomain to Vercel |

**Remove if present:**
- A record: `annotator` → `35.89.195.188` (old EC2)
- Any other `annotator` record that conflicts

**Verify:**
```bash
dig annotator.perfectpixels.com +short
# Should return: cname.vercel-dns.com. and/or 76.76.21.x
```

---

## 2. Vercel (Frontend)

### Why Two URLs Show Different Content

| URL | Type | Points To |
|-----|------|-----------|
| `annotator.perfectpixels.com` | **Production** | Deployment from `main` branch |
| `video-annotator-*-perfectpixels-projects.vercel.app` | **Preview** | Deployment from a specific branch/commit |

They serve different deployments. If they also behave differently (e.g. one works, one doesn't), the cause is usually **environment variables**.

### Environment Variables — CRITICAL

| Variable | Value | Environments |
|----------|-------|---------------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-APP.up.railway.app` | **Production AND Preview** |

**Fix for "preview URL points somewhere different":**

1. Vercel → Project → **Settings** → **Environment Variables**
2. Find `VITE_API_URL`
3. Ensure it's enabled for **both** Production and Preview (check the toggles)
4. If it was only set for Production, add it for Preview too (same value)
5. **Redeploy** both: Production (main) and the preview branch

Without `VITE_API_URL` for Preview, preview builds use the fallback `https://your-app.up.railway.app` (invalid), so API calls fail or go to the wrong place.

### Domains
- [ ] **Custom domain added:** `annotator.perfectpixels.com`
- [ ] Status shows "Valid" (not "Pending" or "Error")

**Important:** 
- No trailing slash on `VITE_API_URL`
- Redeploy after changing (Vite env vars are baked in at build time)

**Verify in browser:** Open DevTools → Network → trigger an API call → request should go to Railway URL, not Vercel.

---

## 3. Railway (Backend)

### Environment Variables
| Variable | Value | Notes |
|----------|-------|-------|
| `CORS_ORIGIN` | `https://annotator.perfectpixels.com,https://YOUR-VERCEL-URL.vercel.app` | Comma-separated, no spaces |
| `AWS_REGION` | `us-east-1` | |
| `AWS_S3_BUCKET` | `video-annotator-public` | Or your bucket name |
| `AWS_ACCESS_KEY_ID` | *(your key)* | |
| `AWS_SECRET_ACCESS_KEY` | *(your secret)* | |
| `NODE_ENV` | `production` | |
| `USE_CLOUDFRONT` | `false` | Optional |

**CORS_ORIGIN must include:**
1. `https://annotator.perfectpixels.com` (custom domain)
2. Your Vercel URL(s):
   - Production: `https://video-annotator.vercel.app` (if you have one)
   - Preview: `https://video-annotator-*.vercel.app` — **preview URLs change each deploy**, so either:
     - Add the current preview URL when testing, or
     - Use a wildcard if Railway supports it (check docs), or
     - Rely on custom domain for production

**Example CORS_ORIGIN:**
```
https://annotator.perfectpixels.com,https://video-annotator-7t5ehykb7-perfectpixels-projects.vercel.app
```

---

## 4. Quick Verification Commands

```bash
# 1. DNS points to Vercel
dig annotator.perfectpixels.com +short

# 2. Custom domain loads (after DNS propagates)
curl -I https://annotator.perfectpixels.com

# 3. Railway API is up (replace with your Railway URL)
curl https://YOUR-RAILWAY-URL.up.railway.app/api/current-user

# 4. CORS: from browser console on your app
fetch('https://YOUR-RAILWAY-URL.up.railway.app/api/current-user', {credentials: 'include'})
  .then(r => r.json()).then(console.log)
```

---

## 5. Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| CORS error in console | Railway `CORS_ORIGIN` doesn't include your frontend URL | Add your Vercel URL and/or custom domain to CORS_ORIGIN |
| "Failed to fetch" / net::ERR | Wrong or missing `VITE_API_URL` in Vercel | Set `VITE_API_URL` = Railway URL, redeploy |
| Domain shows old site or 404 | GoDaddy DNS not updated or not propagated | CNAME `annotator` → `cname.vercel-dns.com`, wait 5–60 min |
| Videos don't load | S3 bucket or proxy URL wrong | Check Railway `AWS_S3_BUCKET`, `RAILWAY_PUBLIC_DOMAIN` |
| Preview deploy works, custom domain doesn't | Domain not in Vercel, or DNS wrong | Add domain in Vercel Domains, fix GoDaddy CNAME |
| Video thumbnails show placeholder (camera icon) | CORS_ORIGIN missing frontend URL | Add frontend URL to Railway CORS_ORIGIN. See `VIDEO_CONNECTION_TROUBLESHOOTING.md` |
| Thumbnails/Screenshot work in Firefox but not Safari | Cross-origin video + Safari strict CORS | Ensure `vercel.json` rewrites `/api/video-proxy` to your Railway URL. Video loads same-origin. |

---

## 6. Your Current URLs (fill in)

| Purpose | URL |
|---------|-----|
| Custom domain (production) | `https://annotator.perfectpixels.com` |
| Vercel (preview/production) | `https://video-annotator-7t5ehykb7-perfectpixels-projects.vercel.app` |
| Railway backend | `https://________________.up.railway.app` |

**Action:** Copy your Railway URL from Railway dashboard → Variables or Deployments, then ensure:
- Vercel `VITE_API_URL` = that Railway URL
- Railway `CORS_ORIGIN` includes both `https://annotator.perfectpixels.com` and your Vercel URL
- **vercel.json** rewrite: `/api/video-proxy` destination = `https://YOUR-RAILWAY-URL.up.railway.app/api/video-proxy` (must match your Railway URL)
