# Public Video Annotator — Deployment Guide

## Architecture
- **Frontend**: Vercel (React/Vite)
- **Backend**: Railway (Node.js/Express/Socket.IO)
- **Storage**: AWS S3 (personal account 582234715800)
- **AI**: AWS Transcribe + Bedrock (Claude Sonnet 4)

## 1. AWS Setup (Personal Account) ✅ DONE

S3 bucket `video-annotator-public` created in `us-east-1` with:
- CORS enabled (all origins)
- Public access blocked
- `perfectpixels-bot` IAM policy updated to v6 with S3 read/write/delete + Transcribe permissions

## 2. Railway Backend

1. Push to GitHub (use `.gitignore.github` as `.gitignore`)
2. Connect repo to Railway
3. Set root directory to `server`
4. Set start command: `node index.public.js`
5. Add environment variables (see `server/.env.railway`):
   - `AWS_REGION=us-east-1`
   - `AWS_ACCESS_KEY_ID=<your-access-key>`
   - `AWS_SECRET_ACCESS_KEY=<your secret>`
   - `AWS_S3_BUCKET=video-annotator-public`
   - `PORT=3001` (Railway assigns its own, but fallback)
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://<your-app>.vercel.app`
   - `USE_CLOUDFRONT=false`

## 3. Vercel Frontend

1. Connect same repo to Vercel
2. Root directory: `.` (project root)
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
   - `VITE_API_URL=https://<your-app>.up.railway.app`

## 4. Config Switch

Before deploying, update `src/config.ts` to use the Railway config:
```typescript
export { API_BASE_URL, SOCKET_URL } from './config.railway';
```

Or better: Vercel injects `VITE_API_URL` at build time, so `config.railway.ts`
reads it from `import.meta.env.VITE_API_URL` automatically.

## 5. GitHub Setup

```bash
# From your project root
cp .gitignore.github .gitignore
cp README.github.md README.md

# Init fresh repo (don't push Amazon internal history)
git init
git add .
git commit -m "Initial commit — Video Annotator public version"
git remote add origin git@github.com:perfectedpixels/video-annotator.git
git push -u origin main
```

## Key Differences from Amazon Internal Version

| Feature | Amazon (EC2) | Public (Railway) |
|---|---|---|
| Entry point | `server/index.js` | `server/index.public.js` |
| Auth | Nginx basic auth + workspace ACL | None (public) |
| Frontend config | `config.production.ts` | `config.railway.ts` |
| S3 bucket | `your-video-annotation-bucket` | `video-annotator-public` |
| AWS account | `427791004700` | `582234715800` |
| Domain | `video-annotator.jllevine.people.aws.dev` | `*.vercel.app` / custom |
