import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';
// @ts-ignore
import ffmpegStatic from 'ffmpeg-static';
// @ts-ignore
import ffprobeStatic from 'ffprobe-static';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import {
  listAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  duplicateAssessment,
  previewAssessment,
  getCategories
} from '../controllers/admin/assessmentAdminController';
import {
  getAnalytics,
  getUserAnalytics,
  getContentAnalytics,
  getAssessmentAnalytics
} from '../controllers/admin/analyticsController';
import {
  getAIPerformanceAnalytics,
  getCrisisDetectionAnalytics,
  getSystemHealthAnalytics,
  getUserEngagementAnalytics,
  getWellnessImpactAnalytics,
  getComprehensiveAnalytics
} from '../controllers/admin/advancedAnalyticsController';
import {
  getUsers,
  getUserDetails,
  updateUserStatus,
  getUserActivity,
  deleteUser,
  resetUserPassword,
  getUserStats
} from '../controllers/admin/userManagementController';
import {
  bulkUpdateAssessmentStatus,
  bulkDeleteAssessments,
  bulkUpdatePracticeStatus,
  bulkDeletePractices,
  bulkUpdateContentStatus,
  bulkDeleteContent,
  bulkUpdateAssessmentTags,
  bulkUpdatePracticeApproach,
  bulkUpdateContentType
} from '../controllers/admin/bulkOperationsController';
import {
  getActivityLogs,
  getActivityStats,
  getActivityFilters,
  exportActivityLogs,
  logActivity
} from '../controllers/admin/activityLogController';
import { validate } from '../middleware/validate';
import {
  createAssessmentSchema,
  updateAssessmentSchema
} from '../api/validators/adminAssessment.validator';

const router = express.Router();
const prisma = new PrismaClient();
// Configure ffmpeg binaries if available
try {
  if (ffmpegStatic) (ffmpeg as any).setFfmpegPath(ffmpegStatic as string);
  if (ffprobeStatic?.path) (ffmpeg as any).setFfprobePath(ffprobeStatic.path);
} catch (e) {
  console.warn('FFmpeg setup warning:', e);
}

// Admin emails – configurable via ADMIN_EMAILS env var (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@example.com,admin@mentalwellbeing.ai')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// Multer storage configuration with validation
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/aac'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// Validation schemas for content management
const contentValidationSchema = Joi.object({
  title: Joi.string().required().max(200),
  type: Joi.string().required(),
  category: Joi.string().required(),
  approach: Joi.string().required(),
  content: Joi.string().allow(''),
  description: Joi.string().required().max(2000),
  url: Joi.string().uri().allow('', null).optional(),
  youtubeUrl: Joi.string().max(50).allow('', null).optional(),
  thumbnailUrl: Joi.string().uri().allow('', null).optional(),
  duration: Joi.number().integer().min(0).allow(null).optional(),
  difficulty: Joi.string().allow('', null).optional(), // Legacy field - kept for backward compatibility
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  isPublished: Joi.boolean().optional(),
  // Enhanced fields
  contentType: Joi.string().allow(null).optional(), // Legacy field - kept for backward compatibility
  intensityLevel: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
  focusAreas: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  immediateRelief: Joi.boolean().optional(),
  crisisEligible: Joi.boolean().optional(), // NEW V2
  timeOfDay: Joi.array().items(Joi.string().valid('morning', 'afternoon', 'evening', 'night')).optional(), // NEW V2
  environment: Joi.array().items(Joi.string().valid('home', 'work', 'public', 'nature')).optional(), // NEW V2
  culturalContext: Joi.string().max(500).allow('', null).optional(),
  hasSubtitles: Joi.boolean().optional(),
  transcript: Joi.string().max(50000).allow('', null).optional()
});

