# Fix CORS Issue - Video Not Loading

## Problem
Videos are not loading due to CORS error:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource
```

## Root Cause
Your S3 bucket name is still set to the placeholder `your-video-annotation-bucket` and the bucket doesn't have CORS configuration applied.

## Solution

### Step 1: Update Bucket Name

You have two options:

#### Option A: Use Existing Bucket (Recommended)
If you already have an S3 bucket, update `server/.env`:

```bash
# Edit server/.env
AWS_S3_BUCKET=your-actual-bucket-name-here
```

#### Option B: Create New Bucket
```bash
# Create a new bucket with a unique name
aws s3 mb s3://video-annotator-jllevine-$(date +%s) --region us-east-1

# Update server/.env with the new bucket name
AWS_S3_BUCKET=video-annotator-jllevine-1234567890
```

### Step 2: Apply CORS Configuration

Run the script I created:

```bash
./apply-s3-cors.sh
```

This will:
- ✅ Check if bucket exists
- ✅ Apply CORS configuration from `cors-config.json`
- ✅ Verify the configuration was applied

### Step 3: Restart Server

```bash
# On your EC2 instance
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175 "pm2 restart video-annotator"
```

### Step 4: Test

1. Hard refresh browser (Cmd+Shift+R)
2. Upload a new video
3. Video should now play without CORS errors

## What the CORS Configuration Does

The `cors-config.json` file allows:
- **Origins**: All origins (`*`) - videos can be loaded from any domain
- **Methods**: GET and HEAD - required for video playback
- **Headers**: All headers - allows range requests for video seeking
- **Exposed Headers**: ETag, Content-Length, Content-Type - needed for video metadata

## Alternative: Manual CORS Configuration

If you prefer to configure CORS manually via AWS Console:

1. Go to AWS S3 Console
2. Select your bucket
3. Go to "Permissions" tab
4. Scroll to "Cross-origin resource sharing (CORS)"
5. Click "Edit"
6. Paste this configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

7. Click "Save changes"

## Troubleshooting

### "Bucket does not exist"
- Check the bucket name in `server/.env`
- Verify the bucket exists in the correct region
- Make sure you have access to the bucket

### "Access Denied" when applying CORS
You need the `s3:PutBucketCORS` permission. Add this to your IAM policy:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutBucketCORS",
    "s3:GetBucketCORS"
  ],
  "Resource": "arn:aws:s3:::your-bucket-name"
}
```

### CORS still not working after applying
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R)
3. Check browser console for different error
4. Verify CORS was applied:
   ```bash
   aws s3api get-bucket-cors --bucket your-bucket-name --region us-east-1
   ```

## Why This Happened

When you upload a video to S3, the server generates a pre-signed URL like:
```
https://your-bucket.s3.us-east-1.amazonaws.com/videos/123.mp4?X-Amz-...
```

The browser tries to load this video from a different origin (S3) than your app (EC2), which triggers CORS checks. Without proper CORS configuration, the browser blocks the request.

## Quick Fix Summary

```bash
# 1. Update bucket name in server/.env
vim server/.env
# Change: AWS_S3_BUCKET=your-actual-bucket-name

# 2. Apply CORS configuration
./apply-s3-cors.sh

# 3. Restart server on EC2
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175 "pm2 restart video-annotator"

# 4. Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

## After Fixing

Once CORS is configured:
- ✅ Videos will load and play correctly
- ✅ Video seeking will work
- ✅ Transcription can complete (needs video access)
- ✅ No more CORS errors in console

The transcription feature also needs video access from AWS Transcribe service, so fixing CORS helps with that too!
