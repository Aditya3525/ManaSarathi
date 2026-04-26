import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';
const ytSearch = require('yt-search') as (query: string) => Promise<{
  videos?: Array<{
    videoId?: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    seconds?: number;
    author?: { name?: string };
    ago?: string;
    url?: string;
  }>;
}>;
// @ts-ignore
import ffmpegStatic from 'ffmpeg-static';
// @ts-ignore
import ffprobeStatic from 'ffprobe-static';
import Joi from 'joi';

import prisma from '../config/database';
import { logActivity } from '../controllers/admin/activityLogController';
import { getJwtSecret } from '../config/auth';
import { createAdminAuthRoutes } from './admin/authRoutes';
import assessmentRoutes from './admin/assessmentRoutes';
import analyticsRoutes from './admin/analyticsRoutes';
import userRoutes from './admin/userRoutes';
import bulkRoutes from './admin/bulkRoutes';
import activityLogRoutes from './admin/activityLogRoutes';
import { createMediaRoutes } from './admin/mediaRoutes';
import { createPracticeContentRoutes } from './admin/practiceContentRoutes';
import dashboardRoutes from './admin/dashboardRoutes';
import { createTherapistManagementRoutes } from './admin/therapistManagementRoutes';
import { requireAdmin, ADMIN_EMAILS } from './admin/requireAdmin';

const router = express.Router();
const JWT_SECRET = getJwtSecret();

export { requireAdmin } from './admin/requireAdmin';

// Configure ffmpeg binaries if available
try {
  if (ffmpegStatic) (ffmpeg as any).setFfmpegPath(ffmpegStatic as string);
  if (ffprobeStatic?.path) (ffmpeg as any).setFfprobePath(ffprobeStatic.path);
} catch (error) {
  console.warn('FFmpeg setup warning:', error);
}

const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/aac'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const MEDIA_ROOT = path.join(UPLOADS_ROOT, 'media');
const THUMBNAILS_ROOT = path.join(UPLOADS_ROOT, 'thumbnails');

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
  difficulty: Joi.string().allow('', null).optional(),
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  isPublished: Joi.boolean().optional(),
  contentType: Joi.string().allow(null).optional(),
  intensityLevel: Joi.string().valid('low', 'medium', 'high', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED').allow(null).optional(),
  focusAreas: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  immediateRelief: Joi.boolean().optional(),
  crisisEligible: Joi.boolean().optional(),
  timeOfDay: Joi.array().items(Joi.string().valid('morning', 'afternoon', 'evening', 'night')).optional(),
  environment: Joi.array().items(Joi.string().valid('home', 'work', 'public', 'nature')).optional(),
  culturalContext: Joi.string().max(500).allow('', null).optional(),
  hasSubtitles: Joi.boolean().optional(),
  transcript: Joi.string().max(50000).allow('', null).optional(),
  scheduledPublishAt: Joi.date().iso().allow(null).optional()
});

const practiceValidationSchema = Joi.object({
  title: Joi.string().required().max(200),
  type: Joi.string().required(),
  approach: Joi.string().required(),
  description: Joi.string().max(2000).allow('', null).optional(),
  youtubeUrl: Joi.string().max(50).allow('', null).optional(),
  thumbnailUrl: Joi.string().uri().allow('', null).optional(),
  duration: Joi.number().integer().min(0).required(),
  difficulty: Joi.string().allow('', null).optional(),
  level: Joi.string().allow('', null).optional(),
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
  category: Joi.string().valid(
    'MEDITATION', 'YOGA', 'BREATHING', 'MINDFULNESS', 'JOURNALING',
    'CBT_TECHNIQUE', 'GROUNDING_EXERCISE', 'SELF_REFLECTION',
    'MOVEMENT', 'SLEEP_HYGIENE'
  ).allow(null).optional(),
  intensityLevel: Joi.string().valid('low', 'medium', 'high', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED').allow(null).optional(),
  focusAreas: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  immediateRelief: Joi.boolean().optional(),
  crisisEligible: Joi.boolean().optional(),
  requiredEquipment: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  environment: Joi.array().items(Joi.string().valid('home', 'work', 'public', 'nature')).optional(),
  timeOfDay: Joi.array().items(Joi.string().valid('morning', 'afternoon', 'evening', 'night')).optional(),
  sensoryEngagement: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  steps: Joi.array().items(Joi.object({
    step: Joi.number().required(),
    instruction: Joi.string().required().max(500),
    duration: Joi.number().optional()
  })).max(50).optional(),
  contraindications: Joi.array().items(Joi.string().max(200)).max(20).optional(),
  scheduledPublishAt: Joi.date().iso().allow(null).optional()
});

const sanitizeFolderPath = (value?: string): string | null => {
  if (!value) return null;
  const normalized = value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized) return null;
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.includes('..'))) {
    return null;
  }
  if (!segments.every((segment) => /^[a-zA-Z0-9_-]+$/.test(segment))) {
    return null;
  }
  return segments.join('/');
};

