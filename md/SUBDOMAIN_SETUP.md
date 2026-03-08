# Subdomain Setup Guide for Internal Amazon Hosting

## Overview

To host your video annotation app on an internal Amazon subdomain (e.g., `video-annotator.corp.amazon.com` or `video-annotator.your-team.amazon.com`), you'll need to work with Amazon's internal DNS and hosting infrastructure.

## Option 1: Using Amazon Corporate Infrastructure (Recommended)

### Step 1: Choose Your Subdomain Pattern

Amazon internal apps typically use one of these patterns:
- `<app-name>.corp.amazon.com` - For corporate/internal tools
- `<app-name>.<team>.amazon.com` - For team-specific tools
- `<app-name>.a2z.com` - For A to Z applications

**Example for your app:**
- `video-annotator.corp.amazon.com`
- `video-annotator.your-team-name.amazon.com`

### Step 2: Create DNS Entry (Self-Service)

**IMPORTANT**: Adding and removing records under `corp.amazon.com` is now **self-service**. You do NOT need to create a ticket.

#### Using the Internal Corp CNAME Editor

1. **Access the CNAME Editor**
   - Go to: https://dns-manage-web.corp.proxy.amazon.com/
   - Look for the "DNS CNAME (Alias) Editor" tool
   - Or use the direct link from the FAQ: https://w.amazon.com/?DNSServiceFAQ#Managing_CNAMES_.28Aliases.29

2. **Add New CNAME (Alias)**
   
   Fill in the form fields:
   
   - **Full Alias Name**: `video-annotator.corp.amazon.com`
     - Must be the complete subdomain you want
     - Must be in an "open zone" (corp.amazon.com is an open zone)
   
   - **Points To**: Your EC2 instance hostname or IP
     - Example: `ec2-3-81-247-175.compute-1.amazonaws.com`
     - Or: `3.81.247.175` (if using A record)
   
   - **Set Owner (group)**: Select your team's POSIX or LDAP group
     - This determines who can edit this record later
     - Example: `@your-team-name` or `@software` (temporary, can change later)
     - Find your groups at: https://permissions.amazon.com/user.mhtml
   
   - **TTL (60 Seconds)**: Leave as default (60) or use 900 (recommended)
   
   - **Open Zones**: Select from dropdown
     - For corp subdomain: Choose `corp.amazon.com`
     - Other options: `aka.corp.amazon.com`, `integ.amazon.com`, etc.

3. **Verify and Add**
   - Click "Verify Add" button to check if the name is available
   - If verification passes, click "Add" to create the CNAME
   - The change takes effect within 2 minutes (typically)

4. **Alternative: Using BatchDNS CLI Tool**
   
   If you prefer command-line:
   
   ```bash
   # Deploy BatchDNSCLI environment
   # Create a batch file with your DNS entry
   cat > dns-batch.txt << EOF
   add, video-annotator.corp.amazon.com, 900, CNAME, ec2-3-81-247-175.compute-1.amazonaws.com
   EOF
   
   # Execute the batch
   /apollo/env/BatchDNSCLI/bin/batchdns \
     --server dns-manage.corp.proxy.amazon.com \
     --file dns-batch.txt \
     --owner @your-team-group
   ```

5. **Managing Your CNAME Later**
   
   To edit or delete your CNAME:
   - Use the "Find and Edit CNAME (Alias)" section in the CNAME Editor
   - Enter your full alias name: `video-annotator.corp.amazon.com`
   - Click "Find" to load the current settings
   - Make changes and click "Update" or "Delete"
   
   To change ownership:
   - Use the "Manage DNS Data Ownership" tool in the same DNS UI
   - Add/remove groups or users who can manage this record

### Step 3: Verify DNS Propagation

```bash
# Test DNS resolution (wait 2-5 minutes after creating CNAME)
nslookup video-annotator.corp.amazon.com

# Or use dig
dig video-annotator.corp.amazon.com

# Should return your EC2 IP or hostname
```

### Step 4: Set Up SSL/TLS Certificate

Amazon internal apps require HTTPS. You have two options:

#### Option A: Use Amazon Certificate Manager (ACM)

1. **Request Certificate via SIM-T Ticket**
   - **Category**: Try searching for "SSL Certificate" OR use `IT Services` → `ServiceNow` (general)
   - **Note**: If you can't find "Security" or "SSL Certificate" categories, use the general IT Services → ServiceNow category and clearly state "SSL Certificate Request" in the title.
   - Subdomain: `video-annotator.corp.amazon.com`
   - Certificate Type: Internal Amazon CA

2. **Install Certificate on Your Server**
   ```bash
   # Certificate files will be provided by IT
   # Typically: certificate.crt, private.key, ca-bundle.crt
   ```

#### Option B: Use Internal Certificate Authority

