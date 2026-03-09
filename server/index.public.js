/**
 * Video Annotator — Public/Education Version
 * 
 * This is the public deployment entry point (Railway/Vercel).
 * Differences from index.js (Amazon internal):
 *   - No workspace access control or basic auth headers
 *   - No X-Forwarded-User middleware
 *   - Simple username from request body/query (no auth enforcement)
 *   - CORS configured for Vercel frontend
 */
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadVideoToS3, getPresignedUrl, deleteVideoFromS3, streamVideoFromS3, isS3Configured } from './s3-service.js';
import { startTranscriptionJob, getTranscriptionJobStatus, fetchTranscriptFromUri, isTranscribeConfigured } from './transcribe-service.js';
import { generateVideoSummary } from './ai-summary-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USE_S3 = isS3Configured();
console.log(`Storage mode: ${USE_S3 ? 'S3' : 'Local filesystem'}`);

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
const normalizedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ''));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const normalized = origin.replace(/\/$/, '');
    const allowed = normalizedOrigins.some(o => o.replace(/\/$/, '') === normalized);
    if (allowed) return cb(null, origin);
    console.warn('CORS rejected:', origin, '| allowed:', normalizedOrigins);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Username']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded videos (local storage fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for video uploads
const storage = USE_S3 
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        try { await fs.mkdir(uploadDir, { recursive: true }); } catch {}
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 10e6
});

// In-memory storage
const annotations = new Map();
const users = new Map();
if (!global.videos) global.videos = [];

// Data persistence
const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');
const ANNOTATIONS_FILE = path.join(DATA_DIR, 'annotations.json');

async function loadPersistedData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const videosData = await fs.readFile(VIDEOS_FILE, 'utf8');
      global.videos = JSON.parse(videosData);
      console.log(`Loaded ${global.videos.length} videos from disk`);
    } catch (err) { if (err.code !== 'ENOENT') console.error('Error loading videos:', err); }
    try {
      const annotationsData = await fs.readFile(ANNOTATIONS_FILE, 'utf8');
      const annotationsObj = JSON.parse(annotationsData);
      if (Array.isArray(annotationsObj)) {
        annotationsObj.forEach(({ videoId, annotations: va }) => annotations.set(videoId, va));
      } else {
        Object.entries(annotationsObj).forEach(([videoId, va]) => annotations.set(videoId, va));
      }
      console.log(`Loaded annotations for ${annotations.size} videos from disk`);
    } catch (err) { if (err.code !== 'ENOENT') console.error('Error loading annotations:', err); }
  } catch (err) { console.error('Error in loadPersistedData:', err); }
}

async function savePersistedData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(VIDEOS_FILE, JSON.stringify(global.videos, null, 2));
    const annotationsArray = Array.from(annotations.entries()).map(([videoId, va]) => ({ videoId, annotations: va }));
    await fs.writeFile(ANNOTATIONS_FILE, JSON.stringify(annotationsArray, null, 2));
    console.log('Data persisted to disk');
  } catch (err) { console.error('Error saving data:', err); }
}

await loadPersistedData();
setInterval(savePersistedData, 5 * 60 * 1000);
process.on('SIGINT', async () => { await savePersistedData(); process.exit(0); });
process.on('SIGTERM', async () => { await savePersistedData(); process.exit(0); });