const ensureUploadRoots = () => {
  if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  if (!fs.existsSync(MEDIA_ROOT)) fs.mkdirSync(MEDIA_ROOT, { recursive: true });
  if (!fs.existsSync(THUMBNAILS_ROOT)) fs.mkdirSync(THUMBNAILS_ROOT, { recursive: true });
};

const toPublicUploadUrl = (absolutePath: string): string => {
  const relative = path.relative(UPLOADS_ROOT, absolutePath).replace(/\\/g, '/');
  return `/uploads/${relative}`;
};

const resolvePublicUploadPath = (publicUrl: string): string | null => {
  if (!publicUrl.startsWith('/uploads/')) return null;
  const relative = publicUrl.replace(/^\/uploads\//, '').replace(/\\/g, '/');
  if (relative.includes('..')) return null;
  const absolute = path.resolve(UPLOADS_ROOT, relative);
  if (!absolute.startsWith(path.resolve(UPLOADS_ROOT))) return null;
  return absolute;
};

const detectMediaTypeFromExtension = (fileName: string): 'image' | 'video' | 'audio' | 'document' => {
  const ext = path.extname(fileName).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext)) return 'audio';
  return 'document';
};

ensureUploadRoots();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadRoots();
    const baseFolder = file.mimetype.startsWith('image/') ? THUMBNAILS_ROOT : MEDIA_ROOT;
    const requestedFolder = sanitizeFolderPath(typeof req.query.folder === 'string' ? req.query.folder : undefined);
    const dest = requestedFolder
      ? path.resolve(baseFolder, requestedFolder)
      : baseFolder;

    if (!dest.startsWith(path.resolve(baseFolder))) {
      return cb(new Error('Invalid folder path'), baseFolder);
    }

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname) || '.' + (file.mimetype.split('/')[1] || 'dat');
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
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

type YouTubeSearchResult = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  durationMinutes: number | null;
  channelTitle: string | null;
  publishedAt: string | null;
  url: string;
};

async function searchYouTubeVideos(query: string, limit = 8): Promise<YouTubeSearchResult[]> {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) return [];

  try {
    const searchResult = await ytSearch(normalizedQuery);
    const videos = Array.isArray(searchResult?.videos) ? searchResult.videos : [];

    return videos
      .slice(0, Math.min(Math.max(limit, 1), 20))
      .map((video) => {
        const id = String(video.videoId || '').trim();
        const durationSeconds = Number.isFinite(video.seconds) ? Number(video.seconds) : null;
        const url = id ? `https://www.youtube.com/watch?v=${id}` : String(video.url || '').trim();

        return {
          id,
          title: String(video.title || 'Untitled video').trim(),
          description: video.description ? String(video.description) : null,
          thumbnail: video.thumbnail ? String(video.thumbnail) : youtubeThumbFromId(id),
          durationSeconds,
          durationMinutes: durationSeconds && durationSeconds > 0
            ? Math.max(1, Math.round(durationSeconds / 60))
            : null,
          channelTitle: video.author?.name ? String(video.author.name) : null,
          publishedAt: video.ago ? String(video.ago) : null,
          url,
        };
      })
      .filter((item) => Boolean(item.id && item.url));
  } catch (error) {
    console.error('YouTube search failed', error);
    return [];
  }
}

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
    } catch (error) {
      console.error('YouTube API metadata fetch error', error);
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
    } catch (error) {
      console.error('YouTube fallback metadata fetch error', error);
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
    } catch (error) {
      console.error('YouTube oEmbed metadata fetch error', error);
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

const probeMediaMetadata = async (diskPath: string): Promise<any | null> => {
  return new Promise((resolve) => {
    try {
      (ffmpeg as any).ffprobe(diskPath, (err: any, metadata: any) => {
        if (err) return resolve(null);
        resolve(metadata);
      });
    } catch {
      resolve(null);
    }
  });
};

router.use('/', createAdminAuthRoutes({
  prisma,
  jwtSecret: JWT_SECRET,
  adminEmails: ADMIN_EMAILS,
}));

router.use('/', createMediaRoutes({
  requireAdmin,
  upload,
  prisma,
  uploadsRoot: UPLOADS_ROOT,
  mediaRoot: MEDIA_ROOT,
  thumbnailsRoot: THUMBNAILS_ROOT,
  ensureUploadRoots,
  sanitizeFolderPath,
  toPublicUploadUrl,
  resolvePublicUploadPath,
  detectMediaTypeFromExtension,
  getYouTubeMetadata,
  searchYouTubeVideos,
  youtubeThumbFromId,
  probeMediaMetadata,
}));

router.use('/', createPracticeContentRoutes({
  requireAdmin,
  prisma,
  practiceValidationSchema,
  contentValidationSchema,
  youtubeThumbFromId,
}));

router.use('/', dashboardRoutes);
router.use('/', assessmentRoutes);
router.use('/', analyticsRoutes);
router.use('/', userRoutes);
router.use('/', bulkRoutes);
router.use('/', activityLogRoutes);

router.use('/', createTherapistManagementRoutes({
  requireAdmin,
  prisma,
}));

export default router;
export { logActivity };
