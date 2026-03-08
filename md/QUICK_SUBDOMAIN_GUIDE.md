# Quick Subdomain Setup - TL;DR

## The Fastest Path to Get Your Subdomain

### Step 1: Create IT Ticket (5 minutes)

Go to **https://t.corp.amazon.com** and create a ticket:

**Option A - Try searching for "DNS" in the ticket system**
- Search for "DNS Request" or "Domain Name" in the ticket creation search
- Or look under: IT Services → ServiceNow → DNS/Network Request

**Option B - Use general IT Services ticket**
```
Category: IT Services → ServiceNow (or similar general category)
Title: DNS Entry Request for Video Annotator App

Details:
- Request Type: DNS Entry / Subdomain Request
- Subdomain: video-annotator.corp.amazon.com
- Record Type: A Record
- Target IP: [Your EC2 instance IP address]
- Purpose: Internal video annotation tool
- Users: [Your team name]
```

**Note**: The exact category path may vary. If you can't find "Network" or "DNS", use the general IT Services category and clearly state "DNS Request" in the title.

**Wait time**: 1-3 business days

### Step 2: Request SSL Certificate (5 minutes)

Create another ticket at **https://t.corp.amazon.com**:

**Option A - Search for "SSL" or "Certificate"**
- Search for "SSL Certificate" in the ticket creation search
- Or look under: IT Services → ServiceNow → Security/Certificate Request

**Option B - Use general IT Services ticket**
```
Category: IT Services → ServiceNow (or similar general category)
Title: SSL Certificate Request for video-annotator.corp.amazon.com

Details:
- Request Type: SSL Certificate
- Domain: video-annotator.corp.amazon.com
- Certificate Type: Internal Amazon CA
- Purpose: HTTPS for video annotation app
```

**Note**: If you can't find a specific SSL/Security category, use the general IT Services category and clearly state "SSL Certificate Request" in the title.

**Wait time**: 1-2 business days

### Step 3: Configure Your Server (30 minutes)

Once you receive the certificate files:

```bash
# 1. Install certificate
sudo mkdir -p /etc/ssl/certs/video-annotator
sudo cp certificate.crt /etc/ssl/certs/video-annotator/
sudo cp private.key /etc/ssl/certs/video-annotator/
sudo cp ca-bundle.crt /etc/ssl/certs/video-annotator/
sudo chmod 600 /etc/ssl/certs/video-annotator/private.key

# 2. Create Nginx config
sudo nano /etc/nginx/sites-available/video-annotator
```

Paste this config:

```nginx
server {
    listen 80;
    server_name video-annotator.corp.amazon.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name video-annotator.corp.amazon.com;

    ssl_certificate /etc/ssl/certs/video-annotator/certificate.crt;
    ssl_certificate_key /etc/ssl/certs/video-annotator/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        root /var/www/video-annotator/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# 3. Enable and restart
sudo ln -s /etc/nginx/sites-available/video-annotator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Open firewall
sudo ufw allow 443/tcp
```

### Step 4: Update Your App (5 minutes)

```typescript
// src/config.ts
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://video-annotator.corp.amazon.com'
  : 'http://localhost:3001'

export const SOCKET_URL = import.meta.env.PROD
  ? 'https://video-annotator.corp.amazon.com'
  : 'http://localhost:3001'
```

```bash
# Rebuild and deploy
npm run build
sudo cp -r dist/* /var/www/video-annotator/dist/
```

### Step 5: Test (2 minutes)

```bash
# Test DNS
nslookup video-annotator.corp.amazon.com

# Test HTTPS
curl -I https://video-annotator.corp.amazon.com

# Open in browser
open https://video-annotator.corp.amazon.com
```

## That's It! 🎉

Your app is now live at: **https://video-annotator.corp.amazon.com**

## Timeline Summary

| Step | Time | Wait Time |
|------|------|-----------|
| Create DNS ticket | 5 min | 1-3 days |
| Request SSL cert | 5 min | 1-2 days |
| Configure server | 30 min | - |
| Update app | 5 min | - |
| Test | 2 min | - |
| **Total** | **~1 hour work** | **~3-5 days wait** |

## Troubleshooting

**DNS not working?**
```bash
# Check if DNS is live
dig video-annotator.corp.amazon.com
```

**SSL errors?**
```bash
# Test certificate
openssl s_client -connect video-annotator.corp.amazon.com:443
```

**502 Bad Gateway?**
```bash
# Check backend is running
curl http://localhost:3001/api/videos
sudo systemctl status nginx
```

## Who to Contact

- **DNS issues**: IT Service Desk (t.corp.amazon.com)
- **SSL issues**: Security Team ticket
- **Server issues**: Your AWS/EC2 admin

## Alternative: Use Existing Team Domain

If your team already has a domain (e.g., `your-team.amazon.com`), you can skip the DNS ticket and just add a subdomain:

```
video-annotator.your-team.amazon.com
```

Ask your team's domain admin to add the A record pointing to your EC2 IP.

---

**Full details**: See `SUBDOMAIN_SETUP.md` for comprehensive guide
