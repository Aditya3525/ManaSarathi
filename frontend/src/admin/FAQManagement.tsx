import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  HelpCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  MoreVertical,
  RefreshCw,
  Tag
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
import { Textarea } from '../components/ui/textarea';
import { useNotificationStore } from '../stores/notificationStore';

import { AdminSectionCard } from './AdminSectionCard';
import { adminFetch } from './adminApi';
import { AdminStatCard } from './AdminStatCard';

// Types
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isPublished: boolean;
  viewCount: number;
  helpful: number;
  notHelpful: number;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  order: number;
  tags: string;
  isPublished: boolean;
}

const FAQ_CATEGORIES = [
  'GENERAL',
  'PRIVACY',
  'ASSESSMENTS',
  'CHATBOT',
  'BILLING',
  'TECHNICAL',
  'SAFETY'
];

import { getServerBaseUrl } from '../config/apiConfig';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || getServerBaseUrl();

// Admin API for FAQs
const faqAdminApi = {
  getAll: async (): Promise<{ data: FAQ[] }> => {
    const response = await fetch(`${API_BASE}/api/faq`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    const json = await response.json();
    return { data: json.data.faqs };
  },

  create: async (data: FAQFormData): Promise<FAQ> => {
    const response = await adminFetch(`${API_BASE}/api/admin/help-safety/faq`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create FAQ');
    const json = await response.json();
    return json.data.faq;
  },

  update: async (id: string, data: Partial<FAQFormData>): Promise<FAQ> => {
    const response = await adminFetch(`${API_BASE}/api/admin/help-safety/faq/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update FAQ');
    const json = await response.json();
    return json.data.faq;
  },

  delete: async (id: string): Promise<void> => {
    const response = await adminFetch(`${API_BASE}/api/admin/help-safety/faq/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete FAQ');
  }
};

interface FAQManagementProps {
  onRefresh?: () => void;
}

export function FAQManagement({ onRefresh }: FAQManagementProps) {
  const { push } = useNotificationStore();

  // State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [viewingFaq, setViewingFaq] = useState<FAQ | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FAQ | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FAQFormData>({
    question: '',
    answer: '',
    category: 'GENERAL',
    order: 0,
    tags: '',
    isPublished: true
  });

  // Fetch FAQs
  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await faqAdminApi.getAll();
      setFaqs(result.data);
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load FAQs'
      });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Filter FAQs
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || faq.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const totalFaqs = faqs.length;
  const totalViews = faqs.reduce((sum, f) => sum + f.viewCount, 0);
  const totalHelpful = faqs.reduce((sum, f) => sum + f.helpful, 0);
  const avgHelpfulness = totalHelpful + faqs.reduce((sum, f) => sum + f.notHelpful, 0) > 0
    ? Math.round((totalHelpful / (totalHelpful + faqs.reduce((sum, f) => sum + f.notHelpful, 0))) * 100)
    : 0;

  // Handlers
  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      category: 'GENERAL',
      order: faqs.length,
      tags: '',
      isPublished: true
    });
    setIsFormOpen(true);
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
      tags: faq.tags || '',
      isPublished: faq.isPublished
    });
    setIsFormOpen(true);
  };

  const handleView = (faq: FAQ) => {
    setViewingFaq(faq);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsSubmitting(true);
    try {
      await faqAdminApi.delete(deleteConfirm.id);
      push({
        type: 'success',
        title: 'FAQ Deleted',
        description: 'The FAQ has been deleted successfully'
      });
      setDeleteConfirm(null);
      fetchFaqs();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete FAQ'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.question.length < 10) {
      push({ type: 'error', title: 'Validation Error', description: 'Question must be at least 10 characters' });
      return;
    }
    if (formData.answer.length < 20) {
      push({ type: 'error', title: 'Validation Error', description: 'Answer must be at least 20 characters' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFaq) {
        await faqAdminApi.update(editingFaq.id, formData);
        push({
          type: 'success',
          title: 'FAQ Updated',
          description: 'The FAQ has been updated successfully'
        });
      } else {
        await faqAdminApi.create(formData);
        push({
          type: 'success',
          title: 'FAQ Created',
          description: 'The FAQ has been created successfully'
        });
      }
      setIsFormOpen(false);
      fetchFaqs();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save FAQ'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      GENERAL: 'bg-blue-100 text-blue-800',
      PRIVACY: 'bg-purple-100 text-purple-800',
      ASSESSMENTS: 'bg-green-100 text-green-800',
      CHATBOT: 'bg-orange-100 text-orange-800',
      BILLING: 'bg-yellow-100 text-yellow-800',
      TECHNICAL: 'bg-gray-100 text-gray-800',
      SAFETY: 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total FAQs"
          value={totalFaqs}
          icon={HelpCircle}
          tone="info"
        />
        <AdminStatCard
          label="Total Views"
          value={totalViews}
          icon={Eye}
          tone="info"
        />
        <AdminStatCard
          label="Helpful Votes"
          value={totalHelpful}
          icon={ThumbsUp}
          tone="positive"
        />
        <AdminStatCard
          label="Helpfulness Rate"
          value={`${avgHelpfulness}%`}
          icon={MessageSquare}
          tone="positive"
        />
      </div>

      {/* Main Content */}
      <AdminSectionCard
        title="FAQ Management"
        icon={HelpCircle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFaqs()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {FAQ_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* FAQ List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No FAQs Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first FAQ'}
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map(faq => (
              <Card key={faq.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getCategoryColor(faq.category)}>
                          {faq.category}
                        </Badge>
                        {!faq.isPublished && (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-lg mb-1 truncate">
                        {faq.question}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {faq.answer}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {faq.viewCount} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {faq.helpful}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3" />
                          {faq.notHelpful}
                        </span>
                        {faq.tags && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {faq.tags.split(',').length} tags
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(faq)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(faq)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(faq)}
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
            ))}
          </div>
        )}
      </AdminSectionCard>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? 'Edit FAQ' : 'Create New FAQ'}
            </DialogTitle>
            <DialogDescription>
              {editingFaq
                ? 'Update the FAQ details below'
                : 'Fill in the details to create a new FAQ'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                placeholder="Enter the question..."
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {formData.question.length}/500 characters (min 10)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer *</Label>
              <Textarea
                id="answer"
                placeholder="Enter the answer..."
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                {formData.answer.length}/2000 characters (min 20)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAQ_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., getting started, onboarding, beginner"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingFaq ? 'Update FAQ' : 'Create FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingFaq} onOpenChange={() => setViewingFaq(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>FAQ Details</DialogTitle>
          </DialogHeader>
          {viewingFaq && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Category</Label>
                <div className="mt-1">
                  <Badge className={getCategoryColor(viewingFaq.category)}>
                    {viewingFaq.category}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Question</Label>
                <p className="mt-1 font-medium">{viewingFaq.question}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Answer</Label>
                <p className="mt-1 whitespace-pre-wrap">{viewingFaq.answer}</p>
              </div>
              {viewingFaq.tags && (
                <div>
                  <Label className="text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingFaq.tags.split(',').map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{viewingFaq.viewCount}</p>
                  <p className="text-sm text-muted-foreground">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{viewingFaq.helpful}</p>
                  <p className="text-sm text-muted-foreground">Helpful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{viewingFaq.notHelpful}</p>
                  <p className="text-sm text-muted-foreground">Not Helpful</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingFaq(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (viewingFaq) handleEdit(viewingFaq);
              setViewingFaq(null);
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
            <DialogTitle>Delete FAQ</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (
            <div className="py-4">
              <p className="font-medium">{deleteConfirm.question}</p>
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