// Poll transcription job status
async function pollTranscriptionStatus(videoId, jobName, io) {
  const maxAttempts = 60;
  let attempts = 0;
  const poll = async () => {
    try {
      attempts++;
      const result = await getTranscriptionJobStatus(jobName);
      console.log(`Transcription status for ${videoId}: ${result.status} (attempt ${attempts}/${maxAttempts})`);
      if (result.status === 'COMPLETED') {
        const transcript = await fetchTranscriptFromUri(result.transcriptFileUri, videoId);
        const video = global.videos.find(v => v.id === videoId);
        if (video) {
          video.transcriptionStatus = 'completed';
          video.transcript = transcript;
          io.emit('video-updated', video);
          try {
            video.aiSummaryStatus = 'processing';
            io.emit('video-updated', video);
            const summary = await generateVideoSummary(transcript);
            video.aiSummary = summary;
            video.aiSummaryStatus = 'completed';
            io.emit('video-updated', video);
          } catch (summaryError) {
            console.error(`AI summary failed for ${videoId}:`, summaryError);
            video.aiSummaryStatus = 'failed';
            io.emit('video-updated', video);
          }
        }
      } else if (result.status === 'FAILED') {
        const video = global.videos.find(v => v.id === videoId);
        if (video) { video.transcriptionStatus = 'failed'; io.emit('video-updated', video); }
      } else if (result.status === 'IN_PROGRESS' && attempts < maxAttempts) {
        setTimeout(poll, 30000);
      } else if (attempts >= maxAttempts) {
        const video = global.videos.find(v => v.id === videoId);
        if (video) { video.transcriptionStatus = 'failed'; io.emit('video-updated', video); }
      }
    } catch (error) {
      console.error(`Error polling transcription for ${videoId}:`, error);
      const video = global.videos.find(v => v.id === videoId);
      if (video) { video.transcriptionStatus = 'failed'; io.emit('video-updated', video); }
    }
  };
  setTimeout(poll, 30000);
}

// Upload video
app.post('/api/upload-video', (req, res) => {
  upload.single('video')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'File size exceeds 2GB limit' });
      return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ success: false, error: `Upload failed: ${err.message}` });
    }
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No video file provided' });
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = uniqueSuffix + path.extname(req.file.originalname);
      const videoId = uniqueSuffix.toString();
      let videoUrl, s3Key = null;
      if (USE_S3) {
        s3Key = await uploadVideoToS3(req.file.buffer, filename, req.file.mimetype);
        const baseUrl = getBaseUrl(req);
        videoUrl = `${baseUrl}/api/video-proxy?key=${encodeURIComponent(s3Key)}`;
      } else {
        videoUrl = `http://localhost:${process.env.PORT || 3001}/uploads/${req.file.filename}`;
      }
      const { title, description, tags, username, workspace } = req.body;
      const videoMetadata = {
        id: videoId,
        filename: USE_S3 ? s3Key : req.file.filename,
        url: videoUrl,
        s3Key,
        title: title || 'Untitled Video',
        description: description || '',
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        username: username || 'anonymous',
        workspace: workspace || null,
        uploadedAt: Date.now(),
        size: req.file.size,
        useS3: USE_S3
      };
      global.videos.push(videoMetadata);
      if (USE_S3 && s3Key && isTranscribeConfigured() && process.env.DISABLE_TRANSCRIPTION !== 'true') {
        try {
          const transcriptionResult = await startTranscriptionJob(videoId, s3Key);
          videoMetadata.transcriptionStatus = 'processing';
          videoMetadata.transcriptionJobId = transcriptionResult.jobName;
          pollTranscriptionStatus(videoId, transcriptionResult.jobName, io);
        } catch (error) {
          console.error('Failed to start transcription:', error);
          videoMetadata.transcriptionStatus = 'failed';
        }
      }
      await savePersistedData();
      res.json({ success: true, video: videoMetadata });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

// Video proxy — streams from S3 to avoid CORS (no S3 CORS config needed)
app.get('/api/video-proxy', async (req, res) => {
  const key = req.query.key;
  if (!key || !USE_S3) return res.status(400).json({ error: 'Missing key' });
  try {
    const obj = await streamVideoFromS3(key);
    res.setHeader('Content-Type', obj.ContentType || 'video/mp4');
    if (obj.ContentLength) res.setHeader('Content-Length', obj.ContentLength);
    obj.Body.pipe(res);
  } catch (err) {
    console.error('Video proxy error:', err);
    res.status(404).json({ error: 'Video not found' });
  }
});

// Get base URL for proxy (Railway sets X-Forwarded-*)
function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host') || req.headers.host;
  return `${proto}://${host}`;
}

// Get all videos
app.get('/api/videos', async (req, res) => {
  const { username, search, workspace, archived } = req.query;
  let videos = global.videos || [];
  if (username) videos = videos.filter(v => v.username === username);
  if (search) {
    const s = search.toLowerCase();
    videos = videos.filter(v => v.title.toLowerCase().includes(s) || v.tags.some(t => t.toLowerCase().includes(s)));
  }
  if (workspace) videos = videos.filter(v => v.workspace === workspace);
  const showArchived = archived === 'true';
  videos = videos.filter(v => showArchived ? v.archived === true : v.archived !== true);
  const baseUrl = getBaseUrl(req);
  if (USE_S3) {
    videos = videos.map((video) => {
      if (video.s3Key) return { ...video, url: `${baseUrl}/api/video-proxy?key=${encodeURIComponent(video.s3Key)}` };
      return video;
    });
  }
  res.json({ success: true, videos: videos.reverse() });
});

