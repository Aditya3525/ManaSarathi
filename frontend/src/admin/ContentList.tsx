import {
  Plus,
  Edit,
  Trash2,
  Search,
  FileText,
  Video,
  Headphones,
  BookMarked,
  Mic,
  Heart,
  Filter,
  Eye
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getApiBaseUrl } from '../config/apiConfig';
import { useNotificationStore } from '../stores/notificationStore';

import { adminFetch } from './adminApi';
import { BulkActionToolbar } from './BulkActionToolbar';
import { PreviewModal } from './PreviewModal';

export interface ContentItem {
  id: string;
  title: string;
  type: 'article' | 'video' | 'audio' | 'playlist' | 'story';
  approach: 'western' | 'eastern' | 'hybrid' | 'all';
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  description?: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  duration?: number;
  tags?: string[];
  isPublished: boolean;
  createdAt: string;
}

interface ContentListProps {
  embedded?: boolean;
  onAdd?: () => void;
  onEdit?: (content: ContentItem) => void;
  itemsExternal?: ContentItem[];
  setItemsExternal?: (items: ContentItem[] | ((prev: ContentItem[]) => ContentItem[])) => void;
}

export const ContentList: React.FC<ContentListProps> = ({
  embedded = false,
  onAdd,
  onEdit,
  itemsExternal,
  setItemsExternal
}) => {
  const { push } = useNotificationStore();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterApproach, setFilterApproach] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<ContentItem | null>(null);

  const filterGridClasses = 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4';

  // Use external items if provided (embedded mode)
  const currentItems = embedded && itemsExternal ? itemsExternal : items;
  const setCurrentItems = embedded && setItemsExternal ? setItemsExternal : setItems;

  const loadContent = useCallback(async () => {
    // Check if we're in embedded mode and have external data
    if (embedded && itemsExternal) {
      return; // Don't make API call if we have external data
    }

    setLoading(true);
    try {
      const response = await adminFetch(`${getApiBaseUrl()}/admin/content`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load content');
      }
      
      const data = await response.json();
      const raw = data.data || [];
      interface RawContent {
        id: string; title: string; type: string; approach: string; category?: string; difficulty?: string;
        description?: string; thumbnailUrl?: string; youtubeUrl?: string; duration?: number | string; tags?: string | string[]; isPublished: boolean; createdAt?: string;
      }
      const normalized: ContentItem[] = (raw as RawContent[]).map((c) => ({
        id: c.id,
        title: c.title,
        type: (['article','video','audio','playlist','story'].includes(c.type) ? c.type : 'article') as ContentItem['type'],
        approach: (['western','eastern','hybrid','all'].includes(c.approach) ? c.approach : 'all') as ContentItem['approach'],
        category: c.category,
        difficulty: c.difficulty as ContentItem['difficulty'],
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        duration: typeof c.duration === 'string' ? parseInt(c.duration) || undefined : c.duration,
        youtubeUrl: c.youtubeUrl,
        tags: Array.isArray(c.tags)
          ? c.tags
          : (typeof c.tags === 'string' && c.tags.trim().length > 0
              ? c.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
              : []),
        isPublished: !!c.isPublished,
        createdAt: c.createdAt || new Date().toISOString()
      }));
      setItems(normalized);
    } catch (error) {
      console.error('Error loading content:', error);
      push({ 
        type: 'error', 
        title: 'Error', 
        description: 'Failed to load content' 
      });
    } finally {
      setLoading(false);
    }
  }, [embedded, itemsExternal, push, setItems]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      const response = await adminFetch(`${getApiBaseUrl()}/admin/content/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete content');
      }

      setCurrentItems((prev: ContentItem[]) => prev.filter(item => item.id !== id));
      push({ 
        type: 'success', 
        title: 'Success', 
        description: 'Content deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      push({ 
        type: 'error', 
        title: 'Error', 
        description: 'Failed to delete content' 
      });
    }
  };

  // Bulk selection handlers
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkPublish = async () => {
    try {
      setIsBulkActionLoading(true);
      const response = await adminFetch(`${getApiBaseUrl()}/admin/bulk/content/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contentIds: Array.from(selectedIds),
          published: true
        })
      });

      if (!response.ok) throw new Error('Failed to publish content');

      const data = await response.json();
      push({
        type: 'success',
        title: 'Success',
        description: data.message || `Published ${selectedIds.size} content items`
      });

      setSelectedIds(new Set());
      loadContent();
    } catch (error) {
      console.error('Bulk publish error:', error);
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to publish content'
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkUnpublish = async () => {
    try {
      setIsBulkActionLoading(true);
      const response = await adminFetch(`${getApiBaseUrl()}/admin/bulk/content/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contentIds: Array.from(selectedIds),
          published: false
        })
      });

      if (!response.ok) throw new Error('Failed to unpublish content');

      const data = await response.json();
      push({
        type: 'success',
        title: 'Success',
        description: data.message || `Unpublished ${selectedIds.size} content items`
      });

      setSelectedIds(new Set());
      loadContent();
    } catch (error) {
      console.error('Bulk unpublish error:', error);
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to unpublish content'
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkActionLoading(true);
      const response = await adminFetch(`${getApiBaseUrl()}/admin/bulk/content`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contentIds: Array.from(selectedIds)
        })
      });

      if (!response.ok) throw new Error('Failed to delete content');

      const data = await response.json();
      push({
        type: 'success',
        title: 'Success',
        description: data.message || `Deleted ${selectedIds.size} content items`
      });

      setSelectedIds(new Set());
      loadContent();
    } catch (error) {
      console.error('Bulk delete error:', error);
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete content'
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Headphones className="h-4 w-4" />;
      case 'exercise': return <BookMarked className="h-4 w-4" />;
      case 'meditation': return <Heart className="h-4 w-4" />;
      case 'reflection': return <Mic className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getApproachColor = (approach: string) => {
    switch (approach) {
      case 'cbt': return 'bg-blue-100 text-blue-800';
      case 'mindfulness': return 'bg-green-100 text-green-800';
      case 'dbt': return 'bg-purple-100 text-purple-800';
      case 'act': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter items based on search and filters
  const filteredItems = currentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesApproach = filterApproach === 'all' || item.approach === filterApproach;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'published' && item.isPublished) ||
                         (filterStatus === 'draft' && !item.isPublished);

    return matchesSearch && matchesType && matchesApproach && matchesStatus;
  });

  const headerSubtitle = useMemo(() => {
    return `Manage articles, videos, and other content (${filteredItems.length} items)`;
  }, [filteredItems.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Content Management</h2>
          <p className="text-muted-foreground">{headerSubtitle}</p>
        </div>
        {onAdd && (
          <Button onClick={onAdd} className="flex items-center gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Add Content
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={filterGridClasses}>
            <div className="relative md:col-span-2 lg:col-span-2">
              <Search 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" 
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector('input');
                  input?.focus();
                  input?.select();
                }}
              />
              <Input
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-12 h-11"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="exercise">Exercise</SelectItem>
                <SelectItem value="meditation">Meditation</SelectItem>
                <SelectItem value="reflection">Reflection</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterApproach} onValueChange={setFilterApproach}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Approaches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Approaches</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="cbt">CBT</SelectItem>
                <SelectItem value="mindfulness">Mindfulness</SelectItem>
                <SelectItem value="dbt">DBT</SelectItem>
                <SelectItem value="act">ACT</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Loading content...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No content found</h3>
            <p className="text-sm text-muted-foreground">
              {currentItems.length === 0 
                ? "Get started by creating your first content piece"
                : "Try adjusting your filters or search terms"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                    />
                    {getTypeIcon(item.type)}
                    <span className="text-sm font-medium capitalize">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewContent(item);
                        setPreviewOpen(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {item.thumbnailUrl && (
                  <div className="mb-2 h-32 w-full overflow-hidden rounded-md bg-muted flex items-center justify-center">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="object-cover w-full h-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{item.title}</h3>
                
                {item.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge variant="secondary" className={getApproachColor(item.approach)}>
                    {item.approach.toUpperCase()}
                  </Badge>
                  {item.isPublished ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                  {item.duration && (
                    <Badge variant="outline">{item.duration}min</Badge>
                  )}
                  {item.type === 'video' && item.youtubeUrl && (
                    <Badge variant="outline" className="text-xs">YouTube</Badge>
                  )}
                </div>

                {Array.isArray(item.tags) && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-3">
                  Created: {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        entityType="content"
        onPublish={handleBulkPublish}
        onUnpublish={handleBulkUnpublish}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        isLoading={isBulkActionLoading}
      />

      {/* Preview Modal */}
      <PreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        content={previewContent}
      />
    </div>
  );
};
