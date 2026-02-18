import { MessageCircle, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { getApiBaseUrl } from '../../../config/apiConfig';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Skeleton } from '../../ui/skeleton';

interface ConversationTopic {
  topic: string;
  count: number;
  lastMentioned: string;
}

interface ConversationMemory {
  recentTopics: ConversationTopic[];
  recurringThemes: string[];
}

interface ConversationMemoryResponse {
  success?: boolean;
  data?: ConversationMemory;
  error?: string;
}

interface ConversationTopicsWidgetProps {
  userId: string;
}

const TOPIC_LABELS: Record<string, string> = {
  anxiety: '😰 Anxiety',
  depression: '😔 Depression',
  stress: '😓 Stress',
  sleep: '😴 Sleep',
  work: '💼 Work',
  relationships: '💑 Relationships',
  family: '👨‍👩‍👧‍👦 Family',
  social: '👥 Social',
  health: '🏥 Health',
  self_esteem: '💪 Self-Esteem',
  mindfulness: '🧘 Mindfulness',
  exercise: '🏃 Exercise',
  diet: '🥗 Diet',
  trauma: '💔 Trauma',
  grief: '😢 Grief',
  substance: '🚬 Substance Use'
};

const TOPIC_COLORS: Record<string, string> = {
  anxiety: 'bg-red-500',
  depression: 'bg-purple-500',
  stress: 'bg-orange-500',
  sleep: 'bg-indigo-500',
  work: 'bg-blue-500',
  relationships: 'bg-pink-500',
  family: 'bg-green-500',
  social: 'bg-cyan-500',
  health: 'bg-teal-500',
  self_esteem: 'bg-amber-500',
  mindfulness: 'bg-emerald-500',
  exercise: 'bg-lime-500',
  diet: 'bg-yellow-500',
  trauma: 'bg-rose-500',
  grief: 'bg-violet-500',
  substance: 'bg-gray-500'
};

export function ConversationTopicsWidget({ userId }: ConversationTopicsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<ConversationMemory | null>(null);

  useEffect(() => {
    if (!userId) {
      setMemory(null);
      return;
    }

    const abortController = new AbortController();

    const fetchConversationMemory = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${getApiBaseUrl()}/chat/memory/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch conversation memory (status ${response.status})`);
        }

        const payload: ConversationMemoryResponse = await response.json();

        if (payload.success === false) {
          throw new Error(payload.error || 'Failed to load conversation topics');
        }

        const payloadMemory = payload.data ?? (payload as unknown as ConversationMemory);

        if (!payloadMemory || !Array.isArray(payloadMemory.recentTopics)) {
          setMemory({ recentTopics: [], recurringThemes: [] });
          return;
        }

        setMemory(payloadMemory);
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('Error fetching conversation memory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversation topics');
        setMemory(null);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchConversationMemory();

    return () => abortController.abort();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversation Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/6" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversation Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!memory || !memory.recentTopics || memory.recentTopics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversation Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Start chatting to see your conversation topics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topTopics = [...memory.recentTopics]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxCount = topTopics[0]?.count || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Conversation Topics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          What you&apos;ve been talking about (last 30 days)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {topTopics.map((topic) => {
            const percentage = (topic.count / maxCount) * 100;
            const label = TOPIC_LABELS[topic.topic] || topic.topic;
            const colorClass = TOPIC_COLORS[topic.topic] || 'bg-gray-500';

            return (
              <div key={topic.topic} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">
                    {topic.count} {topic.count === 1 ? 'time' : 'times'}
                  </span>
                </div>
                <div className="relative">
                  <Progress value={percentage} className="h-2" />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full ${colorClass} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Last mentioned: {new Date(topic.lastMentioned).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>

        {memory.recurringThemes && memory.recurringThemes.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Recurring Themes</h4>
            </div>
            <ul className="space-y-2">
              {memory.recurringThemes.slice(0, 3).map((theme, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{theme}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {topTopics.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No topics tracked yet. Keep chatting to build your conversation history!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
