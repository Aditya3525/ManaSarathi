import { 
  Send,
  ArrowLeft,
  MessageCircle,
  User,
  Loader2,
  AlertTriangle,
  Phone,
  X,
  Mic,
  MoreHorizontal,
  Menu,
  Download,
  LifeBuoy
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccessibility } from '../../../contexts/AccessibilityContext';
import { chatApi, conversationsApi, type ChatSendMessageResponse } from '../../../services/api';
import {
  parseAssessmentPromptMeta,
  parseExerciseCardMeta,
  type AssessmentPromptMeta,
  type ExerciseCardMeta,
} from '../../../types/chat';
import {
  clearAssessmentShareContext,
  readAssessmentShareContext,
  type AssessmentShareContext,
} from '../../../utils/assessmentSharingContext';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../../ui/sheet';

import { ConversationHistorySidebar } from './ConversationHistorySidebar';
import { EmptyState } from './EmptyState';
import { BreathingAnimation, CBTThoughtRecord, GroundingChecklist } from './exercises';
import { ExportDialog } from './ExportDialog';
import { InlineFeedback } from './InlineFeedback';
import { MarkdownMessage } from './MarkdownMessage';
import { MessageActions } from './MessageActions';
import { QuickActionsBar } from './QuickActionsBar';

interface ChatbotProps {
  user: {
    firstName?: string;
    lastName?: string;
    name?: string;
  } | null;
  onNavigate: (page: string) => void;
  isModal?: boolean;
  onClose?: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown> | string | null;
  suggestions?: string[];
  isTyping?: boolean;
  feedback?: 'liked' | 'disliked' | null;
  enableTypewriter?: boolean;
  assessmentPrompt?: AssessmentPromptMeta | null;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

type SendMessageContentFn = (
  content: string,
  options?: { showUserMessage?: boolean; conversationId?: string }
) => Promise<void>;

const EMPTY_ASSISTANT_FALLBACK = 'I am here with you. Could you share a little more so I can support you better?';

const resolveNonEmptyContent = (value: unknown, fallback = EMPTY_ASSISTANT_FALLBACK): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const buildAssessmentDiscussPrompt = (context: AssessmentShareContext): string => {
  const lines: string[] = [
    `I want to discuss my latest ${context.assessmentLabel} assessment results.`,
  ];

  if (typeof context.latestScore === 'number') {
    lines.push(`Latest score: ${Math.round(context.latestScore)}%.`);
  }

  if (typeof context.wellnessScore === 'number') {
    lines.push(`Overall wellness score: ${Math.round(context.wellnessScore)}%.`);
  }

  if (context.trend) {
    lines.push(`Trend: ${context.trend}.`);
  }

  if (context.interpretation) {
    lines.push(`Interpretation: ${context.interpretation}`);
  }

  if (Array.isArray(context.recommendations) && context.recommendations.length > 0) {
    lines.push(`Recommendations provided: ${context.recommendations.slice(0, 4).join('; ')}`);
  }

  lines.push('Please explain what this means and give me a practical plan I can follow today.');
  return lines.join('\n');
};

export function Chatbot({ user, onNavigate, isModal = false, onClose }: ChatbotProps) {
  const { t } = useTranslation();
  const { settings: accessibilitySettings } = useAccessibility();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisisWarning, setShowCrisisWarning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Manual voice control - off by default
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'liked' | 'disliked' | null>>({});
  const [currentlyTypingMessageId, setCurrentlyTypingMessageId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const initializedForUserRef = useRef<string | null>(null);
  const isRequestInFlightRef = useRef(false);
  const pendingDiscussContextRef = useRef<AssessmentShareContext | null>(null);
  const autoDiscussInjectedRef = useRef(false);
  const sendMessageContentRef = useRef<SendMessageContentFn | null>(null);

  const userSignature = [user?.firstName, user?.lastName, user?.name]
    .filter(Boolean)
    .join('|') || 'anonymous';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation starters and initial greeting
  useEffect(() => {
    if (initializedForUserRef.current === userSignature) {
      return;
    }
    initializedForUserRef.current = userSignature;

    const loadInitialData = async () => {
      try {
        // Load personalized greeting
        const greetingResponse = await chatApi.getMoodBasedGreeting();
        let greetingText = `Hello ${([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'there')}! I'm ManaSarathi, your AI wellbeing companion. I'm here to listen, support, and help guide you through your mental health journey. What would you like to talk about today?`;
        
        if (greetingResponse.success && greetingResponse.data?.greeting) {
          greetingText = greetingResponse.data.greeting;
        }

        // Set initial greeting
        const greeting: Message = {
          id: '1',
          type: 'bot',
          content: greetingText,
          timestamp: new Date(),
          suggestions: []
        };
        setMessages([greeting]);

        // Load conversation starters
        const startersResponse = await chatApi.getConversationStarters();
        if (startersResponse.success && startersResponse.data) {
          setConversationStarters(startersResponse.data);
        }

        // Check for proactive check-in
        const checkInResponse = await chatApi.getProactiveCheckIn();
        if (checkInResponse.success && checkInResponse.data?.shouldCheckIn) {
          const checkIn = checkInResponse.data;
          // Add check-in message after a short delay
          setTimeout(() => {
            const checkInMessage: Message = {
              id: `checkin-${Date.now()}`,
              type: 'bot',
              content: checkIn.message,
              timestamp: new Date(),
              suggestions: ['Tell me more', 'I\'m doing okay', 'Not right now']
            };
            setMessages(prev => [...prev, checkInMessage]);
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        // Fallback greeting
        const fallbackGreeting: Message = {
          id: '1',
          type: 'bot',
          content: `Hello! I'm your AI wellbeing companion. How are you feeling today?`,
          timestamp: new Date(),
          suggestions: []
        };
        setMessages([fallbackGreeting]);
      }
    };

    loadInitialData();
  }, [user, userSignature]);

  useEffect(() => {
    autoDiscussInjectedRef.current = false;
    pendingDiscussContextRef.current = null;

    const context = readAssessmentShareContext();
    if (context?.source === 'insights-discuss') {
      pendingDiscussContextRef.current = context;
      clearAssessmentShareContext();
    }
  }, [userSignature]);

  // Initialize speech recognition
  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setVoiceInputSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setVoiceInputSupported(false);
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current || !voiceInputSupported) {
      console.warn('Voice input is not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        if (isSpeaking) {
          stopSpeaking();
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const applyChatPayload = (
    messagePayload: ChatSendMessageResponse,
    options?: {
      enableTypewriter?: boolean;
      replaceMessageId?: string;
      streamedContent?: string;
    }
  ) => {
    if (messagePayload.conversationId && messagePayload.conversationId !== currentConversationId) {
      setCurrentConversationId(messagePayload.conversationId);
    }

    const structuredMessage =
      typeof messagePayload.message === 'object' && messagePayload.message !== null
        ? (messagePayload.message as Record<string, unknown>)
        : null;
    const structuredContent =
      structuredMessage && typeof structuredMessage.content === 'string'
        ? structuredMessage.content
        : undefined;
    const structuredMetadata =
      structuredMessage && 'metadata' in structuredMessage
        ? ((structuredMessage.metadata as Record<string, unknown> | string | null) ?? null)
        : null;
    const assessmentPrompt = parseAssessmentPromptMeta(
      (messagePayload.assessmentPrompt as Record<string, unknown> | null | undefined) ?? structuredMetadata
    );
    const resolvedContent =
      options?.streamedContent && options.streamedContent.trim().length > 0
        ? options.streamedContent
        : resolveNonEmptyContent(
            structuredContent,
            'I apologize, but I encountered an issue generating a response.'
          );

    const smartReplies = messagePayload.smartReplies || [];
    const persistedBotMessageId =
      typeof messagePayload.message === 'object' &&
      messagePayload.message !== null &&
      'id' in messagePayload.message &&
      messagePayload.message.id
        ? String(messagePayload.message.id)
        : (Date.now() + 2).toString();

    const botResponse: Message = {
      id: persistedBotMessageId,
      type: 'bot',
      content: resolvedContent,
      metadata: structuredMetadata,
      timestamp: new Date(),
      suggestions: smartReplies,
      enableTypewriter: options?.enableTypewriter ?? true,
      assessmentPrompt,
    };

    setCurrentlyTypingMessageId((options?.enableTypewriter ?? true) ? persistedBotMessageId : null);
    setMessages((prev) => {
      const withoutStreamingPlaceholder = options?.replaceMessageId
        ? prev.filter((msg) => msg.id !== options.replaceMessageId)
        : prev;
      return [...withoutStreamingPlaceholder, botResponse];
    });

    if (messagePayload.crisis) {
      setShowCrisisWarning(true);
    }

    if (voiceEnabled) {
      speakText(resolvedContent);
    }
  };

  const sendMessageContent = async (
    content: string,
    options?: { showUserMessage?: boolean; conversationId?: string }
  ) => {
    const messageContent = content.trim();
    if (!messageContent) return;
    if (isRequestInFlightRef.current) return;

    isRequestInFlightRef.current = true;

    const shouldShowUserMessage = options?.showUserMessage !== false;
    if (shouldShowUserMessage) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: messageContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
    }

    setIsTyping(true);

    try {
      const targetConversationId = options?.conversationId ?? currentConversationId ?? undefined;

      const sendWithLegacyEndpoint = async () => {
        const response = await chatApi.sendMessage(messageContent, targetConversationId, {
          simpleLanguage: accessibilitySettings.simpleLanguage,
        });

        if (response.success && response.data) {
          applyChatPayload(response.data, { enableTypewriter: true });
          return;
        }

        console.error('❌ Chat API failed:', response.error);
        const fallbackMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'bot',
          content: 'I\'m having trouble connecting right now, but I\'m here to listen. Could you tell me more about how you\'re feeling?',
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, fallbackMessage]);
      };

      const streamingMessageId = `stream-${Date.now()}`;
      let streamStarted = false;
      let streamReceivedToken = false;
      let streamedContent = '';

      try {
        const streamPayload = await chatApi.streamMessage(
          messageContent,
          targetConversationId,
          { simpleLanguage: accessibilitySettings.simpleLanguage },
          (event) => {
            if (event.type === 'token') {
              streamReceivedToken = true;
              streamedContent += event.token;

              if (!streamStarted) {
                streamStarted = true;
                setIsTyping(false);
                setCurrentlyTypingMessageId(null);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: streamingMessageId,
                    type: 'bot',
                    content: '',
                    timestamp: new Date(),
                    suggestions: [],
                    enableTypewriter: false,
                  }
                ]);
              }

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingMessageId
                    ? {
                        ...msg,
                        content: streamedContent,
                      }
                    : msg
                )
              );
            }
          }
        );

        applyChatPayload(streamPayload, {
          enableTypewriter: false,
          replaceMessageId: streamStarted ? streamingMessageId : undefined,
          streamedContent,
        });
      } catch (streamError) {
        console.error('❌ Chat stream error:', streamError);

        if (!streamReceivedToken) {
          await sendWithLegacyEndpoint();
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `stream-warning-${Date.now()}`,
              type: 'system',
              content: 'The response stream was interrupted. You can ask me to continue from where we left off.',
              timestamp: new Date(),
            }
          ]);
        }
      }
    } catch (error) {
      console.error('❌ Chat API error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        content: 'I\'m experiencing some technical difficulties right now. In the meantime, please know that I\'m here to support you. What would you like to talk about?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      isRequestInFlightRef.current = false;
    }
  };

  const handleSendMessage = async () => {
    if (isTyping || isRequestInFlightRef.current) {
      return;
    }
    await sendMessageContent(inputValue);
  };

  sendMessageContentRef.current = sendMessageContent;

  useEffect(() => {
    if (autoDiscussInjectedRef.current) {
      return;
    }

    const context = pendingDiscussContextRef.current;
    if (!context) {
      return;
    }

    if (messages.length === 0 || isTyping || isRequestInFlightRef.current) {
      return;
    }

    autoDiscussInjectedRef.current = true;
    void sendMessageContentRef.current?.(buildAssessmentDiscussPrompt(context));
  }, [messages.length, isTyping]);

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleLike = async (messageId: string) => {
    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: 'liked'
    }));

    try {
      await chatApi.submitMessageFeedback(messageId, 'liked');
    } catch (error) {
      console.error('Failed to submit like feedback:', error);
      setMessageFeedback(prev => ({ ...prev, [messageId]: null }));
    }
  };

  const handleFeedbackSubmit = async (
    messageId: string,
    rating: 'positive' | 'negative',
    notes?: string,
  ) => {
    if (rating === 'positive') {
      await handleLike(messageId);
      setFeedbackMessageId(null);
      return;
    }

    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: 'disliked'
    }));

    try {
      const feedbackResponse = await chatApi.submitMessageFeedback(messageId, 'disliked', notes);

      if (feedbackResponse.success && feedbackResponse.data?.repairPrompt) {
        setMessages(prev => [
          ...prev,
          {
            id: `repair-${Date.now()}`,
            type: 'system',
            content: feedbackResponse.data?.repairPrompt || 'Thanks for the feedback. What would feel most helpful right now?',
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to submit dislike feedback:', error);
      setMessageFeedback(prev => ({ ...prev, [messageId]: null }));
    } finally {
      setFeedbackMessageId(null);
    }
  };

  const handleDislike = (messageId: string) => {
    setFeedbackMessageId((prev) => (prev === messageId ? null : messageId));
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the message to regenerate
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Get the last user message before this bot message
    const userMessages = messages.slice(0, messageIndex).filter(m => m.type === 'user');
    if (userMessages.length === 0) return;

    const lastUserMessage = userMessages[userMessages.length - 1];

    // Remove the old bot message
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Resend the user message in the same conversation to regenerate assistant output.
    await sendMessageContent(lastUserMessage.content, {
      showUserMessage: false,
      conversationId: currentConversationId || undefined
    });
  };

  const handleGetExercises = () => {
    // Navigate to exercises page
    onNavigate('exercises');
  };

  const handleGetSummary = async () => {
    // Request a conversation summary from the AI
    const summaryRequest = 'Can you provide a brief summary of our conversation so far and any key insights or recommendations?';
    await sendMessageContent(summaryRequest);
  };

  const handleBookmark = () => {
    // In a real implementation, this would save the conversation to bookmarks
    // For now, we'll just show a placeholder message
    const systemMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: 'Bookmark feature coming soon! This conversation will be saved to your bookmarks.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const handleExport = () => {
    // Only allow export if there's an active conversation
    if (!currentConversationId) {
      // Fallback: Export current messages as text (for new chats not yet saved)
      const conversationText = messages
        .map(m => {
          const sender = m.type === 'user' ? 'You' : m.type === 'bot' ? 'AI Assistant' : 'System';
          const time = m.timestamp.toLocaleString();
          return `[${time}] ${sender}:\n${m.content}\n`;
        })
        .join('\n---\n\n');

      const blob = new Blob([conversationText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // Open export dialog for saved conversations
    setShowExportDialog(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isTyping || isRequestInFlightRef.current) {
        return;
      }
      handleSendMessage();
    }
  };

  const handleTypewriterComplete = () => {
    setCurrentlyTypingMessageId(null);
    // Optionally trigger voice output here if needed
  };

  const handleSelectConversation = async (conversationId: string | null) => {
    if (conversationId === null) {
      // Start a new conversation
      setCurrentConversationId(null);
      setMessages([]);
      setShowMobileSidebar(false);
      // Reset to initial greeting
      const greeting: Message = {
        id: '1',
        type: 'bot',
        content: `Hello ${([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'there')}! I'm your AI wellbeing companion. What would you like to talk about today?`,
        timestamp: new Date(),
        suggestions: conversationStarters
      };
      setMessages([greeting]);
    } else {
      // Load existing conversation
      setCurrentConversationId(conversationId);
      setShowMobileSidebar(false);
      
      // Show loading state
      const loadingMessage: Message = {
        id: 'loading',
        type: 'system',
        content: 'Loading conversation...',
        timestamp: new Date()
      };
      setMessages([loadingMessage]);
      
      // Fetch conversation messages from API
      try {
        const response = await conversationsApi.getConversation(conversationId);
        if (response.success && response.data?.messages) {
          // Convert API messages to UI Message format
          const loadedMessages: Message[] = response.data.messages.map((msg) => ({
            id: msg.id,
            type: msg.type as 'user' | 'bot' | 'system',
            content:
              msg.type === 'bot' || msg.type === 'system'
                ? resolveNonEmptyContent(msg.content)
                : String(msg.content ?? ''),
            timestamp: new Date(msg.createdAt),
            metadata: msg.metadata ?? null,
            assessmentPrompt: parseAssessmentPromptMeta(msg.metadata ?? null),
            suggestions: [],
          }));
          
          setMessages(loadedMessages);
        } else {
          // Show error message
          const errorMessage: Message = {
            id: 'error',
            type: 'system',
            content: 'Failed to load conversation. Please try again.',
            timestamp: new Date()
          };
          setMessages([errorMessage]);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        const errorMessage: Message = {
          id: 'error',
          type: 'system',
          content: 'Failed to load conversation. Please try again.',
          timestamp: new Date()
        };
        setMessages([errorMessage]);
      }
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const exerciseMeta = !isUser && !isSystem ? parseExerciseCardMeta(message.metadata) : null;
    const assessmentPrompt = !isUser && !isSystem
      ? (message.assessmentPrompt ?? parseAssessmentPromptMeta(message.metadata))
      : null;

    const renderExerciseCard = (meta: ExerciseCardMeta) => {
      switch (meta.exerciseCard) {
        case 'breathing-animation':
          return (
            <BreathingAnimation
              title={meta.title}
              pattern={meta.pattern}
              rounds={meta.rounds}
            />
          );
        case 'grounding-checklist':
          return <GroundingChecklist title={meta.title} steps={meta.steps} />;
        case 'cbt-thought-record':
          return <CBTThoughtRecord title={meta.title} steps={meta.cbtSteps} />;
        case 'body-scan-visual':
        case 'worry-dump-timer':
          return (
            <MarkdownMessage
              content={message.content}
              enableTypewriter={message.enableTypewriter && message.id === currentlyTypingMessageId}
              typewriterSpeed={20}
              onTypewriterComplete={handleTypewriterComplete}
            />
          );
        default:
          return (
            <MarkdownMessage
              content={message.content}
              enableTypewriter={message.enableTypewriter && message.id === currentlyTypingMessageId}
              typewriterSpeed={20}
              onTypewriterComplete={handleTypewriterComplete}
            />
          );
      }
    };

    return (
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4 group message-enter`}>
        {!isUser && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSystem ? 'bg-amber-100' : 'bg-primary/10'
          }`}>
            {isSystem ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <span className="text-xl" role="img" aria-label="Manasarathi">🪷</span>
            )}
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
          <div
            className={exerciseMeta
              ? 'rounded-2xl p-0 overflow-hidden'
              : `rounded-2xl px-4 py-3 ${
                isUser
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : isSystem
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : 'bg-muted'
              }`
            }
          >
            {exerciseMeta ? (
              <div className="min-w-[280px] max-w-[420px]">
                {renderExerciseCard(exerciseMeta)}
              </div>
            ) : (
              <MarkdownMessage
                content={message.content}
                enableTypewriter={message.enableTypewriter && message.id === currentlyTypingMessageId}
                typewriterSpeed={20}
                onTypewriterComplete={handleTypewriterComplete}
              />
            )}
          </div>

          {assessmentPrompt && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm text-foreground">{assessmentPrompt.prompt}</p>
              {typeof assessmentPrompt.daysSinceLastAssessment === 'number' && (
                <p className="text-xs text-muted-foreground">
                  Last anxiety assessment was {assessmentPrompt.daysSinceLastAssessment} day(s) ago.
                </p>
              )}
              <Button size="sm" onClick={() => onNavigate('assessments')}>
                {assessmentPrompt.ctaLabel}
              </Button>
            </div>
          )}
          
          <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
            isUser ? 'justify-end' : 'justify-start'
          }`}>
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            
            {/* Message Actions - Only show for bot messages */}
            {!isUser && !isSystem && (
              <MessageActions
                messageId={message.id}
                content={message.content}
                onLike={handleLike}
                onDislike={handleDislike}
                onRegenerate={handleRegenerate}
                onSpeak={speakText}
                feedback={messageFeedback[message.id] || null}
              />
            )}
          </div>

          {!isUser && !isSystem && feedbackMessageId === message.id && (
            <InlineFeedback
              messageId={message.id}
              onSubmit={(messageId, rating, notes) => {
                void handleFeedbackSubmit(messageId, rating, notes);
              }}
              onDismiss={() => setFeedbackMessageId(null)}
            />
          )}

          {/* Suggestions */}
          {message.suggestions && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>

        {isUser && (
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>
    );
  };

  const chatContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Fixed */}
      <div className={`flex-shrink-0 border-b p-4 ${isModal ? '' : 'bg-gradient-to-r from-primary/10 to-accent/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isModal && (
              <>
                {/* Mobile Menu Button */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowMobileSidebar(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                
                {/* Back Button - Hidden on Mobile */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hidden lg:flex"
                  onClick={() => onNavigate('dashboard')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">{t('chat.title')}</h1>
                <p className="text-xs text-muted-foreground">{t('chat.subtitle')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Voice Toggle Button */}
            <Button 
              variant={voiceEnabled ? "default" : "ghost"} 
              size="sm"
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setVoiceEnabled(!voiceEnabled);
              }}
              title={voiceEnabled ? "Voice replies ON - Click to disable" : "Voice replies OFF - Click to enable"}
              className={voiceEnabled ? "bg-primary text-primary-foreground" : ""}
            >
              {voiceEnabled ? "🔊" : "🔇"}
            </Button>
            {isModal && onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('chat.exportChat')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate('help')}>
                  <LifeBuoy className="h-4 w-4 mr-2" />
                  {t('chat.crisisResources')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState 
            onStarterClick={(starter) => void sendMessageContent(starter)}
            starters={conversationStarters.length > 0 ? conversationStarters : undefined}
          />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Conversation Starters - Show when just initial greeting */}
            {messages.length === 1 && conversationStarters.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Or choose a topic to get started:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {conversationStarters.map((starter, index) => (
                    <Button
                  key={index}
                  variant="outline"
                  className="h-auto py-3 px-4 text-left justify-start text-sm hover:bg-primary/5 hover:border-primary/50 transition-all"
                  onClick={() => handleSuggestionClick(starter)}
                >
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        )}
          </>
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 px-3 py-2 message-enter">
            <span className="text-lg animate-breathe" role="img" aria-label="Thinking">🪷</span>
            <span className="text-sm text-muted-foreground italic">
              Manasarathi is reflecting...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar
        onExercises={handleGetExercises}
        onSummary={handleGetSummary}
        onBookmark={handleBookmark}
        onExport={handleExport}
      />

      {/* Input - Fixed Footer */}
      <div className="flex-shrink-0 border-t p-4 bg-background">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('chat.placeholder')}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-6 w-6 p-0 ${isSpeaking ? 'bg-blue-100' : ''}`}
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    // Find the last bot message and speak it
                    const lastBotMessage = [...messages].reverse().find(m => m.type === 'bot');
                    if (lastBotMessage) {
                      speakText(lastBotMessage.content);
                    }
                  }
                }}
                title={isSpeaking ? "Stop speaking" : "Read last message aloud"}
              >
                {isSpeaking ? (
                  <div className="h-4 w-4 relative">
                    <div className="absolute inset-0 animate-pulse bg-blue-500 rounded-full opacity-50" />
                    <div className="relative h-full w-full flex items-center justify-center text-sm">
                      ⏹️
                    </div>
                  </div>
                ) : (
                  <span className="text-sm">🔊</span>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-6 w-6 p-0 ${isListening ? 'bg-red-100 text-red-600' : ''}`}
                onClick={toggleVoiceInput}
                title={isListening ? "Stop listening" : "Voice input"}
                disabled={!voiceInputSupported}
              >
                <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            size="sm"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return <div className="flex flex-col h-full">{chatContent}</div>;
  }

  return (
    <div className="fixed inset-0 bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 border-r flex-shrink-0">
        <ConversationHistorySidebar
          activeConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          className="h-full"
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
        <SheetContent side="left" className="w-80 p-0" aria-describedby="conversation-list-description">
          <SheetTitle className="sr-only">Conversation History</SheetTitle>
          <SheetDescription id="conversation-list-description" className="sr-only">
            Browse and select from your previous conversations
          </SheetDescription>
          <ConversationHistorySidebar
            activeConversationId={currentConversationId}
            onSelectConversation={(conversationId) => {
              handleSelectConversation(conversationId);
              setShowMobileSidebar(false);
            }}
            className="h-full"
            showCloseButton
            onCloseSidebar={() => setShowMobileSidebar(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {chatContent}
      </div>

      {/* Crisis Warning Modal */}
      {showCrisisWarning && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                We Care About Your Safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                It sounds like you might be going through something serious. We want to help you connect 
                with immediate professional support.
              </p>
              
              <div className="space-y-3">
                <Button className="w-full" onClick={() => window.open('tel:988')}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call 988 (Crisis Lifeline)
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onNavigate('help')}
                >
                  View Crisis Resources
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setShowCrisisWarning(false)}
                >
                  Continue Conversation
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• National Suicide Prevention Lifeline: 988</p>
                <p>• Crisis Text Line: Text HOME to 741741</p>
                <p>• Emergency Services: 911</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Dialog */}
      {currentConversationId && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          conversationId={currentConversationId}
          conversationTitle="Current Conversation"
          messageCount={messages.length}
        />
      )}
    </div>
  );
}
