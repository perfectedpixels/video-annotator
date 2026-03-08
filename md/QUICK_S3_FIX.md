# Quick S3 CORS Fix

## The Problem
Your bucket name is still set to `your-video-annotation-bucket` (a placeholder) and CORS is not configured, causing videos to fail loading.

## Quick Fix (Run on EC2 Instance)

SSH into your EC2 instance and run these commands:

```bash
# SSH into EC2
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175

# Navigate to app directory
cd ~/video-annotator

# Step 1: Create a new S3 bucket with unique name
BUCKET_NAME="video-annotator-jllevine-$(date +%s)"
aws s3 mb s3://${BUCKET_NAME} --region us-east-1

# Step 2: Apply CORS configuration
cat > /tmp/cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket ${BUCKET_NAME} \
  --cors-configuration file:///tmp/cors-config.json \
  --region us-east-1

# Step 3: Update .env file with new bucket name
cd ~/video-annotator/server
sed -i "s/AWS_S3_BUCKET=.*/AWS_S3_BUCKET=${BUCKET_NAME}/" .env

# Step 4: Verify the change
grep AWS_S3_BUCKET .env

# Step 5: Restart the server
pm2 restart video-annotator

# Step 6: Check logs
pm2 logs video-annotator --lines 20
```

## What to Look For

After restarting, you should see in the logs:
```
✓ Storage mode: S3
✓ S3 Bucket: video-annotator-jllevine-1234567890
✓ Transcription: Enabled
```

## Test It

1. Go to your app: http://3.81.247.175:3001
2. Hard refresh: Cmd+Shift+R
3. Upload a new video
4. Video should play without CORS errors
5. Check browser console - no CORS errors

## Alternative: Use Existing Bucket

If you already have an S3 bucket you want to use:

```bash
# SSH into EC2
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175

# Set your bucket name
BUCKET_NAME="your-existing-bucket-name"

# Apply CORS
cat > /tmp/cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket ${BUCKET_NAME} \
  --cors-configuration file:///tmp/cors-config.json \
  --region us-east-1

# Update .env
cd ~/video-annotator/server
sed -i "s/AWS_S3_BUCKET=.*/AWS_S3_BUCKET=${BUCKET_NAME}/" .env

# Restart
pm2 restart video-annotator
```

## Verify CORS is Applied

```bash
# Check CORS configuration
aws s3api get-bucket-cors --bucket ${BUCKET_NAME} --region us-east-1
```

Should return:
```json
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

## Troubleshooting

### "Access Denied" when creating bucket
Your EC2 IAM role needs `s3:CreateBucket` permission. Either:
1. Add the permission to the IAM role, or
2. Use an existing bucket instead

### "Access Denied" when applying CORS
Your EC2 IAM role needs `s3:PutBucketCORS` permission. Add this to the IAM policy:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:CreateBucket",
    "s3:PutBucketCORS",
    "s3:GetBucketCORS"
  ],
  "Resource": "arn:aws:s3:::video-annotator-*"
}
```

### Videos still don't load
1. Check server logs: `pm2 logs video-annotator`
2. Verify bucket name in .env: `cat ~/video-annotator/server/.env | grep AWS_S3_BUCKET`
3. Hard refresh browser: Cmd+Shift+R
4. Upload a NEW video (old videos may have expired URLs)

## Why This Fixes It

1. **Real bucket name**: Replaces placeholder with actual S3 bucket
2. **CORS configuration**: Allows browser to load videos from S3
3. **Transcription**: AWS Transcribe can now access videos for transcription

## After Fixing

✅ Videos load and play correctly
✅ No CORS errors in browser console
✅ Transcription can complete successfully
✅ Video seeking works properly

## One-Liner (Copy-Paste on EC2)

```bash
BUCKET_NAME="video-annotator-jllevine-$(date +%s)" && \
aws s3 mb s3://${BUCKET_NAME} --region us-east-1 && \
cat > /tmp/cors.json << 'EOF'
{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag","Content-Length","Content-Type"],"MaxAgeSeconds":3000}]}
EOF
aws s3api put-bucket-cors --bucket ${BUCKET_NAME} --cors-configuration file:///tmp/cors.json --region us-east-1 && \
cd ~/video-annotator/server && \
sed -i "s/AWS_S3_BUCKET=.*/AWS_S3_BUCKET=${BUCKET_NAME}/" .env && \
pm2 restart video-annotator && \
echo "✓ Done! Bucket: ${BUCKET_NAME}"
```

This single command will:
1. Create bucket
2. Apply CORS
3. Update .env
4. Restart server
5. Show you the bucket name

Copy and paste this into your EC2 SSH session!
