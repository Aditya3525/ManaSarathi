import { Upload, X, Plus, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Textarea } from '../ui/textarea';

interface EnhancedContentFormProps {
  onSubmit: (data: ContentFormData) => Promise<void>;
  initialData?: Partial<ContentFormData>;
  isEditing?: boolean;
}

export interface ContentFormData {
  title: string;
  type: string; // Content type: article, video, podcast, interactive
  category: string;
  approach: string;
  content: string;
  description?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds
  intensityLevel?: string; // Difficulty level: low, medium, high
  tags: string;
  focusAreas: string[]; // Array format
  immediateRelief: boolean;
  crisisEligible: boolean; // NEW V2
  timeOfDay: string[]; // NEW V2
  environment: string[]; // NEW V2
  culturalContext?: string;
  hasSubtitles: boolean;
  transcript?: string;
  isPublished: boolean;
  sourceUrl?: string;
  sourceName?: string;
}

const intensityLevels = ['low', 'medium', 'high'];

const focusAreasOptions = [
  'Anxiety Relief',
  'Depression Support',
  'Stress Management',
  'Sleep Improvement',
  'Mindfulness',
  'Self-Compassion',
  'Emotional Regulation',
  'Trauma Recovery',
  'Relationship Skills',
  'Anger Management',
  'Grief Support',
  'Crisis Intervention',
  'Panic Attack Relief',
  'Grounding Techniques',
  'Body Awareness',
  'Breathing Exercises',
  'Progressive Relaxation',
  'Cognitive Reframing',
  'Positive Psychology',
  'Resilience Building'
];

const approaches = ['western', 'eastern', 'hybrid'];

