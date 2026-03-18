# Video Connections Stopped Working — Diagnostic Guide

When thumbnails show the placeholder (camera icon) or videos fail to play, follow these steps.

---

## Step 1: Check CORS Match (Most Common Cause)

The video proxy **only** sends CORS headers when the request `Origin` matches `CORS_ORIGIN`. If it doesn't match, the browser blocks the video.

**1. Get your frontend origin**

When you use the app, the origin is one of:
- `https://annotator.perfectpixels.com`
- `https://video-annotator-xxxx.vercel.app` (preview URL)

**2. Call the debug endpoint from your app's origin**

Open the app in your browser, then in the console run:

```javascript
fetch('https://YOUR-RAILWAY-URL.up.railway.app/api/debug', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('CORS origins:', d.corsOrigins, '| Request origin:', d.requestOrigin))
```

Or visit (replace with your Railway URL):
```
https://YOUR-RAILWAY-URL.up.railway.app/api/debug
```
in a new tab **while on your app's domain** (so the Referer/Origin is correct), or use curl:

```bash
curl -H "Origin: https://annotator.perfectpixels.com" https://YOUR-RAILWAY-URL.up.railway.app/api/debug
```

**3. Verify the match**

- `corsOrigins` = what Railway has in `CORS_ORIGIN` (split by comma)
- `requestOrigin` = what the browser sends

**They must match exactly** (no trailing slash, same protocol). Example:
- ✅ `https://annotator.perfectpixels.com` in both
- ❌ `https://annotator.perfectpixels.com/` (trailing slash)
- ❌ `http://` vs `https://`

**4. Fix Railway CORS_ORIGIN**

Railway → Variables → `CORS_ORIGIN`:

```
https://annotator.perfectpixels.com,https://video-annotator-xxxx.vercel.app
```

Include every URL where users access the app. No spaces after commas. Redeploy.

---

## Step 2: Check Video URL Format

**1. Get a video URL from the API**

```bash
curl -s https://YOUR-RAILWAY-URL.up.railway.app/api/videos | jq -r '.videos[0].url'
```

**2. Expected format**

```
https://YOUR-RAILWAY-URL.up.railway.app/api/video-proxy?key=videos%2F1234567890-123456789.mp4
```

If you see a direct S3 URL or `your-app.up.railway.app`, `baseUrl` is wrong. Check:
- `RAILWAY_PUBLIC_DOMAIN` in Railway (often set automatically)
- Or `X-Forwarded-Host` / `X-Forwarded-Proto` from the proxy

---

## Step 3: Test Video Proxy Directly

```bash
# Get a video key from /api/videos response, then:
curl -I -H "Origin: https://annotator.perfectpixels.com" \
  "https://YOUR-RAILWAY-URL.up.railway.app/api/video-proxy?key=videos%2FYOUR-VIDEO-KEY.mp4"
```

**Check response:**
- `Access-Control-Allow-Origin: https://annotator.perfectpixels.com` — CORS OK
- `200` or `206` — proxy OK
- `404` — key wrong or S3 object missing
- No `Access-Control-Allow-Origin` — CORS_ORIGIN doesn't include your origin

---

## Step 4: Browser Console

Open DevTools → Network. Load the app and watch for:

- **Red (failed) requests** to `/api/video-proxy` → CORS or 404
- **CORS error** in Console → Origin not in CORS_ORIGIN
- **403 / 404** → S3 or proxy issue

---

## Code Change: crossOrigin Removed

`crossOrigin="anonymous"` was removed from video elements. It required the server to send CORS headers; if `CORS_ORIGIN` didn't match the frontend URL, the browser blocked the video. Without it, the browser may allow the video to load in more cases. If videos still fail, the fix is to ensure `CORS_ORIGIN` includes your frontend URL.

---

## Quick Fixes

| Symptom | Fix |
|---------|-----|
| CORS error in console | Add your frontend URL to Railway `CORS_ORIGIN`, redeploy |
| 404 on video-proxy | Wrong key or video missing in S3 |
| Videos work in one browser, not another | Often CORS; ensure all access URLs are in CORS_ORIGIN |
| Worked before, stopped after deploy | Vercel preview URL changed; add new URL to CORS_ORIGIN |

---

## Railway Variables Checklist

- [ ] `CORS_ORIGIN` includes `https://annotator.perfectpixels.com`
- [ ] `CORS_ORIGIN` includes your Vercel URL(s) if you use them
- [ ] `AWS_S3_BUCKET` = `video-annotator-public`
- [ ] `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are for account 582234715800
