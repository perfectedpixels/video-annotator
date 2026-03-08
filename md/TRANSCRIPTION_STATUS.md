# Transcription Feature - Current Status

## ✅ What's Working

1. **Code Deployed**: All transcription code is deployed and active
2. **Service Enabled**: Server logs show "Transcription: Enabled"
3. **UI Ready**: Tab system with Notes and Transcription tabs is live
4. **Auto-detection**: Service automatically detects AWS credentials from IAM role

## ⚠️ What's Needed

The transcription feature requires AWS Transcribe permissions. Your EC2 instance needs an IAM role with the following permissions:

### Required IAM Policy

Add this policy to your EC2 instance's IAM role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob",
        "transcribe:ListTranscriptionJobs"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-video-annotation-bucket/*"
    }
  ]
}
```

## How to Add IAM Permissions

### Option 1: Via AWS Console (Recommended)

1. Go to AWS Console → EC2 → Instances
2. Find your instance (3.81.247.175)
3. Click on the IAM role attached to it
4. Click "Add permissions" → "Create inline policy"
5. Paste the JSON policy above
6. Replace `your-video-annotation-bucket` with your actual bucket name
7. Click "Review policy" → Name it "TranscribeAccess" → "Create policy"

### Option 2: Via AWS CLI

```bash
# Get the instance's IAM role name
aws ec2 describe-instances --instance-ids i-YOUR-INSTANCE-ID \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn'

# Create the policy file
cat > transcribe-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob",
        "transcribe:ListTranscriptionJobs"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-video-annotation-bucket/*"
    }
  ]
}
EOF

# Attach the policy to the role
aws iam put-role-policy \
  --role-name YOUR-ROLE-NAME \
  --policy-name TranscribeAccess \
  --policy-document file://transcribe-policy.json
```

## Testing After Adding Permissions

1. **No restart needed** - IAM permissions take effect immediately
2. **Upload a new video** - Must be uploaded AFTER adding permissions
3. **Check the Transcription tab** - Should show "Transcribing in progress..."
4. **Wait** - Takes approximately 1x video length (5-min video = ~5 min wait)
5. **Refresh page** - Transcript should appear

## How to Verify It's Working

### Check Server Logs
```bash
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175 "pm2 logs video-annotator --lines 50"
```

Look for:
- ✅ "Transcription: Enabled"
- ✅ "Transcription job started: transcribe-..."
- ✅ "Transcription completed for video ..."
- ❌ "Failed to start transcription: ..." (means permissions issue)

### Check AWS Console
1. Go to AWS Transcribe → Transcription jobs
2. Look for jobs named `transcribe-{videoId}-{timestamp}`
3. Check job status: IN_PROGRESS → COMPLETED

## Current Behavior

**Without Transcribe Permissions:**
- Videos upload successfully
- Notes tab works perfectly
- Transcription tab doesn't appear (because no transcription is attempted)
- No errors shown to user

**With Transcribe Permissions:**
- Videos upload successfully
- Transcription job starts automatically
- Transcription tab appears with spinner
- After ~1x video length, transcript appears
- Clickable timestamps to jump in video

## Cost Reminder

AWS Transcribe charges **$0.024 per minute** of audio:
- 5-minute video: $0.12
- 10-minute video: $0.24
- 30-minute video: $0.72
- 60-minute video: $1.44

## Troubleshooting

### "Transcription: Disabled" in logs
- ✅ FIXED - Now shows "Transcription: Enabled"

### Transcription tab doesn't appear
- Upload a NEW video (after adding IAM permissions)
- Old videos won't have transcription

### "Failed to start transcription" in logs
- IAM role missing Transcribe permissions
- Check IAM policy is attached correctly
- Verify bucket name in policy matches actual bucket

### Transcription stuck on "processing"
- Normal - takes ~1x video length
- Check AWS Console for job status
- Server polls every 60 seconds for up to 60 minutes

## Files Modified

- `server/transcribe-service.js` - Updated to use IAM role credentials
- Now checks for `AWS_S3_BUCKET` or `S3_BUCKET_NAME` environment variable
- Automatically uses EC2 IAM role credentials (no explicit keys needed)

## Summary

✅ **Code is ready and deployed**
✅ **Service is enabled**
⏳ **Waiting for IAM permissions to be added**

Once you add the Transcribe permissions to your EC2 instance's IAM role, transcription will work automatically for all new video uploads!