const practiceValidationSchema = Joi.object({
  title: Joi.string().required().max(200),
  type: Joi.string().required(),
  approach: Joi.string().required(),
  description: Joi.string().max(2000).allow('', null).optional(),
  youtubeUrl: Joi.string().max(50).allow('', null).optional(),
  thumbnailUrl: Joi.string().uri().allow('', null).optional(),
  duration: Joi.number().integer().min(0).required(),
  difficulty: Joi.string().required(), // Frontend sends 'level' mapped to 'difficulty'
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  instructions: Joi.string().max(5000).allow('', null).optional(),
  benefits: Joi.string().max(2000).allow('', null).optional(),
  precautions: Joi.string().max(2000).allow('', null).optional(),
  format: Joi.string().allow('', null).optional(),
  audioUrl: Joi.string().uri().allow('', null).optional(),
  videoUrl: Joi.string().uri().allow('', null).optional(),
  isPublished: Joi.boolean().optional(),
  // New enhanced fields
  category: Joi.string().valid(
    'MEDITATION', 'YOGA', 'BREATHING', 'MINDFULNESS', 'JOURNALING',
    'CBT_TECHNIQUE', 'GROUNDING_EXERCISE', 'SELF_REFLECTION',
    'MOVEMENT', 'SLEEP_HYGIENE'
  ).allow(null).optional(),
  intensityLevel: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
  focusAreas: Joi.array().items(Joi.string().max(100)).max(10).optional(), // NEW V2
  immediateRelief: Joi.boolean().optional(), // NEW V2
  crisisEligible: Joi.boolean().optional(), // NEW V2
  requiredEquipment: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  environment: Joi.array().items(Joi.string().valid('home', 'work', 'public', 'nature')).optional(),
  timeOfDay: Joi.array().items(Joi.string().valid('morning', 'afternoon', 'evening', 'night')).optional(),
  sensoryEngagement: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  steps: Joi.array().items(Joi.object({
    step: Joi.number().required(),
    instruction: Joi.string().required().max(500),
    duration: Joi.number().optional()
  })).max(50).optional(),
  contraindications: Joi.array().items(Joi.string().max(200)).max(20).optional()
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const base = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    const folder = file.mimetype.startsWith('image/') ? 'thumbnails' : 'media';
    const dest = path.join(base, folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname) || '.' + (file.mimetype.split('/')[1] || 'dat');
    cb(null, unique + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB hard cap
  fileFilter: (req, file, cb) => {
    const { mimetype } = file;
    const ok = ALLOWED_IMAGE.includes(mimetype) || ALLOWED_AUDIO.includes(mimetype) || ALLOWED_VIDEO.includes(mimetype);
    if (!ok) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  }
});

function youtubeThumbFromId(id?: string | null) {
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function parseIsoDuration(iso?: string | null) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
}

type YouTubeMetadata = {
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  isoDuration: string | null;
};

async function getYouTubeMetadata(id: string): Promise<YouTubeMetadata | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const normalizedId = id.trim();
  const fullUrl = normalizedId.startsWith('http')
    ? normalizedId
    : `https://www.youtube.com/watch?v=${encodeURIComponent(normalizedId)}`;

  const attemptApiKey = async (): Promise<YouTubeMetadata | null> => {
    if (!apiKey) return null;
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(normalizedId)}&key=${apiKey}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn('YouTube API request failed', resp.status, resp.statusText);
        return null;
      }
      const data: any = await resp.json();
      const item = data.items?.[0];
      if (!item) return null;
      const snippet = item.snippet || {};
      const durationSeconds = parseIsoDuration(item.contentDetails?.duration);
      return {
        title: snippet.title || null,
        description: snippet.description || null,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || youtubeThumbFromId(normalizedId),
        durationSeconds,
        isoDuration: item.contentDetails?.duration || null
      };
    } catch (err) {
      console.error('YouTube API metadata fetch error', err);
      return null;
    }
  };

  const attemptYtdl = async (): Promise<YouTubeMetadata | null> => {
    try {
      const info = await ytdl.getBasicInfo(fullUrl);
      const details = info.videoDetails;
      if (!details) return null;
      const thumbs = details.thumbnails || [];
      const bestThumb = thumbs.length ? thumbs[thumbs.length - 1].url : youtubeThumbFromId(normalizedId);
      const durationSeconds = details.lengthSeconds ? parseInt(details.lengthSeconds, 10) : 0;
      return {
        title: details.title || null,
        description: details.description || null,
        thumbnail: bestThumb || youtubeThumbFromId(normalizedId),
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
        isoDuration: null
      };
    } catch (err) {
      console.error('YouTube fallback metadata fetch error', err);
      return null;
    }
  };

  const attemptOEmbed = async (): Promise<YouTubeMetadata | null> => {
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(fullUrl)}&format=json`;
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn('YouTube oEmbed request failed', resp.status, resp.statusText);
        return null;
      }
      const data: any = await resp.json();
      return {
        title: data.title || null,
        description: data.author_name ? `Channel: ${data.author_name}` : null,
        thumbnail: data.thumbnail_url || youtubeThumbFromId(normalizedId),
        durationSeconds: null,
        isoDuration: null
      };
    } catch (err) {
      console.error('YouTube oEmbed metadata fetch error', err);
      return null;
    }
  };

  const viaApi = await attemptApiKey();
  if (viaApi) return viaApi;

  const viaYtdl = await attemptYtdl();
  if (viaYtdl) return viaYtdl;

  const viaOEmbed = await attemptOEmbed();
  if (viaOEmbed) return viaOEmbed;

  return null;
}

// (Upload route added later after requireAdmin definition)

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if email is in admin list
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Check password if exists
    if (user.password && password !== 'admin123') {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
    } else {
      // For demo purposes, allow a default password if no password is set or admin123 is used
      if (password !== 'admin123') {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        isAdmin: true
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Return token in response body for cross-domain compatibility
    console.log('Admin login success', { email: user.email });
    const { password: _, ...adminData } = user as any;
    res.json({ ...adminData, role: 'Admin', token });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Check if current JWT user is an admin (for auto-login from user dashboard)
router.get('/check-user-admin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ isAdmin: false });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id || decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ isAdmin: false });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    res.json({
      isAdmin,
      email: user.email,
      id: user.id
    });
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ isAdmin: false });
  }
});

// Auto-login admin from JWT user session
router.post('/auto-login', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id || decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if email is in admin list
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return res.status(403).json({ error: 'Not an admin user' });
    }

    // Generate admin JWT token
    const adminToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        isAdmin: true
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Return token in response body for cross-domain compatibility
    console.log('Admin auto-login success', { email: user.email });
    const { password: _, ...adminData } = user as any;
    res.json({ ...adminData, role: 'Admin', token: adminToken });
  } catch (error) {
    console.error('Admin auto-login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check admin session (supports Authorization header and session cookie)
router.get('/session', async (req, res) => {
  try {
    // Try Authorization header first (cross-domain), then fall back to session
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : (req.session as any).adminToken;

    if (!token) {
      return res.status(401).json({ error: 'No admin session' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // Get fresh admin data
    const admin = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    if (!admin || !ADMIN_EMAILS.includes(admin.email)) {
      console.warn('Admin session check: invalid admin or not whitelisted', { decodedId: (decoded as any)?.id });
      return res.status(401).json({ error: 'Invalid admin session' });
    }

    res.json({ ...admin, role: 'Admin' });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(401).json({ error: 'Invalid admin session' });
  }
});

// Middleware to check admin authentication (supports Authorization header and session)
export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    // Try Authorization header first (cross-domain), then fall back to session
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : (req.session as any)?.adminToken;

    if (!token) {
      console.error('Admin middleware: No admin token found (checked Authorization header and session)');
      return res.status(401).json({ error: 'Admin authentication required', details: 'No token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    const admin = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!admin || !ADMIN_EMAILS.includes(admin.email)) {
      console.error('Admin middleware: User not found or not admin:', admin?.email);
      return res.status(401).json({ error: 'Admin authentication required', details: 'Invalid admin credentials' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(401).json({ error: 'Admin authentication required', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Generic single-file upload (admin only) - must appear after requireAdmin declaration
// Type casting applied to avoid express type version mismatch noise
(router as any).post('/upload/:type', requireAdmin as any, (upload as any).single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rel = req.file.path.split('uploads')[1].replace(/\\/g, '/').replace(/^\//, '');
    const publicUrl = `/uploads/${rel}`;
    const kind = req.params.type;
    const isImage = req.file.mimetype.startsWith('image/');
    res.json({ success: true, type: kind, fileType: req.file.mimetype, size: req.file.size, url: publicUrl, role: isImage ? 'thumbnail' : 'media' });
  } catch (e) {
    console.error('Upload error', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// YouTube metadata (duration) fetch - admin only
router.get('/youtube/metadata/:id', requireAdmin as any, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing video id' });
    }

    const meta = await getYouTubeMetadata(id);
    if (!meta) {
      console.warn('YouTube metadata unavailable for', id);
      return res.json({
        success: false,
        id,
        isoDuration: null,
        durationSeconds: null,
        durationMinutes: null,
        message: 'Unable to retrieve YouTube metadata. Please verify the video URL manually.'
      });
    }

    const minutesRounded = typeof meta.durationSeconds === 'number' && meta.durationSeconds > 0
      ? Math.max(1, Math.round(meta.durationSeconds / 60))
      : null;

    res.json({
      success: true,
      id,
      isoDuration: meta.isoDuration,
      durationSeconds: meta.durationSeconds,
      durationMinutes: minutesRounded
    });
  } catch (e) {
    console.error('YouTube metadata error', e);
    res.status(500).json({ success: false, error: 'Failed to fetch metadata' });
  }
});

// Unified media metadata endpoint
// Query params: type=youtube|file&value=<id or url>
router.get('/media/metadata', requireAdmin as any, async (req, res) => {
  try {
    const { type, value } = req.query as { type?: string; value?: string };
    if (!type || !value) {
      return res.status(400).json({ success: false, error: 'Missing type or value' });
    }
    if (type === 'youtube') {
      const id = String(value).trim();
      const meta = await getYouTubeMetadata(id);
      if (!meta) {
        console.warn('Unified media metadata fallback: returning minimal payload for', id);
        return res.json({
          success: true,
          provider: 'youtube',
          id,
          title: null,
          description: null,
          thumbnail: youtubeThumbFromId(id),
          durationSeconds: null,
          durationMinutes: null,
          originalUrl: `https://www.youtube.com/watch?v=${id}`,
          note: 'Metadata fetch unavailable; please enter details manually.'
        });
      }
      return res.json({
        success: true,
        provider: 'youtube',
        id,
        title: meta.title,
        description: meta.description,
        thumbnail: meta.thumbnail || youtubeThumbFromId(id),
        durationSeconds: meta.durationSeconds,
        durationMinutes: typeof meta.durationSeconds === 'number' && meta.durationSeconds > 0
          ? Math.max(1, Math.round(meta.durationSeconds / 60))
          : null,
        originalUrl: `https://www.youtube.com/watch?v=${id}`
      });
    } else if (type === 'file') {
      // value is expected to be a public URL under /uploads/
      // Map to disk path
      const publicUrl = value.startsWith('/uploads/') ? value : null;
      if (!publicUrl) return res.status(400).json({ success: false, error: 'File value must start with /uploads/' });
      const diskPath = path.join(__dirname, '../../', publicUrl);
      if (!fs.existsSync(diskPath)) return res.status(404).json({ success: false, error: 'File not found' });
      // Probe duration (best effort)
      const probe = () => new Promise<any>((resolve) => {
        try {
          (ffmpeg as any).ffprobe(diskPath, (err: any, metadata: any) => {
            if (err) return resolve(null);
            resolve(metadata);
          });
        } catch (e) { resolve(null); }
      });
      const meta = await probe();
      let seconds: number | null = null;
      if (meta?.format?.duration) seconds = Math.round(meta.format.duration);
      // Derive title from filename
      const base = path.basename(diskPath).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      return res.json({
        success: true,
        provider: 'local',
        title: base,
        description: null,
        thumbnail: null,
        durationSeconds: seconds,
        durationMinutes: seconds ? Math.max(1, Math.round(seconds / 60)) : null,
        originalUrl: value
      });
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported type' });
    }
  } catch (e) {
    console.error('Media metadata endpoint error', e);
    res.status(500).json({ success: false, error: 'Failed to fetch media metadata' });
  }
});

