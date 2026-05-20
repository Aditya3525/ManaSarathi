import { TrendingUp, TrendingDown, Minus, Smile, Meh, Frown } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { getApiBaseUrl } from '../../../config/apiConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Skeleton } from '../../ui/skeleton';

interface EmotionalPatternWidgetProps {
  userId: string;
}

interface EmotionalPattern {
  predominant: string;
  recentShift: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface ConversationMemory {
  emotionalPatterns?: {
    predominant?: string;
    recentShift?: string;
  };
  sentimentDistribution?: {
    positive?: number;
    neutral?: number;
    negative?: number;
  };
}

const MOOD_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  positive: {
    label: 'Positive',
    icon: <Smile className="h-4 w-4" />,
    color: 'text-green-600'
  },
  neutral: {
    label: 'Neutral',
    icon: <Meh className="h-4 w-4" />,
    color: 'text-yellow-600'
  },
  negative: {
    label: 'Negative',
    icon: <Frown className="h-4 w-4" />,
    color: 'text-red-600'
  }
};

const PREDOMINANT_MOODS: Record<string, { label: string; color: string }> = {
  anxious: { label: 'Anxious', color: 'text-orange-600' },
  stressed: { label: 'Stressed', color: 'text-red-600' },
  calm: { label: 'Calm', color: 'text-blue-600' },
  hopeful: { label: 'Hopeful', color: 'text-green-600' },
  sad: { label: 'Sad', color: 'text-purple-600' },
  content: { label: 'Content', color: 'text-teal-600' },
  overwhelmed: { label: 'Overwhelmed', color: 'text-red-700' },
  stable: { label: 'Stable', color: 'text-emerald-600' },
  uncertain: { label: 'Uncertain', color: 'text-gray-600' },
  motivated: { label: 'Motivated', color: 'text-indigo-600' }
};

const SHIFT_ICONS: Record<string, React.ReactNode> = {
  improving: <TrendingUp className="h-4 w-4 text-green-600" />,
  declining: <TrendingDown className="h-4 w-4 text-red-600" />,
  stable: <Minus className="h-4 w-4 text-blue-600" />,
  fluctuating: <Minus className="h-4 w-4 text-yellow-600 animate-pulse" />
};

export const EmotionalPatternWidget: React.FC<EmotionalPatternWidgetProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pattern, setPattern] = useState<EmotionalPattern | null>(null);

  useEffect(() => {
    const fetchEmotionalPattern = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(`${getApiBaseUrl()}/chat/memory/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch emotional patterns');
        }

        const result = await response.json();
        const memory: ConversationMemory = result.data;

        // Extract emotional pattern data
        const emotionalPattern: EmotionalPattern = {
          predominant: memory.emotionalPatterns?.predominant || 'stable',
          recentShift: memory.emotionalPatterns?.recentShift || 'stable',
          positive: memory.sentimentDistribution?.positive || 0,
          neutral: memory.sentimentDistribution?.neutral || 0,
          negative: memory.sentimentDistribution?.negative || 0
        };

        setPattern(emotionalPattern);
      } catch (err) {
        console.error('Error fetching emotional patterns:', err);
        setError(err instanceof Error ? err.message : 'Failed to load emotional patterns');
      } finally {
        setLoading(false);
      }
    };

    fetchEmotionalPattern();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Unable to Load Emotional Patterns</CardTitle>
          <CardDescription className="text-red-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!pattern) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5" />
            Emotional Patterns
          </CardTitle>
          <CardDescription>
            Start chatting with the AI to see your emotional patterns
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = pattern.positive + pattern.neutral + pattern.negative;
  const hasData = total > 0;

  const positivePercent = hasData ? Math.round((pattern.positive / total) * 100) : 0;
  const neutralPercent = hasData ? Math.round((pattern.neutral / total) * 100) : 0;
  const negativePercent = hasData ? Math.round((pattern.negative / total) * 100) : 0;

  const predominantMood = PREDOMINANT_MOODS[pattern.predominant] || { 
    label: pattern.predominant, 
    color: 'text-gray-600' 
  };
  
  const shiftIcon = SHIFT_ICONS[pattern.recentShift] || SHIFT_ICONS.stable;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smile className="h-5 w-5" />
          Emotional Patterns
        </CardTitle>
        <CardDescription>
          Your emotional tone in recent conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sentiment Distribution */}
        {hasData ? (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Sentiment Distribution</h4>
            
            {/* Positive Sentiment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {MOOD_LABELS.positive.icon}
                  <span className={`text-sm font-medium ${MOOD_LABELS.positive.color}`}>
                    {MOOD_LABELS.positive.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {positivePercent}%
                </span>
              </div>
              <Progress 
                value={positivePercent} 
                className="h-2 bg-green-100"
                indicatorClassName="bg-green-500"
              />
            </div>

            {/* Neutral Sentiment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {MOOD_LABELS.neutral.icon}
                  <span className={`text-sm font-medium ${MOOD_LABELS.neutral.color}`}>
                    {MOOD_LABELS.neutral.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {neutralPercent}%
                </span>
              </div>
              <Progress 
                value={neutralPercent} 
                className="h-2 bg-yellow-100"
                indicatorClassName="bg-yellow-500"
              />
            </div>

            {/* Negative Sentiment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {MOOD_LABELS.negative.icon}
                  <span className={`text-sm font-medium ${MOOD_LABELS.negative.color}`}>
                    {MOOD_LABELS.negative.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {negativePercent}%
                </span>
              </div>
              <Progress 
                value={negativePercent} 
                className="h-2 bg-red-100"
                indicatorClassName="bg-red-500"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No sentiment data available yet</p>
          </div>
        )}

        {/* Predominant Mood & Recent Shift */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Predominant Mood</p>
            <p className={`text-lg font-semibold ${predominantMood.color}`}>
              {predominantMood.label}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Recent Shift</p>
            <div className="flex items-center gap-2">
              {shiftIcon}
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {pattern.recentShift}
              </p>
            </div>
          </div>
        </div>

        {/* Insight Message */}
        {hasData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-900">
              {positivePercent >= 50 ? (
                <span>💙 You&apos;re expressing mostly positive emotions. Keep nurturing what&apos;s working!</span>
              ) : negativePercent >= 50 ? (
                <span>🌟 You&apos;re navigating challenging emotions. Consider trying a mindfulness exercise.</span>
              ) : (
                <span>⚖️ Your emotional tone is balanced. Keep checking in with yourself regularly.</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
