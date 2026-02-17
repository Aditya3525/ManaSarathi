import { useState, useRef, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput as RNTextInput, Modal, FlatList, Share, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MessageCircle, Send, Bot, User as UserIcon, Menu, Plus, Archive, Trash2, X, AlertTriangle, Phone, ThumbsUp, ThumbsDown, Copy, Download, FileText, FileJson, Share2 } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import { chatApi, conversationsApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';

// Crisis language detection - matches webapp's implementation
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', "don't want to live",
  'hurt myself', 'self harm', 'cutting', 'overdose',
  'hopeless', 'no point', 'better off dead',
];

const detectCrisisLanguage = (text: string): boolean => {
  return CRISIS_KEYWORDS.some(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );
};

// Markdown styles for AI messages (dark text) and user messages (white text)
const aiMarkdownStyles = {
  body: { color: '#111827', fontSize: 14, lineHeight: 20 },
  paragraph: { marginBottom: 8, marginTop: 0 },
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  heading1: { fontSize: 18, fontWeight: '700' as const, marginBottom: 4, marginTop: 8 },
  heading2: { fontSize: 16, fontWeight: '700' as const, marginBottom: 4, marginTop: 6 },
  heading3: { fontSize: 15, fontWeight: '600' as const, marginBottom: 4, marginTop: 4 },
  code_inline: { backgroundColor: '#f3f4f6', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  fence: { backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, marginVertical: 8 },
  blockquote: { borderLeftWidth: 4, borderLeftColor: '#d1d5db', paddingLeft: 12, marginVertical: 8, fontStyle: 'italic' as const, color: '#6b7280' },
  link: { color: '#2563eb', textDecorationLine: 'underline' as const },
  hr: { backgroundColor: '#d1d5db', height: 1, marginVertical: 16 },
};

const userMarkdownStyles = {
  ...aiMarkdownStyles,
  body: { ...aiMarkdownStyles.body, color: '#ffffff' },
  code_inline: { ...aiMarkdownStyles.code_inline, backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' },
  blockquote: { ...aiMarkdownStyles.blockquote, borderLeftColor: 'rgba(255,255,255,0.5)', color: 'rgba(255,255,255,0.8)' },
  link: { color: '#bfdbfe', textDecorationLine: 'underline' as const },
};

export default function ChatScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCrisisWarning, setShowCrisisWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'liked' | 'disliked' | null>>({});

  // Fetch conversations list for sidebar
  const { data: conversations } = useQuery({
    queryKey: queryKeys.conversations.lists(),
    queryFn: async () => {
      const response = await conversationsApi.getConversations();
      return (response.data as any[]) || [];
    },
  });

  // Fetch conversation starters from API
  const { data: starters } = useQuery({
    queryKey: queryKeys.chat.starters(),
    queryFn: async () => {
      const response = await chatApi.getConversationStarters();
      return (response.data as string[]) || [];
    },
  });

  // Fetch mood-based greeting
  const { data: greeting } = useQuery({
    queryKey: queryKeys.chat.greeting(),
    queryFn: async () => {
      const response = await chatApi.getMoodBasedGreeting();
      return (response.data as any)?.greeting || null;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId || 'new'),
    queryFn: async () => {
      if (!conversationId) return [];
      const response = await conversationsApi.getConversation(conversationId);
      return (response.data as any)?.messages || [];
    },
    enabled: !!conversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ convId, msg }: { convId: string | null; msg: string }) => {
      return await chatApi.sendMessage(msg, convId || undefined);
    },
    onSuccess: (response) => {
      if (!conversationId && response.data?.conversationId) {
        setConversationId(response.data.conversationId);
      }
      // Extract smart replies from backend response
      const replies = response.data?.smartReplies || [];
      setSmartReplies(replies);

      queryClient.invalidateQueries({ 
        queryKey: queryKeys.conversations.detail(conversationId || 'new') 
      });
      setMessage('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error: any) => {
      console.error('Chat send error:', error);
      // Show a gentle error as an alert rather than crashing
      Alert.alert(
        t('chat.errorTitle', 'Connection Issue'),
        t('chat.errorMessage', "I'm having trouble connecting right now. Please check your connection and try again."),
        [{ text: t('common.ok', 'OK') }]
      );
    },
  });

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;

    // Crisis language detection - show warning before sending
    if (detectCrisisLanguage(trimmedMessage)) {
      setShowCrisisWarning(true);
      return;
    }

    // Clear smart replies when sending a new message
    setSmartReplies([]);

    sendMessageMutation.mutate({
      convId: conversationId,
      msg: trimmedMessage,
    });
  };

  // Send despite crisis warning (user chose to continue)
  const handleSendDespiteCrisis = () => {
    const trimmedMessage = message.trim();
    setShowCrisisWarning(false);
    setSmartReplies([]);
    if (!trimmedMessage) return;
    sendMessageMutation.mutate({
      convId: conversationId,
      msg: trimmedMessage,
    });
  };

  // Message feedback handlers — persist to backend
  const handleLike = (messageId: string) => {
    const newValue = messageFeedback[messageId] === 'liked' ? null : 'liked';
    setMessageFeedback(prev => ({ ...prev, [messageId]: newValue }));
    if (conversationId && newValue) {
      chatApi.sendMessage(`[feedback:${newValue}:${messageId}]`, conversationId).catch(() => {});
    }
  };

  const handleDislike = (messageId: string) => {
    const newValue = messageFeedback[messageId] === 'disliked' ? null : 'disliked';
    setMessageFeedback(prev => ({ ...prev, [messageId]: newValue }));
    if (conversationId && newValue) {
      chatApi.sendMessage(`[feedback:${newValue}:${messageId}]`, conversationId).catch(() => {});
    }
  };

  const handleCopyMessage = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Alert.alert(t('common.copied', 'Copied'), t('chat.messageCopied', 'Message copied to clipboard'));
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setShowSidebar(false);
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
    setShowSidebar(false);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await conversationsApi.deleteConversation(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
      if (conversationId === id) {
        setConversationId(null);
      }
    } catch {
      // silently fail
    }
  };

  const handleShareConversation = async () => {
    if (!messages || messages.length === 0) return;
    setShowExportModal(true);
  };

  const exportConversation = async (format: 'text' | 'json' | 'pdf') => {
    if (!messages || messages.length === 0) return;
    setShowExportModal(false);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `MaanSarathi-chat-${timestamp}`;

      if (format === 'text') {
        const text = `MaanSarathi Conversation\nExported: ${new Date().toLocaleString()}\n${'─'.repeat(40)}\n\n` +
          messages.map((m: any) => `[${m.role === 'user' ? 'You' : 'AI Companion'}] ${new Date(m.timestamp || m.createdAt || '').toLocaleString()}\n${m.content}`).join('\n\n' + '─'.repeat(40) + '\n\n');

        const fileUri = FileSystem.documentDirectory + `${fileName}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Export Conversation' });
        } else {
          await Share.share({ message: text, title: 'MaanSarathi Chat' });
        }
      } else if (format === 'json') {
        const jsonData = {
          appName: 'MaanSarathi',
          exportDate: new Date().toISOString(),
          conversationId: conversationId,
          messageCount: messages.length,
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || m.createdAt,
            id: m.id,
          })),
        };

        const fileUri = FileSystem.documentDirectory + `${fileName}.json`;
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(jsonData, null, 2), { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Conversation' });
        } else {
          await Clipboard.setStringAsync(JSON.stringify(jsonData, null, 2));
          Alert.alert(t('chat.exported', 'Exported'), t('chat.jsonCopied', 'JSON copied to clipboard'));
        }
      } else if (format === 'pdf') {
        // Generate HTML for PDF-like sharing
        const htmlContent = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>MaanSarathi Conversation</title>
<style>
  body { font-family: -apple-system, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; background: #fafafa; }
  h1 { color: #6366f1; font-size: 22px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .msg { margin-bottom: 16px; padding: 12px 16px; border-radius: 12px; }
  .user { background: #6366f1; color: white; margin-left: 40px; }
  .ai { background: white; border: 1px solid #e5e7eb; margin-right: 40px; }
  .sender { font-weight: 600; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .user .sender { color: rgba(255,255,255,0.8); }
  .ai .sender { color: #6366f1; }
  .time { font-size: 10px; margin-top: 6px; opacity: 0.6; }
  .content { font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
</style></head><body>
<h1>🧠 MaanSarathi Conversation</h1>
<p class="meta">Exported on ${new Date().toLocaleString()} • ${messages.length} messages</p>
${messages.map((m: any) => `
<div class="msg ${m.role === 'user' ? 'user' : 'ai'}">
  <div class="sender">${m.role === 'user' ? 'You' : 'AI Companion'}</div>
  <div class="content">${(m.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
  <div class="time">${new Date(m.timestamp || m.createdAt || '').toLocaleString()}</div>
</div>`).join('')}
</body></html>`;

        const fileUri = FileSystem.documentDirectory + `${fileName}.html`;
        await FileSystem.writeAsStringAsync(fileUri, htmlContent, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'Export Conversation' });
        } else {
          Alert.alert(t('chat.exported', 'Exported'), t('chat.exportNotAvailable', 'File sharing not available on this device'));
        }
      }
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || t('chat.exportError', 'Failed to export conversation'));
    }
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const displayMessages = (() => {
    const msgs = messages || [];
    if (sendMessageMutation.isPending && message.trim()) {
      return [...msgs, {
        id: 'temp-user',
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
        isTemporary: true,
      }];
    }
    return msgs;
  })();

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => setShowSidebar(true)} className="mr-3" activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('accessibility.menuButton')}>
            <Menu size={24} color="#374151" />
          </TouchableOpacity>
          <View className="bg-primary-100 rounded-full p-2 mr-3">
            <Bot size={24} color="#6366f1" />
          </View>
          <View className="flex-1">
            <Text variant="h3">
              {t('chat.title', 'AI Companion')}
            </Text>
            <Text variant="caption" className="text-gray-600">
              {greeting || t('chat.subtitle', 'Your mental wellness chatbot')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleNewConversation} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('chat.newConversation', 'New Conversation')}>
            <Plus size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="px-6 py-4"
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-12">
            <LoadingSpinner size="large" />
          </View>
        ) : displayMessages.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12">
            <View className="bg-primary-100 rounded-full p-6 mb-4">
              <MessageCircle size={48} color="#6366f1" />
            </View>
            <Text variant="h3" className="mb-2 text-center">
              {t('chat.welcome', 'Hi there!')}
            </Text>
            <Text variant="body" className="text-gray-600 text-center mb-6 px-4">
              {t('chat.welcomeMessage', "I'm here to support you. How are you feeling today?")}
            </Text>
            <View className="w-full gap-2">
              {(starters && starters.length > 0 ? starters.slice(0, 4) : [
                t('chat.starter1', "I'm feeling stressed"),
                t('chat.starter2', 'I need help coping'),
                t('chat.starter3', 'Tell me about yourself'),
              ]).map((starter: string, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setMessage(starter)}
                  className="bg-white p-4 rounded-xl border border-gray-200"
                  accessibilityRole="button"
                >
                  <Text variant="body" className="text-center text-gray-700">
                    {starter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View className="gap-4">
            {displayMessages.map((msg: any, index: number) => {
              const isUser = msg.role === 'user';
              const isLastAiMessage = !isUser && index === displayMessages.length - 1;
              return (
                <View key={msg.id || index}>
                  <View
                    className={`flex-row ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <View className="bg-primary-100 rounded-full p-2 mr-2 h-8 w-8">
                        <Bot size={16} color="#6366f1" />
                      </View>
                    )}
                    <View
                      className={`max-w-[75%] p-4 rounded-2xl ${
                        isUser
                          ? 'bg-primary-600'
                          : 'bg-white border border-gray-200'
                      } ${msg.isTemporary ? 'opacity-60' : ''}`}
                    >
                      <Markdown style={isUser ? userMarkdownStyles : aiMarkdownStyles}>
                        {msg.content}
                      </Markdown>
                      {/* Message actions for AI messages */}
                      {!isUser && !msg.isTemporary && (
                        <View className="flex-row items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                          <TouchableOpacity
                            onPress={() => handleLike(msg.id || String(index))}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <ThumbsUp
                              size={14}
                              color={messageFeedback[msg.id || String(index)] === 'liked' ? '#22c55e' : '#9ca3af'}
                              fill={messageFeedback[msg.id || String(index)] === 'liked' ? '#22c55e' : 'none'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDislike(msg.id || String(index))}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <ThumbsDown
                              size={14}
                              color={messageFeedback[msg.id || String(index)] === 'disliked' ? '#ef4444' : '#9ca3af'}
                              fill={messageFeedback[msg.id || String(index)] === 'disliked' ? '#ef4444' : 'none'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleCopyMessage(msg.content)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Copy size={14} color="#9ca3af" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {isUser && (
                      <View className="bg-primary-600 rounded-full p-2 ml-2 h-8 w-8">
                        <UserIcon size={16} color="#ffffff" />
                      </View>
                    )}
                  </View>
                  {/* Smart replies after the last AI message */}
                  {isLastAiMessage && smartReplies.length > 0 && !sendMessageMutation.isPending && (
                    <View className="flex-row flex-wrap gap-2 mt-3 ml-10">
                      {smartReplies.map((reply, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setMessage(reply)}
                          className="bg-primary-50 border border-primary-200 rounded-full px-4 py-2"
                          activeOpacity={0.7}
                        >
                          <Text variant="caption" className="text-primary-700 font-medium">
                            {reply}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {sendMessageMutation.isPending && (
              <View className="flex-row justify-start" accessibilityLiveRegion="polite">
                <View className="bg-primary-100 rounded-full p-2 mr-2 h-8 w-8">
                  <Bot size={16} color="#6366f1" />
                </View>
                <View className="bg-white p-4 rounded-2xl border border-gray-200">
                  <LoadingSpinner size="small" />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View className="bg-white px-6 py-4 border-t border-gray-200">
        <View className="flex-row items-center gap-3">
          <View className="flex-1 bg-gray-100 rounded-full px-4 py-2">
            <RNTextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t('chat.inputPlaceholder', 'Type a message...')}
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}
              className="text-base text-gray-900 max-h-24"
              style={{ minHeight: 40 }}
              accessibilityLabel={t('chat.inputPlaceholder', 'Type a message...')}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className={`rounded-full p-3 ${
              message.trim() && !sendMessageMutation.isPending
                ? 'bg-primary-600'
                : 'bg-gray-300'
            }`}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.sendMessage')}
          >
            <Send size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Crisis Warning Modal */}
      <Modal
        visible={showCrisisWarning}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCrisisWarning(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="flex-row items-center mb-4">
              <AlertTriangle size={24} color="#dc2626" />
              <Text variant="h3" className="ml-2 text-red-600">
                {t('chat.crisisTitle', 'We Care About Your Safety')}
              </Text>
            </View>
            <Text variant="body" className="text-gray-600 mb-6">
              {t('chat.crisisMessage', "It sounds like you might be going through something serious. We want to help you connect with immediate professional support.")}
            </Text>
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => Linking.openURL('tel:988')}
                className="bg-red-600 rounded-xl p-4 flex-row items-center justify-center"
                activeOpacity={0.7}
              >
                <Phone size={18} color="#ffffff" />
                <Text variant="label" className="text-white ml-2">
                  {t('chat.callCrisisLine', 'Call 988 (Crisis Lifeline)')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowCrisisWarning(false);
                  router.push('/help-safety' as any);
                }}
                className="border border-gray-300 rounded-xl p-4"
                activeOpacity={0.7}
              >
                <Text variant="label" className="text-center text-gray-700">
                  {t('chat.viewResources', 'View Crisis Resources')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendDespiteCrisis}
                className="rounded-xl p-4"
                activeOpacity={0.7}
              >
                <Text variant="label" className="text-center text-gray-500">
                  {t('chat.continueConversation', 'Continue Conversation')}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="mt-4 gap-1">
              <Text variant="caption" className="text-gray-500">• National Suicide Prevention Lifeline: 988</Text>
              <Text variant="caption" className="text-gray-500">• Crisis Text Line: Text HOME to 741741</Text>
              <Text variant="caption" className="text-gray-500">• Emergency Services: 911</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Conversation Sidebar Modal */}
      <Modal
        visible={showSidebar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSidebar(false)}
      >
        <View className="flex-1 bg-white">
          <View className="px-6 pt-12 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text variant="h2">{t('chat.conversations', 'Conversations')}</Text>
            <TouchableOpacity onPress={() => setShowSidebar(false)} accessibilityRole="button" accessibilityLabel={t('accessibility.closeButton')}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            className="mx-6 mt-4 mb-2 p-4 bg-primary-50 rounded-xl border border-primary-200 flex-row items-center"
            onPress={handleNewConversation}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Plus size={20} color="#6366f1" />
            <Text variant="body" className="ml-3 text-primary-700 font-medium">
              {t('chat.newConversation', 'New Conversation')}
            </Text>
          </TouchableOpacity>

          <FlatList
            data={conversations || []}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8 }}
            ListEmptyComponent={
              <View className="items-center py-12">
                <MessageCircle size={48} color="#d1d5db" />
                <Text variant="body" className="text-gray-500 mt-4">
                  {t('chat.noConversations', 'No conversations yet')}
                </Text>
              </View>
            }
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity
                className={`p-4 rounded-xl mb-2 flex-row items-center ${
                  item.id === conversationId ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                }`}
                onPress={() => handleSelectConversation(item.id)}
                activeOpacity={0.7}
              >
                <View className="flex-1">
                  <Text variant="label" className="mb-1" numberOfLines={1}>
                    {item.title || t('chat.untitled', 'Untitled')}
                  </Text>
                  <Text variant="caption" className="text-gray-500">
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteConversation(item.id)}
                  className="p-2 ml-2"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color="#9ca3af" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Export Conversation Modal */}
      <Modal
        visible={showExportModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowExportModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text variant="h3">{t('chat.exportConversation', 'Export Conversation')}</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text variant="caption" className="text-gray-500 mb-4">
              {t('chat.exportDesc', 'Choose a format to export your conversation')}
            </Text>

            <View className="gap-3">
              {/* Plain Text */}
              <TouchableOpacity
                onPress={() => exportConversation('text')}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
                activeOpacity={0.7}
              >
                <View className="bg-blue-100 rounded-full p-3 mr-4">
                  <FileText size={24} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text variant="label">{t('chat.exportText', 'Plain Text')}</Text>
                  <Text variant="caption" className="text-gray-500">
                    {t('chat.exportTextDesc', 'Simple text file, easy to read')}
                  </Text>
                </View>
                <Download size={18} color="#9ca3af" />
              </TouchableOpacity>

              {/* JSON */}
              <TouchableOpacity
                onPress={() => exportConversation('json')}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
                activeOpacity={0.7}
              >
                <View className="bg-green-100 rounded-full p-3 mr-4">
                  <FileJson size={24} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text variant="label">{t('chat.exportJSON', 'JSON Data')}</Text>
                  <Text variant="caption" className="text-gray-500">
                    {t('chat.exportJSONDesc', 'Structured data, ideal for backup')}
                  </Text>
                </View>
                <Download size={18} color="#9ca3af" />
              </TouchableOpacity>

              {/* PDF (HTML) */}
              <TouchableOpacity
                onPress={() => exportConversation('pdf')}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
                activeOpacity={0.7}
              >
                <View className="bg-red-100 rounded-full p-3 mr-4">
                  <Share2 size={24} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text variant="label">{t('chat.exportPDF', 'Formatted (HTML/PDF)')}</Text>
                  <Text variant="caption" className="text-gray-500">
                    {t('chat.exportPDFDesc', 'Styled document for sharing or printing')}
                  </Text>
                </View>
                <Download size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text variant="caption" className="text-gray-400 text-center mt-4">
              {t('chat.exportInfo', 'Files are saved temporarily and shared via your device')}
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
