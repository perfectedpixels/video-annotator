# AI Summary Feature Setup

## What's New

Added an **AI Summary** tab that automatically generates a bullet-point summary of video topics after transcription completes.

## How It Works

1. Video is uploaded → Transcription starts
2. Transcription completes → AI summary generation starts automatically
3. AI Summary tab shows the generated summary with:
   - Brief overview
   - Main topics covered (bullet points)
   - Key takeaways (bullet points)

## AWS Bedrock Permissions Required

Your EC2 instance needs Bedrock permissions to generate summaries.

### Add to IAM Role

Go to AWS Console → IAM → Roles → VideoAnnotatorRole → Add permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
    }
  ]
}
```

### Enable Bedrock Model Access

1. Go to AWS Console → Bedrock → Model access
2. Click "Manage model access"
3. Enable "Claude 3 Haiku"
4. Click "Save changes"

## Testing

1. **Hard refresh browser** (Cmd+Shift+R)
2. **Upload a new video** or wait for existing transcription to complete
3. **Check AI Summary tab** - should show:
   - "Generating AI summary..." (spinner) while processing
   - Summary with bullet points when complete

## Cost

AWS Bedrock Claude 3 Haiku pricing:
- **Input**: $0.25 per 1M tokens (~$0.0003 per video)
- **Output**: $1.25 per 1M tokens (~$0.001 per summary)
- **Total per video**: ~$0.001 (less than a penny!)

Very cost-effective for internal use.

## Features

- ✅ Automatic generation after transcription
- ✅ Bullet-point format for easy scanning
- ✅ Shows processing status with spinner
- ✅ Purple gradient background to distinguish from other tabs
- ✅ Uses Claude 3 Haiku (fast and cheap)

## Troubleshooting

### "AI Summary: Disabled" in logs
- Bedrock permissions not added to IAM role
- Add the policy above

### "Failed to generate summary"
- Check if Claude 3 Haiku is enabled in Bedrock console
- Verify IAM permissions include bedrock:InvokeModel
- Check server logs: `pm2 logs video-annotator`

### Summary not appearing
- Wait for transcription to complete first
- Refresh the page
- Check AI Summary tab (third tab)
- Summary generates in background (~5-10 seconds)

## What Gets Summarized

The AI analyzes the full transcript and provides:
1. **Overview**: 1-2 sentence summary of the video
2. **Main Topics**: Bullet points of key subjects discussed
3. **Key Takeaways**: Important points and conclusions

Perfect for quickly understanding video content without watching!

## Current Status

✅ **Code deployed**: AI summary feature is live
✅ **Server shows**: "AI Summary: Enabled"
⏳ **Waiting for**: Bedrock IAM permissions

Once you add the IAM permissions, new videos will automatically get AI summaries!
