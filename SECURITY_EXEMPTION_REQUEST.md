# Security Exemption Request for Video Annotator

## Ticket Information
- **Ticket ID**: d182d8e6-2c5b-4dad-86bd-65edbbf07b35
- **Finding ID**: 9089d5d3-779e-4b97-ac55-fbf917e1056a
- **Resource**: arn:aws:s3:::your-video-annotation-bucket
- **Account**: 427791004700

## How to Request Exemption

### Step 1: Go to Talos Finding
https://appsec.corp.amazon.com/talos/finding/9089d5d3-779e-4b97-ac55-fbf917e1056a

### Step 2: Mark as "Not Useful" with Justification

Click "Update Finding Status" and select "Not Useful"

**Justification Template:**

```
Business Justification: Internal Design Feedback Tool

This S3 bucket is used for an internal design feedback tool (Video Annotator) that allows 
teams to upload and annotate design walkthrough videos. The bucket requires public read 
access for the following reasons:

1. PURPOSE: Internal tool for async design feedback and collaboration
2. DATA CLASSIFICATION: 
   - No customer data
   - No customer metadata  
   - No business data
   - Only internal design prototypes and feedback
3. ACCOUNT TYPE: Personal Isengard account (isengard_personal=True)
4. SECURITY CONTROLS:
   - Videos stored with non-guessable filenames (timestamp + random number)
   - Bucket name is not publicly advertised
   - Access requires knowing exact URL
   - Only videos/ folder is public, not entire bucket
5. ALTERNATIVE CONSIDERED: Presigned URLs expire after 1 hour and break video 
   previews for users outside Amazon network, making the tool unusable
6. RISK ASSESSMENT: Low - internal prototypes only, no sensitive data

Request exemption for public read access to videos/ folder only.
```

### Step 3: Or Request Exception via Mirador

Alternative: https://mirador.security.aws.dev/#/exceptions/new-exception?findingCategory=AWS_ACCOUNT_MISCONFIGURATION&findingType=AWS_ACCOUNT_MISCONFIGURATION.Palisade.AWS-Proactive-Security-Tooling:S3BucketNotPubliclyExposedSecureFoundations

Fill in:
- **Finding Type**: S3BucketNotPubliclyExposedSecureFoundations
- **Resource**: your-video-annotation-bucket
- **Justification**: (use template above)
- **Duration**: 1 year (renewable)

## Important Notes

1. **DO NOT** manually disable Block Public Access again until exemption is approved
2. **DO** update the ticket with your justification
3. **DO** mention this is a personal/dev account with no customer data
4. **DO** emphasize it's an internal tool only

## After Exemption is Approved

Once approved, you can safely re-enable public access:

```bash
aws s3api put-public-access-block \
  --bucket your-video-annotation-bucket \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region us-east-1
```

The exemption will prevent Epoxy from auto-blocking it again.
