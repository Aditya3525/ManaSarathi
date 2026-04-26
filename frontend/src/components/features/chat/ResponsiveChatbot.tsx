import { 
  Send,
  ArrowLeft,
  MessageCircle,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  Phone,
  X,
  Mic,
  MoreVertical,
  Menu,
  Plus,
  Paperclip,
  Volume2,
  VolumeX,
  Download,
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  ThumbsUp,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  GripVertical
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useAccessibility } from '../../../contexts/AccessibilityContext';
import { chatApi, conversationsApi } from '../../../services/api';
import { parseAssessmentPromptMeta, type AssessmentPromptMeta } from '../../../types/chat';
import type { ISpeechRecognition, ISpeechRecognitionEvent, ISpeechRecognitionErrorEvent } from '../../../types/speech-recognition';
import './responsive-chatbot.css';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../../ui/sheet';
import { Textarea } from '../../ui/textarea';

import { ConversationHistorySidebar } from './ConversationHistorySidebar';
import { EmptyState } from './EmptyState';
import { ExportDialog } from './ExportDialog';
import { MarkdownMessage } from './MarkdownMessage';
import { MessageActions } from './MessageActions';

interface ResponsiveChatbotProps {
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
  isExpanded?: boolean;
  assessmentPrompt?: AssessmentPromptMeta | null;
}

const BREAKPOINTS = {
  PHONE: 767,
  TABLET_PORTRAIT: 1023,
  TABLET_LANDSCAPE: 1199,
};

const SIDEBAR_WIDTH_BOUNDS = {
  MIN: 260,
  MAX: 560,
  DEFAULT: 320,
};

const EMPTY_ASSISTANT_FALLBACK = 'I am here with you. Could you share a little more so I can support you better?';

