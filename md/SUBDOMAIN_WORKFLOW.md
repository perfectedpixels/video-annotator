# Subdomain Setup Workflow - Visual Guide

## Complete Process Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBDOMAIN SETUP WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: PREPARATION (30 minutes)
┌──────────────────────────────────────────────────────────────┐
│ 1. Gather Information                                         │
│    ├─ EC2 Instance IP: ___.___.___.___ ✓                    │
│    ├─ Instance ID: i-xxxxxxxxxxxxxxxxx ✓                     │
│    ├─ Security Group ID: sg-xxxxxxxxx ✓                      │
│    ├─ Desired subdomain: video-annotator.corp.amazon.com ✓  │
│    └─ Team info and contact details ✓                        │
└──────────────────────────────────────────────────────────────┘
                              ↓
PHASE 2: DNS REQUEST (1-3 business days)
┌──────────────────────────────────────────────────────────────┐
│ 2. Create DNS Ticket                                          │
│    ├─ Go to: https://t.corp.amazon.com                       │
│    ├─ Category: IT Services → Network → DNS Request          │
│    ├─ Fill template from IT_TICKET_TEMPLATES.md              │
│    └─ Submit and note ticket number: ___________             │
│                                                               │
│    ⏱️  Wait: 1-3 business days                               │
│    📧 You'll receive: Confirmation email when DNS is live    │
└──────────────────────────────────────────────────────────────┘
                              ↓
PHASE 3: SSL CERTIFICATE (1-2 business days)
┌──────────────────────────────────────────────────────────────┐
│ 3. Request SSL Certificate                                    │
│    ├─ Go to: https://t.corp.amazon.com                       │
│    ├─ Category: IT Services → Security → SSL Certificate     │
│    ├─ Fill template from IT_TICKET_TEMPLATES.md              │
│    ├─ Reference DNS ticket number                            │
│    └─ Submit and note ticket number: ___________             │
│                                                               │
│    ⏱️  Wait: 1-2 business days                               │
│    📧 You'll receive: Certificate files or download link     │
│    📦 Files: certificate.crt, private.key, ca-bundle.crt     │
└──────────────────────────────────────────────────────────────┘
                              ↓
