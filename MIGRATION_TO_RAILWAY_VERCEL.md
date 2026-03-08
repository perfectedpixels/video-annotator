# Migration: EC2 → Railway + Vercel

Migrate Video Annotator from EC2 to Railway (backend) + Vercel (frontend), then shut down EC2.

---

## Prerequisites

- [ ] GitHub account
- [ ] Railway account (railway.app)
- [ ] Vercel account (vercel.com)
- [ ] AWS credentials for S3 bucket `video-annotator-public` (same IAM user as EC2: `video-annotator-app` or `perfectpixels-bot`)

---

## Step 1: Push to GitHub

```bash
cd /Users/jllevine/Dropbox/playground/video_annotator

# Prepare for public repo (uses .gitignore.github, switches config to Railway)
./prepare-github-push.sh

# Add remote and push (create repo at github.com/perfectedpixels/video-annotator first if needed)
git remote add origin git@github.com:perfectedpixels/video-annotator.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `video-annotator` repo
3. **Root Directory**: Set to `server`
4. **Start Command**: `node index.public.js` (or confirm `server/railway.json` is used)
5. Add **Variables** (Settings → Variables):

   | Variable | Value |
   |----------|-------|
   | `AWS_REGION` | `us-east-1` |
   | `AWS_ACCESS_KEY_ID` | *(from your EC2 .env.personal or IAM)* |
   | `AWS_SECRET_ACCESS_KEY` | *(same)* |
   | `AWS_S3_BUCKET` | `video-annotator-public` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | `https://annotator.perfectpixels.com,https://your-app.vercel.app` |
   | `USE_CLOUDFRONT` | `false` |

6. Deploy. Once live, copy your **Railway URL** (e.g. `https://video-annotator-production-xxxx.up.railway.app`)

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Add New → Project
2. Import the same `video-annotator` repo
3. **Root Directory**: Leave as `.` (project root)
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Add **Environment Variable**:
   - `VITE_API_URL` = your Railway URL (e.g. `https://video-annotator-production-xxxx.up.railway.app`)
7. Deploy

8. **Copy your Vercel URL** (e.g. `https://video-annotator-xxxx.vercel.app`)

---

## Step 4: Update Railway CORS

Go back to Railway → Variables and set:

```
CORS_ORIGIN=https://annotator.perfectpixels.com,https://your-actual-vercel-url.vercel.app
```

Redeploy if needed.

---

## Step 5: Add Custom Domain to Vercel

1. In Vercel project → **Settings** → **Domains**
2. Add `annotator.perfectpixels.com`
3. Vercel will show DNS instructions. For GoDaddy, use one of:
   - **CNAME**: `annotator` → `cname.vercel-dns.com`
   - **A record**: `annotator` → `76.76.21.21`

---

## Step 6: Update DNS at GoDaddy

1. Log in to GoDaddy → My Products → DNS for `perfectpixels.com`
2. **Remove or update** the existing A record:
   - Old: `annotator` → `35.89.195.188` (EC2)
   - New: Add **CNAME** `annotator` → `cname.vercel-dns.com`  
     (or A record `annotator` → `76.76.21.21`)

3. Save. DNS propagation can take 5–60 minutes.

---

## Step 7: Verify New Deployment

1. Visit `https://annotator.perfectpixels.com` (after DNS propagates)
2. Upload a test video
3. Confirm playback, annotations, and transcription work

---

## Step 8: Stop EC2 Instance

**Only after verifying the new deployment works.**

1. AWS Console → EC2 → Instances
2. Select instance (IP `35.89.195.188`, us-west-2)
3. **Instance state** → **Stop instance**

To fully terminate (no charges):

- **Instance state** → **Terminate instance**

---

## New URLs Summary

| Purpose | URL |
|---------|-----|
| **Production (custom domain)** | `https://annotator.perfectpixels.com` |
| **Vercel default** | `https://video-annotator-xxxx.vercel.app` |
| **Railway backend** | `https://xxxx.up.railway.app` |

**DNS:** Point `annotator.perfectpixels.com` → Vercel (CNAME `cname.vercel-dns.com` or A `76.76.21.21`).

---

## Rollback (if needed)

If something breaks before you stop EC2:

1. Revert DNS at GoDaddy: `annotator` → `35.89.195.188`
2. EC2 stays running; old deployment is unchanged
