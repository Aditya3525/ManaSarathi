import { Search, Plus, FolderOpen, AlertCircle, X, Loader2, RefreshCw } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
  useArchiveConversation,
  useSearchConversations,
} from '../../../hooks/useConversations';
import type { Conversation } from '../../../services/api';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import { Skeleton } from '../../ui/skeleton';

import { ConversationItem } from './ConversationItem';

interface ConversationHistorySidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  className?: string;
  showCloseButton?: boolean;
  onCloseSidebar?: () => void;
}

// Helper function to group conversations by date
function groupConversationsByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 Days': [],
    'Last 30 Days': [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const convDate = new Date(conv.lastMessageAt);
    const convDateOnly = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

    if (convDateOnly.getTime() === today.getTime()) {
      groups.Today.push(conv);
    } else if (convDateOnly.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(conv);
    } else if (convDate >= lastWeek) {
      groups['Last 7 Days'].push(conv);
    } else if (convDate >= lastMonth) {
      groups['Last 30 Days'].push(conv);
    } else {
      groups.Older.push(conv);
    }
  });

  // Filter out empty groups
  return Object.entries(groups).filter(([, convs]) => convs.length > 0);
}

export function ConversationHistorySidebar({
  activeConversationId,
  onSelectConversation,
  className = '',
  showCloseButton = false,
  onCloseSidebar,
}: ConversationHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useConversations(false);
  const { data: searchResults = [] } = useSearchConversations(searchQuery);

  // Mutations
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();
  const archiveConversation = useArchiveConversation();

  // Use search results if searching, otherwise use all conversations
  const displayedConversations = searchQuery.trim() ? searchResults : conversations;
  const showLoadingState = (isLoading || (isFetching && conversations.length === 0)) && !searchQuery.trim();
  const showRetryingState = !showLoadingState && Boolean(error) && conversations.length === 0 && !searchQuery.trim();

  // Group conversations by date
  const groupedConversations = useMemo(
    () => groupConversationsByDate(displayedConversations),
    [displayedConversations]
  );

  const handleNewChat = () => {
    // Clear active conversation to start fresh
    onSelectConversation(null);
  };

  const handleRename = (conversationId: string, newTitle: string) => {
    renameConversation.mutate(conversationId, newTitle);
  };

  const handleDelete = (conversationId: string) => {
    // Soft delete - just archive the conversation
    archiveConversation.mutate({ conversationId, isArchived: true }, {
      onSuccess: () => {
        // If deleted conversation was active, clear selection
        if (conversationId === activeConversationId) {
          onSelectConversation(null);
        }
      },
    });
  };

  const handlePermanentDelete = (conversationId: string) => {
    // Hard delete - permanently remove from database
    deleteConversation.mutate(conversationId, {
      onSuccess: () => {
        // If deleted conversation was active, clear selection
        if (conversationId === activeConversationId) {
          onSelectConversation(null);
        }
      },
    });
  };

  return (
    <div className={`flex flex-col h-full bg-background border-r ${className}`}>
      {/* Header with New Chat button */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
          {showCloseButton && onCloseSidebar ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Minimize sidebar"
              onClick={onCloseSidebar}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <Button
          onClick={handleNewChat}
          className="w-full"
          variant="default"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        {/* Search Input */}
        <div className="relative">
          <Search 
            className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" 
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.querySelector('input');
              input?.focus();
              input?.select();
            }}
          />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12 h-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {showLoadingState ? (
            // Loading skeleton
            <div className="space-y-2">
              <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading conversations...
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-3 py-2">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2 mt-1" />
                </div>
              ))}
            </div>
          ) : showRetryingState ? (
            // Retry state when initial retrieval failed
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-3" />
              <p className="text-sm text-muted-foreground">
                Loading conversations...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We could not retrieve history yet. Try again.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  void refetch();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Retry
              </Button>
            </div>
          ) : displayedConversations.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery.trim() ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery.trim()
                  ? 'Try a different search term'
                  : 'Start a new chat to begin'}
              </p>
            </div>
          ) : (
            // Conversation list grouped by date
            <div className="space-y-4">
              {groupedConversations.map(([group, convs]) => (
                <div key={group}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">
                    {group}
                  </h3>
                  <div className="space-y-1">
                    {convs.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === activeConversationId}
                        onClick={() => onSelectConversation(conversation.id)}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onPermanentDelete={handlePermanentDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with conversation count */}
      {!showLoadingState && conversations.length > 0 && (
        <div className="p-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
