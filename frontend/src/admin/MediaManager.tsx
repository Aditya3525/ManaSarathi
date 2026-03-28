import {
  Upload,
  Download,
  Trash2,
  Eye,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Folder,
  Grid,
  List,
  MoreVertical,
  FolderPlus,
} from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { adminFetch } from './adminApi';
import { getApiBaseUrl, getServerBaseUrl } from '../config/apiConfig';
import { useNotificationStore } from '../stores/notificationStore';

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  url: string;
  thumbnail?: string;
  folder?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MediaManager: React.FC = () => {
  const { push } = useNotificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [knownFolders, setKnownFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const resolveFileUrl = (value: string): string => {
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    return `${getServerBaseUrl()}${value.startsWith('/') ? '' : '/'}${value}`;
  };

  const loadMediaFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminFetch(`${getApiBaseUrl()}/admin/media/files`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load media files');
      }

      const files = Array.isArray(payload.data) ? payload.data : [];
      setMediaFiles(files);

      const folders = Array.from(new Set(
        files
          .map((file: MediaFile) => file.folder)
          .filter((folder: string | null | undefined): folder is string => Boolean(folder))
      ));
      setKnownFolders((prev) => Array.from(new Set([...prev, ...folders])).sort());
    } catch (error) {
      console.error('Failed to load media files:', error);
      push({
        title: 'Error',
        description: 'Failed to load media files',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadMediaFiles();
  }, [loadMediaFiles]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'image':
        return <FileImage className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-purple-500" />;
      case 'audio':
        return <FileAudio className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    try {
      let uploadedCount = 0;
      let failedCount = 0;

      for (const file of Array.from(uploadedFiles)) {
        const uploadKind = file.type.startsWith('image/') ? 'thumbnail' : 'media';
        const uploadUrl = new URL(`${getApiBaseUrl()}/admin/upload/${uploadKind}`);
        if (folderFilter !== 'all') {
          uploadUrl.searchParams.set('folder', folderFilter);
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await adminFetch(uploadUrl.toString(), {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          uploadedCount += 1;
        } else {
          failedCount += 1;
        }
      }

      await loadMediaFiles();

      push({
        title: failedCount === 0 ? 'Success' : 'Upload completed with issues',
        description: failedCount === 0
          ? `Uploaded ${uploadedCount} file(s) successfully`
          : `Uploaded ${uploadedCount} file(s), ${failedCount} failed`,
        type: failedCount === 0 ? 'success' : 'warning',
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      push({
        title: 'Error',
        description: 'Failed to upload files',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  }, [folderFilter, loadMediaFiles, push]);

  // Handle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const deleteMediaFiles = async (fileIds: string[]) => {
    if (fileIds.length === 0) return;

    const targetUrls = mediaFiles
      .filter((file) => fileIds.includes(file.id))
      .map((file) => file.url);

    if (targetUrls.length === 0) return;

    try {
      const response = await adminFetch(`${getApiBaseUrl()}/admin/media/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: targetUrls }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete files');
      }

      const deleted = Array.isArray(payload.data?.deleted) ? payload.data.deleted.length : 0;
      const failed = Array.isArray(payload.data?.failed) ? payload.data.failed.length : 0;

      push({
        title: failed === 0 ? 'Success' : 'Delete completed with issues',
        description: failed === 0
          ? `Deleted ${deleted} file(s)`
          : `Deleted ${deleted} file(s), ${failed} could not be deleted`,
        type: failed === 0 ? 'success' : 'warning',
      });

      setSelectedFiles((prev) => {
        const next = new Set(prev);
        fileIds.forEach((id) => next.delete(id));
        return next;
      });

      await loadMediaFiles();
    } catch (error) {
      console.error('Delete error:', error);
      push({
        title: 'Error',
        description: 'Failed to delete files',
        type: 'error',
      });
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    await deleteMediaFiles(Array.from(selectedFiles));
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await adminFetch(`${getApiBaseUrl()}/admin/media/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: newFolderName.trim(), bucket: 'media' }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create folder');
      }

      const createdFolder = String(payload.data?.folderName || newFolderName.trim());
      setKnownFolders((prev) => Array.from(new Set([...prev, createdFolder])).sort());
      setFolderFilter(createdFolder);

      push({
        title: 'Success',
        description: `Created folder "${createdFolder}"`,
        type: 'success',
      });

      setNewFolderName('');
      setNewFolderOpen(false);
    } catch (error) {
      console.error('Create folder error:', error);
      push({
        title: 'Error',
        description: 'Failed to create folder',
        type: 'error',
      });
    }
  };

  // Filter files
  const filteredFiles = mediaFiles.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || file.type === typeFilter;
    const matchesFolder = folderFilter === 'all' || file.folder === folderFilter;
    return matchesSearch && matchesType && matchesFolder;
  });

  // Get unique folders
  const folders = Array.from(
    new Set([
      ...knownFolders,
      ...mediaFiles
        .map((f) => f.folder)
        .filter((folder: string | null | undefined): folder is string => Boolean(folder)),
    ])
  ).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Media Manager</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, organize, and manage your media files
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{mediaFiles.length}</div>
            <div className="text-sm text-muted-foreground">Total Files</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {formatFileSize(mediaFiles.reduce((sum, f) => sum + f.size, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Size</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{folders.length}</div>
            <div className="text-sm text-muted-foreground">Folders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{selectedFiles.size}</div>
            <div className="text-sm text-muted-foreground">Selected</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
              </SelectContent>
            </Select>

            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder} value={folder || ''}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-muted' : ''}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-muted' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedFiles.size} selected
              </span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedFiles(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Grid/List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Files ({filteredFiles.length})</CardTitle>
            {filteredFiles.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedFiles.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No files found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload files or adjust your filters
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  role="button"
                  tabIndex={0}
                  className={`relative group rounded-lg border p-3 cursor-pointer transition-all ${
                    selectedFiles.has(file.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleFileSelection(file.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleFileSelection(file.id);
                    }
                  }}
                >
                  <div className="aspect-square rounded bg-muted flex items-center justify-center mb-2">
                    {file.thumbnail ? (
                      <img
                        src={resolveFileUrl(file.thumbnail)}
                        alt={file.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium truncate" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(resolveFileUrl(file.url), '_blank')}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMediaFiles([file.id])}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  role="button"
                  tabIndex={0}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedFiles.has(file.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleFileSelection(file.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleFileSelection(file.id);
                    }
                  }}
                >
                  <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{formatFileSize(file.size)}</span>
                      {file.folder && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {file.folder}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(resolveFileUrl(file.url), '_blank')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMediaFiles([file.id])}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewFile !== null} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
            <DialogDescription>
              {previewFile && formatFileSize(previewFile.size)} • {previewFile?.type}
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <div className="max-h-[60vh] overflow-auto">
              {previewFile.type === 'image' && (
                <img
                  src={resolveFileUrl(previewFile.url)}
                  alt={previewFile.name}
                  className="w-full h-auto rounded"
                />
              )}
              {previewFile.type === 'video' && (
                <video src={resolveFileUrl(previewFile.url)} controls className="w-full rounded">
                  <track kind="captions" />
                </video>
              )}
              {previewFile.type === 'audio' && (
                <audio src={resolveFileUrl(previewFile.url)} controls className="w-full">
                  <track kind="captions" />
                </audio>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              Close
            </Button>
            <Button onClick={() => previewFile && window.open(resolveFileUrl(previewFile.url), '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaManager;
