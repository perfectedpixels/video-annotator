# Video Annotator — Current Project State

*Last updated from codebase exploration*

---

## Overview

**Video Annotator** — Collaborative video annotation tool with real-time comments, cloud storage (S3), transcription, AI summaries, and Figma integration.

**Package name:** `vibe-coding-interest` (in package.json)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind, Socket.io client |
| Backend | Node.js, Express, Socket.io |
| Storage | AWS S3 (with optional CloudFront for signed URLs) |
| Services | AWS Transcribe, Bedrock (AI summary), Figma API |

---

## Deployment Modes

### 1. Public (Railway + Vercel) — **Current default**
- **Backend:** `server/index.public.js` on Railway
- **Frontend:** Vercel (uses `config.railway.ts` via `config.ts`)
- **Config:** `VITE_API_URL` in Vercel → Railway URL; `CORS_ORIGIN` in Railway
- **Domain:** `annotator.perfectpixels.com` (GoDaddy CNAME → Vercel)
- **Repo:** `github.com/perfectedpixels/video-annotator`

### 2. Amazon Internal (EC2)
- **Backend:** `server/index.js` (workspace access, auth headers)
- **Frontend:** Served from same EC2 or separate
- **Docs:** QUICK_DEPLOY.md, NEXT_STEPS.md (CloudFront setup)

### 3. Personal (EC2 + Nginx)
- **Config:** `config.personal.ts`, `server/.env.personal`
- **Domain:** `annotator.perfectpixels.com` (previously)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/config.ts` | Re-exports `config.railway` (public deploy) |
| `src/config.railway.ts` | `VITE_API_URL` or fallback Railway URL |
| `server/index.public.js` | Public backend (Railway) — no auth, CORS for Vercel |
| `server/index.js` | Amazon internal — workspace access, auth |
| `server/s3-service.js` | S3 + CloudFront signed URLs, `listVideosFromS3`, proxy |
| `server/data/videos.json` | Persisted video metadata (ephemeral on Railway) |

---

## Recent Features (from git history)

- S3 sync from bucket on startup + `POST /api/sync-videos-from-s3`
- Infer `s3Key` from `filename` for older records
- `Cache-Control: no-store` on `/api/videos`
- Video thumbnails: `#t=0.1` fragment, `preload="auto"`
- Header: Source Sans 3 font, gradient, no icon
- Video proxy through Railway (avoids S3 CORS)

---

## API Endpoints (index.public.js)

- `GET /api/videos` — List videos (rewrites URLs to proxy when baseUrl set)
- `POST /api/upload-video` — Upload to S3
- `GET /api/video-proxy?key=` — Stream video from S3 (Range support)
- `POST /api/sync-videos-from-s3` — Recover videos from S3 into metadata
- `GET /api/annotation-counts` — Comment counts per video
- `GET /api/current-user` — Username (no auth)

---

## Environment Variables

### Railway
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `CORS_ORIGIN` — Comma-separated: custom domain + Vercel URL(s)
- `RAILWAY_PUBLIC_DOMAIN` — Used for video proxy baseUrl
- `USE_CLOUDFRONT`, `CLOUDFRONT_*` — Optional signed URLs

### Vercel
- `VITE_API_URL` — Railway backend URL (set for Production **and** Preview)

---

## Known Issues / Notes

1. **Thumbnails:** Use `#t=0.1` on video URL; `preload="metadata"` was insufficient for first frame
2. **Preview vs Production:** Vercel preview URLs need `VITE_API_URL` in Preview env too
3. **Railway data:** `server/data/` is ephemeral unless a volume is used; S3 sync recovers videos
4. **Package name:** `vibe-coding-interest` in package.json (legacy?)

---

## Docs Reference

| Doc | Purpose |
|-----|---------|
| `AWS_IAM_PERMISSIONS.md` | IAM role/user permissions for S3, Transcribe, Bedrock |
| `URL_VERIFICATION_CHECKLIST.md` | GoDaddy ↔ Vercel ↔ Railway URL/config verification |
| `MIGRATION_TO_RAILWAY_VERCEL.md` | EC2 → Railway + Vercel migration |
| `QUICK_DEPLOY.md` | EC2 deployment steps |
| `NEXT_STEPS.md` | CloudFront post-setup |
| `PROTOZOA.md` | Sharing on Amazon Protozoa |
| `TROUBLESHOOTING.md` | Common fixes |