// Get all practices (admin only)
router.get('/practices', requireAdmin, async (req, res) => {
  try {
    const practices = await prisma.practice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: practices });
  } catch (error) {
    console.error('Get practices error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch practices' });
  }
});

// Create practice (admin only)
router.post('/practices', requireAdmin, async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log('Practice creation request body:', JSON.stringify(req.body, null, 2));

    // Validate request body
    const { error, value } = practiceValidationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.error('Practice validation failed:', error.details.map(d => d.message));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const {
      title,
      type,
      duration,
      difficulty,
      approach,
      format,
      description,
      audioUrl,
      videoUrl,
      youtubeUrl,
      thumbnailUrl,
      tags,
      isPublished,
      instructions,
      benefits,
      precautions,
      // New enhanced fields
      category,
      intensityLevel,
      requiredEquipment,
      environment,
      timeOfDay,
      sensoryEngagement,
      steps,
      contraindications,
      // V2 fields
      focusAreas,
      immediateRelief,
      crisisEligible
    } = value;

    // Disallow legacy combined format
    if (format === 'Audio/Video') {
      return res.status(400).json({ error: 'Combined Audio/Video format is no longer supported' });
    }

    // Sleep practices must be audio only
    if (type === 'sleep' && format !== 'Audio') {
      return res.status(400).json({ error: 'Sleep practices must use Audio format' });
    }

    // Thumbnail handling (fallback to YouTube if provided and valid id)
    let finalThumbnail = thumbnailUrl;
    if (!finalThumbnail || !String(finalThumbnail).trim()) {
      if (youtubeUrl && String(youtubeUrl).trim().length <= 20) {
        finalThumbnail = youtubeThumbFromId(String(youtubeUrl).trim());
      } else {
        return res.status(400).json({ error: 'Thumbnail (URL or uploaded) is required' });
      }
    }

    // Media validation
    if (format === 'Audio') {
      if (!audioUrl || !String(audioUrl).trim()) {
        return res.status(400).json({ error: 'Audio URL or uploaded audio is required for Audio format' });
      }
    } else if (format === 'Video') {
      const hasVideo = (videoUrl && String(videoUrl).trim()) || (youtubeUrl && String(youtubeUrl).trim());
      if (!hasVideo) {
        return res.status(400).json({ error: 'Video URL, YouTube URL, or uploaded video file is required for Video format' });
      }
    }

    const practice = await prisma.practice.create({
      data: {
        title: String(title).trim(),
        type: String(type),
        duration: duration,
        difficulty: String(difficulty),
        approach: String(approach),
        format: String(format),
        description: description ? String(description) : null,
        audioUrl: audioUrl ? String(audioUrl) : null,
        videoUrl: videoUrl ? String(videoUrl) : null,
        youtubeUrl: youtubeUrl ? String(youtubeUrl) : null,
        thumbnailUrl: finalThumbnail ? String(finalThumbnail) : null,
        tags: Array.isArray(tags) ? tags.join(',') : (typeof tags === 'string' ? tags : null),
        isPublished: !!isPublished,
        instructions: instructions || null,
        benefits: benefits || null,
        precautions: precautions || null,
        // New enhanced fields
        category: category || null,
        intensityLevel: intensityLevel || null,
        requiredEquipment: requiredEquipment ? JSON.stringify(requiredEquipment) : null,
        environment: environment ? JSON.stringify(environment) : null,
        timeOfDay: timeOfDay ? JSON.stringify(timeOfDay) : null,
        sensoryEngagement: sensoryEngagement ? JSON.stringify(sensoryEngagement) : null,
        steps: steps ? JSON.stringify(steps) : null,
        contraindications: contraindications ? JSON.stringify(contraindications) : null,
        // V2 fields
        focusAreas: focusAreas ? JSON.stringify(focusAreas) : null,
        immediateRelief: immediateRelief || false,
        crisisEligible: crisisEligible || false
      } as any
    });

    res.json({ success: true, data: practice });
  } catch (error) {
    console.error('❌ Create practice error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to create practice', details: error instanceof Error ? error.message : String(error) });
  }
});

