---
title: Personal AWS Deployment Status
inclusion: manual
tags: [deployment, personal, aws, ec2, s3]
---

# Personal AWS Deployment — Video Annotator

## Status: LIVE ✅

Public URL: https://annotator.perfectpixels.com

## Architecture

| Component | Service | Region | Details |
|-----------|---------|--------|---------|
| Frontend | Nginx on EC2 | us-west-2 | React app served from `/home/ec2-user/video-annotator/dist` |
| Backend | Node.js on EC2 | us-west-2 | `index.public.js` (no Amazon auth), port 3002, managed by PM2 |
| Video Storage | S3 | us-east-1 | Bucket: `video-annotator-public` |
| SSL | Let's Encrypt | — | Auto-renewing, cert at `/etc/letsencrypt/live/annotator.perfectpixels.com/` |
| DNS | GoDaddy | — | A record: `annotator.perfectpixels.com` → `35.89.195.188` |

## EC2 Instance

- IP: `35.89.195.188`
- Instance type: t3.micro (~$8.35/mo)
- AMI: Amazon Linux 2023
- Region: us-west-2 (Oregon)
- SSH key: `video-annotator-personal.pem` (in project root)
- SSH: `ssh -i video-annotator-personal.pem ec2-user@35.89.195.188`
- Security group: `video-annotator-personal-sg`
  - Port 22: SSH (your IP only)
  - Port 80: HTTP (anywhere — redirects to HTTPS, needed for Let's Encrypt)
  - Port 443: HTTPS (anywhere)

## S3 Bucket

- Name: `video-annotator-public`
- Region: us-east-1 (N. Virginia)
- Public access: blocked (private, presigned URLs for access)
- IAM user: `video-annotator-app` (S3 access only via `AmazonS3FullAccess`)
- Access key: `AKIAYPD7EW2MAI4DWXMG`

## What's Different from Amazon Internal Version

| Feature | Amazon (internal) | Personal |
|---------|-------------------|----------|
| Server entry point | `server/index.js` | `server/index.public.js` |
| Authentication | Nginx basic auth + workspace access control | None (open access) |
| Workspace filtering | Yes (aws, hodgkin, demo, uw) | No |
| X-Forwarded-User header | Yes | No |
| Transcription (AWS Transcribe) | Enabled | Disabled (`DISABLE_TRANSCRIPTION=true`) |
| AI Summaries (AWS Bedrock) | Enabled | Disabled (`DISABLE_AI_SUMMARY=true`) |
| CloudFront signed URLs | Yes (distribution E2BQXEPK57V6AW) | No (S3 presigned URLs, 1-hour expiry) |
| Domain | video-annotator.jllevine.people.aws.dev | annotator.perfectpixels.com |
| Frontend config | `src/config.production.ts` | `src/config.personal.ts` |
| Server env | `server/.env` (on Amazon EC2) | `server/.env.personal` |

## Key Files

- `src/config.personal.ts` — Frontend config pointing to personal domain
- `server/.env.personal` — Server env with personal AWS credentials
- `server/index.public.js` — Stripped-down server (no Amazon auth/workspace controls)
- `personal-deploy/deploy-personal.sh` — Deploy script (build + upload + restart)
- `personal-deploy/setup-ec2.sh` — EC2 initial setup script
- `personal-deploy/setup-aws-resources.sh` — S3 bucket + IAM user creation
- `personal-deploy/nginx-personal.conf` — Nginx config for personal domain
- `personal-deploy/PERSONAL_DEPLOYMENT_GUIDE.md` — Full step-by-step guide

## Deploying Updates

From the project root on your local machine:

```bash
# 1. Switch frontend config to personal
# Edit src/config.ts → import from './config.personal'

# 2. Build
npm run build

# 3. Switch config back to production (Amazon)
# Edit src/config.ts → import from './config.production'

# 4. Package and upload
tar czf /tmp/personal-deploy.tar.gz dist/ server/index.public.js server/s3-service.js server/transcribe-service.js server/ai-summary-service.js server/package.json
scp -i video-annotator-personal.pem /tmp/personal-deploy.tar.gz ec2-user@35.89.195.188:/tmp/

# 5. Deploy on EC2
ssh -i video-annotator-personal.pem ec2-user@35.89.195.188
cd /home/ec2-user/video-annotator
tar xzf /tmp/personal-deploy.tar.gz
cd server && npm install --production
pm2 restart video-annotator
```

Or use the automated script: `./personal-deploy/deploy-personal.sh`

## Server Management

```bash
# SSH in
ssh -i video-annotator-personal.pem ec2-user@35.89.195.188

# Check server status
pm2 list

# View logs
pm2 logs video-annotator --lines 50

# Restart server
pm2 restart video-annotator

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| EC2 t3.micro | ~$8.35 |
| S3 storage (50GB) | ~$1.15 |
| S3 data transfer (10GB) | ~$0.90 |
| **Total** | **~$10.40/mo** |

## Security Notes

- Root AWS access keys should be deleted (use IAM user keys only)
- IAM user `video-annotator-app` has `AmazonS3FullAccess` — can be tightened to bucket-specific policy later
- No authentication on the app — anyone with the URL can access it
- S3 bucket is private; videos accessed via presigned URLs (1-hour expiry)
- SSL cert auto-renews via cron (`/etc/cron.d/certbot-renew`)

## Completed Steps

1. ✅ Launched EC2 t3.micro in us-west-2
2. ✅ Installed Node.js 20, Nginx, PM2, certbot
3. ✅ Pointed `annotator.perfectpixels.com` DNS (GoDaddy A record)
4. ✅ Obtained Let's Encrypt SSL certificate
5. ✅ Configured Nginx with HTTPS, rate limiting, WebSocket proxy
6. ✅ Created S3 bucket `video-annotator-public` in us-east-1
7. ✅ Created IAM user `video-annotator-app` with S3 permissions
8. ✅ Built frontend with personal config and deployed
9. ✅ Deployed `index.public.js` backend (no Amazon auth)
10. ✅ Configured PM2 for process management and auto-restart on boot
11. ✅ Verified uploads working (S3) and video playback functional
