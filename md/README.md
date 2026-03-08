# Video Annotator

A collaborative video annotation app with Figma-style commenting that allows teams to provide feedback on uploaded videos with timestamped comments, pin markers, and drawing tools.

## Features

### 🎥 Video Management
- Upload videos with title and tags
- Video library with search functionality
- Personal video collection ("My Videos")
- Video sharing with shareable links
- Delete videos with confirmation

### 💬 Figma-Style Commenting
- Drop pin markers on video screenshots
- Add comments directly at pin locations
- Threaded conversations with replies
- User avatars with initials in random colors
- Hover preview cards showing comment snippets
- Click to expand full comment threads

### 🎨 Drawing & Annotation Tools
- Pin marker tool (default) for precise feedback
- Drawing tool with color picker and line width control
- Undo/Redo functionality for drawings
- Zoom controls (50%-300%) with fullscreen option
- High-resolution screenshots (Full HD 1920x1080)
- Maintains video aspect ratio

### 👥 Real-Time Collaboration
- Multi-user collaboration via WebSocket
- Live sync of comments and annotations
- See who added what feedback in real-time

### 📤 Export Options
- Export to Word document (.docx) with screenshots
- Export to Quip (markdown format)
- Download individual annotated screenshots

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Start the Backend Server

```bash
cd server
npm start
```

The server will run on `http://localhost:3001`

### 3. Start the Frontend (in a new terminal)

```bash
npm run dev
```

The app will run on `http://localhost:5173`

## How to Use

### Getting Started
1. **Set Your Username**: Enter your username when you first open the app
2. **Upload a Video**: 
   - Click "Add Video" (purple button)
   - Enter a title (required)
   - Add tags for organization (optional, with suggestions)
   - Select your video file
   - Click "Upload Video"

### Adding Comments
1. **Select a Video**: Click on any video from the library
2. **Add Comment**: Click the "+Add Comment" button above the video
3. **Drop a Pin**: Click anywhere on the screenshot to place a pin marker
4. **Write Comment**: Type your feedback in the comment box that appears
5. **Post**: Click "Post" to save your comment

### Drawing on Screenshots
1. Click "+Add Comment" button
2. Select the "Draw" tool
3. Choose your color and line width
4. Draw on the screenshot
5. Use Undo/Redo as needed
6. Click "Save Comments" when done

### Viewing & Replying to Comments
1. **Hover** over any pin marker to see a preview of the comment
2. **Click** the pin to open the full comment thread
3. **Reply** by typing in the reply box at the bottom
4. **Navigate** by clicking timestamps to jump to that moment in the video

### Exporting
- **Word**: Click "Export to Word" for a comprehensive .docx report with all comments and screenshots
- **Quip**: Click "Export to Quip" to download a markdown file

### Sharing
- Click the "Share" button to share the video with others
- Uses native Web Share API or copies link to clipboard

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **UI Components**: Custom components with shadcn/ui patterns
- **Icons**: Lucide React
- **Backend**: Node.js, Express
- **Real-time**: Socket.io for WebSocket connections
- **File Upload**: Multer for handling video uploads
- **Export**: docx library for Word export, file-saver for downloads

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── AnnotationModal.tsx    # Main commenting interface
│   │   ├── VideoLibrary.tsx       # Video grid and search
│   │   ├── VideoUploadForm.tsx    # Upload interface
│   │   └── ui/                    # Reusable UI components
│   ├── App.tsx                    # Main app with navigation
│   └── main.tsx                   # Entry point
├── server/
│   ├── index.js                   # Express + Socket.io server
│   ├── uploads/                   # Uploaded video storage
│   └── package.json
└── package.json
```

## Storage & Data

- **Videos**: Stored locally in `server/uploads/` directory
- **Metadata**: Stored in-memory (resets on server restart)
- **Annotations**: Synced via Socket.io, stored in-memory

### For Production Use

Consider implementing:
- **Database**: MongoDB or PostgreSQL for persistent storage
- **Cloud Storage**: AWS S3 or similar for video files
- **Authentication**: User accounts and permissions
- **Security**: Rate limiting, input validation, CORS configuration
- **CDN**: For faster video delivery
- **Backup**: Regular backups of videos and annotations

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires modern browser with HTML5 video support

## Known Limitations

- Videos are stored locally on the server
- Annotations are stored in-memory (lost on server restart)
- No user authentication (username-based only)
- Single server instance (no horizontal scaling)

## Future Enhancements

- [ ] Persistent database storage
- [ ] User authentication and permissions
- [ ] Video transcoding for different qualities
- [ ] Annotation history and versioning
- [ ] Email notifications for new comments
- [ ] Integration with Slack/Chime
- [ ] Mobile app support
- [ ] Video trimming and editing

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