// Update practice (admin only)
router.put('/practices/:id', requireAdmin, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = practiceValidationSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true
    });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    // Fetch existing practice
    const existing = await prisma.practice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Practice not found' });
    }

    // Prepare update data
    const updateData: any = {};

    // Basic fields
    if (value.title !== undefined) updateData.title = String(value.title).trim();
    if (value.type !== undefined) updateData.type = String(value.type);
    if (value.duration !== undefined) updateData.duration = value.duration;
    if (value.difficulty !== undefined) updateData.difficulty = String(value.difficulty);
    if (value.approach !== undefined) updateData.approach = String(value.approach);
    if (value.format !== undefined) updateData.format = String(value.format);
    if (value.description !== undefined) updateData.description = value.description;
    if (value.audioUrl !== undefined) updateData.audioUrl = value.audioUrl;
    if (value.videoUrl !== undefined) updateData.videoUrl = value.videoUrl;
    if (value.youtubeUrl !== undefined) updateData.youtubeUrl = value.youtubeUrl;
    if (value.thumbnailUrl !== undefined) updateData.thumbnailUrl = value.thumbnailUrl;
    if (value.isPublished !== undefined) updateData.isPublished = value.isPublished;
    if (value.instructions !== undefined) updateData.instructions = value.instructions;
    if (value.benefits !== undefined) updateData.benefits = value.benefits;
    if (value.precautions !== undefined) updateData.precautions = value.precautions;

    // Handle tags
    if (value.tags !== undefined) {
      updateData.tags = Array.isArray(value.tags)
        ? value.tags.join(',')
        : (typeof value.tags === 'string' ? value.tags : null);
    }

    // Enhanced fields
    if (value.category !== undefined) updateData.category = value.category;
    if (value.intensityLevel !== undefined) updateData.intensityLevel = value.intensityLevel;
    if (value.requiredEquipment !== undefined) {
      updateData.requiredEquipment = value.requiredEquipment ? JSON.stringify(value.requiredEquipment) : null;
    }
    if (value.environment !== undefined) {
      updateData.environment = value.environment ? JSON.stringify(value.environment) : null;
    }
    if (value.timeOfDay !== undefined) {
      updateData.timeOfDay = value.timeOfDay ? JSON.stringify(value.timeOfDay) : null;
    }
    if (value.sensoryEngagement !== undefined) {
      updateData.sensoryEngagement = value.sensoryEngagement ? JSON.stringify(value.sensoryEngagement) : null;
    }
    if (value.steps !== undefined) {
      updateData.steps = value.steps ? JSON.stringify(value.steps) : null;
    }
    if (value.contraindications !== undefined) {
      updateData.contraindications = value.contraindications ? JSON.stringify(value.contraindications) : null;
    }

    // V2 fields
    if (value.focusAreas !== undefined) {
      updateData.focusAreas = value.focusAreas ? JSON.stringify(value.focusAreas) : null;
    }
    if (value.immediateRelief !== undefined) {
      updateData.immediateRelief = value.immediateRelief;
    }
    if (value.crisisEligible !== undefined) {
      updateData.crisisEligible = value.crisisEligible;
    }

    // Validate merged data
    const merged = { ...existing, ...updateData };

    // Disallow combined format
    if (merged.format === 'Audio/Video') {
      return res.status(400).json({ error: 'Combined Audio/Video format is no longer supported' });
    }

    // Sleep rule
    if (merged.type === 'sleep' && merged.format !== 'Audio') {
      return res.status(400).json({ error: 'Sleep practices must use Audio format' });
    }

    // Mandatory description & thumbnail
    if (!merged.description || !String(merged.description).trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }
    if (!merged.thumbnailUrl || !String(merged.thumbnailUrl).trim()) {
      return res.status(400).json({ error: 'Thumbnail (URL or uploaded) is required' });
    }

    // Media validation
    if (merged.format === 'Audio') {
      if (!merged.audioUrl || !String(merged.audioUrl).trim()) {
        return res.status(400).json({ error: 'Audio URL or uploaded audio is required for Audio format' });
      }
    } else if (merged.format === 'Video') {
      const hasVideo = (merged.videoUrl && String(merged.videoUrl).trim()) ||
        (merged.youtubeUrl && String(merged.youtubeUrl).trim());
      if (!hasVideo) {
        return res.status(400).json({ error: 'Video URL, YouTube URL, or uploaded video file is required for Video format' });
      }
    }

    const practice = await prisma.practice.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, data: practice });
  } catch (error) {
    console.error('Update practice error:', error);
    res.status(500).json({ success: false, error: 'Failed to update practice' });
  }
});

