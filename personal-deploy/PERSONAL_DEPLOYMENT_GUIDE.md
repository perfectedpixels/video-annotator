# Personal Video Annotator — Deployment Guide

## Architecture
- **Frontend**: React app served by Nginx
- **Backend**: Node.js + Socket.IO (index.public.js — no Amazon auth)
- **Storage**: S3 on personal AWS account
- **Domain**: annotator.perfectpixels.com
- **SSL**: Let's Encrypt (free, auto-renewing)
- **Cost**: ~$8-12/month (t3.micro EC2 + S3 storage)

## Step 1: Launch EC2 Instance

1. Log into your personal AWS Console
2. Go to EC2 → Launch Instance
3. Settings:
   - **Name**: video-annotator-personal
   - **AMI**: Amazon Linux 2023
   - **Instance type**: t3.micro ($8.35/mo) or t4g.micro ($6.05/mo ARM)
   - **Key pair**: Create new or use existing
   - **Security group**: Create new with:
     - SSH (22) from your IP
     - HTTP (80) from anywhere (needed for Let's Encrypt)
     - HTTPS (443) from anywhere
   - **Storage**: 20GB gp3 (free tier eligible)
4. Launch and note the public IP

## Step 2: Set Up AWS Resources (S3 + IAM)

From your local machine with AWS CLI configured for your personal account:

```bash
chmod +x personal-deploy/setup-aws-resources.sh
./personal-deploy/setup-aws-resources.sh
```

Save the access keys it outputs — you'll need them for the .env file.

## Step 3: Point DNS

In GoDaddy DNS management for perfectpixels.com:
- Add **A record**:
  - Name: `annotator`
  - Value: `<your-ec2-public-ip>`
  - TTL: 600

Wait 5-15 minutes for propagation. Test with:
```bash
dig annotator.perfectpixels.com
```

## Step 4: Set Up EC2

```bash
# SSH into your instance
ssh -i ~/.ssh/your-key.pem ec2-user@<your-ec2-ip>

# Download and run setup script (or scp it first)
# Option A: Copy from local
# scp -i ~/.ssh/your-key.pem personal-deploy/setup-ec2.sh ec2-user@<ip>:~/

chmod +x setup-ec2.sh
./setup-ec2.sh
```

## Step 5: Get SSL Certificate

After DNS is pointing to your EC2:

```bash
# On the EC2 instance
sudo certbot --nginx -d annotator.perfectpixels.com \
  --non-interactive --agree-tos -m your-email@example.com
```

## Step 6: Install PM2

```bash
# On the EC2 instance
sudo npm install -g pm2
pm2 startup  # Follow the instructions it prints
```

## Step 7: Update .env and Deploy

On your local machine:
1. Edit `server/.env.personal` with your AWS access keys
2. Update `personal-deploy/deploy-personal.sh`:
   - Set `EC2_IP` to your instance IP
   - Set `KEY_PATH` to your SSH key path

```bash
chmod +x personal-deploy/deploy-personal.sh
./personal-deploy/deploy-personal.sh
```

## Step 8: Verify

Visit https://annotator.perfectpixels.com

## Updating

Just run the deploy script again:
```bash
./personal-deploy/deploy-personal.sh
```

## Cost Breakdown

| Resource | Monthly Cost |
|----------|-------------|
| EC2 t3.micro | ~$8.35 |
| S3 (50GB videos) | ~$1.15 |
| Data transfer (10GB) | ~$0.90 |
| **Total** | **~$10.40/mo** |

Tips to save:
- Use t4g.micro (ARM) for ~$6/mo instead of t3.micro
- Reserve instance for 1 year = ~40% savings
- Stop instance when not in use (you only pay for EBS storage when stopped)
