---
title: HTTPS/SSL Setup and Port Forwarding Configuration
inclusion: manual
tags: [deployment, security, nginx, ssl, https]
---

# HTTPS/SSL Setup and Port Forwarding Configuration

This document describes the successful implementation of SSL/TLS encryption and automatic HTTP-to-HTTPS forwarding for the Video Annotator application.

## Overview

The application is configured to:
- Serve all traffic over HTTPS using Let's Encrypt SSL certificates
- Automatically redirect all HTTP traffic to HTTPS
- Redirect port-specific URLs (`:3001`) to the clean HTTPS domain
- Use nginx as a reverse proxy with SSL termination
- Run the Node.js backend on an internal port (3002) not exposed to the internet

## Architecture

```
Internet Traffic
    ↓
nginx (ports 80, 443, 3001)
    ↓
SSL Termination & Routing
    ↓
Node.js Server (localhost:3002)
    ↓
S3 / Database / Services
```

## Key Configuration Changes

### 1. Backend Port Change

**Problem**: nginx needed to listen on port 3001 for redirects, but Node.js was already using it.

**Solution**: Moved Node.js to internal port 3002.

**File**: `server/.env`
```env
PORT=3002
NODE_ENV=production
```

**Server Startup**:
```bash
cd /home/ec2-user/server && NODE_ENV=production node index.js > ../server.log 2>&1 &
```

### 2. Frontend Configuration

**Problem**: Frontend was hardcoded to use `http://domain:3001`

**Solution**: Updated to use HTTPS without port specification.

**File**: `src/config.production.ts`
```typescript
export const API_BASE_URL = 'https://video-annotator.jllevine.people.aws.dev';
export const SOCKET_URL = API_BASE_URL;
```

### 3. Nginx Configuration

**File**: `/etc/nginx/conf.d/video-annotator.conf`

#### HTTP to HTTPS Redirect Server Block
```nginx
# Redirect all HTTP traffic to HTTPS (including port 3001)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 3001;
    listen [::]:3001;
    server_name _;
    return 301 https://video-annotator.jllevine.people.aws.dev$request_uri;
}
```

**Key Points**:
- `listen 80` - Standard HTTP port
- `listen 3001` - Legacy port users might have bookmarked
- `server_name _` - Catch-all for any hostname (IP addresses, etc.)
- `return 301` - Permanent redirect to HTTPS URL
- `$request_uri` - Preserves the path and query string

#### HTTPS Server Block
```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name video-annotator.jllevine.people.aws.dev;

    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/video-annotator.jllevine.people.aws.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/video-annotator.jllevine.people.aws.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API Proxy (to internal port 3002)
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 2G;
    }

    # WebSocket Proxy
    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Static Files
    location /assets/ {
        alias /home/ec2-user/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React App
    location / {
        root /home/ec2-user/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**Key Points**:
- `http2 on` - Enables HTTP/2 for better performance
- `proxy_pass http://localhost:3002` - Routes to internal Node.js server
- `proxy_set_header X-Forwarded-Proto $scheme` - Tells backend it's HTTPS
- `client_max_body_size 2G` - Allows large video uploads
- `proxy_read_timeout 86400` - 24-hour timeout for WebSocket connections

### 4. Security Group Configuration

**Required Open Ports**:
- Port 80 (HTTP) - For redirects to HTTPS
- Port 443 (HTTPS) - For secure traffic
- Port 3001 (HTTP) - For legacy URL redirects
- Port 22 (SSH) - For server management

**Blocked Ports**:
- Port 3002 - Internal only, not exposed to internet

## SSL Certificate Management

### Initial Setup (Already Completed)
Certificates were obtained using Certbot with Let's Encrypt:
```bash
sudo certbot --nginx -d video-annotator.jllevine.people.aws.dev
```

### Certificate Renewal
Certificates auto-renew via systemd timer. To manually renew:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Certificate Locations
- Certificate: `/etc/letsencrypt/live/video-annotator.jllevine.people.aws.dev/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/video-annotator.jllevine.people.aws.dev/privkey.pem`

## Testing the Configuration

### Test HTTPS
```bash
curl -I https://video-annotator.jllevine.people.aws.dev/
# Should return: HTTP/1.1 200 OK
```

### Test HTTP Redirect
```bash
curl -I http://video-annotator.jllevine.people.aws.dev/
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://video-annotator.jllevine.people.aws.dev/
```

### Test Port 3001 Redirect
```bash
curl -I http://video-annotator.jllevine.people.aws.dev:3001/
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://video-annotator.jllevine.people.aws.dev/
```

### Test API Endpoint
```bash
curl https://video-annotator.jllevine.people.aws.dev/api/health
# Should return: {"status":"healthy",...}
```

## Deployment Workflow

When deploying updates:

1. **Build frontend**:
   ```bash
   npm run build
   ```

2. **Deploy to server**:
   ```bash
   scp -i ~/Dropbox/playground/video-annotator-keypair.pem -r dist/* ec2-user@3.81.247.175:/home/ec2-user/dist/
   ```

3. **Restart backend** (if needed):
   ```bash
   ssh -i ~/Dropbox/playground/video-annotator-keypair.pem ec2-user@3.81.247.175 "sudo pkill -9 node"
   ssh -i ~/Dropbox/playground/video-annotator-keypair.pem ec2-user@3.81.247.175 "cd /home/ec2-user/server && NODE_ENV=production node index.js > ../server.log 2>&1 &"
   ```

4. **Reload nginx** (if config changed):
   ```bash
   ssh -i ~/Dropbox/playground/video-annotator-keypair.pem ec2-user@3.81.247.175 "sudo nginx -t && sudo systemctl reload nginx"
   ```

## Troubleshooting

### Videos Not Loading
- Check that frontend config uses HTTPS: `src/config.production.ts`
- Verify S3 pre-signed URLs are being generated
- Check browser console for mixed content warnings

### Port Conflicts
```bash
# Check what's using a port
sudo lsof -i :3002

# Kill all node processes
sudo pkill -9 node
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload configuration
sudo systemctl reload nginx
```

### SSL Certificate Issues
```bash
# Check certificate expiration
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

## Security Best Practices

1. **HSTS Header**: Forces browsers to always use HTTPS for 1 year
2. **X-Frame-Options**: Prevents clickjacking attacks
3. **X-Content-Type-Options**: Prevents MIME-sniffing attacks
4. **Internal Port**: Backend runs on port 3002, not exposed to internet
5. **Automatic Redirects**: All HTTP traffic forced to HTTPS

## URLs That Work

All of these redirect to `https://video-annotator.jllevine.people.aws.dev`:
- `http://video-annotator.jllevine.people.aws.dev`
- `http://video-annotator.jllevine.people.aws.dev:3001`
- `https://video-annotator.jllevine.people.aws.dev` (direct access)
- `http://3.81.247.175` (shows 404, by design)

## Key Learnings

1. **Port Separation**: nginx handles public ports (80, 443, 3001), Node.js uses internal port (3002)
2. **SSL Termination**: nginx handles SSL/TLS, backend receives plain HTTP on localhost
3. **Catch-All Redirects**: Using `server_name _` catches all hostnames/IPs
4. **Frontend Config**: Must match the public-facing URL (HTTPS, no port)
5. **Security Groups**: Only expose necessary ports (80, 443, 3001, 22)

## Related Documentation

- [DEPLOYMENT.md](../../DEPLOYMENT.md) - General deployment guide
- [PRODUCTION_READY.md](../../PRODUCTION_READY.md) - Production checklist
- [S3_SETUP.md](../../S3_SETUP.md) - S3 configuration for video storage
