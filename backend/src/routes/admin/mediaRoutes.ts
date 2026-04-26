import express from 'express';
import fs from 'fs';
import path from 'path';

type MediaType = 'image' | 'video' | 'audio' | 'document';

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

type PrismaLike = {
  content: {
    count: (args: any) => Promise<number>;
  };
  practice: {
    count: (args: any) => Promise<number>;
  };
};

type MediaRoutesOptions = {
  requireAdmin: any;
  upload: any;
  prisma: PrismaLike;
  uploadsRoot: string;
  mediaRoot: string;
  thumbnailsRoot: string;
  ensureUploadRoots: () => void;
  sanitizeFolderPath: (value?: string) => string | null;
  toPublicUploadUrl: (absolutePath: string) => string;
  resolvePublicUploadPath: (publicUrl: string) => string | null;
  detectMediaTypeFromExtension: (fileName: string) => MediaType;
  getYouTubeMetadata: (id: string) => Promise<YouTubeMetadata | null>;
  searchYouTubeVideos: (query: string, limit?: number) => Promise<YouTubeSearchResult[]>;
  youtubeThumbFromId: (id?: string | null) => string | null;
  probeMediaMetadata: (diskPath: string) => Promise<any | null>;
};

export const createMediaRoutes = ({
  requireAdmin,
  upload,
  prisma,
  uploadsRoot,
  mediaRoot,
  thumbnailsRoot,
  ensureUploadRoots,
  sanitizeFolderPath,
  toPublicUploadUrl,
  resolvePublicUploadPath,
  detectMediaTypeFromExtension,
  getYouTubeMetadata,
  searchYouTubeVideos,
  youtubeThumbFromId,
  probeMediaMetadata,
}: MediaRoutesOptions): express.Router => {
  const router = express.Router();

  // Type casting applied to avoid express type version mismatch noise.
  (router as any).post('/upload/:type', requireAdmin as any, (upload as any).single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const publicUrl = toPublicUploadUrl(req.file.path);
      const kind = req.params.type;
      const isImage = req.file.mimetype.startsWith('image/');
      const relative = path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/');
      const parts = relative.split('/').filter(Boolean);
      const folder = parts.length > 2 ? parts.slice(1, -1).join('/') : null;

      res.json({
        success: true,
        type: kind,
        fileType: req.file.mimetype,
        size: req.file.size,
        url: publicUrl,
        role: isImage ? 'thumbnail' : 'media',
        folder,
      });
    } catch (e) {
      console.error('Upload error', e);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

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
          message: 'Unable to retrieve YouTube metadata. Please verify the video URL manually.',
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
        durationMinutes: minutesRounded,
      });
    } catch (e) {
      console.error('YouTube metadata error', e);
      res.status(500).json({ success: false, error: 'Failed to fetch metadata' });
    }
  });

  router.get('/youtube/search', requireAdmin as any, async (req, res) => {
    try {
      const query = String(req.query?.query || '').trim();
      const parsedLimit = Number.parseInt(String(req.query?.limit || '8'), 10);
      const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 8;

      if (!query) {
        return res.status(400).json({ success: false, error: 'Missing query parameter' });
      }

      const results = await searchYouTubeVideos(query, limit);
      res.json({ success: true, data: results });
    } catch (e) {
      console.error('YouTube search endpoint error', e);
      res.status(500).json({ success: false, error: 'Failed to search YouTube videos' });
    }
  });

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
            note: 'Metadata fetch unavailable; please enter details manually.',
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
          originalUrl: `https://www.youtube.com/watch?v=${id}`,
        });
      }

      if (type === 'file') {
        const publicUrl = String(value);
        if (!publicUrl.startsWith('/uploads/')) {
          return res.status(400).json({ success: false, error: 'File value must start with /uploads/' });
        }

        const diskPath = resolvePublicUploadPath(publicUrl);
        if (!diskPath || !fs.existsSync(diskPath)) {
          return res.status(404).json({ success: false, error: 'File not found' });
        }

        const meta = await probeMediaMetadata(diskPath);
        let seconds: number | null = null;
        if (meta?.format?.duration) seconds = Math.round(meta.format.duration);

        const base = path.basename(diskPath).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        return res.json({
          success: true,
          provider: 'local',
          title: base,
          description: null,
          thumbnail: null,
          durationSeconds: seconds,
          durationMinutes: seconds ? Math.max(1, Math.round(seconds / 60)) : null,
          originalUrl: value,
        });
      }

      return res.status(400).json({ success: false, error: 'Unsupported type' });
    } catch (e) {
      console.error('Media metadata endpoint error', e);
      res.status(500).json({ success: false, error: 'Failed to fetch media metadata' });
    }
  });

  router.get('/media/files', requireAdmin as any, async (_req, res) => {
    try {
      ensureUploadRoots();

      const collectFiles = async (bucketRoot: string, bucketName: 'media' | 'thumbnails') => {
        const results: Array<{
          id: string;
          name: string;
          type: MediaType;
          size: number;
          url: string;
          thumbnail?: string;
          folder: string | null;
          bucket: 'media' | 'thumbnails';
          createdAt: string;
          updatedAt: string;
        }> = [];

        const walk = async (dir: string): Promise<void> => {
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walk(fullPath);
              continue;
            }

            const stats = await fs.promises.stat(fullPath);
            const relative = path.relative(bucketRoot, fullPath).replace(/\\/g, '/');
            const folder = relative.includes('/') ? relative.substring(0, relative.lastIndexOf('/')) : null;
            const url = toPublicUploadUrl(fullPath);
            const mediaType = bucketName === 'thumbnails'
              ? 'image'
              : detectMediaTypeFromExtension(entry.name);

            results.push({
              id: `${bucketName}:${relative}`,
              name: entry.name,
              type: mediaType,
              size: stats.size,
              url,
              thumbnail: bucketName === 'thumbnails' || mediaType === 'image' ? url : undefined,
              folder,
              bucket: bucketName,
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
            });
          }
        };

        await walk(bucketRoot);
        return results;
      };

      const [mediaFiles, thumbnailFiles] = await Promise.all([
        collectFiles(mediaRoot, 'media'),
        collectFiles(thumbnailsRoot, 'thumbnails'),
      ]);

      const data = [...mediaFiles, ...thumbnailFiles]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      res.json({ success: true, data });
    } catch (error) {
      console.error('Failed to list media files', error);
      res.status(500).json({ success: false, error: 'Failed to list media files' });
    }
  });

  router.post('/media/folders', requireAdmin as any, async (req, res) => {
    try {
      const folderName = sanitizeFolderPath(String(req.body?.folderName ?? ''));
      const bucketInput = String(req.body?.bucket ?? 'media');
      const bucket = bucketInput === 'thumbnails' ? 'thumbnails' : 'media';

      if (!folderName) {
        return res.status(400).json({ success: false, error: 'A valid folder name is required' });
      }

      const base = bucket === 'thumbnails' ? thumbnailsRoot : mediaRoot;
      const target = path.resolve(base, folderName);
      if (!target.startsWith(path.resolve(base))) {
        return res.status(400).json({ success: false, error: 'Invalid folder path' });
      }

      fs.mkdirSync(target, { recursive: true });
      res.json({
        success: true,
        data: {
          folderName,
          bucket,
          url: `/uploads/${bucket}/${folderName}`,
        },
      });
    } catch (error) {
      console.error('Failed to create media folder', error);
      res.status(500).json({ success: false, error: 'Failed to create folder' });
    }
  });

  router.delete('/media/files', requireAdmin as any, async (req, res) => {
    try {
      const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
      if (urls.length === 0) {
        return res.status(400).json({ success: false, error: 'No file URLs provided' });
      }

      const deleted: string[] = [];
      const failed: Array<{ url: string; reason: string }> = [];

      for (const rawUrl of urls) {
        const publicUrl = String(rawUrl || '');
        const filePath = resolvePublicUploadPath(publicUrl);

        if (!filePath) {
          failed.push({ url: publicUrl, reason: 'Invalid upload URL' });
          continue;
        }

        if (!fs.existsSync(filePath)) {
          failed.push({ url: publicUrl, reason: 'File not found' });
          continue;
        }

        const [contentReferences, practiceReferences] = await Promise.all([
          prisma.content.count({
            where: {
              OR: [
                { content: publicUrl },
                { thumbnailUrl: publicUrl },
                { sourceUrl: publicUrl },
              ],
            },
          }),
          prisma.practice.count({
            where: {
              OR: [
                { audioUrl: publicUrl },
                { videoUrl: publicUrl },
                { thumbnailUrl: publicUrl },
              ],
            },
          }),
        ]);

        if (contentReferences + practiceReferences > 0) {
          failed.push({ url: publicUrl, reason: 'File is referenced by published content/practices' });
          continue;
        }

        fs.unlinkSync(filePath);
        deleted.push(publicUrl);
      }

      res.json({ success: true, data: { deleted, failed } });
    } catch (error) {
      console.error('Failed to delete media files', error);
      res.status(500).json({ success: false, error: 'Failed to delete media files' });
    }
  });

  return router;
};