PHASE 4: SERVER CONFIGURATION (1 hour)
┌──────────────────────────────────────────────────────────────┐
│ 4. Install SSL Certificate                                    │
│    $ sudo mkdir -p /etc/ssl/certs/video-annotator           │
│    $ sudo cp certificate.crt /etc/ssl/certs/video-annotator/│
│    $ sudo cp private.key /etc/ssl/certs/video-annotator/    │
│    $ sudo chmod 600 /etc/ssl/certs/video-annotator/*.key    │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. Configure Nginx                                            │
│    $ sudo nano /etc/nginx/sites-available/video-annotator   │
│    [Paste config from QUICK_SUBDOMAIN_GUIDE.md]             │
│    $ sudo ln -s /etc/nginx/sites-available/video-annotator \│
│                 /etc/nginx/sites-enabled/                    │
│    $ sudo nginx -t                                           │
│    $ sudo systemctl reload nginx                             │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. Update Firewall                                            │
│    $ sudo ufw allow 443/tcp                                  │
│    $ sudo ufw status                                         │
└──────────────────────────────────────────────────────────────┘
                              ↓
PHASE 5: APPLICATION UPDATE (15 minutes)
┌──────────────────────────────────────────────────────────────┐
│ 7. Update Frontend Config                                     │
│    Edit: src/config.ts                                       │
│    Change API_BASE_URL to:                                   │
│    'https://video-annotator.corp.amazon.com'                 │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 8. Rebuild and Deploy                                         │
│    $ npm run build                                           │
│    $ sudo cp -r dist/* /var/www/video-annotator/dist/       │
└──────────────────────────────────────────────────────────────┘
                              ↓
PHASE 6: TESTING (15 minutes)
┌──────────────────────────────────────────────────────────────┐
│ 9. Verify DNS                                                 │
│    $ nslookup video-annotator.corp.amazon.com               │
│    ✓ Should return your EC2 IP                              │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 10. Test HTTPS                                                │
│     $ curl -I https://video-annotator.corp.amazon.com       │
│     ✓ Should return 200 OK                                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 11. Browser Test                                              │
│     Open: https://video-annotator.corp.amazon.com           │
│     ✓ No SSL warnings                                       │
│     ✓ App loads correctly                                   │
│     ✓ Upload video works                                    │
│     ✓ Annotations work                                      │
│     ✓ Real-time collaboration works                         │
└──────────────────────────────────────────────────────────────┘
                              ↓
PHASE 7: LAUNCH (5 minutes)
┌──────────────────────────────────────────────────────────────┐
│ 12. Announce to Team                                          │
│     📧 Send email with:                                      │
│     - URL: https://video-annotator.corp.amazon.com          │
│     - Quick start guide                                     │
│     - Support contact                                       │
└──────────────────────────────────────────────────────────────┘
                              ↓
                    ✅ LIVE IN PRODUCTION! 🚀
```

## Timeline Breakdown

```
Day 1 (You):
├─ 09:00 AM - Gather information (30 min)
├─ 09:30 AM - Submit DNS ticket (10 min)
├─ 09:40 AM - Submit SSL ticket (10 min)
└─ 10:00 AM - Wait for approvals ⏳

Day 2-3 (IT Team):
├─ DNS team reviews request
├─ Security team reviews SSL request
└─ Both teams process and approve

Day 4 (You):
├─ 09:00 AM - Receive DNS confirmation ✓
├─ 10:00 AM - Receive SSL certificate ✓
├─ 10:30 AM - Install certificate (30 min)
├─ 11:00 AM - Configure Nginx (30 min)
├─ 11:30 AM - Update app config (15 min)
├─ 11:45 AM - Deploy (15 min)
├─ 12:00 PM - Test (15 min)
└─ 12:15 PM - Announce to team ✓

Total: ~4 days (3 days waiting, 1 day work)
```

## Parallel vs Sequential Tasks

### ✅ Can Do in Parallel:
```
┌─────────────────┐     ┌─────────────────┐
│  DNS Ticket     │     │  SSL Ticket     │
│  (Submit same   │ AND │  (Submit same   │
│   time)         │     │   time)         │
└─────────────────┘     └─────────────────┘
```

### ❌ Must Do Sequentially:
```
1. DNS Ticket
   ↓ (wait for approval)
2. SSL Certificate
   ↓ (wait for files)
3. Server Configuration
   ↓
4. App Update
   ↓
5. Testing
```

## Decision Tree

```
Do you have EC2 instance running?
├─ YES → Continue to DNS ticket
└─ NO → Deploy to EC2 first (see DEPLOYMENT.md)

Do you have a preferred subdomain?
├─ YES → Use it in DNS ticket
└─ NO → Use: video-annotator.corp.amazon.com

Does your team have existing domain?
├─ YES (e.g., team.amazon.com)
│   └─ Ask team admin to add subdomain
│       (Faster: ~1 day)
└─ NO → Request new subdomain via IT ticket
        (Standard: ~3 days)

Do you need high availability?
├─ YES → Request ALB setup (see Ticket 4)
└─ NO → Single EC2 is fine

Do you need authentication?
├─ YES → Add Midway/Kerberos (see SUBDOMAIN_SETUP.md)
└─ NO → Username-based is fine for now
```

## Troubleshooting Flowchart

```
Problem: Can't access subdomain
├─ Check 1: Is DNS live?
│   $ nslookup video-annotator.corp.amazon.com
│   ├─ NO → Wait longer or contact IT
│   └─ YES → Continue to Check 2
│
├─ Check 2: Is Nginx running?
│   $ sudo systemctl status nginx
│   ├─ NO → sudo systemctl start nginx
│   └─ YES → Continue to Check 3
│
├─ Check 3: Is SSL configured?
│   $ sudo nginx -t
│   ├─ ERROR → Fix config and reload
│   └─ OK → Continue to Check 4
│
├─ Check 4: Is port 443 open?
│   $ sudo ufw status
│   ├─ NO → sudo ufw allow 443/tcp
│   └─ YES → Continue to Check 5
│
└─ Check 5: Is backend running?
    $ curl http://localhost:3001/api/videos
    ├─ ERROR → Start backend: cd server && node index.js
    └─ OK → Check browser console for errors
```

## Success Checklist

```
Pre-Launch Checklist:
□ DNS ticket approved and live
□ SSL certificate installed
□ Nginx configured and running
□ Port 443 open in firewall
□ Backend server running
□ Frontend built and deployed
□ DNS resolves correctly
□ HTTPS works without warnings
□ App loads in browser
□ Video upload works
□ Annotations work
□ Real-time sync works
□ S3 storage works
□ Screenshot capture works

Post-Launch Checklist:
□ Team notified
□ Documentation updated
□ Monitoring set up (optional)
□ Backup strategy in place
□ Support process defined
```

## Quick Commands Reference

```bash
# Check DNS
nslookup video-annotator.corp.amazon.com
dig video-annotator.corp.amazon.com

# Check SSL
openssl s_client -connect video-annotator.corp.amazon.com:443

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx

# Check firewall
sudo ufw status
sudo ufw allow 443/tcp

# Check backend
curl http://localhost:3001/api/videos
ps aux | grep node

# Check logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Support Contacts

```
┌─────────────────────────────────────────────────────────┐
│ Issue Type          │ Contact                           │
├─────────────────────────────────────────────────────────┤
│ DNS not working     │ IT Service Desk (t.corp.amazon)  │
│ SSL certificate     │ Security Team ticket             │
│ AWS/EC2 issues      │ AWS Support ticket               │
│ Network/firewall    │ Network Engineering team         │
│ App bugs            │ Your development team            │
└─────────────────────────────────────────────────────────┘
```

---

**Next Steps**: 
1. Review `IT_TICKET_TEMPLATES.md` for copy-paste ticket templates
2. Review `QUICK_SUBDOMAIN_GUIDE.md` for detailed commands
3. Review `SUBDOMAIN_SETUP.md` for comprehensive documentation

**Your app will be live at**: `https://video-annotator.corp.amazon.com` 🚀