// Delete practice (admin only)
router.delete('/practices/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.practice.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Practice deleted successfully' });
  } catch (error) {
    console.error('Delete practice error:', error);
    res.status(500).json({ error: 'Failed to delete practice' });
  }
});

// Get all content (admin only)
router.get('/content', requireAdmin, async (req, res) => {
  try {
    const content = await prisma.content.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content' });
  }
});

// Create content (admin only)
router.post('/content', requireAdmin, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = contentValidationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const {
      title,
      type,
      category,
      approach,
      content: bodyContent,
      description,
      url,
      youtubeUrl,
      duration,
      difficulty,
      tags,
      isPublished,
      // New enhanced fields
      contentType,
      intensityLevel,
      focusAreas,
      immediateRelief,
      crisisEligible, // NEW V2
      timeOfDay, // NEW V2
      environment, // NEW V2
      culturalContext,
      hasSubtitles,
      transcript
    } = value;

    // Thumbnail handling
    let finalThumb = value.thumbnailUrl;
    if ((!finalThumb || !String(finalThumb).trim()) && youtubeUrl && String(youtubeUrl).trim().length <= 20) {
      finalThumb = youtubeThumbFromId(String(youtubeUrl).trim());
    }

    // Media validation for video/audio
    if (type === 'video') {
      const hasVideo = (url && String(url).trim()) || (youtubeUrl && String(youtubeUrl).trim()) || (bodyContent && String(bodyContent).trim());
      if (!hasVideo) {
        return res.status(400).json({ success: false, error: 'Video URL, YouTube URL, uploaded video, or embedded content is required for video type' });
      }
    }
    if (type === 'audio') {
      const hasAudio = (url && String(url).trim()) || (bodyContent && String(bodyContent).trim());
      if (!hasAudio) {
        return res.status(400).json({ success: false, error: 'Audio URL or uploaded audio is required for audio type' });
      }
    }

    // Determine stored content field
    const storedContent = bodyContent || url || youtubeUrl || description || '';
    if (!storedContent) {
      return res.status(400).json({ success: false, error: 'Content body, URL, YouTube URL, or description required' });
    }

    const created = await prisma.content.create({
      data: {
        title: String(title).trim(),
        type: String(type),
        category: String(category),
        approach: String(approach),
        content: String(storedContent),
        description: description ? String(description) : null,
        youtubeUrl: youtubeUrl ? String(youtubeUrl) : null,
        thumbnailUrl: finalThumb ? String(finalThumb) : null,
        duration: duration || null,
        difficulty: difficulty ? String(difficulty) : null,
        tags: Array.isArray(tags) ? tags.join(',') : (typeof tags === 'string' ? tags : ''),
        isPublished: !!isPublished,
        // New enhanced fields
        contentType: contentType || null,
        intensityLevel: intensityLevel || null,
        focusAreas: focusAreas ? JSON.stringify(focusAreas) : null,
        immediateRelief: immediateRelief || false,
        crisisEligible: crisisEligible || false, // NEW V2
        timeOfDay: timeOfDay ? JSON.stringify(timeOfDay) : null, // NEW V2
        environment: environment ? JSON.stringify(environment) : null, // NEW V2
        culturalContext: culturalContext || null,
        hasSubtitles: hasSubtitles || false,
        transcript: transcript || null,
        completions: 0,
        averageRating: null,
        effectiveness: null
      }
    });

    res.json({ success: true, data: created });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ success: false, error: 'Failed to create content' });
  }
});

// Update content (admin only)
router.put('/content/:id', requireAdmin, async (req, res) => {
  try {
    // Validate request body (partial update allowed)
    const { error, value } = contentValidationSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true // Allow extra fields for flexibility
    });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    // Check if content exists
    const existing = await prisma.content.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    // Prepare update data
    const updateData: any = {};

    // Basic fields
    if (value.title !== undefined) updateData.title = String(value.title).trim();
    if (value.type !== undefined) updateData.type = String(value.type);
    if (value.category !== undefined) updateData.category = String(value.category);
    if (value.approach !== undefined) updateData.approach = String(value.approach);
    if (value.description !== undefined) updateData.description = value.description;
    if (value.content !== undefined) updateData.content = value.content || value.url || value.youtubeUrl || value.description || (existing as any).content;
    if (value.youtubeUrl !== undefined) updateData.youtubeUrl = value.youtubeUrl;
    if (value.thumbnailUrl !== undefined) updateData.thumbnailUrl = value.thumbnailUrl;
    if (value.duration !== undefined) updateData.duration = value.duration;
    if (value.difficulty !== undefined) updateData.difficulty = value.difficulty;
    if (value.isPublished !== undefined) updateData.isPublished = value.isPublished;

    // Handle tags
    if (value.tags !== undefined) {
      updateData.tags = Array.isArray(value.tags)
        ? value.tags.join(',')
        : (typeof value.tags === 'string' ? value.tags : '');
    }

    // Enhanced fields
    if (value.contentType !== undefined) updateData.contentType = value.contentType;
    if (value.intensityLevel !== undefined) updateData.intensityLevel = value.intensityLevel;
    if (value.focusAreas !== undefined) {
      updateData.focusAreas = value.focusAreas ? JSON.stringify(value.focusAreas) : null;
    }
    if (value.immediateRelief !== undefined) updateData.immediateRelief = value.immediateRelief;
    if (value.crisisEligible !== undefined) updateData.crisisEligible = value.crisisEligible; // NEW V2
    if (value.timeOfDay !== undefined) { // NEW V2
      updateData.timeOfDay = value.timeOfDay ? JSON.stringify(value.timeOfDay) : null;
    }
    if (value.environment !== undefined) { // NEW V2
      updateData.environment = value.environment ? JSON.stringify(value.environment) : null;
    }
    if (value.culturalContext !== undefined) updateData.culturalContext = value.culturalContext;
    if (value.hasSubtitles !== undefined) updateData.hasSubtitles = value.hasSubtitles;
    if (value.transcript !== undefined) updateData.transcript = value.transcript;

    // Validate merged data
    const merged: any = { ...(existing as any), ...updateData };
    if (!merged.description || !String(merged.description).trim()) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }

    // Media validation
    if (merged.type === 'video') {
      const hasVideo = (merged.url && String(merged.url).trim()) ||
        (merged.youtubeUrl && String(merged.youtubeUrl).trim()) ||
        (merged.content && String(merged.content).trim());
      if (!hasVideo) {
        return res.status(400).json({
          success: false,
          error: 'Video URL, YouTube URL, uploaded video, or embedded content is required for video type'
        });
      }
    }
    if (merged.type === 'audio') {
      const hasAudio = (merged.url && String(merged.url).trim()) ||
        (merged.content && String(merged.content).trim());
      if (!hasAudio) {
        return res.status(400).json({
          success: false,
          error: 'Audio URL or uploaded audio is required for audio type'
        });
      }
    }

    const updated = await prisma.content.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ success: false, error: 'Failed to update content' });
  }
});

