#!/bin/bash
# Apply S3 CORS for Railway/Vercel deployment
# Fixes thumbnails not loading (browser blocks cross-origin video from S3)
# Run with: AWS_S3_BUCKET=video-annotator-public ./apply-s3-cors-railway.sh

BUCKET="${AWS_S3_BUCKET:-video-annotator-public}"
REGION="${AWS_REGION:-us-east-1}"

echo "Applying S3 CORS to bucket: $BUCKET (region: $REGION)"
echo ""

aws s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://video-annotator-ten.vercel.app",
        "https://annotator.perfectpixels.com",
        "http://localhost:5173"
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3600
    }
  ]
}'

if [ $? -eq 0 ]; then
  echo "✓ S3 CORS applied. Thumbnails should load after browser refresh."
else
  echo "✗ Failed. Ensure AWS CLI is configured and you have s3:PutBucketCORS permission."
fi
