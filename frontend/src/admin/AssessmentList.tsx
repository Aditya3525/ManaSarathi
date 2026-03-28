import {
  ClipboardList,
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { getApiBaseUrl } from '../config/apiConfig';
import { adminApi, type ApiResponse } from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';

import { adminFetch } from './adminApi';
import { AssessmentPreviewModal } from './AssessmentPreviewModal';
import { BulkActionToolbar } from './BulkActionToolbar';

export interface Assessment {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string | null;
  timeEstimate: string | null;
  isActive: boolean;
  isBasicOverallOnly?: boolean;
  visibleInMainList?: boolean;
  questionCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AssessmentListProps {
  onEdit: (assessment: Assessment) => void;
  onAdd: () => void;
  refreshToken?: number;
}

export const AssessmentList: React.FC<AssessmentListProps> = ({ onEdit, onAdd, refreshToken }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);

  const { addNotification } = useNotificationStore();

  // Fetch assessments
  const fetchAssessments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.listAssessments() as ApiResponse<Assessment[]>;

      if (response.success && response.data) {
        setAssessments(response.data);
        setFilteredAssessments(response.data);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch assessments:', error);
      const err = error as { response?: { data?: { error?: string } } };
      addNotification({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.error || 'Failed to load assessments'
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await adminApi.getAssessmentCategories() as ApiResponse<string[]>;
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments, refreshToken]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter assessments
  useEffect(() => {
    let filtered = [...assessments];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (assessment) =>
          assessment.name.toLowerCase().includes(query) ||
          assessment.type.toLowerCase().includes(query) ||
          assessment.category.toLowerCase().includes(query) ||
          (assessment.description && assessment.description.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((assessment) => assessment.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((assessment) =>
        statusFilter === 'active' ? assessment.isActive : !assessment.isActive
      );
    }

    // Type filter (Basic Overall vs Regular)
    if (typeFilter !== 'all') {
      filtered = filtered.filter((assessment) =>
        typeFilter === 'basic' ? assessment.isBasicOverallOnly === true : assessment.isBasicOverallOnly !== true
      );
    }

    setFilteredAssessments(filtered);
  }, [searchQuery, categoryFilter, statusFilter, typeFilter, assessments]);

  // Handle duplicate
  const handleDuplicate = async (assessment: Assessment) => {
    try {
      const response = await adminApi.duplicateAssessment(assessment.id) as {  data: { success?: boolean } };
      
      if (response.data?.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          description: `Assessment "${assessment.name}" duplicated successfully`
        });
        fetchAssessments();
      }
    } catch (error: unknown) {
      console.error('Failed to duplicate assessment:', error);
      const err = error as { response?: { data?: { error?: string } } };
      addNotification({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.error || 'Failed to duplicate assessment'
      });
    }
  };

  // Handle delete
  const confirmDelete = (assessment: Assessment) => {
    setAssessmentToDelete(assessment);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!assessmentToDelete) return;

    try {
      setIsDeleting(true);
      await adminApi.deleteAssessment(assessmentToDelete.id);
      
      addNotification({
        type: 'success',
        title: 'Success',
        description: `Assessment "${assessmentToDelete.name}" deactivated successfully`
      });
      
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
      fetchAssessments();
    } catch (error: unknown) {
      console.error('Failed to delete assessment:', error);
      const err = error as { response?: { data?: { error?: string } } };
      addNotification({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.error || 'Failed to deactivate assessment'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAssessments.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

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
      const response = await adminFetch(`${getApiBaseUrl()}/admin/bulk/assessments/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assessmentIds: Array.from(selectedIds),
          published: true
        })
      });

      if (!response.ok) throw new Error('Failed to publish assessments');

      const data = await response.json();
      addNotification({
        type: 'success',
        title: 'Success',
        description: data.message || `Published ${selectedIds.size} assessments`
      });

      setSelectedIds(new Set());
      fetchAssessments();
    } catch (error) {
      console.error('Bulk publish error:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        description: 'Failed to publish assessments'
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkUnpublish = async () => {
    try {
      setIsBulkActionLoading(true);
      const response = await adminFetch(`${getApiBaseUrl()}/admin/bulk/assessments/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assessmentIds: Array.from(selectedIds),
          published: false
        })
      });

      if (!response.ok) throw new Error('Failed to unpublish assessments');

      const data = await response.json();
      addNotification({
        type: 'success',
        title: 'Success',
        description: data.message || `Unpublished ${selectedIds.size} assessments`
      });

      setSelectedIds(new Set());
      fetchAssessments();
    } catch (error) {
      console.error('Bulk unpublish error:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        description: 'Failed to unpublish assessments'
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkActionLoading(true);
      const response = await adminFetch(`${getApiBaseUrl()}/admin/bulk/assessments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assessmentIds: Array.from(selectedIds)
        })
      });

      if (!response.ok) throw new Error('Failed to delete assessments');

      const data = await response.json();
      addNotification({
        type: 'success',
        title: 'Success',
        description: data.message || `Deleted ${selectedIds.size} assessments`
      });

      setSelectedIds(new Set());
      fetchAssessments();
    } catch (error) {
      console.error('Bulk delete error:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete assessments'
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading assessments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search 
              className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground cursor-pointer" 
              onClick={(e) => {
                const input = e.currentTarget.parentElement?.querySelector('input');
                input?.focus();
                input?.select();
              }}
            />
            <Input
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assessment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="basic">Basic Overall Only</SelectItem>
              <SelectItem value="regular">Regular Assessments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onAdd} className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAssessments.length} of {assessments.length} assessments
      </div>

      {/* Table */}
      {filteredAssessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assessments found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first assessment'}
          </p>
          {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={onAdd}>Create Assessment</Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.size === filteredAssessments.length && filteredAssessments.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(assessment.id)}
                      onCheckedChange={(checked) => handleSelectOne(assessment.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{assessment.name}</span>
                        {assessment.isBasicOverallOnly && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            Basic Overall
                          </Badge>
                        )}
                      </div>
                      {assessment.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {assessment.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {assessment.type}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{assessment.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{assessment.questionCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {assessment.isActive ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(assessment.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreviewAssessment(assessment);
                          setPreviewOpen(true);
                        }}
                        title="Preview assessment"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(assessment)}
                        title="Edit assessment"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(assessment)}
                        title="Duplicate assessment"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(assessment)}
                        className="text-destructive hover:text-destructive"
                        title="Delete assessment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedIds.has(assessment.id)}
                      onCheckedChange={(checked) => handleSelectOne(assessment.id, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1 flex items-center gap-2 flex-wrap">
                        <span className="line-clamp-2">{assessment.name}</span>
                        {assessment.isBasicOverallOnly && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            Basic
                          </Badge>
                        )}
                      </h3>
                      {assessment.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {assessment.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {assessment.type}
                        </code>
                        <Badge variant="outline" className="text-xs">{assessment.category}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {assessment.questionCount} Q
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {assessment.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                        {assessment.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(assessment.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreviewAssessment(assessment);
                      setPreviewOpen(true);
                    }}
                    title="Preview assessment"
                    className="h-8"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="text-xs">Preview</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(assessment)}
                    title="Edit assessment"
                    className="h-8"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    <span className="text-xs">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(assessment)}
                    title="Duplicate assessment"
                    className="h-8"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    <span className="text-xs">Copy</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmDelete(assessment)}
                    className="text-destructive hover:text-destructive h-8"
                    title="Delete assessment"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &ldquo;{assessmentToDelete?.name}&rdquo;? This will set the
              assessment as inactive and it will no longer be available to users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        entityType="assessments"
        onPublish={handleBulkPublish}
        onUnpublish={handleBulkUnpublish}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        isLoading={isBulkActionLoading}
      />

      {/* Preview Modal */}
      <AssessmentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        assessment={previewAssessment}
      />
    </div>
  );
};
