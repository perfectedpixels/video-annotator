# 🚨 ACTION REQUIRED: Fix CORS Issue

## Current Problem
Videos are not loading due to CORS error. The root cause is:
- ❌ Bucket name is still placeholder: `your-video-annotation-bucket`
- ❌ CORS configuration not applied to S3 bucket

## Impact
- ❌ Videos fail to load in browser
- ❌ Transcription cannot complete (needs video access)
- ❌ Browser console shows CORS errors

## Solution (5 minutes)

### Option 1: One-Liner Fix (Easiest) ⭐

SSH into your EC2 instance and run this single command:

```bash
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175

# Then paste this one-liner:
BUCKET_NAME="video-annotator-jllevine-$(date +%s)" && aws s3 mb s3://${BUCKET_NAME} --region us-east-1 && cat > /tmp/cors.json << 'EOF'
{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag","Content-Length","Content-Type"],"MaxAgeSeconds":3000}]}
EOF
aws s3api put-bucket-cors --bucket ${BUCKET_NAME} --cors-configuration file:///tmp/cors.json --region us-east-1 && cd ~/video-annotator/server && sed -i "s/AWS_S3_BUCKET=.*/AWS_S3_BUCKET=${BUCKET_NAME}/" .env && pm2 restart video-annotator && echo "✓ Done! Bucket: ${BUCKET_NAME}"
```

### Option 2: Step-by-Step (More Control)

See `QUICK_S3_FIX.md` for detailed step-by-step instructions.

## After Running the Fix

1. **Refresh browser**: Cmd+Shift+R (hard refresh)
2. **Upload new video**: Test that it loads and plays
3. **Check console**: No more CORS errors
4. **Transcription**: Should complete successfully

## Verification

After the fix, you should see:
```
✓ Storage mode: S3
✓ S3 Bucket: video-annotator-jllevine-1234567890
✓ Transcription: Enabled
```

And in browser console:
```
✓ No CORS errors
✓ Videos load successfully
```

## Files Created to Help You

1. **ACTION_REQUIRED.md** (this file) - Quick overview
2. **QUICK_S3_FIX.md** - Detailed fix instructions
3. **FIX_CORS_ISSUE.md** - Comprehensive troubleshooting guide
4. **diagnose-s3.sh** - Diagnostic script to check S3 config
5. **apply-s3-cors.sh** - Script to apply CORS to existing bucket

## Need Help?

If you encounter any issues:
1. Check `QUICK_S3_FIX.md` for troubleshooting
2. Run `./diagnose-s3.sh` to identify the problem
3. Check server logs: `pm2 logs video-annotator`

## Summary

**What to do**: Run the one-liner on EC2 (Option 1 above)
**Time needed**: 2-3 minutes
**Result**: Videos will load, transcription will work, CORS errors gone

🎯 **Copy the one-liner from Option 1 and paste it into your EC2 SSH session!**