1. **Access Amazon's Internal CA**
   - Go to: https://certificates.corp.amazon.com (or similar internal tool)
   - Request certificate for your subdomain
   - Download certificate files

2. **Configure on EC2 Instance**
   ```bash
   # Install certificate files
   sudo mkdir -p /etc/ssl/certs/video-annotator
   sudo cp certificate.crt /etc/ssl/certs/video-annotator/
   sudo cp private.key /etc/ssl/certs/video-annotator/
   sudo cp ca-bundle.crt /etc/ssl/certs/video-annotator/
   
   # Set permissions
   sudo chmod 600 /etc/ssl/certs/video-annotator/private.key
   sudo chmod 644 /etc/ssl/certs/video-annotator/*.crt
   ```

### Step 5: Configure Nginx with SSL

Update your Nginx configuration:

```nginx
# /etc/nginx/sites-available/video-annotator

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name video-annotator.corp.amazon.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name video-annotator.corp.amazon.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/video-annotator/certificate.crt;
    ssl_certificate_key /etc/ssl/certs/video-annotator/private.key;
    ssl_trusted_certificate /etc/ssl/certs/video-annotator/ca-bundle.crt;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Frontend (React app)
    location / {
        root /var/www/video-annotator/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
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

    # Logs
    access_log /var/log/nginx/video-annotator-access.log;
    error_log /var/log/nginx/video-annotator-error.log;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/video-annotator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Update Application Configuration

Update your frontend config to use the subdomain:

```typescript
// src/config.ts
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://video-annotator.corp.amazon.com'
  : 'http://localhost:3001'

export const SOCKET_URL = import.meta.env.PROD
  ? 'https://video-annotator.corp.amazon.com'
  : 'http://localhost:3001'
```

Rebuild frontend:
```bash
npm run build
```

### Step 7: Configure Security Groups (EC2)

Update your EC2 security group to allow HTTPS:

```bash
# Via AWS CLI
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/8  # Amazon internal network
```

Or via AWS Console:
1. Go to EC2 → Security Groups
2. Select your instance's security group
3. Add inbound rule:
   - Type: HTTPS
   - Port: 443
   - Source: Custom (10.0.0.0/8 for internal Amazon network)

## Option 2: Using AWS Route 53 (Alternative)

If your team has access to Route 53:

### Step 1: Create Hosted Zone (if needed)

```bash
aws route53 create-hosted-zone \
  --name your-team.amazon.com \
  --caller-reference $(date +%s)
```

### Step 2: Create DNS Record

```bash
# Get your hosted zone ID
aws route53 list-hosted-zones

# Create A record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "video-annotator.your-team.amazon.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_EC2_IP"}]
      }
    }]
  }'
```

### Step 3: Verify DNS Propagation

```bash
# Test DNS resolution
nslookup video-annotator.corp.amazon.com

# Or use dig
dig video-annotator.corp.amazon.com
```

## Option 3: Using Application Load Balancer (ALB) - Production Grade

For production deployments, use ALB with auto-scaling:

### Step 1: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name video-annotator-alb \
  --subnets subnet-12345 subnet-67890 \
  --security-groups sg-xxxxxxxxx \
  --scheme internal \
  --type application
```

### Step 2: Create Target Group

```bash
aws elbv2 create-target-group \
  --name video-annotator-targets \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxxxxxxxx \
  --health-check-path /api/health
```

### Step 3: Register EC2 Instance

```bash
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-xxxxxxxxx
```

### Step 4: Create HTTPS Listener

