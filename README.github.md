# Video Annotator

A collaborative video annotation tool with real-time collaboration, cloud storage, and Figma integration.

## Features

- **Real-time Collaboration**: Multiple users can annotate videos simultaneously with Socket.io
- **Video Annotations**: Add timestamped annotations with screenshots at any point in the video
- **Comments & Discussions**: Thread-based commenting system on annotations
- **Cloud Storage**: S3 integration for video and screenshot storage
- **Figma Integration**: Link annotations to Figma designs for design-to-implementation workflows
- **Export Options**: Export annotations to Word documents with screenshots
- **Shareable Links**: Generate shareable links to specific annotations or comments
- **User Management**: Persistent username with localStorage and cookie support

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Socket.io client for real-time updates

### Backend
- Node.js with Express
- Socket.io for WebSocket connections
- AWS SDK for S3 storage
- Multer for file uploads

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- AWS account (for S3 storage)
- Optional: Figma account for design integration

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/video-annotator.git
cd video-annotator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create `server/.env`:
```env
PORT=3001
NODE_ENV=development
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
CORS_ORIGIN=http://localhost:5173
```

4. Configure AWS credentials:
- For local development: Use AWS CLI or environment variables
- For EC2 deployment: Attach IAM role with S3 permissions

## Development

### Run Frontend Dev Server
```bash
npm run dev
```
Frontend will be available at `http://localhost:5173`

### Run Backend Server
```bash
npm run server
```
Backend will be available at `http://localhost:3001`

## Production Build

1. Build the frontend:
```bash
npm run build
```

2. Update production config in `src/config.production.ts`:
```typescript
export const API_BASE_URL = 'http://your-domain:3001';
export const SOCKET_URL = API_BASE_URL;
```

3. Deploy built files to your server

## AWS S3 Setup

1. Create an S3 bucket:
```bash
aws s3 mb s3://your-video-bucket --region us-east-1
```

2. Configure CORS (see `apply-s3-cors.sh`):
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}
```

3. Set public access block settings:
```bash
aws s3api put-public-access-block \
  --bucket your-video-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

## Figma Integration

1. Get your Figma file URL
2. Extract the file key from the URL: `https://www.figma.com/file/{FILE_KEY}/...`
3. Create a Figma personal access token at https://www.figma.com/developers/api#access-tokens
4. Add to `server/.env`:
```env
FIGMA_ACCESS_TOKEN=your-token-here
```

## File Size Limits

- Video uploads: 2GB maximum
- Supported formats: MP4, MOV, AVI, MKV, WebM, FLV, WMV

## Project Structure

```
video-annotator/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── config.ts          # Development config
│   └── config.production.ts # Production config
├── server/                 # Backend Node.js server
│   ├── index.js           # Express server
│   ├── figma-service.js   # Figma API integration
│   └── .env               # Environment variables
├── dist/                   # Built frontend (generated)
└── package.json
```

## API Endpoints

### Videos
- `GET /api/videos` - List all videos
- `POST /api/upload` - Upload a new video
- `DELETE /api/videos/:id` - Delete a video

### Annotations
- `GET /api/annotations/:videoId` - Get annotations for a video
- `POST /api/annotations` - Create a new annotation
- `PUT /api/annotations/:id` - Update an annotation
- `DELETE /api/annotations/:id` - Delete an annotation

### Comments
- `POST /api/annotations/:annotationId/comments` - Add a comment
- `PUT /api/comments/:commentId` - Update a comment
- `DELETE /api/comments/:commentId` - Delete a comment

### Figma
- `GET /api/figma/file/:fileKey` - Get Figma file data
- `GET /api/figma/file/:fileKey/images` - Get Figma component images

### User
- `GET /api/current-user` - Get current user info

## WebSocket Events

### Client → Server
- `join-video` - Join a video room
- `new-annotation` - Broadcast new annotation
- `update-annotation` - Broadcast annotation update
- `delete-annotation` - Broadcast annotation deletion
- `new-comment` - Broadcast new comment

### Server → Client
- `annotations-loaded` - Initial annotations data
- `annotation-added` - New annotation from another user
- `annotation-updated` - Updated annotation from another user
- `annotation-deleted` - Deleted annotation from another user
- `comment-added` - New comment from another user

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions including:
- EC2 setup
- S3 configuration
- SuperNova domain setup
- Nginx reverse proxy
- SSL certificates

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/video-annotator/issues
- Documentation: See docs/ folder

## Acknowledgments

- Built with React, Node.js, and Socket.io
- Uses AWS S3 for storage
- Figma API for design integration
