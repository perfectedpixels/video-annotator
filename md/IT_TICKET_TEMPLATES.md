# IT Ticket Templates - Copy & Paste Ready

## ⚠️ Important Note About Ticket Categories

The IT Services category structure at Amazon changes periodically. The paths shown below are guidelines - the actual categories you see may differ.

**If you can't find the exact category path:**
1. Try using the **search function** in the ticket creation page (search for "DNS", "SSL", "AWS", etc.)
2. Look for **"ServiceNow"** under IT Services as a general category
3. Use the general IT Services category and **clearly state your request type in the title**
4. The IT team will route your ticket to the correct team based on the title and description

**Current known categories (as of your session):**
- IT Services → ServiceNow (general)
- IT Services → Andon-Halt
- IT Services → Content
- IT Services → GSD-E
- IT Services → IT_Comms
- IT Services → Learning & Development
- IT Services → Localization
- IT Services → New Hire Onboarding (NHO)
- IT Services → Operational Excellence
- IT Services → Partner Team Support
- IT Services → Policy
- IT Services → Printers
- IT Services → ServiceNow
- IT Services → Third Party Assessment

**Pro tip**: When in doubt, use **IT Services → ServiceNow** and make your request type crystal clear in the title (e.g., "DNS Request: ...", "SSL Certificate Request: ...", etc.)

---

## Ticket 1: DNS Entry Request

**Where**: https://t.corp.amazon.com

**Category Path**: 
```
OPTION A: Search for "DNS Request" in ticket creation
OPTION B: IT Services → ServiceNow → DNS/Network Request
OPTION C: IT Services → ServiceNow (general) - then specify DNS in title

Note: The exact category structure varies. If you can't find "Network" or "DNS" 
categories, use the general IT Services → ServiceNow category and clearly 
indicate "DNS Request" in your ticket title.
```

**Title**:
```
DNS Entry Request for Video Annotator Application
```

**Description** (copy and customize):
```
Request Type: New DNS Entry

Subdomain Requested: video-annotator.corp.amazon.com
Record Type: A Record
Target IP Address: [YOUR_EC2_INSTANCE_IP]

Purpose: 
Internal video annotation and collaboration tool for team video reviews. 
Enables real-time collaborative commenting on video content with screenshot 
capture and annotation features.

Business Justification:
- Improves team collaboration on video content review
- Centralizes video feedback and annotations
- Reduces email chains and scattered feedback
- Supports remote team collaboration

Expected Users: [YOUR_TEAM_NAME] team (~[NUMBER] users)
Expected Traffic: Low to moderate (internal use only)

Technical Details:
- Application: Node.js backend + React frontend
- Hosting: EC2 instance in us-east-1
- Storage: S3 bucket (your-video-annotation-bucket)
- Security: Internal Amazon network only

Contact: [YOUR_EMAIL]@amazon.com
Phone: [YOUR_PHONE]

Additional Notes:
This is an internal tool and will not be publicly accessible. 
Access will be restricted to Amazon corporate network.
```

**Priority**: Normal

**Urgency**: Medium

---

## Ticket 2: SSL Certificate Request

**Where**: https://t.corp.amazon.com

**Category Path**:
```
OPTION A: Search for "SSL Certificate" in ticket creation
OPTION B: IT Services → ServiceNow → Security/Certificate Request
OPTION C: IT Services → ServiceNow (general) - then specify SSL in title

Note: The exact category structure varies. If you can't find "Security" or 
"SSL Certificate" categories, use the general IT Services → ServiceNow 
category and clearly indicate "SSL Certificate Request" in your ticket title.
```

**Title**:
```
SSL Certificate Request for video-annotator.corp.amazon.com
```