const resolveNonEmptyContent = (value: unknown, fallback = EMPTY_ASSISTANT_FALLBACK): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export function ResponsiveChatbot({ user, onNavigate, isModal = false, onClose }: ResponsiveChatbotProps) {
  const { settings: accessibilitySettings } = useAccessibility();
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return localStorage.getItem('mw-chat-sidebar-open') !== 'false';
  });
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return SIDEBAR_WIDTH_BOUNDS.DEFAULT;
    }

    const raw = Number(localStorage.getItem('mw-chat-sidebar-width'));
    if (!Number.isFinite(raw)) {
      return SIDEBAR_WIDTH_BOUNDS.DEFAULT;
    }

    return Math.min(SIDEBAR_WIDTH_BOUNDS.MAX, Math.max(SIDEBAR_WIDTH_BOUNDS.MIN, raw));
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisisWarning, setShowCrisisWarning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'liked' | 'disliked' | null>>({});
  const [currentlyTypingMessageId, setCurrentlyTypingMessageId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [feedbackTargetMessageId, setFeedbackTargetMessageId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [isSubmittingFeedbackNote, setIsSubmittingFeedbackNote] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializedForUserRef = useRef<string | null>(null);
  const proactiveCheckInTimeoutRef = useRef<number | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef(0);
  const isResizingSidebarRef = useRef(false);

  const userSignature = [user?.firstName, user?.lastName, user?.name]
    .filter(Boolean)
    .join('|') || 'anonymous';
  const hasSpeakableMessage = messages.some(
    (message) => message.type === 'bot' && message.content.trim().length > 0
  );

  // Responsive helpers
  const isPhone = viewportWidth <= BREAKPOINTS.PHONE;
  const isTabletPortrait = viewportWidth > BREAKPOINTS.PHONE && viewportWidth <= BREAKPOINTS.TABLET_PORTRAIT;
  const isTabletLandscape = viewportWidth > BREAKPOINTS.TABLET_PORTRAIT && viewportWidth <= BREAKPOINTS.TABLET_LANDSCAPE;
  const isDesktop = viewportWidth > BREAKPOINTS.TABLET_LANDSCAPE;
  const isMobile = isPhone || isTabletPortrait;

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('mw-chat-sidebar-open', isDesktopSidebarOpen ? 'true' : 'false');
  }, [isDesktopSidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('mw-chat-sidebar-width', String(desktopSidebarWidth));
  }, [desktopSidebarWidth]);

  useEffect(() => {
    if (!isDesktop && !isTabletLandscape) {
      if (isResizingSidebarRef.current) {
        isResizingSidebarRef.current = false;
        setIsResizingSidebar(false);
      }
      return;
    }

    const stopResize = () => {
      if (isResizingSidebarRef.current) {
        isResizingSidebarRef.current = false;
        setIsResizingSidebar(false);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizingSidebarRef.current) {
        return;
      }

      const nextWidth = Math.min(
        SIDEBAR_WIDTH_BOUNDS.MAX,
        Math.max(SIDEBAR_WIDTH_BOUNDS.MIN, event.clientX)
      );
      setDesktopSidebarWidth(nextWidth);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
    };
  }, [isDesktop, isTabletLandscape]);

  const startSidebarResize = useCallback(() => {
    if (!(isDesktop || isTabletLandscape)) {
      return;
    }

    isResizingSidebarRef.current = true;
    setIsResizingSidebar(true);
  }, [isDesktop, isTabletLandscape]);

  // Handle viewport resize
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile && showTools) {
      setShowTools(false);
    }
  }, [isMobile, showTools]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    const maxHeight = isMobile ? 132 : 120;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [inputValue, isMobile]);

  // Auto-scroll logic with user override detection
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, [isUserScrolling]);

  // Detect user scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (!isAtBottom) {
        setIsUserScrolling(true);
        setShowJumpToLatest(true);
      } else {
        setIsUserScrolling(false);
        setShowJumpToLatest(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, isUserScrolling]);

  // Load conversation starters and initial greeting
  useEffect(() => {
    if (initializedForUserRef.current === userSignature) {
      return;
    }
    initializedForUserRef.current = userSignature;

    if (proactiveCheckInTimeoutRef.current !== null) {
      window.clearTimeout(proactiveCheckInTimeoutRef.current);
      proactiveCheckInTimeoutRef.current = null;
    }

    const loadInitialData = async () => {
      try {
        const greetingResponse = await chatApi.getMoodBasedGreeting();
        let greetingText = `Hello ${([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'there')}! I'm ManaSarathi, your AI wellbeing companion. I'm here to listen, support, and help guide you through your mental health journey. What would you like to talk about today?`;
        
        if (greetingResponse.success && greetingResponse.data?.greeting) {
          greetingText = greetingResponse.data.greeting;
        }

        const greeting: Message = {
          id: '1',
          type: 'bot',
          content: greetingText,
          timestamp: new Date(),
          suggestions: []
        };
        setMessages([greeting]);

        const startersResponse = await chatApi.getConversationStarters();
        if (startersResponse.success && startersResponse.data) {
          setConversationStarters(startersResponse.data);
        }

        const checkInResponse = await chatApi.getProactiveCheckIn();
        if (checkInResponse.success && checkInResponse.data?.shouldCheckIn) {
          const checkIn = checkInResponse.data;
          proactiveCheckInTimeoutRef.current = window.setTimeout(() => {
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

    return () => {
      if (proactiveCheckInTimeoutRef.current !== null) {
        window.clearTimeout(proactiveCheckInTimeoutRef.current);
        proactiveCheckInTimeoutRef.current = null;
      }
    };
  }, [user, userSignature]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: ISpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
        setVoiceInputSupported(true);
      }
    } else {
      setVoiceInputSupported(false);
    }

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
    if (!recognitionRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: `voice-unsupported-${Date.now()}`,
          type: 'system',
          content: 'Voice input is not supported in this browser. Please use Chrome or Edge.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) {
      console.warn('Speech synthesis not supported');
      return;
    }

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

  const handleComposerVoiceOutput = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    const speakableMessage = [...messages]
      .reverse()
      .find((message) => message.type === 'bot' && message.content.trim().length > 0);

    if (speakableMessage) {
      speakText(speakableMessage.content);
    }
  };

  const sendMessageContent = async (
    content: string,
    options?: { showUserMessage?: boolean; conversationId?: string }
  ) => {
    if (isTyping || isLoadingConversation) {
      return;
    }

    const messageContent = content.trim();
    if (!messageContent) return;

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

    setIsUserScrolling(false);
    setIsTyping(true);
    const requestId = ++activeRequestIdRef.current;

    try {
      const targetConversationId = options?.conversationId ?? currentConversationIdRef.current ?? undefined;
      const response = await chatApi.sendMessage(messageContent, targetConversationId, {
        simpleLanguage: accessibilitySettings.simpleLanguage,
      });

      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        const messagePayload = response.data;

        if (messagePayload.conversationId && messagePayload.conversationId !== currentConversationId) {
          setCurrentConversationId(messagePayload.conversationId);
        }

        const structuredContent =
          typeof messagePayload.message === 'object' && messagePayload.message !== null
            ? messagePayload.message.content
            : undefined;
        const structuredMetadata =
          typeof messagePayload.message === 'object' && messagePayload.message !== null && 'metadata' in messagePayload.message
            ? ((messagePayload.message.metadata as Record<string, unknown> | string | null) ?? null)
            : null;
        const assessmentPrompt = parseAssessmentPromptMeta(
          (messagePayload.assessmentPrompt as Record<string, unknown> | null | undefined) ?? structuredMetadata
        );
        const resolvedContent = resolveNonEmptyContent(
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
          enableTypewriter: true,
          assessmentPrompt,
        };

        setCurrentlyTypingMessageId(persistedBotMessageId);
        setMessages(prev => [...prev, botResponse]);

        if (messagePayload.crisis) {
          setShowCrisisWarning(true);
        }
      } else {
        const fallbackMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'bot',
          content: 'I\'m having trouble connecting right now, but I\'m here to listen. Could you tell me more about how you\'re feeling?',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error('Chat API error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        content: 'I\'m experiencing some technical difficulties right now. In the meantime, please know that I\'m here to support you. What would you like to talk about?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (isTyping || isLoadingConversation) {
      return;
    }

    setShowTools(false);
    await sendMessageContent(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessageContent(suggestion);
  };

  const handleLike = async (messageId: string) => {
    setMessageFeedback(prev => ({ ...prev, [messageId]: 'liked' }));
    try {
      await chatApi.submitMessageFeedback(messageId, 'liked');
    } catch (error) {
      console.error('Failed to submit like feedback:', error);
      setMessageFeedback(prev => ({ ...prev, [messageId]: null }));
    }
  };

  const submitDislikeFeedback = async (messageId: string, note?: string) => {
    try {
      setIsSubmittingFeedbackNote(true);
      const feedbackResponse = await chatApi.submitMessageFeedback(messageId, 'disliked', note);
      if (feedbackResponse.success && feedbackResponse.data?.repairPrompt) {
        setMessages(prev => [
          ...prev,
          {
            id: `repair-${Date.now()}`,
            type: 'system',
            content: feedbackResponse.data.repairPrompt,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to submit dislike feedback:', error);
      setMessageFeedback(prev => ({ ...prev, [messageId]: null }));
    } finally {
      setIsSubmittingFeedbackNote(false);
      setFeedbackTargetMessageId(null);
      setFeedbackNote('');
    }
  };

  const handleDislike = (messageId: string) => {
    setMessageFeedback(prev => ({ ...prev, [messageId]: 'disliked' }));
    setFeedbackTargetMessageId(messageId);
    setFeedbackNote('');
  };

  const handleRegenerate = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const userMessages = messages.slice(0, messageIndex).filter((m) => m.type === 'user');
    if (userMessages.length === 0) return;

    const lastUserMessage = userMessages[userMessages.length - 1];
    setMessages(prev => prev.filter((m) => m.id !== messageId));

    await sendMessageContent(lastUserMessage.content, {
      showUserMessage: false,
      conversationId: currentConversationId || undefined
    });
  };

  const handleSelectConversation = async (conversationId: string | null) => {
    activeRequestIdRef.current += 1;
    setIsTyping(false);

    if (conversationId === null) {
      setCurrentConversationId(null);
      currentConversationIdRef.current = null;
      setMessages([]);
      setInputValue('');
      setIsLoadingConversation(false);
      setShowMobileSidebar(false);
      
      const greeting: Message = {
        id: '1',
        type: 'bot',
        content: `Hello ${([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'there')}! I'm your AI wellbeing companion. What would you like to talk about today?`,
        timestamp: new Date(),
        suggestions: conversationStarters
      };
      setMessages([greeting]);
    } else {
      setCurrentConversationId(conversationId);
      currentConversationIdRef.current = conversationId;
      setInputValue('');
      setShowMobileSidebar(false);
      setIsLoadingConversation(true);
      
      const loadingMessage: Message = {
        id: 'loading',
        type: 'system',
        content: 'Loading conversation...',
        timestamp: new Date()
      };
      setMessages([loadingMessage]);
      
      try {
        const response = await conversationsApi.getConversation(conversationId);
        if (response.success && response.data?.messages) {
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
      } finally {
        setIsLoadingConversation(false);
      }
    }
  };

  const toggleMessageExpansion = (messageId: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, isExpanded: !msg.isExpanded } : msg
    ));
  };

  const jumpToLatest = () => {
    setIsUserScrolling(false);
    setShowJumpToLatest(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Message component with long content handling
  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const assessmentPrompt = !isUser && !isSystem
      ? (message.assessmentPrompt ?? parseAssessmentPromptMeta(message.metadata))
      : null;
    const maxLength = isMobile ? 300 : 500;
    const isLongMessage = message.content.length > maxLength;
    const shouldTruncate = isLongMessage && !message.isExpanded;
    const displayContent = shouldTruncate 
      ? message.content.substring(0, maxLength) + '...'
      : message.content;

    return (
      <div className={`flex gap-2 md:gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-3 md:mb-4 group`}>
        {!isUser && (
          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSystem ? 'bg-amber-100' : 'bg-primary/10'
          }`}>
            {isSystem ? (
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
            ) : (
              <Bot className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            )}
          </div>
        )}
        
        <div className={`max-w-[88%] md:max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
          <div
            className={`rounded-2xl px-3 py-2 md:px-4 md:py-3 ${
              isUser
                ? 'bg-primary text-primary-foreground ml-auto'
                : isSystem
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-muted'
            }`}
          >
            <MarkdownMessage 
              content={displayContent} 
              enableTypewriter={message.enableTypewriter && message.id === currentlyTypingMessageId}
              typewriterSpeed={20}
              onTypewriterComplete={() => setCurrentlyTypingMessageId(null)}
            />
            
            {isLongMessage && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-auto p-0 text-xs hover:underline"
                onClick={() => toggleMessageExpansion(message.id)}
              >
                {message.isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            )}
          </div>

          {assessmentPrompt && (
            <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm text-foreground">{assessmentPrompt.prompt}</p>
              {typeof assessmentPrompt.daysSinceLastAssessment === 'number' && (
                <p className="text-xs text-muted-foreground">
                  Last anxiety assessment was {assessmentPrompt.daysSinceLastAssessment} day(s) ago.
                </p>
              )}
              <Button size="sm" onClick={() => onNavigate('assessments')} className={isMobile ? 'min-h-[40px]' : ''}>
                {assessmentPrompt.ctaLabel}
              </Button>
            </div>
          )}
          
          <div className={`flex items-center gap-1 md:gap-2 mt-1 text-xs text-muted-foreground ${
            isUser ? 'justify-end' : 'justify-start'
          }`}>
            <span className="text-[10px] md:text-xs">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {!isUser && !isSystem && (
              isMobile ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${messageFeedback[message.id] === 'liked' ? 'bg-green-50 text-green-700' : ''}`}
                    onClick={() => handleLike(message.id)}
                    title="This was helpful"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${messageFeedback[message.id] === 'disliked' ? 'bg-red-50 text-red-700' : ''}`}
                    onClick={() => handleDislike(message.id)}
                    title="This wasn't helpful"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <MessageActions
                  messageId={message.id}
                  content={message.content}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  onRegenerate={handleRegenerate}
                  onSpeak={speakText}
                  feedback={messageFeedback[message.id] || null}
                />
              )
            )}
          </div>

          {/* Smart Reply Chips */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className={`flex gap-2 mt-2 md:mt-3 ${isMobile ? 'overflow-x-auto pb-2' : 'flex-wrap'}`}>
              {message.suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs whitespace-nowrap min-h-[44px] md:min-h-0 px-3 md:px-4 rounded-full"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>

        {isUser && (
          <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
          </div>
        )}
      </div>
    );
  };

  // Topic chips for empty state
  const TopicChips = () => {
    if (conversationStarters.length === 0) return null;

    return (
      <div className="mt-6">
        <p className="text-sm text-muted-foreground mb-3 text-center">
          Or choose a topic to get started:
        </p>
        <div className={`${
          isMobile 
            ? 'flex gap-2 overflow-x-auto pb-2 hide-scrollbar' 
            : 'grid grid-cols-2 gap-2'
        }`}>
          {conversationStarters.map((starter, index) => (
            <Button
              key={index}
              variant="outline"
              className={`${
                isMobile 
                  ? 'flex-shrink-0 whitespace-nowrap min-h-[44px]' 
                  : 'h-auto py-3'
              } px-4 text-left justify-start text-sm hover:bg-primary/5 hover:border-primary/50 transition-all`}
              onClick={() => handleSuggestionClick(starter)}
            >
              {starter}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Composer with responsive controls
  const Composer = () => {
    return (
      <div className="flex-shrink-0 border-t p-3 md:p-4 bg-background safe-area-bottom">
        {/* Tools menu for mobile */}
        {isMobile && showTools && (
          <div className="mb-2 flex gap-2 pb-2 border-b">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-h-[44px]"
              disabled
              title="Attachments coming soon"
              onClick={() => {
                setShowTools(false);
              }}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={() => {
                setShowTools(false);
                onNavigate('help');
              }}
            >
              <LifeBuoy className="h-4 w-4 mr-2" />
              Support
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 flex-shrink-0"
              aria-label={showTools ? 'Hide tools' : 'Show tools'}
              onClick={() => setShowTools(!showTools)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Share what's on your mind..."
              disabled={isLoadingConversation}
              className={`pr-20 resize-none ${isMobile ? 'min-h-[44px] max-h-[132px]' : 'min-h-[48px] max-h-[120px]'}`}
              rows={1}
              style={{
                height: 'auto',
                maxHeight: isMobile ? '132px' : '120px'
              }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 ${isMobile ? 'min-h-[44px] min-w-[44px]' : ''}`}
                onClick={handleComposerVoiceOutput}
                disabled={!isSpeaking && !hasSpeakableMessage}
                aria-label={isSpeaking ? 'Stop voice output' : 'Read latest assistant message aloud'}
                title={isSpeaking ? 'Stop speaking' : 'Read latest assistant message'}
              >
                {isSpeaking ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 ${isListening ? 'bg-red-100 text-red-600' : ''} ${isMobile ? 'min-h-[44px] min-w-[44px]' : ''}`}
                onClick={toggleVoiceInput}
                disabled={!voiceInputSupported || isLoadingConversation}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                title={
                  !voiceInputSupported
                    ? 'Voice input is unavailable in this browser'
                    : isListening
                    ? 'Stop listening'
                    : 'Voice input'
                }
              >
                <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || isLoadingConversation}
            size={isMobile ? 'default' : 'sm'}
            className={`flex-shrink-0 ${isMobile ? 'h-11 w-11 p-0' : ''}`}
            aria-label={isTyping ? 'Sending message' : isLoadingConversation ? 'Loading conversation' : 'Send message'}
          >
            {isTyping || isLoadingConversation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Crisis support footer on mobile */}
        {isMobile && (
          <div className="mt-2 text-center">
            <button
              onClick={() => onNavigate('help')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Need crisis support? <span className="underline">Tap here</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex-shrink-0 border-b ${isMobile ? 'p-3 safe-area-top' : 'p-4'} ${
        isModal ? 'bg-background' : 'bg-gradient-to-r from-primary/10 to-accent/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            {!isModal && (
              <Button 
                variant="ghost" 
                size="sm"
                className={`flex-shrink-0 ${isMobile ? 'h-9 w-9 p-0' : ''}`}
                onClick={() => isMobile || isTabletPortrait ? setShowMobileSidebar(true) : onNavigate('dashboard')}
              >
                {isMobile || isTabletPortrait ? <Menu className="h-5 w-5" /> : <ArrowLeft className="h-4 w-4" />}
              </Button>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-7 h-7' : 'w-8 h-8'}`}>
                <MessageCircle className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className={`font-semibold truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                  AI Wellbeing Companion
                </h1>
                <p className={`text-muted-foreground truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  Always here to listen
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {!isModal && (isDesktop || isTabletLandscape) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 md:px-3"
                onClick={() => setIsDesktopSidebarOpen((prev) => !prev)}
                aria-label={isDesktopSidebarOpen ? 'Hide conversations sidebar' : 'Show conversations sidebar'}
              >
                {isDesktopSidebarOpen ? (
                  <>
                    <PanelLeftClose className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Hide</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Conversations</span>
                  </>
                )}
              </Button>
            )}
            {isModal && onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className={isMobile ? 'h-9 w-9 p-0' : ''}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={isMobile ? 'h-9 w-9 p-0' : ''}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={isMobile ? 'min-w-[200px]' : ''}>
                <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate('help')}>
                  <LifeBuoy className="h-4 w-4 mr-2" />
                  Crisis Resources
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto ${isMobile ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}
      >
        {messages.length === 0 ? (
          <EmptyState 
            onStarterClick={handleSuggestionClick}
            starters={conversationStarters.length > 0 ? conversationStarters : undefined}
          />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {messages.length === 1 && <TopicChips />}
          </>
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className={`flex gap-2 md:gap-3 justify-start`}>
            <div className={`rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'w-7 h-7' : 'w-8 h-8'}`}>
              <Bot className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </div>
            <div className="bg-muted rounded-2xl px-3 md:px-4 py-2 md:py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Jump to latest button */}
      {showJumpToLatest && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg rounded-full"
            onClick={jumpToLatest}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Jump to latest
          </Button>
        </div>
      )}

      {/* Composer */}
      <Composer />
    </div>
  );

  const feedbackDialog = (
    <Dialog
      open={feedbackTargetMessageId !== null}
      onOpenChange={(open) => {
        if (open) {
          return;
        }

        if (feedbackTargetMessageId) {
          setMessageFeedback(prev => ({ ...prev, [feedbackTargetMessageId]: null }));
        }

        setFeedbackTargetMessageId(null);
        setFeedbackNote('');
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Help Us Improve This Reply</DialogTitle>
          <DialogDescription>
            Share what would have been more helpful. This is optional.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={feedbackNote}
          onChange={(event) => setFeedbackNote(event.target.value)}
          placeholder="Example: I needed clearer next steps."
          rows={4}
          maxLength={400}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!feedbackTargetMessageId) {
                return;
              }
              void submitDislikeFeedback(feedbackTargetMessageId);
            }}
            disabled={isSubmittingFeedbackNote}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!feedbackTargetMessageId) {
                return;
              }

              const note = feedbackNote.trim();
              void submitDislikeFeedback(feedbackTargetMessageId, note.length > 0 ? note : undefined);
            }}
            disabled={isSubmittingFeedbackNote}
          >
            {isSubmittingFeedbackNote ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {isModal ? (
        <div className="flex flex-col h-full">{chatContent}</div>
      ) : (
        <div className="min-h-screen bg-background flex h-screen">
          {/* Desktop / Tablet landscape sidebar */}
          {(isDesktop || isTabletLandscape) && isDesktopSidebarOpen && (
            <>
              <div
                className="border-r flex-shrink-0"
                style={{ width: desktopSidebarWidth }}
              >
                <ConversationHistorySidebar
                  activeConversationId={currentConversationId}
                  onSelectConversation={handleSelectConversation}
                  className="h-screen"
                  showCloseButton
                  onCloseSidebar={() => setIsDesktopSidebarOpen(false)}
                />
              </div>
              <button
                type="button"
                className={`chat-sidebar-resizer ${isResizingSidebar ? 'chat-sidebar-resizer--active' : ''}`}
                onPointerDown={startSidebarResize}
                aria-label="Resize conversation sidebar"
                title="Drag to resize sidebar"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          )}

          {/* Mobile/Tablet Portrait Sidebar - Drawer */}
          {(isMobile || isTabletPortrait) && (
            <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
              <SheetContent 
                side="left" 
                className={`p-0 ${isMobile ? 'w-[85vw] max-w-[320px]' : 'w-80'}`}
                aria-describedby="conversation-drawer-description"
              >
                <SheetTitle className="sr-only">Conversation History</SheetTitle>
                <SheetDescription id="conversation-drawer-description" className="sr-only">
                  Browse and manage your conversation history
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
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col h-screen relative">
            {chatContent}
          </div>
        </div>
      )}

      {/* Crisis Warning Modal */}
      {showCrisisWarning && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 safe-area-insets">
          <Card className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                We Care About Your Safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
                It sounds like you might be going through something serious. We want to help you connect 
                with immediate professional support.
              </p>
              
              <div className="space-y-2">
                <Button 
                  className={`w-full ${isMobile ? 'min-h-[48px]' : ''}`}
                  onClick={() => window.open('tel:988')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call 988 (Crisis Lifeline)
                </Button>
                
                <Button 
                  variant="outline" 
                  className={`w-full ${isMobile ? 'min-h-[48px]' : ''}`}
                  onClick={() => {
                    setShowCrisisWarning(false);
                    onNavigate('help');
                  }}
                >
                  View Crisis Resources
                </Button>
                
                <Button 
                  variant="ghost" 
                  className={`w-full ${isMobile ? 'min-h-[48px]' : ''}`}
                  onClick={() => setShowCrisisWarning(false)}
                >
                  Continue Conversation
                </Button>
              </div>

              <div className={`text-muted-foreground space-y-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
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
      {feedbackDialog}

    </>
  );
}
