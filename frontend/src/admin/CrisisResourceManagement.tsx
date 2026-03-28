import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Phone,
  MessageSquare,
  Globe,
  Loader2,
  MoreVertical,
  RefreshCw,
  Clock,
  Shield
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { useNotificationStore } from '../stores/notificationStore';

import { adminFetch } from './adminApi';
import { AdminSectionCard } from './AdminSectionCard';
import { AdminStatCard } from './AdminStatCard';

// Types
export interface CrisisResource {
  id: string;
  name: string;
  type: string;
  phoneNumber: string | null;
  textNumber: string | null;
  website: string | null;
  description: string;
  availability: string;
  country: string;
  language: string;
  isActive: boolean;
  order: number;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CrisisResourceFormData {
  name: string;
  type: string;
  phoneNumber: string;
  textNumber: string;
  website: string;
  description: string;
  availability: string;
  country: string;
  language: string;
  order: number;
  tags: string;
  isActive: boolean;
}

const RESOURCE_TYPES = [
  'HOTLINE',
  'TEXT_LINE',
  'CHAT_SERVICE',
  'EMERGENCY',
  'SUPPORT_GROUP',
  'WEBSITE'
];

import { getServerBaseUrl } from '../config/apiConfig';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || getServerBaseUrl();

// Admin API for Crisis Resources
const crisisResourceAdminApi = {
  getAll: async (): Promise<{ data: CrisisResource[] }> => {
    const response = await fetch(`${API_BASE}/api/crisis/resources`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch crisis resources');
    const json = await response.json();
    return { data: json.data.resources };
  },

  create: async (data: CrisisResourceFormData): Promise<CrisisResource> => {
    const response = await adminFetch(`${API_BASE}/api/admin/help-safety/crisis/resources`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create crisis resource');
    const json = await response.json();
    return json.data.resource;
  },

  update: async (id: string, data: Partial<CrisisResourceFormData>): Promise<CrisisResource> => {
    const response = await adminFetch(`${API_BASE}/api/admin/help-safety/crisis/resources/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update crisis resource');
    const json = await response.json();
    return json.data.resource;
  },

  delete: async (id: string): Promise<void> => {
    const response = await adminFetch(`${API_BASE}/api/admin/help-safety/crisis/resources/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete crisis resource');
  }
};

interface CrisisResourceManagementProps {
  onRefresh?: () => void;
}

export function CrisisResourceManagement({ onRefresh }: CrisisResourceManagementProps) {
  const { push } = useNotificationStore();

  // State
  const [resources, setResources] = useState<CrisisResource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<CrisisResource | null>(null);
  const [viewingResource, setViewingResource] = useState<CrisisResource | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CrisisResource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CrisisResourceFormData>({
    name: '',
    type: 'HOTLINE',
    phoneNumber: '',
    textNumber: '',
    website: '',
    description: '',
    availability: '24/7',
    country: 'US',
    language: 'English',
    order: 0,
    tags: '',
    isActive: true
  });

  // Fetch resources
  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const result = await crisisResourceAdminApi.getAll();
      setResources(result.data);
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load crisis resources'
      });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Filter resources
  const filteredResources = resources.filter(resource => {
    const matchesSearch =
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || resource.type === filterType;
    return matchesSearch && matchesType;
  });

  // Stats
  const totalResources = resources.length;
  const activeResources = resources.filter(r => r.isActive).length;
  const hotlines = resources.filter(r => r.type === 'HOTLINE').length;
  const textLines = resources.filter(r => r.type === 'TEXT_LINE').length;

  // Handlers
  const handleCreate = () => {
    setEditingResource(null);
    setFormData({
      name: '',
      type: 'HOTLINE',
      phoneNumber: '',
      textNumber: '',
      website: '',
      description: '',
      availability: '24/7',
      country: 'US',
      language: 'English',
      order: resources.length,
      tags: '',
      isActive: true
    });
    setIsFormOpen(true);
  };

  const handleEdit = (resource: CrisisResource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      type: resource.type,
      phoneNumber: resource.phoneNumber || '',
      textNumber: resource.textNumber || '',
      website: resource.website || '',
      description: resource.description,
      availability: resource.availability,
      country: resource.country,
      language: resource.language,
      order: resource.order,
      tags: resource.tags || '',
      isActive: resource.isActive
    });
    setIsFormOpen(true);
  };