**Description** (copy and customize):
```
Certificate Request Type: New Certificate

Domain Name: video-annotator.corp.amazon.com
Certificate Type: Internal Amazon CA Certificate
Certificate Format: PEM (preferred) or PFX

Purpose:
HTTPS encryption for internal video annotation application.

Application Details:
- Application Name: Video Annotator
- Server Type: Nginx on Amazon Linux 2
- EC2 Instance ID: [YOUR_INSTANCE_ID]
- Region: us-east-1

Certificate Requirements:
- Subject Alternative Names (SANs): video-annotator.corp.amazon.com
- Key Size: 2048-bit RSA (or higher)
- Validity Period: 1 year (standard)

Delivery Method:
Please provide certificate files via:
- certificate.crt (server certificate)
- private.key (private key)
- ca-bundle.crt (certificate chain)

Or provide download link via secure method.

Technical Contact: [YOUR_EMAIL]@amazon.com
Phone: [YOUR_PHONE]

Additional Information:
- This certificate will be installed on Nginx web server
- Application serves internal users only
- DNS entry ticket: [REFERENCE_TICKET_NUMBER_FROM_TICKET_1]

Security Compliance:
Application follows Amazon security best practices:
- HTTPS only (no HTTP)
- Internal network access only
- Regular security updates applied
```

**Priority**: Normal

**Urgency**: Medium

---

## Ticket 3: Security Group Update (If Needed)

**Where**: https://t.corp.amazon.com

**Category Path**:
```
OPTION A: Search for "AWS" or "Security Group" in ticket creation
OPTION B: IT Services → ServiceNow → Cloud Services/AWS Support
OPTION C: IT Services → ServiceNow (general) - then specify AWS in title

Note: For AWS-related requests, you may also be able to submit directly 
through AWS Console or your team's AWS admin.
```

**Title**:
```
Security Group Update for Video Annotator EC2 Instance
```

**Description** (copy and customize):
```
Request Type: Security Group Modification

EC2 Instance ID: [YOUR_INSTANCE_ID]
Security Group ID: [YOUR_SECURITY_GROUP_ID]
Region: us-east-1

Requested Changes:
Add inbound rule to allow HTTPS traffic from Amazon internal network

Rule Details:
- Type: HTTPS
- Protocol: TCP
- Port: 443
- Source: 10.0.0.0/8 (Amazon internal network)
- Description: HTTPS access for video-annotator.corp.amazon.com

Business Justification:
Enable HTTPS access to internal video annotation application after 
DNS and SSL certificate setup is complete.

Related Tickets:
- DNS Request: [TICKET_NUMBER_1]
- SSL Certificate: [TICKET_NUMBER_2]

Current Security Group Rules:
[LIST CURRENT RULES IF KNOWN]

Contact: [YOUR_EMAIL]@amazon.com
```

**Priority**: Normal

**Urgency**: Low

---

## Ticket 4: Load Balancer Setup (Optional - For Production)

**Where**: https://t.corp.amazon.com

**Category Path**:
```
OPTION A: Search for "Load Balancer" or "ALB" in ticket creation
OPTION B: IT Services → ServiceNow → Cloud Services/AWS Support
OPTION C: IT Services → ServiceNow (general) - then specify AWS ALB in title

Note: For AWS infrastructure requests, you may also be able to submit 
through AWS Console or your team's AWS admin.
```

**Title**:
```
Application Load Balancer Setup for Video Annotator
```

**Description** (copy and customize):
```
Request Type: New Application Load Balancer

Application Name: Video Annotator
Environment: Production
Region: us-east-1

Load Balancer Configuration:
- Type: Application Load Balancer (ALB)
- Scheme: Internal
- IP Address Type: IPv4
- Subnets: [YOUR_SUBNET_IDS]
- Security Groups: [YOUR_SECURITY_GROUP_IDS]

Target Configuration:
- Target Type: Instance
- Protocol: HTTP
- Port: 80
- Health Check Path: /api/health
- Target Instances: [YOUR_EC2_INSTANCE_IDS]

Listener Configuration:
- Protocol: HTTPS
- Port: 443
- SSL Certificate: [CERTIFICATE_ARN_FROM_TICKET_2]
- Default Action: Forward to target group

DNS Configuration:
- Domain: video-annotator.corp.amazon.com
- Record Type: CNAME
- Target: [ALB_DNS_NAME]

Business Justification:
- High availability for internal video annotation tool
- Support for auto-scaling in future
- Better traffic distribution
- Improved reliability

Contact: [YOUR_EMAIL]@amazon.com

Related Tickets:
- DNS Request: [TICKET_NUMBER_1]
- SSL Certificate: [TICKET_NUMBER_2]
```

