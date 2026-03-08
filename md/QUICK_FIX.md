# Quick Fix - Deploy Frontend to EC2

## The Issue
The `dist` folder (frontend files) is missing on EC2. The server is running but has nothing to serve.

## The Fix (Run These 3 Commands)

### 1. Build the frontend locally:
```bash
npm run build
```

### 2. Upload dist folder to EC2:
```bash
scp -i ~/Downloads/video-annotator-keypair.pem -r dist ec2-user@54.234.105.21:~/
```

### 3. Restart the server:
```bash
ssh -i ~/Downloads/video-annotator-keypair.pem ec2-user@54.234.105.21 "pm2 restart video-annotator"
```

## Test It

1. **Disconnect from Amazon VPN** (blocks port 3001)
2. Open: `http://54.234.105.21:3001`
3. Should load immediately!

## Why This Works

The server code at `~/server/index.js` looks for static files at `../dist/` (one level up).

Directory structure after fix:
```
/home/ec2-user/
├── dist/         ← Frontend (React)
└── server/       ← Backend (Node.js)
```

## Alternative: Use Deploy Script

```bash
./deploy-to-ec2.sh
```

This does all 3 steps automatically.
