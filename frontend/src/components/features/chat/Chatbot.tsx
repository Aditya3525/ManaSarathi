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
  MoreHorizontal,
  Menu,
  Download,
  LifeBuoy
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useConversationMessages } from '../../../hooks/useConversations';
import { chatApi, conversationsApi } from '../../../services/api';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../../ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../ui/dropdown-menu';

import { ConversationHistorySidebar } from './ConversationHistorySidebar';
import { EmptyState } from './EmptyState';
import { ExportDialog } from './ExportDialog';
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
  suggestions?: string[];
  isTyping?: boolean;
  feedback?: 'liked' | 'disliked' | null;
  enableTypewriter?: boolean;
}

export function Chatbot({ user, onNavigate, isModal = false, onClose }: ChatbotProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisisWarning, setShowCrisisWarning] = useState(false);
  const [isLoadingStarters, setIsLoadingStarters] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Manual voice control - off by default
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'liked' | 'disliked' | null>>({});
  const [currentlyTypingMessageId, setCurrentlyTypingMessageId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation starters and initial greeting
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load personalized greeting
        const greetingResponse = await chatApi.getMoodBasedGreeting();
        let greetingText = `Hello ${([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'there')}! I'm MaanaSarathi, your AI wellbeing companion. I'm here to listen, support, and help guide you through your mental health journey. What would you like to talk about today?`;
        
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
      } finally {
        setIsLoadingStarters(false);
      }
    };

    loadInitialData();
  }, [user]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
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
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
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

  const detectCrisisLanguage = (text: string): boolean => {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'don\'t want to live',
      'hurt myself', 'self harm', 'cutting', 'overdose',
      'hopeless', 'no point', 'better off dead'
    ];
    
    return crisisKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputValue;
    setInputValue('');

    // Check for crisis language
    if (detectCrisisLanguage(messageContent)) {
      setShowCrisisWarning(true);
      const crisisMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'I\'m concerned about your safety. If you\'re having thoughts of hurting yourself, please reach out for immediate help.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, crisisMessage]);
      return;
    }

    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Call the real backend API with Gemini, passing conversationId
      console.log('🤖 Sending message to chat API:', messageContent, 'conversationId:', currentConversationId);
      const response = await chatApi.sendMessage(messageContent, currentConversationId || undefined);
      console.log('📥 Chat API response:', response);
      
      if (response.success && response.data) {
        const messagePayload = response.data;
        
        // Update conversationId if returned from API
        if (messagePayload.conversationId && messagePayload.conversationId !== currentConversationId) {
          console.log('📝 Setting conversation ID:', messagePayload.conversationId);
          setCurrentConversationId(messagePayload.conversationId);
        }
        
        const structuredContent =
          typeof messagePayload.message === 'object' && messagePayload.message !== null
            ? messagePayload.message.content
            : undefined;
        const fallbackContent =
          typeof messagePayload.response === 'string' ? messagePayload.response : undefined;
        const resolvedContent =
          structuredContent ?? fallbackContent ?? 'I apologize, but I encountered an issue generating a response.';

        // Use smart replies from backend if available
        const smartReplies = messagePayload.smartReplies || [];

        const botMessageId = (Date.now() + 2).toString();
        const botResponse: Message = {
          id: botMessageId,
          type: 'bot',
          content: resolvedContent,
          timestamp: new Date(),
          suggestions: smartReplies,
          enableTypewriter: true
        };

        setCurrentlyTypingMessageId(botMessageId);

        setMessages(prev => [...prev, botResponse]);
        
        // Speak the bot response only if voice is enabled
        if (voiceEnabled) {
          speakText(resolvedContent);
        }
      } else {
        console.error('❌ Chat API failed:', response.error);
        // Fallback to local response if API fails
        const fallbackMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'bot',
          content: 'I\'m having trouble connecting right now, but I\'m here to listen. Could you tell me more about how you\'re feeling?',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error('❌ Chat API error:', error);
      
      // Fallback to local response on error
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

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleLike = (messageId: string) => {
    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: 'liked'
    }));
  };

  const handleDislike = (messageId: string) => {
    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: 'disliked'
    }));
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

    // Resend the user message to get a new response
    setIsTyping(true);
    try {
      const response = await chatApi.sendMessage(lastUserMessage.content);
      
      if (response.success && response.data) {
        const messagePayload = response.data;
        const structuredContent =
          typeof messagePayload.message === 'object' && messagePayload.message !== null
            ? messagePayload.message.content
            : undefined;
        const fallbackContent =
          typeof messagePayload.response === 'string' ? messagePayload.response : undefined;
        const resolvedContent =
          structuredContent ?? fallbackContent ?? 'I apologize, but I encountered an issue generating a response.';

        const smartReplies = messagePayload.smartReplies || [];

        const botResponse: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: resolvedContent,
          timestamp: new Date(),
          suggestions: smartReplies
        };

        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGetExercises = () => {
    // Navigate to exercises page
    onNavigate('exercises');
  };

  const handleGetSummary = async () => {
    // Request a conversation summary from the AI
    const summaryRequest = 'Can you provide a brief summary of our conversation so far and any key insights or recommendations?';
    setInputValue(summaryRequest);
    await handleSendMessage();
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
      handleSendMessage();
    }
  };

  const handleTypewriterComplete = (_messageId: string) => {
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
            content: msg.content,
            timestamp: new Date(msg.createdAt),
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

    return (
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
        {!isUser && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSystem ? 'bg-amber-100' : 'bg-primary/10'
          }`}>
            {isSystem ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <Bot className="h-4 w-4 text-primary" />
            )}
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-primary text-primary-foreground ml-auto'
                : isSystem
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-muted'
            }`}
          >
            <MarkdownMessage 
              content={message.content} 
              enableTypewriter={message.enableTypewriter && message.id === currentlyTypingMessageId}
              typewriterSpeed={20}
              onTypewriterComplete={() => handleTypewriterComplete(message.id)}
            />
          </div>
          
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
            onStarterClick={(starter) => {
              setInputValue(starter);
              handleSendMessage();
            }}
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
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
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
              onKeyPress={handleKeyPress}
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
            onSelectConversation={handleSelectConversation}
            className="h-full"
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
