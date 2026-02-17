import { Loader2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { useNotificationStore } from '../stores/notificationStore';

export interface PracticeRecord {
  id: string;
  title: string;
  type: 'meditation' | 'breathing' | 'yoga' | 'sleep';
  format?: 'Audio' | 'Video' | 'Audio/Video';
  duration: number;
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  approach: 'Western' | 'Eastern' | 'Hybrid' | 'All';
  description?: string;
  audioUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  isPublished: boolean;
  // V2 Schema Fields - Crisis & Focus
  focusAreas?: string[];
  immediateRelief?: boolean;
  crisisEligible?: boolean;
  // New metadata fields
  category?: string;
  intensityLevel?: 'low' | 'medium' | 'high';
  requiredEquipment?: string[];
  environment?: string[];
  timeOfDay?: string[];
  sensoryEngagement?: string[];
  steps?: Array<{ step: number; instruction: string; duration?: number }>;
  contraindications?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface PracticeFormProps {
  existing?: PracticeRecord;
  onSaved: (practice: PracticeRecord) => void;
  onClose: () => void;
}

export const PracticeForm: React.FC<PracticeFormProps> = ({ existing, onSaved, onClose }) => {
  const { push } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState({ audio: false, video: false, thumbnail: false });
  const [fileNames, setFileNames] = useState<{ audio?: string; video?: string; thumbnail?: string }>({});
  const [metaLoading, setMetaLoading] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [formData, setFormData] = useState<Partial<PracticeRecord>>({
    title: '',
    type: 'meditation',
    duration: 5,
    level: 'Beginner',
    approach: 'All',
    format: 'Audio',
    description: '',
    audioUrl: '',
    videoUrl: '',
    youtubeUrl: '',
    thumbnailUrl: '',
    tags: [],
    isPublished: false,
    // V2 Schema Fields - Crisis & Focus
    focusAreas: [],
    immediateRelief: false,
    crisisEligible: false,
    // New metadata fields
    category: '',
    intensityLevel: 'medium',
    requiredEquipment: [],
    environment: [],
    timeOfDay: [],
    sensoryEngagement: [],
    steps: [],
    contraindications: [],
  });

  useEffect(() => {
    if (existing) {
      // Normalize existing.tags: backend may return comma string
      let normalizedTags: string[] | undefined = existing.tags;
      if (normalizedTags && !Array.isArray(normalizedTags)) {
        if (typeof (normalizedTags as unknown) === 'string') {
          const raw = normalizedTags as unknown as string;
          normalizedTags = raw.split(',').map(t => t.trim()).filter(t => t.length > 0);
        } else {
          normalizedTags = [];
        }
      }
      setFormData({ ...existing, tags: normalizedTags || [] });
      setYoutubeInput(existing.youtubeUrl || '');
    }
  }, [existing]);

  const handleInputChange = (field: keyof PracticeRecord, value: string | number | boolean | string[]) => {
    // If type changes to sleep, enforce Audio format
    if (field === 'type' && value === 'sleep') {
      setFormData(prev => ({ ...prev, type: value as PracticeRecord['type'], format: 'Audio' }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    handleInputChange('tags', tags);
  };

  function extractYouTubeId(raw?: string) {
    if (!raw) return '';
    const val = raw.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;
    try {
      const u = new URL(val);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split(/[?&#]/)[0];
      const v = u.searchParams.get('v');
      if (v) return v;
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
  } catch (_) { /* ignore parse */ }
    return val;
  }

  // Fetch full YouTube metadata (title, description, thumbnail, duration)
  const fetchYouTubeFull = async (id: string, force = false) => {
    console.log('fetchYouTubeFull called with id:', id, 'force:', force);
    setMetaLoading(true);
    try {
      const resp = await fetch(`/api/admin/media/metadata?type=youtube&value=${encodeURIComponent(id)}`, { credentials: 'include' });
      console.log('Metadata response status:', resp.status);
      if (!resp.ok) {
        let msg = `Metadata request failed (${resp.status})`;
        try {
          const errJson = await resp.json();
          if (errJson?.error) msg = errJson.error;
        } catch { /* ignore parse */ }
        console.warn('YouTube metadata fetch failed:', msg);
        push({ type: 'error', title: 'YouTube Metadata', description: msg });
        return;
      }
      const json = await resp.json();
      console.log('Metadata response:', json);
      if (!json.success) {
        push({ type: 'error', title: 'YouTube Metadata', description: json.error || 'Failed to fetch video data' });
        return;
      }
      console.log('Setting form data with duration:', json.durationMinutes, 'current duration:', formData.duration);
      setFormData(prev => ({
        ...prev,
        title: prev.title?.trim() ? prev.title : (json.title || prev.title),
        description: prev.description?.trim() ? prev.description : (json.description || prev.description),
        thumbnailUrl: prev.thumbnailUrl?.trim() ? prev.thumbnailUrl : (json.thumbnail || prev.thumbnailUrl),
        duration: (force || !prev.duration || prev.duration <= 1 || prev.duration === 5) && json.durationMinutes
          ? json.durationMinutes
          : prev.duration
      }));
    } catch (e) {
      console.error('YouTube metadata exception', e);
      push({ type: 'error', title: 'YouTube Metadata', description: 'Unexpected error fetching metadata' });
    } finally {
      setMetaLoading(false);
    }
  };

  // Debounced auto-fetch when youtubeUrl changes
  const ytDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedId = useRef<string>('');
  useEffect(() => {
    const raw = youtubeInput.trim();
    console.log('YouTube URL changed:', raw);
    if (!raw) {
      lastFetchedId.current = '';
      return;
    }
    if (ytDebounceRef.current) clearTimeout(ytDebounceRef.current);
    ytDebounceRef.current = setTimeout(() => {
      const id = extractYouTubeId(raw);
      console.log('Extracted YouTube ID:', id);
      if (!id) return;
      if (lastFetchedId.current === id) return; // avoid duplicate fetch
      lastFetchedId.current = id;
      fetchYouTubeFull(id);
    }, 500);
    return () => { if (ytDebounceRef.current) clearTimeout(ytDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeInput]);

  const fetchFileMetadata = async (fileUrl: string) => {
    try {
      const resp = await fetch(`/api/admin/media/metadata?type=file&value=${encodeURIComponent(fileUrl)}`, { credentials: 'include' });
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.success ? json : null;
    } catch (e) {
      console.error('File metadata fetch error:', e);
      return null;
    }
  };

  const uploadFile = async (file: File, type: 'media' | 'thumbnail') => {
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch(`/api/admin/upload/${type}`, { method: 'POST', body: form, credentials: 'include' });
    if (!resp.ok) throw new Error('Upload failed');
    const data = await resp.json();
    return data.url as string;
  };

  const fetchYouTubeDuration = async (id: string) => {
    try {
      const resp = await fetch(`/api/admin/youtube/metadata/${id}`, { credentials: 'include' });
      if (!resp.ok) return; // silent
      const json = await resp.json();
      if (json.success && json.durationMinutes && (!formData.duration || !existing)) {
        setFormData(prev => ({ ...prev, duration: json.durationMinutes }));
      }
  } catch (_) { /* ignore metadata fetch */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      push({ type: 'error', title: 'Validation Error', description: 'Title is required' });
      return;
    }

    if (!formData.description || !formData.description.trim()) {
      push({ type: 'error', title: 'Validation Error', description: 'Description is required' });
      return;
    }

    if (!formData.thumbnailUrl || !formData.thumbnailUrl.trim()) {
      push({ type: 'error', title: 'Validation Error', description: 'Thumbnail is required (URL or uploaded image)' });
      return;
    }

    // Media requirements
    if (formData.format === 'Audio') {
      const hasAudio = (formData.audioUrl && formData.audioUrl.trim()) || uploaded.audio;
      if (!hasAudio) {
        push({ type: 'error', title: 'Validation Error', description: 'Provide an Audio URL or upload an audio file' });
        return;
      }
    }
    if (formData.format === 'Video') {
      const hasVideo = (formData.videoUrl && formData.videoUrl.trim()) || (formData.youtubeUrl && formData.youtubeUrl.trim()) || uploaded.video;
      if (!hasVideo) {
        push({ type: 'error', title: 'Validation Error', description: 'Provide a Video URL, YouTube URL, or upload a video file' });
        return;
      }
    }

    if (!formData.duration || formData.duration <= 0) {
      push({ type: 'error', title: 'Validation Error', description: 'Duration must be greater than 0' });
      return;
    }

    setLoading(true);
    try {
      let youtubeVideoId: string | null = null;
      if (formData.youtubeUrl) {
        const id = extractYouTubeId(formData.youtubeUrl);
        if (id) {
          youtubeVideoId = id;
          await fetchYouTubeDuration(id);
        }
      }

      // Perform pending uploads: detect temp placeholders 'uploaded-*'
      const updated: Record<string, unknown> = { ...formData };
      if (youtubeVideoId) {
        updated.youtubeUrl = youtubeVideoId;
      }
      const uploadTasks: Promise<void>[] = [];
      const audioInput = document.getElementById('audioUpload') as HTMLInputElement | null;
      const videoInput = document.getElementById('videoUpload') as HTMLInputElement | null;
      const thumbInput = document.getElementById('thumbnailUpload') as HTMLInputElement | null;
      if (audioInput?.files?.[0] && formData.format === 'Audio') {
        uploadTasks.push(uploadFile(audioInput.files[0], 'media').then(url => { updated.audioUrl = url; }));
      }
      if (videoInput?.files?.[0] && formData.format === 'Video') {
        uploadTasks.push(uploadFile(videoInput.files[0], 'media').then(url => { updated.videoUrl = url; }));
      }
      if (thumbInput?.files?.[0]) {
        uploadTasks.push(uploadFile(thumbInput.files[0], 'thumbnail').then(url => { updated.thumbnailUrl = url; }));
      }
      if (uploadTasks.length) await Promise.all(uploadTasks);

      // Fetch metadata for uploaded media files
      if (updated.audioUrl) {
        const meta = await fetchFileMetadata(updated.audioUrl as string);
        if (meta?.durationMinutes && (!updated.duration || updated.duration === 5)) {
          updated.duration = meta.durationMinutes;
        }
        if (meta?.title && !updated.title) {
          updated.title = meta.title;
        }
      }
      if (updated.videoUrl) {
        const meta = await fetchFileMetadata(updated.videoUrl as string);
        if (meta?.durationMinutes && (!updated.duration || updated.duration === 5)) {
          updated.duration = meta.durationMinutes;
        }
        if (meta?.title && !updated.title) {
          updated.title = meta.title;
        }
      }

      const url = existing ? `/api/admin/practices/${existing.id}` : '/api/admin/practices';
      const method = existing ? 'PUT' : 'POST';
      
      // Build payload with level as difficulty for backend compatibility
      interface PracticePayload extends Omit<PracticeRecord, 'id' | 'tags'> {
        tags?: string | string[];
        difficulty?: string;
      }
      const payload: PracticePayload = {
        ...(formData as PracticePayload),
        difficulty: formData.level, // Map level to difficulty for backend
        tags: Array.isArray(formData.tags) ? formData.tags.join(',') : formData.tags,
      };

      // Clean up empty strings to null for optional enum fields
      const finalPayload: any = { ...payload, ...updated };
      if (finalPayload.category === '') finalPayload.category = null;
      if (finalPayload.intensityLevel === '') finalPayload.intensityLevel = null;
      
      // Clean up empty arrays
      if (Array.isArray(finalPayload.requiredEquipment) && finalPayload.requiredEquipment.length === 0) {
        delete finalPayload.requiredEquipment;
      }
      if (Array.isArray(finalPayload.environment) && finalPayload.environment.length === 0) {
        delete finalPayload.environment;
      }
      if (Array.isArray(finalPayload.timeOfDay) && finalPayload.timeOfDay.length === 0) {
        delete finalPayload.timeOfDay;
      }
      if (Array.isArray(finalPayload.sensoryEngagement) && finalPayload.sensoryEngagement.length === 0) {
        delete finalPayload.sensoryEngagement;
      }
      if (Array.isArray(finalPayload.steps) && finalPayload.steps.length === 0) {
        delete finalPayload.steps;
      }
      if (Array.isArray(finalPayload.contraindications) && finalPayload.contraindications.length === 0) {
        delete finalPayload.contraindications;
      }

      console.log('Sending practice payload:', JSON.stringify(finalPayload, null, 2));

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Practice save failed:', errorData);
        const errorMessage = errorData.details ? 
          `Validation errors: ${errorData.details.join(', ')}` : 
          errorData.error || `Failed to ${existing ? 'update' : 'create'} practice`;
        throw new Error(errorMessage);
      }

      const savedPractice = await response.json();
      onSaved(savedPractice);
      push({ 
        type: 'success', 
        title: 'Success', 
        description: `Practice ${existing ? 'updated' : 'created'} successfully` 
      });
    } catch (error) {
      console.error('Practice save error:', error);
      push({ 
        type: 'error', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to save practice' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Practice title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type || 'Meditation'}
            onValueChange={(value) => handleInputChange('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meditation">Meditation</SelectItem>
              <SelectItem value="breathing">Breathing</SelectItem>
              <SelectItem value="yoga">Yoga</SelectItem>
              <SelectItem value="sleep">Sleep</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes) *</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration || 5}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 5)}
            placeholder="Duration in minutes"
            min="1"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <Select
            value={formData.level || 'Beginner'}
            onValueChange={(value) => handleInputChange('level', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="approach">Approach</Label>
          <Select
            value={formData.approach || 'All'}
            onValueChange={(value) => handleInputChange('approach', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select approach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Approaches</SelectItem>
              <SelectItem value="Western">Western</SelectItem>
              <SelectItem value="Eastern">Eastern</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select
            value={formData.format || 'Audio'}
            onValueChange={(value) => handleInputChange('format', value)}
            disabled={formData.type === 'sleep'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Audio">Audio</SelectItem>
              <SelectItem value="Video">Video</SelectItem>
            </SelectContent>
          </Select>
          {formData.type === 'sleep' && (
            <p className="text-xs text-muted-foreground">Sleep practices are limited to audio format.</p>
          )}
        </div>

        {/* NEW: Category Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="category">Practice Category</Label>
          <Select
            value={formData.category || ''}
            onValueChange={(value) => handleInputChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEDITATION">Meditation</SelectItem>
              <SelectItem value="YOGA">Yoga</SelectItem>
              <SelectItem value="BREATHING">Breathing</SelectItem>
              <SelectItem value="MINDFULNESS">Mindfulness</SelectItem>
              <SelectItem value="JOURNALING">Journaling</SelectItem>
              <SelectItem value="CBT_TECHNIQUE">CBT Technique</SelectItem>
              <SelectItem value="GROUNDING_EXERCISE">Grounding Exercise</SelectItem>
              <SelectItem value="SELF_REFLECTION">Self-Reflection</SelectItem>
              <SelectItem value="MOVEMENT">Movement</SelectItem>
              <SelectItem value="SLEEP_HYGIENE">Sleep Hygiene</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* NEW: Intensity Level */}
        <div className="space-y-2">
          <Label htmlFor="intensityLevel">Intensity Level</Label>
          <Select
            value={formData.intensityLevel || 'medium'}
            onValueChange={(value) => handleInputChange('intensityLevel', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select intensity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* NEW: Required Equipment */}
      <div className="space-y-2">
        <Label htmlFor="requiredEquipment">Required Equipment (max 20, comma-separated)</Label>
        <Input
          id="requiredEquipment"
          value={(formData.requiredEquipment || []).join(', ')}
          onChange={(e) => {
            const equipment = e.target.value.split(',').map(eq => eq.trim()).filter(eq => eq.length > 0).slice(0, 20);
            handleInputChange('requiredEquipment', equipment);
          }}
          placeholder="e.g., Yoga mat, Cushion, Timer, Journal"
        />
        <p className="text-xs text-muted-foreground">
          {(formData.requiredEquipment || []).length}/20 items
        </p>
      </div>

      {/* NEW: Environment Multi-Select */}
      <div className="space-y-2">
        <Label>Suitable Environments</Label>
        <div className="flex flex-wrap gap-2">
          {['home', 'work', 'public', 'nature'].map((env) => (
            <label key={env} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.environment || []).includes(env)}
                onChange={(e) => {
                  const current = formData.environment || [];
                  const updated = e.target.checked
                    ? [...current, env]
                    : current.filter(e => e !== env);
                  handleInputChange('environment', updated);
                }}
                className="rounded"
              />
              <span className="text-sm capitalize">{env}</span>
            </label>
          ))}
        </div>
      </div>

      {/* NEW: Time of Day Multi-Select */}
      <div className="space-y-2">
        <Label>Best Time of Day</Label>
        <div className="flex flex-wrap gap-2">
          {['morning', 'afternoon', 'evening', 'night'].map((time) => (
            <label key={time} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.timeOfDay || []).includes(time)}
                onChange={(e) => {
                  const current = formData.timeOfDay || [];
                  const updated = e.target.checked
                    ? [...current, time]
                    : current.filter(t => t !== time);
                  handleInputChange('timeOfDay', updated);
                }}
                className="rounded"
              />
              <span className="text-sm capitalize">{time}</span>
            </label>
          ))}
        </div>
      </div>

      {/* NEW: Sensory Engagement */}
      <div className="space-y-2">
        <Label htmlFor="sensoryEngagement">Sensory Engagement (max 10, comma-separated)</Label>
        <Input
          id="sensoryEngagement"
          value={(formData.sensoryEngagement || []).join(', ')}
          onChange={(e) => {
            const sensory = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 10);
            handleInputChange('sensoryEngagement', sensory);
          }}
          placeholder="e.g., Visual, Auditory, Tactile, Breathing"
        />
        <p className="text-xs text-muted-foreground">
          {(formData.sensoryEngagement || []).length}/10 items
        </p>
      </div>

      {/* NEW: Contraindications */}
      <div className="space-y-2">
        <Label htmlFor="contraindications">Contraindications/Safety Warnings (max 20, comma-separated)</Label>
        <Textarea
          id="contraindications"
          value={(formData.contraindications || []).join(', ')}
          onChange={(e) => {
            const contras = e.target.value.split(',').map(c => c.trim()).filter(c => c.length > 0 && c.length <= 200).slice(0, 20);
            handleInputChange('contraindications', contras);
          }}
          placeholder="e.g., Not for pregnant women, Avoid if high blood pressure, Consult doctor if back pain"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          {(formData.contraindications || []).length}/20 items (max 200 chars each)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Brief description of the practice"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formData.format === 'Audio' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audioUrl">Audio URL</Label>
              <Input
                id="audioUrl"
                value={formData.audioUrl || ''}
                onChange={(e) => handleInputChange('audioUrl', e.target.value)}
                placeholder="Direct link to audio file"
                type="url"
                disabled={uploaded.audio}
              />
              {uploaded.audio && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-green-600">Selected file: {fileNames.audio}</span>
                  <button
                    type="button"
                    className="text-red-500 hover:underline"
                    onClick={() => {
                      setUploaded(prev => ({ ...prev, audio: false }));
                      setFileNames(prev => ({ ...prev, audio: undefined }));
                      handleInputChange('audioUrl', '');
                    }}
                  >Remove</button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="audioUpload">Or Upload Audio File</Label>
              <Input
                id="audioUpload"
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleInputChange('audioUrl', `uploaded-audio-${file.name}`);
                    setUploaded(prev => ({ ...prev, audio: true }));
                    setFileNames(prev => ({ ...prev, audio: file.name }));
                    if (!formData.title) {
                      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g,' ') }));
                    }
                  }
                }}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              <p className="text-xs text-muted-foreground">
                Upload an audio file from your local machine
              </p>
            </div>
          </div>
        )}

        {formData.format === 'Video' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl || ''}
                onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                placeholder="Direct link to video file"
                type="url"
                disabled={uploaded.video}
              />
              {uploaded.video && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-green-600">Selected file: {fileNames.video}</span>
                  <button
                    type="button"
                    className="text-red-500 hover:underline"
                    onClick={() => {
                      setUploaded(prev => ({ ...prev, video: false }));
                      setFileNames(prev => ({ ...prev, video: undefined }));
                      handleInputChange('videoUrl', '');
                    }}
                  >Remove</button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoUpload">Or Upload Video File</Label>
              <Input
                id="videoUpload"
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleInputChange('videoUrl', `uploaded-video-${file.name}`);
                    setUploaded(prev => ({ ...prev, video: true }));
                    setFileNames(prev => ({ ...prev, video: file.name }));
                    if (!formData.title) {
                      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g,' ') }));
                    }
                  }
                }}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              <p className="text-xs text-muted-foreground">
                Upload a video file from your local machine
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="youtubeUrl" className="flex items-center gap-2">
            YouTube URL (Optional)
            {metaLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </Label>
          <div className="relative">
            <Input
              id="youtubeUrl"
              className={metaLoading ? 'pr-8' : ''}
              value={youtubeInput}
              onChange={(e) => {
                const value = e.target.value;
                setYoutubeInput(value);
                handleInputChange('youtubeUrl', value);
              }}
              placeholder="Paste a YouTube link or video ID"
              type="text"
            />
            {metaLoading && (
              <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {metaLoading ? 'Fetching metadata…' : 'Title, description, thumbnail & duration will auto-fill.'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL *</Label>
            <Input
              id="thumbnailUrl"
              value={formData.thumbnailUrl || ''}
              onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
              placeholder="URL to thumbnail image"
              type="url"
              disabled={uploaded.thumbnail}
            />
            {uploaded.thumbnail && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-green-600">Selected file: {fileNames.thumbnail}</span>
                <button
                  type="button"
                  className="text-red-500 hover:underline"
                  onClick={() => {
                    setUploaded(prev => ({ ...prev, thumbnail: false }));
                    setFileNames(prev => ({ ...prev, thumbnail: undefined }));
                    handleInputChange('thumbnailUrl', '');
                  }}
                >Remove</button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnailUpload">Or Upload Thumbnail *</Label>
            <Input
              id="thumbnailUpload"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleInputChange('thumbnailUrl', `uploaded-image-${file.name}`);
                  setUploaded(prev => ({ ...prev, thumbnail: true }));
                  setFileNames(prev => ({ ...prev, thumbnail: file.name }));
                }
              }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
            />
            <p className="text-xs text-muted-foreground">Provide an image URL or upload a local image file.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
          onChange={(e) => handleTagsChange(e.target.value)}
          placeholder="anxiety, stress, relaxation"
        />
      </div>

      {/* V2 Schema Fields - Crisis & Focus */}
      <div className="space-y-4 border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold text-gray-700">V2 Schema: Focus & Crisis Filtering</h3>
        
        {/* Focus Areas */}
        <div className="space-y-2">
          <Label htmlFor="focusAreas">Focus Areas (comma-separated)</Label>
          <Input
            id="focusAreas"
            value={Array.isArray(formData.focusAreas) ? formData.focusAreas.join(', ') : ''}
            onChange={(e) => {
              const areas = e.target.value.split(',').map(a => a.trim().toLowerCase()).filter(a => a.length > 0);
              handleInputChange('focusAreas', areas);
            }}
            placeholder="anxiety, stress, panic, depression, sleep, focus"
          />
          <p className="text-xs text-muted-foreground">
            Lowercase keywords for targeted recommendations (e.g., anxiety, stress, panic)
          </p>
        </div>

        {/* Immediate Relief Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="immediateRelief"
            checked={formData.immediateRelief || false}
            onChange={(e) => handleInputChange('immediateRelief', e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="immediateRelief" className="cursor-pointer">
            ⚡ Quick Relief Practice (5-10 min techniques for immediate support)
          </Label>
        </div>

        {/* Crisis-Eligible Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="crisisEligible"
            checked={formData.crisisEligible || false}
            onChange={(e) => handleInputChange('crisisEligible', e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="crisisEligible" className="cursor-pointer">
            ✅ Crisis-Safe Practice (Suitable for users in emotional crisis)
          </Label>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isPublished"
          checked={formData.isPublished || false}
          onCheckedChange={(checked) => handleInputChange('isPublished', checked)}
        />
        <Label htmlFor="isPublished">Published</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : existing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};
