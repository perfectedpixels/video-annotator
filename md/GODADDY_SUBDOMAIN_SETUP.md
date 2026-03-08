# GoDaddy Subdomain Setup with Nginx Reverse Proxy

## Overview

This guide shows you how to:
1. Set up a subdomain on your GoDaddy domain
2. Point it to your EC2 instance
3. Use Nginx to hide the port number (`:3001`)
4. Access your app at `http://video-annotator.yourdomain.com` instead of `http://3.81.247.175:3001`

## Prerequisites

- GoDaddy domain (you own)
- EC2 instance running at `3.81.247.175`
- SSH access to EC2 instance
- App currently running on port 3001

---

## Step 1: GoDaddy DNS Setup

1. **Log into GoDaddy**
   - Go to: https://dcc.godaddy.com/manage/dns

2. **Select Your Domain**
   - Click on the domain you want to use

3. **Add DNS Record**
   - Click "Add" button
   - **Type**: `A`
   - **Name**: `video-annotator` (or whatever subdomain you want)
   - **Value**: `3.81.247.175`
   - **TTL**: `600` (10 minutes)
   - Click "Save"

4. **Wait for DNS Propagation**
   - Usually takes 5-30 minutes
   - Can take up to 24 hours in rare cases

5. **Test DNS Resolution**
   ```bash
   dig video-annotator.yourdomain.com
   # Should return: 3.81.247.175
   ```

---

## Step 2: Install Nginx on EC2

SSH into your EC2 instance:

```bash
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@3.81.247.175
```

Install Nginx:

```bash
# Install Nginx
sudo yum install nginx -y

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## Step 3: Configure Nginx as Reverse Proxy

Create Nginx configuration file:

```bash
sudo nano /etc/nginx/conf.d/video-annotator.conf
```

Paste this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name video-annotator.yourdomain.com;  # REPLACE WITH YOUR SUBDOMAIN

    # Frontend (React app)
    location / {
        root /home/ec2-user/video_annotator/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Socket.io WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Increase max upload size for video files
    client_max_body_size 500M;

    # Logs
    access_log /var/log/nginx/video-annotator-access.log;
    error_log /var/log/nginx/video-annotator-error.log;
}
```

Save and exit:
- Press `Ctrl+X`
- Press `Y`
- Press `Enter`

---

## Step 4: Test and Reload Nginx

```bash
# Test configuration for syntax errors
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

---

## Step 5: Update EC2 Security Group

Allow HTTP traffic (port 80):

### Option A: Using AWS CLI (from your local machine)

```bash
# Get your security group ID first
aws ec2 describe-instances --instance-ids i-0af89297af85fcb5b \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text

# Add HTTP rule (replace sg-xxxxx with your security group ID)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

### Option B: Using AWS Console

1. Go to: https://console.aws.amazon.com/ec2/
2. Click "Security Groups" in left sidebar
3. Find your instance's security group
4. Click "Edit inbound rules"
5. Click "Add rule"
   - **Type**: HTTP
   - **Protocol**: TCP
   - **Port**: 80
   - **Source**: 0.0.0.0/0 (or restrict to specific IPs)
6. Click "Save rules"

---

## Step 6: Update Application Configuration

Update your frontend config to use the subdomain without port:

```typescript
// src/config.ts
export const API_BASE_URL = import.meta.env.PROD 
  ? 'http://video-annotator.yourdomain.com'  // REPLACE WITH YOUR SUBDOMAIN
  : 'http://localhost:3001'

export const SOCKET_URL = import.meta.env.PROD
  ? 'http://video-annotator.yourdomain.com'  // REPLACE WITH YOUR SUBDOMAIN
  : 'http://localhost:3001'
```

---

## Step 7: Rebuild and Deploy Frontend

From your local machine:

```bash
# Navigate to project directory
cd ~/path/to/video_annotator

# Rebuild frontend
npm run build

# Deploy to EC2
scp -i ~/Downloads/video-annotator-keypair.pem -r dist/* \
  ec2-user@3.81.247.175:~/video_annotator/dist/
```

---

## Step 8: Verify Everything Works