export function EnhancedContentForm({ onSubmit, initialData, isEditing = false }: EnhancedContentFormProps) {
  const { push } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ContentFormData>({
    title: initialData?.title || '',
    type: initialData?.type || 'article',
    category: initialData?.category || 'mindfulness',
    approach: initialData?.approach || 'hybrid',
    content: initialData?.content || '',
    description: initialData?.description || '',
    youtubeUrl: initialData?.youtubeUrl || '',
    thumbnailUrl: initialData?.thumbnailUrl || '',
    duration: initialData?.duration || undefined,
    intensityLevel: initialData?.intensityLevel || 'low',
    tags: initialData?.tags || '',
    focusAreas: initialData?.focusAreas || [],
    immediateRelief: initialData?.immediateRelief || false,
    crisisEligible: initialData?.crisisEligible || false, // NEW V2
    timeOfDay: initialData?.timeOfDay || [], // NEW V2
    environment: initialData?.environment || [], // NEW V2
    culturalContext: initialData?.culturalContext || '',
    hasSubtitles: initialData?.hasSubtitles || false,
    transcript: initialData?.transcript || '',
    isPublished: initialData?.isPublished || false,
    sourceUrl: initialData?.sourceUrl || '',
    sourceName: initialData?.sourceName || ''
  });

  const handleFocusAreaToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      push({ title: 'Validation Error', description: 'Title is required', type: 'error' });
      return;
    }
    
    if (!formData.content.trim()) {
      push({ title: 'Validation Error', description: 'Content is required', type: 'error' });
      return;
    }

    if (formData.focusAreas.length === 0) {
      push({ title: 'Validation Error', description: 'Please select at least one focus area', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      push({
        title: 'Success',
        description: `Content ${isEditing ? 'updated' : 'created'} successfully`,
        type: 'success'
      });
    } catch (error) {
      push({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save content',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Content' : 'Create New Content'}
        </h2>
        {formData.immediateRelief && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Crisis Resource</span>
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter content title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Content Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="podcast">Podcast</SelectItem>
              <SelectItem value="interactive">Interactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category and Approach */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., anxiety, depression"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="approach">Approach *</Label>
          <Select
            value={formData.approach}
            onValueChange={(value) => setFormData({ ...formData, approach: value })}
          >
            <SelectTrigger id="approach">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {approaches.map(approach => (
                <SelectItem key={approach} value={approach}>
                  {approach.charAt(0).toUpperCase() + approach.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intensityLevel">Intensity Level *</Label>
          <Select
            value={formData.intensityLevel}
            onValueChange={(value) => setFormData({ ...formData, intensityLevel: value })}
          >
            <SelectTrigger id="intensityLevel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intensityLevels.map(level => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description and Content */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the content"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content/URL *</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Enter content text or resource URL"
          rows={6}
          required
        />
      </div>

      {/* Media URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="youtubeUrl">YouTube URL</Label>
          <Input
            id="youtubeUrl"
            type="url"
            value={formData.youtubeUrl}
            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
          <Input
            id="thumbnailUrl"
            type="url"
            value={formData.thumbnailUrl}
            onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Duration and Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration || ''}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || undefined })}
            placeholder="e.g., 300 for 5 minutes"
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="meditation, breathing, relaxation"
          />
        </div>
      </div>

      {/* Focus Areas */}
      <div className="space-y-3">
        <Label>Focus Areas * (select all that apply)</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
          {focusAreasOptions.map(area => (
            <div key={area} className="flex items-center space-x-2">
              <Checkbox
                id={`focus-${area}`}
                checked={formData.focusAreas.includes(area)}
                onCheckedChange={() => handleFocusAreaToggle(area)}
              />
              <label
                htmlFor={`focus-${area}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {area}
              </label>
            </div>
          ))}
        </div>
        {formData.focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.focusAreas.map(area => (
              <span key={area} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {area}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-blue-900"
                  onClick={() => handleFocusAreaToggle(area)}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cultural Context and Transcript */}
      <div className="space-y-2">
        <Label htmlFor="culturalContext">Cultural Context</Label>
        <Input
          id="culturalContext"
          value={formData.culturalContext}
          onChange={(e) => setFormData({ ...formData, culturalContext: e.target.value })}
          placeholder="e.g., Buddhist mindfulness, Western CBT, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transcript">Transcript (for videos/audio)</Label>
        <Textarea
          id="transcript"
          value={formData.transcript}
          onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
          placeholder="Full text transcript..."
          rows={4}
        />
      </div>

      {/* Source Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input
            id="sourceUrl"
            type="url"
            value={formData.sourceUrl}
            onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
            placeholder="https://source.com/..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceName">Source Name</Label>
          <Input
            id="sourceName"
            value={formData.sourceName}
            onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
            placeholder="e.g., Mayo Clinic, APA"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="immediateRelief"
            checked={formData.immediateRelief}
            onCheckedChange={(checked) => setFormData({ ...formData, immediateRelief: checked as boolean })}
          />
          <label
            htmlFor="immediateRelief"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Immediate Relief / Crisis Resource
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="crisisEligible"
            checked={formData.crisisEligible}
            onCheckedChange={(checked) => setFormData({ ...formData, crisisEligible: checked as boolean })}
          />
          <label
            htmlFor="crisisEligible"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            ✅ Crisis-Safe Content
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasSubtitles"
            checked={formData.hasSubtitles}
            onCheckedChange={(checked) => setFormData({ ...formData, hasSubtitles: checked as boolean })}
          />
          <label
            htmlFor="hasSubtitles"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Has Subtitles
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPublished"
            checked={formData.isPublished}
            onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked as boolean })}
          />
          <label
            htmlFor="isPublished"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Publish Immediately
          </label>
        </div>
      </div>

      {/* V2 Fields: Time of Day & Environment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="timeOfDay">Recommended Time of Day</Label>
          <div className="flex flex-wrap gap-2">
            {['morning', 'afternoon', 'evening', 'night'].map((time) => (
              <label key={time} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.timeOfDay.includes(time)}
                  onChange={() => {
                    setFormData(prev => ({
                      ...prev,
                      timeOfDay: prev.timeOfDay.includes(time)
                        ? prev.timeOfDay.filter(t => t !== time)
                        : [...prev.timeOfDay, time]
                    }));
                  }}
                  className="rounded"
                />
                <span className="text-sm capitalize">{time}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-500">Select optimal times for this content</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="environment">Suitable Environments</Label>
          <div className="flex flex-wrap gap-2">
            {['home', 'work', 'public', 'nature'].map((env) => (
              <label key={env} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.environment.includes(env)}
                  onChange={() => {
                    setFormData(prev => ({
                      ...prev,
                      environment: prev.environment.includes(env)
                        ? prev.environment.filter(e => e !== env)
                        : [...prev.environment, env]
                    }));
                  }}
                  className="rounded"
                />
                <span className="text-sm capitalize">{env}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-500">Where can users consume this content?</p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isSubmitting ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              {isEditing ? 'Update Content' : 'Create Content'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
