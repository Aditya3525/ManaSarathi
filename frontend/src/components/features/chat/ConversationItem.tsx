import { MoreHorizontal, Edit2, Archive, Trash, Download } from 'lucide-react';
import React, { useState } from 'react';

import type { Conversation } from '../../../services/api';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';

import { ExportDialog } from './ExportDialog';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onRename,
  onDelete,
  onPermanentDelete,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title || 'Untitled');
  const [showExportDialog, setShowExportDialog] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleRename = () => {
    if (editValue.trim() && editValue !== conversation.title) {
      onRename(conversation.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditValue(conversation.title || 'Untitled');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="px-3 py-2 group relative">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
          maxLength={100}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        px-3 py-2 rounded-lg cursor-pointer group relative
        transition-all duration-200 hover:bg-accent/50
        ${isActive ? 'bg-accent text-accent-foreground' : ''}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate">
              {conversation.title || 'Untitled Conversation'}
            </h4>
            {conversation.messageCount > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                {conversation.messageCount}
              </span>
            )}
          </div>
          
          {conversation.lastMessage && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {conversation.lastMessage}
            </p>
          )}
          
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatTimestamp(conversation.lastMessageAt)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0 bg-muted/50 hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShowExportDialog(true);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Hide this conversation from sidebar? (You can restore it later)')) {
                  onDelete(conversation.id);
                }
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Delete (Hide)
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('⚠️ PERMANENTLY delete this conversation?\n\nThis will remove all messages forever and cannot be undone!')) {
                  onPermanentDelete(conversation.id);
                }
              }}
            >
              <Trash className="h-4 w-4 mr-2" />
              Permanent Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {conversation.isArchived && (
        <div className="absolute top-2 right-2 opacity-50">
          <Archive className="h-3 w-3" />
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        conversationId={conversation.id}
        conversationTitle={conversation.title || 'Untitled Conversation'}
        messageCount={conversation.messageCount}
      />
    </div>
  );
}