// Current user — public version just returns the username from query/header
app.get('/api/current-user', (req, res) => {
  const username = req.query.username || req.headers['x-username'] || 'guest';
  res.json({
    success: true,
    username,
    accessType: 'full-access',
    allowedWorkspaces: null,
    restrictedTo: null,
    isRestricted: false
  });
});

// Tags
app.get('/api/tags', (req, res) => {
  const videos = global.videos || [];
  const uniqueTags = [...new Set(videos.flatMap(v => v.tags))];
  res.json({ success: true, tags: uniqueTags });
});

// Delete video
app.delete('/api/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const videos = global.videos || [];
    const idx = videos.findIndex(v => v.id === videoId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Video not found' });
    const video = videos[idx];
    if (video.useS3 && video.s3Key) await deleteVideoFromS3(video.s3Key);
    else await fs.unlink(path.join(__dirname, 'uploads', video.filename)).catch(() => {});
    videos.splice(idx, 1);
    await savePersistedData();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update video metadata
app.put('/api/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, tags, workspace, archived } = req.body;
    const videos = global.videos || [];
    const idx = videos.findIndex(v => v.id === videoId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Video not found' });
    videos[idx] = {
      ...videos[idx],
      ...(title !== undefined && { title }),
      ...(tags !== undefined && { tags }),
      ...(workspace !== undefined && { workspace }),
      ...(archived !== undefined && { archived })
    };
    await savePersistedData();
    res.json({ success: true, video: videos[idx] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Annotation counts
app.get('/api/annotation-counts', (req, res) => {
  const counts = {}, lastUpdated = {};
  for (const [videoId, va] of annotations.entries()) {
    counts[videoId] = va.length;
    if (va.length > 0) lastUpdated[videoId] = Math.max(...va.map(a => a.createdAt));
  }
  res.json({ success: true, counts, lastUpdated });
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join-video', ({ videoId, username }) => {
    users.set(socket.id, username);
    socket.join(videoId);
    socket.emit('annotations-loaded', annotations.get(videoId) || []);
    socket.to(videoId).emit('user-joined', { username });
  });
  socket.on('add-annotation', ({ videoId, annotation }) => {
    if (!annotations.has(videoId)) annotations.set(videoId, []);
    annotations.get(videoId).push(annotation);
    io.to(videoId).emit('annotation-added', annotation);
    savePersistedData();
  });
  socket.on('add-comment', ({ videoId, annotationId, comment }) => {
    const va = annotations.get(videoId);
    if (va) {
      const a = va.find(a => a.id === annotationId);
      if (a) { if (!a.comments) a.comments = []; a.comments.push(comment); io.to(videoId).emit('comment-added', { annotationId, comment }); savePersistedData(); }
    }
  });
  socket.on('update-annotation', ({ videoId, annotation }) => {
    const va = annotations.get(videoId);
    if (va) { const i = va.findIndex(a => a.id === annotation.id); if (i !== -1) { va[i] = annotation; io.to(videoId).emit('annotation-updated', annotation); savePersistedData(); } }
  });
  socket.on('delete-annotation', ({ videoId, annotationId }) => {
    const va = annotations.get(videoId);
    if (va) { const i = va.findIndex(a => a.id === annotationId); if (i !== -1) { va.splice(i, 1); io.to(videoId).emit('annotation-deleted', annotationId); savePersistedData(); } }
  });
  socket.on('disconnect', () => { users.delete(socket.id); });
});

// Health check
// Debug: verify CORS and config (no secrets)
app.get('/api/debug', (req, res) => {
  res.json({
    ok: true,
    storage: USE_S3 ? 'S3' : 'local',
    corsOrigins: normalizedOrigins,
    requestOrigin: req.headers.origin || '(none)'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now(), storage: USE_S3 ? 's3' : 'local', uptime: process.uptime() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Storage: ${USE_S3 ? 'AWS S3' : 'Local filesystem'}`);
});