// Delete content (admin only)
router.delete('/content/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.content.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// ==========================================
// ASSESSMENT MANAGEMENT ROUTES (ADMIN ONLY)
// ==========================================

// Get all assessments with filtering
router.get('/assessments', requireAdmin, listAssessments);

// Get assessment categories
router.get('/assessments/categories', requireAdmin, getCategories);

// Get single assessment by ID
router.get('/assessments/:id', requireAdmin, getAssessment);

// Create new assessment
router.post(
  '/assessments',
  requireAdmin,
  validate(createAssessmentSchema),
  createAssessment
);

// Update assessment
router.put(
  '/assessments/:id',
  requireAdmin,
  validate(updateAssessmentSchema),
  updateAssessment
);

// Delete (soft delete) assessment
router.delete('/assessments/:id', requireAdmin, deleteAssessment);

// Duplicate assessment
router.post('/assessments/:id/duplicate', requireAdmin, duplicateAssessment);

// Preview assessment scoring
router.post('/assessments/:id/preview', requireAdmin, previewAssessment);

// ==========================================
// ANALYTICS ROUTES (ADMIN ONLY)
// ==========================================

// Get comprehensive analytics (all metrics combined)
router.get('/analytics/comprehensive', requireAdmin, getComprehensiveAnalytics);

// Get AI performance metrics
router.get('/analytics/ai-performance', requireAdmin, getAIPerformanceAnalytics);

// Get crisis detection metrics
router.get('/analytics/crisis-detection', requireAdmin, getCrisisDetectionAnalytics);

// Get system health metrics
router.get('/analytics/system-health', requireAdmin, getSystemHealthAnalytics);

// Get user engagement metrics
router.get('/analytics/user-engagement', requireAdmin, getUserEngagementAnalytics);

// Get wellness impact metrics
router.get('/analytics/wellness-impact', requireAdmin, getWellnessImpactAnalytics);

// Get basic analytics (legacy)
router.get('/analytics', requireAdmin, getAnalytics);

// Get user analytics (legacy)
router.get('/analytics/users', requireAdmin, getUserAnalytics);

// Get content analytics (legacy)
router.get('/analytics/content', requireAdmin, getContentAnalytics);

// Get assessment analytics (legacy)
router.get('/analytics/assessments', requireAdmin, getAssessmentAnalytics);

// ==========================================
// USER MANAGEMENT ROUTES (ADMIN ONLY)
// ==========================================

// Get user statistics
router.get('/users/stats', requireAdmin, getUserStats);

// Get list of users with filters
router.get('/users', requireAdmin, getUsers);

// Get specific user details
router.get('/users/:id', requireAdmin, getUserDetails);

// Update user status
router.patch('/users/:id', requireAdmin, updateUserStatus);

// Get user activity timeline
router.get('/users/:id/activity', requireAdmin, getUserActivity);

// Delete user account
router.delete('/users/:id', requireAdmin, deleteUser);

// Reset user password
router.post('/users/:id/reset-password', requireAdmin, resetUserPassword);

// ==========================================
// BULK OPERATIONS ROUTES (ADMIN ONLY)
// ==========================================

// Bulk update assessment status (publish/unpublish)
router.post('/bulk/assessments/publish', requireAdmin, bulkUpdateAssessmentStatus);

// Bulk delete assessments
router.delete('/bulk/assessments', requireAdmin, bulkDeleteAssessments);

// Bulk update assessment tags
router.post('/bulk/assessments/tags', requireAdmin, bulkUpdateAssessmentTags);

// Bulk update practice status (publish/unpublish)
router.post('/bulk/practices/publish', requireAdmin, bulkUpdatePracticeStatus);

// Bulk delete practices
router.delete('/bulk/practices', requireAdmin, bulkDeletePractices);

// Bulk update practice approach
router.post('/bulk/practices/approach', requireAdmin, bulkUpdatePracticeApproach);

// Bulk update content status (publish/unpublish)
router.post('/bulk/content/publish', requireAdmin, bulkUpdateContentStatus);

// Bulk delete content
router.delete('/bulk/content', requireAdmin, bulkDeleteContent);

// Bulk update content type
router.post('/bulk/content/type', requireAdmin, bulkUpdateContentType);

// ==========================================
// ACTIVITY LOG ROUTES (ADMIN ONLY)
// ==========================================

// Get activity logs with filtering and pagination
router.get('/activity-logs', requireAdmin, getActivityLogs);

// Get activity log statistics
router.get('/activity-logs/stats', requireAdmin, getActivityStats);

// Get filter options (unique values)
router.get('/activity-logs/filters', requireAdmin, getActivityFilters);

// Export activity logs as CSV
router.get('/activity-logs/export', requireAdmin, exportActivityLogs);

// ==========================================
// THERAPIST MANAGEMENT ROUTES (ADMIN ONLY)
// ==========================================

// Normalize availability from legacy { day, times: ['9:00 AM - 5:00 PM'] } format
// to the expected { day, startTime, endTime } format
function normalizeAvailability(slots: any[]): { day: string; startTime: string; endTime: string }[] {
  if (!Array.isArray(slots)) return [];
  const result: { day: string; startTime: string; endTime: string }[] = [];
  for (const slot of slots) {
    if (slot.startTime && slot.endTime) {
      // Already in correct format
      result.push({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime });
    } else if (slot.times && Array.isArray(slot.times)) {
      // Legacy format: { day: 'Monday', times: ['9:00 AM - 5:00 PM'] }
      for (const timeRange of slot.times) {
        const parts = timeRange.split(' - ');
        if (parts.length === 2) {
          result.push({
            day: slot.day,
            startTime: convertTo24h(parts[0].trim()),
            endTime: convertTo24h(parts[1].trim())
          });
        }
      }
    }
  }
  return result;
}

function convertTo24h(time12: string): string {
  // If already in 24h format like "09:00", return as-is
  if (/^\d{1,2}:\d{2}$/.test(time12) && !time12.includes('AM') && !time12.includes('PM')) {
    return time12;
  }
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Therapist validation schema
const therapistValidationSchema = Joi.object({
  name: Joi.string().required().max(100),
  credential: Joi.string().required().valid('PSYCHOLOGIST', 'PSYCHIATRIST', 'LCSW', 'LMFT', 'LPC', 'LMHC'),
  title: Joi.string().required().max(150),
  bio: Joi.string().required().max(2000),
  specialties: Joi.array().items(Joi.string()).min(1).required(),
  email: Joi.string().email().allow('', null).optional(),
  phone: Joi.string().max(20).allow('', null).optional(),
  website: Joi.string().uri().allow('', null).optional(),
  street: Joi.string().max(200).allow('', null).optional(),
  city: Joi.string().max(100).allow('', null).optional(),
  state: Joi.string().max(50).allow('', null).optional(),
  zipCode: Joi.string().max(20).allow('', null).optional(),
  country: Joi.string().max(50).default('US'),
  acceptsInsurance: Joi.boolean().default(false),
  insurances: Joi.array().items(Joi.string()).optional(),
  sessionFee: Joi.number().min(0).allow(null).optional(),
  offersSliding: Joi.boolean().default(false),
  availability: Joi.array().items(Joi.object({
    day: Joi.string().required(),
    startTime: Joi.string().required(),
    endTime: Joi.string().required()
  })).optional(),
  profileImageUrl: Joi.string().uri().allow('', null).optional(),
  yearsExperience: Joi.number().integer().min(0).allow(null).optional(),
  languages: Joi.string().max(200).allow('', null).optional(),
  isActive: Joi.boolean().default(true),
  isVerified: Joi.boolean().default(false),
  // Portal account fields (optional — if provided, a User account is created/linked)
  portalEmail: Joi.string().email().allow('', null).optional(),
  portalPassword: Joi.string().min(6).max(128).allow('', null).optional(),
  enablePortal: Joi.boolean().optional()
});

// Get all therapists (admin - includes inactive/unverified)
router.get('/therapists', requireAdmin, async (req, res) => {
  try {
    const {
      search,
      specialty,
      credential,
      isActive,
      isVerified,
      city,
      state,
      limit = '50',
      offset = '0',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { bio: { contains: search as string } },
        { city: { contains: search as string } },
        { title: { contains: search as string } }
      ];
    }
    if (specialty) {
      where.specialtiesJson = { contains: specialty as string };
    }
    if (credential) {
      where.credential = credential as string;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (isVerified !== undefined) {
      where.isVerified = isVerified === 'true';
    }
    if (city) {
      where.city = { contains: city as string };
    }
    if (state) {
      where.state = state as string;
    }

    const [therapists, total] = await Promise.all([
      prisma.therapist.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.therapist.count({ where })
    ]);

    // Parse JSON fields and strip raw JSON columns
    const therapistsWithParsed = therapists.map(t => {
      const { insurances: _raw, specialtiesJson: _sj, availabilityJson: _aj, ...rest } = t;
      return {
        ...rest,
        specialties: JSON.parse(t.specialtiesJson || '[]'),
        availability: normalizeAvailability(JSON.parse(t.availabilityJson || '[]')),
        insurancesList: t.insurances ? JSON.parse(t.insurances) : [],
        portalLinked: !!t.userId
      };
    });

    res.json({
      success: true,
      data: therapistsWithParsed,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error('Error fetching therapists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch therapists' });
  }
});

// Get single therapist by ID (admin)
router.get('/therapists/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const therapist = await prisma.therapist.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        bookings: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!therapist) {
      return res.status(404).json({ success: false, error: 'Therapist not found' });
    }

    const { insurances: _raw, specialtiesJson: _sj, availabilityJson: _aj, ...therapistRest } = therapist;
    const therapistData = {
      ...therapistRest,
      specialties: JSON.parse(therapist.specialtiesJson || '[]'),
      availability: normalizeAvailability(JSON.parse(therapist.availabilityJson || '[]')),
      insurancesList: therapist.insurances ? JSON.parse(therapist.insurances) : [],
      portalLinked: !!therapist.userId,
      portalEmail: therapist.user?.email || null
    };

    res.json({ success: true, data: therapistData });
  } catch (error) {
    console.error('Error fetching therapist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch therapist' });
  }
});