```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### Step 5: Point DNS to ALB

Update DNS to point to ALB DNS name:
```
video-annotator.corp.amazon.com → CNAME → video-annotator-alb-123456.us-east-1.elb.amazonaws.com
```

## Authentication Integration (Optional)

For internal Amazon apps, you may want to integrate with Midway/Kerberos:

### Option A: Midway Authentication

1. **Register App with Midway**
   - Go to: https://midway.amazon.com
   - Register new application
   - Get client ID and secret

2. **Add Midway Middleware to Backend**
   ```javascript
   // server/middleware/auth.js
   const midway = require('@amazon/midway-client')
   
   const authenticateUser = async (req, res, next) => {
     const token = req.headers.authorization
     
     try {
       const user = await midway.verifyToken(token)
       req.user = user
       next()
     } catch (error) {
       res.status(401).json({ error: 'Unauthorized' })
     }
   }
   
   module.exports = { authenticateUser }
   ```

### Option B: Kerberos/LDAP

1. **Configure Nginx for Kerberos**
   ```nginx
   location / {
       auth_gss on;
       auth_gss_keytab /etc/krb5.keytab;
       auth_gss_service_name HTTP/video-annotator.corp.amazon.com;
   }
   ```

## Checklist

- [ ] Choose subdomain name (e.g., video-annotator.corp.amazon.com)
- [ ] Access CNAME Editor: https://dns-manage-web.corp.proxy.amazon.com/
- [ ] Create CNAME using self-service tool (2 minutes)
- [ ] Verify DNS propagation (2-5 minutes)
- [ ] Request SSL certificate (if needed)
- [ ] Configure EC2 security groups (port 443)
- [ ] Install SSL certificate on server
- [ ] Configure Nginx with HTTPS
- [ ] Update application config with subdomain
- [ ] Rebuild and deploy frontend
- [ ] Test HTTPS access
- [ ] (Optional) Set up ALB for production
- [ ] (Optional) Integrate authentication
- [ ] Update documentation with new URL

## Timeline

- **DNS CNAME Creation**: Immediate (self-service, 2-5 minutes propagation)
- **SSL Certificate**: 1-2 business days (if requesting via ticket)
- **Configuration**: 1-2 hours
- **Testing**: 1 hour

**Total**: ~1-2 business days (down from 3-5 days!)

## Common Issues

### Issue: DNS not resolving
**Solution**: 
- Wait 2-5 minutes for DNS propagation (not 24 hours!)
- Verify you used the correct "Open Zone" in the CNAME Editor
- Check the CNAME was created successfully using "Find and Edit CNAME"
- Ensure you're on the Amazon corporate network

### Issue: "Invalid group owner" error in CNAME Editor
**Solution**: 
- Use `@software` as a temporary owner group (works for everyone)
- After creation, use "Manage DNS Data Ownership" tool to add your team group
- Group names must be prefixed with `@` (e.g., `@your-team`)

### Issue: Can't find my CNAME to edit it
**Solution**: 
- Make sure you're using the correct DNS stack (Corp vs Global vs Regional)
- For corp.amazon.com, use: https://dns-manage-web.corp.proxy.amazon.com/
- Enter the FULL alias name including domain (e.g., `video-annotator.corp.amazon.com`)

### Issue: SSL certificate errors
**Solution**: Ensure certificate matches subdomain exactly, check certificate chain

### Issue: 502 Bad Gateway
**Solution**: Check backend is running, verify Nginx proxy_pass configuration

### Issue: WebSocket connection fails
**Solution**: Ensure Nginx has WebSocket upgrade headers configured

## Support Resources

- **DNS Self-Service Tool**: https://dns-manage-web.corp.proxy.amazon.com/
- **DNS FAQ**: https://w.amazon.com/?DNSServiceFAQ
- **DNS Support (if self-service fails)**: https://t.corp.amazon.com/create/templates/ad0580dc-b9a2-457a-89f7-20cbb3387278
- **SSL Certificates**: Security Team ticket
- **AWS Resources**: Your AWS account admin
- **Networking**: Network Engineering team

## Important Notes

1. **Self-Service is Now Available**: You do NOT need to create tickets for corp.amazon.com CNAMEs
2. **Use the CNAME Editor**: https://dns-manage-web.corp.proxy.amazon.com/
3. **Changes are Fast**: DNS propagates in 2-5 minutes (not hours/days)
4. **You Control Ownership**: Set your team group as owner to manage the record
5. **Open Zones**: corp.amazon.com, aka.corp.amazon.com, integ.amazon.com are all open zones

## Example: Complete Setup Commands

```bash
# 1. Install SSL certificate
sudo mkdir -p /etc/ssl/certs/video-annotator
sudo cp ~/certificate.crt /etc/ssl/certs/video-annotator/
sudo cp ~/private.key /etc/ssl/certs/video-annotator/
sudo chmod 600 /etc/ssl/certs/video-annotator/private.key

# 2. Configure Nginx
sudo nano /etc/nginx/sites-available/video-annotator
# (paste configuration from above)

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/video-annotator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Update firewall
sudo ufw allow 443/tcp

# 5. Test
curl -I https://video-annotator.corp.amazon.com
```

## Next Steps

1. **Access the CNAME Editor** at https://dns-manage-web.corp.proxy.amazon.com/
2. **Create your CNAME** (takes 2 minutes, no ticket needed!)
3. **Verify DNS** works (wait 2-5 minutes)
4. While DNS propagates, prepare SSL certificate request
5. Configure Nginx with SSL
6. Test locally with hosts file override (optional)
7. Once DNS is live, verify and announce to team

## Security Considerations

- ✅ Use HTTPS only (no HTTP)
- ✅ Restrict access to Amazon internal network
- ✅ Keep SSL certificates up to date
- ✅ Enable security headers
- ✅ Consider adding authentication
- ✅ Monitor access logs
- ✅ Set up CloudWatch alarms

Your app will be accessible at: `https://video-annotator.corp.amazon.com` 🚀
