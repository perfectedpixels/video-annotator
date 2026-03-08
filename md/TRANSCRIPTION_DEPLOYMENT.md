# Transcription Feature Deployment Guide

## Overview
This adds AWS Transcribe integration to automatically transcribe uploaded videos.

## Prerequisites
- AWS account with Transcribe access
- S3 bucket already configured (required for transcription)
- AWS credentials with Transcribe permissions

## Deployment Steps

### 1. Upload Files to EC2
```bash
# Upload frontend build
scp -i ~/Downloads/video-annotator-keypair.pem -r dist ec2-user@3.81.247.175:~/

# Upload server files
scp -i ~/Downloads/video-annotator-keypair.pem server/package.json ec2-user@3.81.247.175:~/server/
scp -i ~/Downloads/video-annotator-keypair.pem server/index.js ec2-user@3.81.247.175:~/server/
scp -i ~/Downloads/video-annotator-keypair.pem server/transcribe-service.js ec2-user@3.81.247.175:~/server/
```

### 2. Install New Dependencies on Server
```bash
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175

# Navigate to server directory
cd ~/server

# Install new AWS Transcribe SDK
npm install

# Exit SSH
exit
```

### 3. Verify AWS Credentials
The transcription service uses the same AWS credentials as S3. Ensure your `.env` file has:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name
```

### 4. Update IAM Permissions
Your AWS IAM user/role needs these additional permissions:
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
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 5. Restart Server
```bash
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175 "pm2 restart video-annotator"
```

### 6. Verify Deployment
Check the server logs:
```bash
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175 "pm2 logs video-annotator --lines 50"
```

You should see:
```
Storage mode: S3
Transcription: Enabled
```

## How It Works

1. **Upload**: When a video is uploaded, a transcription job is automatically started
2. **Processing**: The video shows "Transcribing in progress..." with a spinner
3. **Polling**: Server polls AWS Transcribe every 60 seconds for status
4. **Completion**: Once done, transcript appears in the Transcription tab
5. **Display**: First 20 segments shown, with "Show all" button for more

## Features

- **Tab System**: Notes and Transcription tabs below video player
- **Progressive Disclosure**: Shows first 20 transcript segments, expandable to all
- **Clickable Timestamps**: Click any transcript segment to jump to that time
- **Status Indicators**: 
  - Processing: Spinning icon with "Transcribing in progress..."
  - Completed: Full transcript with timestamps
  - Failed: Error message

## Cost Estimates

AWS Transcribe pricing (as of 2024):
- Standard: $0.024 per minute
- 10-minute video: ~$0.24
- 60-minute video: ~$1.44

## Troubleshooting

### Transcription shows "failed"
- Check AWS credentials have Transcribe permissions
- Verify S3 bucket is accessible
- Check server logs: `pm2 logs video-annotator`

### Transcription stuck on "processing"
- AWS Transcribe takes approximately 1x video length to process
- Check job status in AWS Console: Transcribe → Transcription jobs
- Server polls every 60 seconds for up to 60 minutes

### No transcription tab appears
- Transcription only works when S3 is enabled
- Check server logs show "Transcription: Enabled"
- Older videos won't have transcription (only new uploads)

## Testing

1. Upload a new video (must be after deployment)
2. Video should show "Transcription" tab
3. Tab should show spinning icon and "Transcribing in progress..."
4. Wait ~1x video length (e.g., 5-minute video takes ~5 minutes)
5. Refresh page to see completed transcript
6. Click transcript segments to jump to timestamps

## Notes

- Transcription only works for videos uploaded AFTER this deployment
- Existing videos will not have transcription
- Transcription requires S3 to be enabled
- Local file storage does not support transcription
