# Video Annotator — AWS IAM Permissions Checklist

Use this to verify your IAM role/user has the correct permissions for Video Annotator.

---

## AWS Account

| Account ID | Use |
|------------|-----|
| **582234715800** | Personal account — S3 bucket `video-annotator-public`, Railway credentials |
| 427791004700 | Non-personal / work account — not used for public deploy |

**Verify you're on the right account:**
```bash
aws sts get-caller-identity
# Should show Account: "582234715800" for public/personal deploy
```

If you see 427791004700, switch to your personal profile: `export AWS_PROFILE=personal` (or your profile name).

---

## Deployment Context

| Deployment | Credentials | Where to add policy |
|------------|-------------|---------------------|
| **Railway** | IAM user keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) | IAM → Users → [your user] → Add permissions |
| **EC2** | IAM role attached to instance | IAM → Roles → [instance role] → Add permissions |

---

## Required Permissions (All Deployments)

### S3 — Video storage, proxy, sync

Used by: `s3-service.js` — uploads, deletes, streams, lists videos

| Action | Resource | Purpose |
|--------|----------|---------|
| `s3:PutObject` | `arn:aws:s3:::YOUR-BUCKET-NAME/*` | Upload videos |
| `s3:GetObject` | `arn:aws:s3:::YOUR-BUCKET-NAME/*` | Stream videos (proxy), fetch transcripts |
| `s3:DeleteObject` | `arn:aws:s3:::YOUR-BUCKET-NAME/*` | Delete videos |
| `s3:ListBucket` | `arn:aws:s3:::YOUR-BUCKET-NAME` | List videos (sync from S3) |

**Replace `YOUR-BUCKET-NAME`** with your actual bucket (e.g. `video-annotator-public`, `perfectpixels-video-annotator`).

---

## Optional Permissions

### AWS Transcribe — Auto-transcription

Used when: `DISABLE_TRANSCRIPTION` is not set and Transcribe is configured.

| Action | Resource | Purpose |
|--------|----------|---------|
| `transcribe:StartTranscriptionJob` | `*` | Start transcription job |
| `transcribe:GetTranscriptionJob` | `*` | Poll job status |
| `transcribe:ListTranscriptionJobs` | `*` | List jobs (optional) |

Transcribe writes transcripts to your S3 bucket. Your app reads them with `s3:GetObject` (already required above).

### AWS Bedrock — AI summaries

Used when: `DISABLE_AI_SUMMARY` is not set and Bedrock is configured.

| Action | Resource | Purpose |
|--------|----------|---------|
| `bedrock:InvokeModel` | `arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0` | Generate AI summary |

**Also:** Enable Claude 3 Haiku in Bedrock → Model access.

---

## Setup / One-Time Permissions

Only needed if you create buckets or configure CORS via the app/scripts:

| Action | Resource | Purpose |
|--------|----------|---------|
| `s3:CreateBucket` | `arn:aws:s3:::video-annotator-*` | Create bucket (if scripted) |
| `s3:PutBucketCORS` | `arn:aws:s3:::YOUR-BUCKET-NAME` | Configure CORS |
| `s3:GetBucketCORS` | `arn:aws:s3:::YOUR-BUCKET-NAME` | Read CORS config |

---

## Complete IAM Policy (Copy-Paste)

Replace `YOUR-BUCKET-NAME` with your bucket name.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3VideoStorage",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["videos/*", "transcripts/*"]
        }
      }
    },
    {
      "Sid": "Transcribe",
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob",
        "transcribe:ListTranscriptionJobs"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Bedrock",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
    }
  ]
}
```

### Minimal policy (S3 only, no Transcribe/Bedrock)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

---

## Verification

### 1. Test S3 access

```bash
# List objects (should show videos/)
aws s3 ls s3://YOUR-BUCKET-NAME/videos/

# Upload test (optional)
echo "test" | aws s3 cp - s3://YOUR-BUCKET-NAME/videos/test.txt
aws s3 rm s3://YOUR-BUCKET-NAME/videos/test.txt
```

### 2. Test Transcribe (if enabled)

Upload a video in the app. Check server logs for:
- `Transcription job started: transcribe-...` — success
- `Failed to start transcription` — permission error

### 3. Test Bedrock (if enabled)

After transcription completes, check AI Summary tab. If it fails, check:
- Bedrock → Model access → Claude 3 Haiku enabled
- IAM has `bedrock:InvokeModel`

---

## Common Issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Upload fails | Missing `s3:PutObject` | Add S3 policy |
| Thumbnails/videos don't load | Missing `s3:GetObject` | Add S3 policy |
| "Recover from S3" finds nothing | Missing `s3:ListBucket` | Add ListBucket |
| Sync fails | Missing `s3:ListBucket` | Add ListBucket |
| Transcription fails | Missing Transcribe permissions | Add Transcribe policy |
| AI summary fails | Missing Bedrock or model not enabled | Add Bedrock policy + enable model |
| Delete video fails | Missing `s3:DeleteObject` | Add S3 policy |

---

## CloudFront / Signed URLs

CloudFront signing uses a **private key file** (not IAM). No IAM permissions needed for signing. Ensure:
- `CLOUDFRONT_PRIVATE_KEY_PATH` points to the PEM file
- `CLOUDFRONT_KEY_PAIR_ID` matches your key pair