// Create new therapist
router.post('/therapists', requireAdmin, async (req, res) => {
  try {
    const { error, value } = therapistValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { specialties, insurances, availability, portalEmail, portalPassword, enablePortal, ...rest } = value;

    // ─── Portal account creation / linking ─────────────────────────────
    let userId: string | null = null;

    if (enablePortal && portalEmail) {
      const normalizedEmail = portalEmail.toLowerCase().trim();

      // Check if a User already exists with this email
      let existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (existingUser) {
        // Check if this user is already linked to another therapist
        const alreadyLinked = await prisma.therapist.findFirst({ where: { userId: existingUser.id } });
        if (alreadyLinked) {
          return res.status(400).json({
            success: false,
            error: `This email is already linked to therapist "${alreadyLinked.name}". A user can only be linked to one therapist.`
          });
        }
        // Update password if a new one was provided
        if (portalPassword) {
          const hashedPassword = await bcrypt.hash(portalPassword, 10);
          await prisma.user.update({ where: { id: existingUser.id }, data: { password: hashedPassword } });
        }
        userId = existingUser.id;
      } else {
        // Create a new User account
        if (!portalPassword) {
          return res.status(400).json({
            success: false,
            error: 'Password is required when creating a new portal account'
          });
        }
        const hashedPassword = await bcrypt.hash(portalPassword, 10);
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: rest.name,
            password: hashedPassword,
            isOnboarded: true
          }
        });
        userId = newUser.id;
      }
    }

    const therapist = await prisma.therapist.create({
      data: {
        ...rest,
        specialtiesJson: JSON.stringify(specialties || []),
        insurances: insurances ? JSON.stringify(insurances) : null,
        availabilityJson: JSON.stringify(availability || []),
        ...(userId && { userId })
      }
    });

    // Log activity
    const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
    await logActivity(adminEmail, 'CREATE', 'THERAPIST', therapist.id, therapist.name, { created: therapist, portalLinked: !!userId }, req);

    res.status(201).json({
      success: true,
      data: {
        ...(() => { const { insurances: _r, specialtiesJson: _s, availabilityJson: _a, ...clean } = therapist; return clean; })(),
        specialties: specialties || [],
        availability: availability || [],
        insurancesList: insurances || [],
        portalLinked: !!userId,
        portalEmail: portalEmail || null
      }
    });
  } catch (error) {
    console.error('Error creating therapist:', error);
    res.status(500).json({ success: false, error: 'Failed to create therapist' });
  }
});

