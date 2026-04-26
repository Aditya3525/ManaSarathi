import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { conversationsApi } from '../services/api';
import type { Conversation, ConversationWithMessages } from '../services/api';

// Query keys for React Query
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (includeArchived: boolean) => [...conversationKeys.lists(), { includeArchived }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  search: (query: string) => [...conversationKeys.all, 'search', query] as const,
  count: (includeArchived: boolean) => [...conversationKeys.all, 'count', { includeArchived }] as const,
};

// Hook to get all conversations
export const useConversations = (includeArchived = false) => {
  return useQuery({
    queryKey: conversationKeys.list(includeArchived),
    queryFn: async () => {
      const response = await conversationsApi.getConversations(includeArchived);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch conversations');
      }
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * (2 ** attempt), 8000),
  });
};

// Hook to get a single conversation with messages
export const useConversationMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await conversationsApi.getConversation(conversationId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch conversation');
      }
      return response.data;
    },
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
  });
};

// Hook to search conversations
export const useSearchConversations = (query: string) => {
  return useQuery({
    queryKey: conversationKeys.search(query),
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await conversationsApi.searchConversations(query);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to search conversations');
      }
      return response.data;
    },
    enabled: query.trim().length > 0,
    staleTime: 30000,
  });
};

// Hook to get conversation count
export const useConversationCount = (includeArchived = false) => {
  return useQuery({
    queryKey: conversationKeys.count(includeArchived),
    queryFn: async () => {
      const response = await conversationsApi.getConversationCount(includeArchived);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch conversation count');
      }
      return response.data.count;
    },
    staleTime: 60000, // 1 minute
  });
};

// Hook to create a new conversation
export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string) => {
      const response = await conversationsApi.createConversation(title);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create conversation');
      }
      return response.data;
    },
    onSuccess: (newConversation) => {
      // Invalidate and refetch conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      
      // Optionally add the new conversation to the cache
      queryClient.setQueryData<Conversation[]>(
        conversationKeys.list(false),
        (old) => old ? [newConversation, ...old] : [newConversation]
      );
    },
  });
};

// Hook to update a conversation (rename or archive)
export const useUpdateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      updates 
    }: { 
      conversationId: string; 
      updates: { title?: string; isArchived?: boolean } 
    }) => {
      const response = await conversationsApi.updateConversation(conversationId, updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update conversation');
      }
      return response.data;
    },
    onSuccess: (updatedConversation, variables) => {
      // Update the conversation in all relevant queries
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(variables.conversationId) });
      
      // Update the cached list
      queryClient.setQueryData<Conversation[]>(
        conversationKeys.list(false),
        (old) => old?.map(conv => 
          conv.id === updatedConversation.id ? updatedConversation : conv
        )
      );
    },
  });
};

// Hook to delete a conversation
export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await conversationsApi.deleteConversation(conversationId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete conversation');
      }
      return conversationId;
    },
    onSuccess: (deletedId) => {
      // Remove from cache and invalidate queries
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.removeQueries({ queryKey: conversationKeys.detail(deletedId) });
      
      // Remove from cached list
      queryClient.setQueryData<Conversation[]>(
        conversationKeys.list(false),
        (old) => old?.filter(conv => conv.id !== deletedId)
      );
    },
  });
};

// Hook to generate AI title for a conversation
export const useGenerateTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await conversationsApi.generateTitle(conversationId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate title');
      }
      return { conversationId, title: response.data.title };
    },
    onSuccess: ({ conversationId, title }) => {
      // Update the conversation in cache
      queryClient.setQueryData<ConversationWithMessages>(
        conversationKeys.detail(conversationId),
        (old) => old ? { ...old, title } : undefined
      );
      
      queryClient.setQueryData<Conversation[]>(
        conversationKeys.list(false),
        (old) => old?.map(conv => 
          conv.id === conversationId ? { ...conv, title } : conv
        )
      );
      
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
};

// Hook to archive/unarchive a conversation
export const useArchiveConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      isArchived 
    }: { 
      conversationId: string; 
      isArchived: boolean 
    }) => {
      const response = await conversationsApi.archiveConversation(conversationId, isArchived);
      if (!response.success) {
        throw new Error(response.error || 'Failed to archive conversation');
      }
      return { conversationId, isArchived };
    },
    onSuccess: ({ conversationId, isArchived }) => {
      // Invalidate all list queries since archiving affects multiple views
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      
      // Remove from active list if archived
      if (isArchived) {
        queryClient.setQueryData<Conversation[]>(
          conversationKeys.list(false),
          (old) => old?.filter(conv => conv.id !== conversationId)
        );
      }
    },
  });
};

// Convenience hook for renaming (wrapper around useUpdateConversation)
export const useRenameConversation = () => {
  const updateMutation = useUpdateConversation();

  return {
    ...updateMutation,
    mutate: (conversationId: string, title: string) => {
      updateMutation.mutate({ conversationId, updates: { title } });
    },
    mutateAsync: (conversationId: string, title: string) => {
      return updateMutation.mutateAsync({ conversationId, updates: { title } });
    },
  };
};
