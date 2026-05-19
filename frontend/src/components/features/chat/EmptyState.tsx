import { Heart, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
import React from 'react';

import { Button } from '../../ui/button';

interface EmptyStateProps {
  onStarterClick?: (starter: string) => void;
  starters?: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onStarterClick,
  starters = [
    "I'm feeling anxious today",
    "Help me relax with a breathing exercise",
    "I want to improve my mood",
    "I'm having trouble sleeping"
  ]
}) => {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 sm:py-12">
      {/* Animated Gradient Illustration */}
      <div className="relative mb-8 h-24 w-24 sm:h-28 sm:w-28">
        {/* Outer animated ring */}
           <div className="absolute -inset-8 animate-pulse rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 opacity-30 blur-2xl sm:-inset-10" />
        
        {/* Inner floating icons */}
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="absolute top-0 left-0 animate-bounce" style={{ animationDuration: '3s' }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg sm:h-12 sm:w-12">
              <Heart className="h-6 w-6 text-white" fill="white" />
            </div>
          </div>
          
          <div className="absolute top-0 right-0 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg sm:h-10 sm:w-10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg sm:h-10 sm:w-10">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <div className="absolute bottom-0 right-0 animate-bounce" style={{ animationDuration: '3.2s', animationDelay: '1.5s' }}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="mb-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to Your AI Wellness Companion
        </h2>
        <p className="text-muted-foreground text-sm">
          I&apos;m here to support your wellbeing journey. Share what&apos;s on your mind, and let&apos;s work together toward better emotional health.
        </p>
      </div>

      {/* Starter Cards */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {starters.map((starter, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto py-4 px-5 text-left justify-start hover:bg-primary/5 hover:border-primary transition-all group"
            onClick={() => onStarterClick && onStarterClick(starter)}
          >
            <div className="flex w-full items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 transition-colors group-hover:from-primary/30 group-hover:to-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 break-words text-sm">
                {starter}
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground mt-6 text-center max-w-sm">
        💡 Tip: Click any suggestion above or type your own message below to start our conversation
      </p>
    </div>
  );
};

export default EmptyState;