// Update therapist
router.put('/therapists/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.therapist.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Therapist not found' });
    }

    const { error, value } = therapistValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { specialties, insurances, availability, portalEmail, portalPassword, enablePortal, ...rest } = value;

    // ─── Portal account management ─────────────────────────────────────
    let userId: string | null | undefined = undefined; // undefined = don't change

    if (enablePortal === false) {
      // Admin explicitly disabled portal — unlink user
      userId = null;
    } else if (enablePortal && portalEmail) {
      const normalizedEmail = portalEmail.toLowerCase().trim();

      let existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (existingUser) {
        // Check if this user is already linked to a DIFFERENT therapist
        const alreadyLinked = await prisma.therapist.findFirst({
          where: { userId: existingUser.id, id: { not: id } }
        });
        if (alreadyLinked) {
          return res.status(400).json({
            success: false,
            error: `This email is already linked to therapist "${alreadyLinked.name}".`
          });
        }
        if (portalPassword) {
          const hashedPassword = await bcrypt.hash(portalPassword, 10);
          await prisma.user.update({ where: { id: existingUser.id }, data: { password: hashedPassword } });
        }
        userId = existingUser.id;
      } else {
        if (!portalPassword) {
          return res.status(400).json({
            success: false,
            error: 'Password is required when creating a new portal account'
          });
        }
        const hashedPassword = await bcrypt.hash(portalPassword, 10);
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: rest.name || existing.name,
            password: hashedPassword,
            isOnboarded: true
          }
        });
        userId = newUser.id;
      }
    }

    const therapist = await prisma.therapist.update({
      where: { id },
      data: {
        ...rest,
        specialtiesJson: JSON.stringify(specialties || []),
        insurances: insurances ? JSON.stringify(insurances) : null,
        availabilityJson: JSON.stringify(availability || []),
        ...(userId !== undefined && { userId })
      }
    });

    // Log activity
    const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
    await logActivity(adminEmail, 'UPDATE', 'THERAPIST', therapist.id, therapist.name, { before: existing, after: therapist }, req);

    res.json({
      success: true,
      data: {
        ...(() => { const { insurances: _r, specialtiesJson: _s, availabilityJson: _a, ...clean } = therapist; return clean; })(),
        specialties: specialties || [],
        availability: availability || [],
        insurancesList: insurances || [],
        portalLinked: !!therapist.userId,
        portalEmail: portalEmail || null
      }
    });
  } catch (error) {
    console.error('Error updating therapist:', error);
    res.status(500).json({ success: false, error: 'Failed to update therapist' });
  }
});

// Delete therapist
router.delete('/therapists/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.therapist.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Therapist not found' });
    }

    // Check for active bookings
    const activeBookings = await prisma.therapistBooking.count({
      where: {
        therapistId: id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete therapist with ${activeBookings} active booking(s). Please cancel or complete them first.`
      });
    }

    await prisma.therapist.delete({ where: { id } });

    // Log activity
    const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
    await logActivity(adminEmail, 'DELETE', 'THERAPIST', id, existing?.name || '', { deleted: existing }, req);

    res.json({ success: true, message: 'Therapist deleted successfully' });
  } catch (error) {
    console.error('Error deleting therapist:', error);
    res.status(500).json({ success: false, error: 'Failed to delete therapist' });
  }
});

// Toggle therapist active status
router.patch('/therapists/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isVerified } = req.body;

    const existing = await prisma.therapist.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Therapist not found' });
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;

    const therapist = await prisma.therapist.update({
      where: { id },
      data: updateData
    });

    // Log activity
    const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
    await logActivity(adminEmail, 'UPDATE', 'THERAPIST', id, therapist.name, { before: existing, after: therapist }, req);

    res.json({
      success: true,
      data: {
        ...(() => { const { insurances: _r, specialtiesJson: _s, availabilityJson: _a, ...clean } = therapist; return clean; })(),
        specialties: JSON.parse(therapist.specialtiesJson || '[]'),
        availability: JSON.parse(therapist.availabilityJson || '[]'),
        insurancesList: therapist.insurances ? JSON.parse(therapist.insurances) : []
      }
    });
  } catch (error) {
    console.error('Error updating therapist status:', error);
    res.status(500).json({ success: false, error: 'Failed to update therapist status' });
  }
});

// Get therapist statistics
router.get('/therapists-stats', requireAdmin, async (req, res) => {
  try {
    const [total, active, verified, byCredential, bySpecialty] = await Promise.all([
      prisma.therapist.count(),
      prisma.therapist.count({ where: { isActive: true } }),
      prisma.therapist.count({ where: { isVerified: true } }),
      prisma.therapist.groupBy({
        by: ['credential'],
        _count: true
      }),
      prisma.therapist.findMany({
        select: { specialtiesJson: true }
      })
    ]);

    // Count specialties
    const specialtyCounts: Record<string, number> = {};
    bySpecialty.forEach(t => {
      const specs = JSON.parse(t.specialtiesJson || '[]') as string[];
      specs.forEach(s => {
        specialtyCounts[s] = (specialtyCounts[s] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        verified,
        inactive: total - active,
        unverified: total - verified,
        byCredential: byCredential.map(c => ({ credential: c.credential, count: c._count })),
        bySpecialty: Object.entries(specialtyCounts).map(([specialty, count]) => ({ specialty, count }))
      }
    });
  } catch (error) {
    console.error('Error fetching therapist stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch therapist statistics' });
  }
});

export default router;
export { logActivity };