  const handleView = (resource: CrisisResource) => {
    setViewingResource(resource);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsSubmitting(true);
    try {
      await crisisResourceAdminApi.delete(deleteConfirm.id);
      push({
        type: 'success',
        title: 'Resource Deleted',
        description: 'The crisis resource has been deleted successfully'
      });
      setDeleteConfirm(null);
      fetchResources();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete resource'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.name.length < 3) {
      push({ type: 'error', title: 'Validation Error', description: 'Name must be at least 3 characters' });
      return;
    }
    if (formData.description.length < 10) {
      push({ type: 'error', title: 'Validation Error', description: 'Description must be at least 10 characters' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingResource) {
        await crisisResourceAdminApi.update(editingResource.id, formData);
        push({
          type: 'success',
          title: 'Resource Updated',
          description: 'The crisis resource has been updated successfully'
        });
      } else {
        await crisisResourceAdminApi.create(formData);
        push({
          type: 'success',
          title: 'Resource Created',
          description: 'The crisis resource has been created successfully'
        });
      }
      setIsFormOpen(false);
      fetchResources();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save resource'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      HOTLINE: 'bg-red-100 text-red-800',
      TEXT_LINE: 'bg-orange-100 text-orange-800',
      CHAT_SERVICE: 'bg-blue-100 text-blue-800',
      EMERGENCY: 'bg-red-500 text-white',
      SUPPORT_GROUP: 'bg-green-100 text-green-800',
      WEBSITE: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HOTLINE':
      case 'EMERGENCY':
        return Phone;
      case 'TEXT_LINE':
        return MessageSquare;
      case 'CHAT_SERVICE':
      case 'WEBSITE':
        return Globe;
      default:
        return Shield;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Resources"
          value={totalResources}
          icon={AlertTriangle}
          tone="info"
        />
        <AdminStatCard
          label="Active Resources"
          value={activeResources}
          icon={Shield}
          tone="positive"
        />
        <AdminStatCard
          label="Hotlines"
          value={hotlines}
          icon={Phone}
          tone="warning"
        />
        <AdminStatCard
          label="Text Lines"
          value={textLines}
          icon={MessageSquare}
          tone="info"
        />
      </div>

      {/* Main Content */}
      <AdminSectionCard
        title="Crisis Resources Management"
        icon={AlertTriangle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchResources()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {RESOURCE_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resource List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Resources Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first crisis resource'}
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResources.map(resource => {
              const TypeIcon = getTypeIcon(resource.type);
              return (
                <Card key={resource.id} className={`hover:shadow-md transition-shadow ${!resource.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${getTypeColor(resource.type)}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-lg truncate">
                              {resource.name}
                            </h3>
                            {!resource.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {resource.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <Badge className={getTypeColor(resource.type)}>
                              {resource.type.replace('_', ' ')}
                            </Badge>
                            {resource.phoneNumber && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {resource.phoneNumber}
                              </span>
                            )}
                            {resource.textNumber && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {resource.textNumber}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {resource.availability}
                            </span>
                            <span>{resource.country}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(resource)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(resource)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirm(resource)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </AdminSectionCard>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit Crisis Resource' : 'Create New Crisis Resource'}
            </DialogTitle>
            <DialogDescription>
              {editingResource
                ? 'Update the crisis resource details below'
                : 'Fill in the details to create a new crisis resource'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., 988 Suicide & Crisis Lifeline"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the resource and who it helps..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  placeholder="e.g., 988 or 1-800-273-8255"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="textNumber">Text Number</Label>
                <Input
                  id="textNumber"
                  placeholder="e.g., 741741"
                  value={formData.textNumber}
                  onChange={(e) => setFormData({ ...formData, textNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://..."
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="availability">Availability *</Label>
                <Input
                  id="availability"
                  placeholder="e.g., 24/7"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="e.g., US"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Languages</Label>
                <Input
                  id="language"
                  placeholder="e.g., English, Spanish"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., suicide, crisis, 24/7"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active (visible to users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingResource ? 'Update Resource' : 'Create Resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crisis Resource Details</DialogTitle>
          </DialogHeader>
          {viewingResource && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Badge className={getTypeColor(viewingResource.type)}>
                  {viewingResource.type.replace('_', ' ')}
                </Badge>
                {!viewingResource.isActive && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="mt-1 font-medium text-lg">{viewingResource.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1">{viewingResource.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {viewingResource.phoneNumber && (
                  <div>
                    <Label className="text-muted-foreground">Phone Number</Label>
                    <p className="mt-1 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {viewingResource.phoneNumber}
                    </p>
                  </div>
                )}
                {viewingResource.textNumber && (
                  <div>
                    <Label className="text-muted-foreground">Text Number</Label>
                    <p className="mt-1 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {viewingResource.textNumber}
                    </p>
                  </div>
                )}
              </div>
              {viewingResource.website && (
                <div>
                  <Label className="text-muted-foreground">Website</Label>
                  <p className="mt-1">
                    <a href={viewingResource.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {viewingResource.website}
                    </a>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Availability</Label>
                  <p className="mt-1">{viewingResource.availability}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Country</Label>
                  <p className="mt-1">{viewingResource.country}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Languages</Label>
                  <p className="mt-1">{viewingResource.language}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingResource(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (viewingResource) handleEdit(viewingResource);
              setViewingResource(null);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Crisis Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this crisis resource? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (
            <div className="py-4">
              <p className="font-medium">{deleteConfirm.name}</p>
              <p className="text-sm text-muted-foreground">{deleteConfirm.type}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
