# Automatic Login Setup Guide

## Overview

The app now supports automatic login using Amazon employee credentials when accessed through Amazon's internal infrastructure.

## How It Works

1. **Behind Amazon Load Balancer**: When users access the app through a subdomain (e.g., `video-annotator.corp.amazon.com`), Amazon's load balancer adds authentication headers
2. **Server Detection**: The Express server reads the `X-Forwarded-User` header
3. **Auto-Login**: The frontend fetches the current user from `/api/current-user` endpoint
4. **Fallback**: If no Amazon headers are detected, users can still manually enter their username

## Implementation Status

✅ **Backend**: Server middleware added to detect Amazon user headers  
✅ **Frontend**: Auto-fetch user on app load with fallback to manual entry  
✅ **API Endpoint**: `/api/current-user` returns authenticated username

## Prerequisites

To enable automatic login, you need:

1. **Subdomain with HTTPS** (e.g., `video-annotator.corp.amazon.com`)
2. **Amazon Load Balancer** or **API Gateway** that adds authentication headers
3. **Internal Amazon network** access

## Setup Steps

### 1. Request Subdomain (Required)

Follow the guide in `QUICK_SUBDOMAIN_GUIDE.md`:

- Create IT ticket for DNS entry
- Request SSL certificate
- Configure Nginx or ALB

### 2. Deploy Updated Code

The code is already updated! Just deploy:

```bash
# Build frontend
npm run build

# Deploy to EC2
scp -i ~/Downloads/video-annotator-keypair.pem -r dist ec2-user@3.81.247.175:~/
scp -i ~/Downloads/video-annotator-keypair.pem server/index.js ec2-user@3.81.247.175:~/server/

# Restart server
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175 "pm2 restart video-annotator"
```

### 3. Configure Load Balancer (If Using ALB)

If you're using an Application Load Balancer, ensure it's configured to:

1. **Enable OIDC Authentication** (optional, for full Midway integration)
2. **Pass User Headers**: Configure ALB to forward `X-Forwarded-User` header

Example ALB Target Group settings:
```
Stickiness: Enabled
Health Check: /api/health
```

### 4. Test Auto-Login

```bash
# Test the endpoint
curl -H "X-Forwarded-User: your-username" https://video-annotator.corp.amazon.com/api/current-user

# Expected response:
{
  "success": true,
  "username": "your-username",
  "authenticated": true
}
```

## User Experience

### With Auto-Login (Behind Amazon Infrastructure)
1. User visits `https://video-annotator.corp.amazon.com`
2. App automatically detects username from headers
3. User goes straight to video library
4. Username shown in top-right corner

### Without Auto-Login (Direct IP Access)
1. User visits `http://3.81.247.175:3001`
2. App shows username input screen
3. User enters username manually
4. Username saved in localStorage

## Supported Headers

The server checks for these headers (in order):
1. `X-Forwarded-User` - Standard Amazon ALB header
2. `X-Amzn-Oidc-Identity` - Amazon OIDC identity
3. `X-Amzn-Oidc-Data` - Amazon OIDC data (JWT)

## Security Notes

- Headers are only trusted when behind Amazon's infrastructure
- Direct IP access still requires manual username entry
- No passwords are stored or transmitted
- Username is used for attribution only (not authorization)

## Troubleshooting

### Auto-login not working?

1. **Check headers are being sent**:
   ```bash
   curl -I https://video-annotator.corp.amazon.com
   ```

2. **Check server logs**:
   ```bash
   ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175 "pm2 logs video-annotator --lines 50"
   ```
   Look for: `Amazon user detected: username`

3. **Test the endpoint directly**:
   ```bash
   curl https://video-annotator.corp.amazon.com/api/current-user
   ```

4. **Verify you're behind Amazon infrastructure**:
   - Must access via subdomain (not IP)
   - Must be on Amazon network or VPN
   - Load balancer must be configured

### Still showing username prompt?

This is expected if:
- Accessing via IP address instead of subdomain
- Not behind Amazon load balancer
- Headers not configured on load balancer

The app will fall back to manual username entry, which still works fine!

## Next Steps

1. **Complete subdomain setup** (see `QUICK_SUBDOMAIN_GUIDE.md`)
2. **Deploy updated code** (commands above)
3. **Test auto-login** via subdomain
4. **Verify fallback** still works via IP

## Timeline

| Task | Time | Wait Time |
|------|------|-----------|
| Request subdomain | 5 min | 1-3 days |
| Request SSL cert | 5 min | 1-2 days |
| Configure server | 30 min | - |
| Deploy code | 5 min | - |
| Test | 5 min | - |
| **Total** | **~1 hour** | **~3-5 days** |

## Contact

For help with:
- **Subdomain/DNS**: IT Service Desk (t.corp.amazon.com)
- **SSL Certificate**: Security Team
- **Load Balancer**: Your AWS admin
- **App Issues**: jllevine (see footer link)

---

**Status**: ✅ Code ready, waiting for subdomain setup