1. **Test DNS Resolution**
   ```bash
   dig video-annotator.yourdomain.com
   # Should return: 3.81.247.175
   ```

2. **Test HTTP Access**
   ```bash
   curl -I http://video-annotator.yourdomain.com
   # Should return: HTTP/1.1 200 OK
   ```

3. **Open in Browser**
   ```
   http://video-annotator.yourdomain.com
   ```

4. **Test All Features**
   - Upload a video
   - Create annotations
   - Check WebSocket connection (real-time updates)

---

## Troubleshooting

### DNS Not Resolving

**Problem**: `dig` returns NXDOMAIN

**Solutions**:
- Wait longer (DNS can take up to 24 hours)
- Check GoDaddy DNS settings are correct
- Clear your local DNS cache:
  ```bash
  # macOS
  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
  
  # Windows
  ipconfig /flushdns
  ```

### Nginx Not Starting

**Problem**: `sudo systemctl status nginx` shows failed

**Solutions**:
```bash
# Check error logs
sudo tail -f /var/log/nginx/error.log

# Common issues:
# 1. Port 80 already in use
sudo netstat -tlnp | grep :80

# 2. Configuration syntax error
sudo nginx -t
```

### 502 Bad Gateway

**Problem**: Nginx returns 502 error

**Solutions**:
```bash
# Check if backend is running
pm2 status

# Restart backend if needed
pm2 restart video-annotator

# Check backend logs
pm2 logs video-annotator
```

### WebSocket Connection Fails

**Problem**: Real-time updates don't work

**Solutions**:
- Check browser console for WebSocket errors
- Verify Socket.io location block in Nginx config
- Ensure backend is running on port 3001
- Check firewall rules allow WebSocket connections

### File Upload Fails

**Problem**: Large video uploads fail

**Solutions**:
```bash
# Increase Nginx upload size
sudo nano /etc/nginx/conf.d/video-annotator.conf

# Add or increase:
client_max_body_size 500M;

# Reload Nginx
sudo systemctl reload nginx
```

---

## Optional: Add HTTPS (SSL Certificate)

For production use, you should add HTTPS. Here's how:

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d video-annotator.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)

# Certificate auto-renews, but you can test renewal:
sudo certbot renew --dry-run
```

After adding SSL, update your config:

```typescript
// src/config.ts
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://video-annotator.yourdomain.com'  // Note: HTTPS
  : 'http://localhost:3001'
```

---

## Maintenance Commands

```bash
# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx (no downtime)
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx access logs
sudo tail -f /var/log/nginx/video-annotator-access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/video-annotator-error.log

# Test Nginx configuration
sudo nginx -t
```

---

## Summary

After completing these steps, your app will be accessible at:

```
http://video-annotator.yourdomain.com
```

**No port number needed!**

Nginx handles:
- Routing port 80 to your app on port 3001
- Serving static frontend files
- Proxying API requests
- WebSocket connections for real-time updates

---

## Checklist

- [ ] Add A record in GoDaddy DNS
- [ ] Wait for DNS propagation (test with `dig`)
- [ ] Install Nginx on EC2
- [ ] Create Nginx configuration file
- [ ] Test and reload Nginx
- [ ] Update EC2 security group (allow port 80)
- [ ] Update app config with subdomain
- [ ] Rebuild frontend (`npm run build`)
- [ ] Deploy frontend to EC2
- [ ] Test in browser
- [ ] (Optional) Add HTTPS with Let's Encrypt

---

## Your Configuration

**Replace these values with your actual information:**

- **Your Domain**: `yourdomain.com`
- **Your Subdomain**: `video-annotator.yourdomain.com`
- **EC2 IP**: `3.81.247.175`
- **EC2 Instance ID**: `i-0af89297af85fcb5b`
- **SSH Key**: `~/Downloads/video-annotator-keypair.pem`
- **Backend Port**: `3001`

---

## Need Help?

If you run into issues:
1. Check the troubleshooting section above
2. Review Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Check backend logs: `pm2 logs video-annotator`
4. Verify DNS with: `dig video-annotator.yourdomain.com`

Good luck! 🚀
