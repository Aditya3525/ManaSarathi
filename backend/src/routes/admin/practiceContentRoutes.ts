import express from 'express';

type RoutesOptions = {
  requireAdmin: any;
  prisma: any;
  practiceValidationSchema: any;
  contentValidationSchema: any;
  youtubeThumbFromId: (id?: string | null) => string | null;
};

export const createPracticeContentRoutes = ({
  requireAdmin,
  prisma,
  practiceValidationSchema,
  contentValidationSchema,
  youtubeThumbFromId,
}: RoutesOptions): express.Router => {
  const router = express.Router();

  const normalizeIntensityLevel = (value?: string | null): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null => {
    if (!value || !String(value).trim()) {
      return null;
    }

    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'beginner' || normalized === 'low') return 'BEGINNER';
    if (normalized === 'intermediate' || normalized === 'medium' || normalized === 'moderate') return 'INTERMEDIATE';
    if (normalized === 'advanced' || normalized === 'high') return 'ADVANCED';
    return null;
  };

  const normalizeDifficulty = (value?: string | null): string | null => {
    if (!value || !String(value).trim()) {
      return null;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'beginner' || normalized === 'low') return 'Beginner';
    if (normalized === 'intermediate' || normalized === 'moderate' || normalized === 'medium') return 'Intermediate';
    if (normalized === 'advanced' || normalized === 'high') return 'Advanced';
    return String(value).trim();
  };

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
        console.error('Practice validation failed:', error.details.map((d: any) => d.message));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map((d: any) => d.message)
        });
      }

      const {
        title,
        type,
        duration,
        difficulty,
        level,
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

      const resolvedDifficulty = normalizeDifficulty(difficulty || level);
      if (!resolvedDifficulty) {
        return res.status(400).json({ success: false, error: 'Difficulty/level is required' });
      }

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
          difficulty: resolvedDifficulty,
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
          intensityLevel: normalizeIntensityLevel(intensityLevel),
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
          details: error.details.map((d: any) => d.message)
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
      if (value.difficulty !== undefined || value.level !== undefined) {
        const normalizedDifficulty = normalizeDifficulty(value.difficulty || value.level);
        if (normalizedDifficulty) {
          updateData.difficulty = normalizedDifficulty;
        }
      }
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
      if (value.intensityLevel !== undefined) {
        updateData.intensityLevel = normalizeIntensityLevel(value.intensityLevel);
      }
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
          details: error.details.map((d: any) => d.message)
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
        crisisEligible,
        timeOfDay,
        environment,
        culturalContext,
        hasSubtitles,
        transcript
      } = value;

      const normalizedIntensityLevel = normalizeIntensityLevel(intensityLevel);

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
          intensityLevel: normalizedIntensityLevel,
          focusAreas: focusAreas ? JSON.stringify(focusAreas) : null,
          immediateRelief: immediateRelief || false,
          crisisEligible: crisisEligible || false,
          timeOfDay: timeOfDay ? JSON.stringify(timeOfDay) : null,
          environment: environment ? JSON.stringify(environment) : null,
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
        allowUnknown: true
      });
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map((d: any) => d.message)
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
      if (value.intensityLevel !== undefined) {
        updateData.intensityLevel = normalizeIntensityLevel(value.intensityLevel);
      }
      if (value.focusAreas !== undefined) {
        updateData.focusAreas = value.focusAreas ? JSON.stringify(value.focusAreas) : null;
      }
      if (value.immediateRelief !== undefined) updateData.immediateRelief = value.immediateRelief;
      if (value.crisisEligible !== undefined) updateData.crisisEligible = value.crisisEligible;
      if (value.timeOfDay !== undefined) {
        updateData.timeOfDay = value.timeOfDay ? JSON.stringify(value.timeOfDay) : null;
      }
      if (value.environment !== undefined) {
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

  return router;
};