**Priority**: Normal

**Urgency**: Low

---

## Quick Reference: What You Need Before Creating Tickets

### For DNS Ticket:
- [ ] EC2 instance IP address
- [ ] Desired subdomain name
- [ ] Team name and size
- [ ] Your contact information

### For SSL Certificate Ticket:
- [ ] Subdomain name (same as DNS ticket)
- [ ] EC2 instance ID
- [ ] DNS ticket number (reference)
- [ ] Your contact information

### For Security Group Ticket:
- [ ] EC2 instance ID
- [ ] Security group ID
- [ ] DNS and SSL ticket numbers
- [ ] Your contact information

---

## How to Find Required Information

### Find Your EC2 Instance IP:
```bash
# Via AWS CLI
aws ec2 describe-instances --instance-ids i-xxxxxxxxx --query 'Reservations[0].Instances[0].PublicIpAddress'

# Or via AWS Console
# EC2 → Instances → Select your instance → Copy "Public IPv4 address"
```

### Find Your Security Group ID:
```bash
# Via AWS CLI
aws ec2 describe-instances --instance-ids i-xxxxxxxxx --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId'

# Or via AWS Console
# EC2 → Instances → Select your instance → Security tab → Security groups
```

### Find Your Instance ID:
```bash
# If you're on the EC2 instance
ec2-metadata --instance-id

# Or via AWS Console
# EC2 → Instances → Instance ID column
```

---

## Ticket Tracking

Keep track of your tickets:

| Ticket Type | Ticket Number | Status | Created Date | Completed Date |
|-------------|---------------|--------|--------------|----------------|
| DNS Entry | | | | |
| SSL Certificate | | | | |
| Security Group | | | | |
| Load Balancer | | | | |

---

## Expected Response Times

| Ticket Type | Typical Response | Typical Resolution |
|-------------|------------------|-------------------|
| DNS Entry | 4-8 hours | 1-3 business days |
| SSL Certificate | 4-8 hours | 1-2 business days |
| Security Group | 2-4 hours | Same day |
| Load Balancer | 4-8 hours | 1-2 business days |

---

## Follow-Up Template

If you haven't heard back in 3 business days:

```
Subject: Follow-up on Ticket [TICKET_NUMBER]

Hi [Team Name],

I'm following up on ticket [TICKET_NUMBER] submitted on [DATE] 
regarding [DNS Entry/SSL Certificate/etc.] for video-annotator.corp.amazon.com.

Could you please provide an update on the status?

Thank you!
[YOUR_NAME]
```

---

## Tips for Faster Approval

1. ✅ **Be specific**: Include all required information upfront
2. ✅ **Reference related tickets**: Link DNS and SSL tickets together
3. ✅ **Explain business value**: Show how it helps your team
4. ✅ **Follow naming conventions**: Use standard Amazon subdomain patterns
5. ✅ **Respond quickly**: Answer any follow-up questions promptly
6. ✅ **Test first**: Ensure your app works locally before requesting DNS

---

## After Tickets Are Approved

1. ✅ Wait for DNS propagation (up to 24 hours)
2. ✅ Install SSL certificate on your server
3. ✅ Configure Nginx with HTTPS
4. ✅ Update application configuration
5. ✅ Test thoroughly
6. ✅ Announce to your team

**Your app will be live at**: `https://video-annotator.corp.amazon.com` 🚀
