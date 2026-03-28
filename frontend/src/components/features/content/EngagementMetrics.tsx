import { Activity, BarChart3, Clock, Smile, Star, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { engagementApi, UserEngagementRecord } from '../../../services/api';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';
import { Skeleton } from '../../ui/skeleton';

interface EngagementStat {
  id: string;
  contentTitle: string;
  completed: boolean;
  rating: number | null;
  timeSpent: number | null;
  moodBefore: string | null;
  moodAfter: string | null;
  effectiveness: number | null;
  createdAt: string;
}

interface EngagementMetricsProps {
  userId: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  return `${mins}m`;
};

const getMoodEmoji = (mood: string): string => {
  const emojiMap: Record<string, string> = {
    happy: '😊',
    calm: '😌',
    anxious: '😰',
    sad: '😢',
    stressed: '😫',
    angry: '😠',
    neutral: '😐',
    overwhelmed: '😵',
    hopeful: '🙂',
    peaceful: '😇'
  };
  return emojiMap[mood] || '😐';
};

const calculateMoodImprovement = (before: string, after: string): number => {
  const moodScores: Record<string, number> = {
    sad: 1,
    overwhelmed: 2,
    anxious: 3,
    stressed: 3,
    angry: 3,
    neutral: 5,
    hopeful: 7,
    calm: 8,
    happy: 9,
    peaceful: 10
  };
  
  const beforeScore = moodScores[before] || 5;
  const afterScore = moodScores[after] || 5;
  return afterScore - beforeScore;
};

export function EngagementMetrics({ userId }: EngagementMetricsProps) {
  const [engagements, setEngagements] = useState<EngagementStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEngagementData = async () => {
      try {
        setIsLoading(true);
        const response = await engagementApi.getMyEngagements();
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch engagement data');
        }

        const mapped = response.data.map((entry: UserEngagementRecord): EngagementStat => ({
          id: entry.id,
          contentTitle: entry.content?.title || 'Untitled content',
          completed: entry.completed,
          rating: entry.rating,
          timeSpent: entry.timeSpent,
          moodBefore: entry.moodBefore,
          moodAfter: entry.moodAfter,
          effectiveness: entry.effectiveness,
          createdAt: entry.updatedAt || entry.createdAt,
        }));

        setEngagements(mapped);
      } catch (error) {
        console.error('Failed to fetch engagement data:', error);
        setEngagements([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEngagementData();
  }, [userId]);

  // Calculate aggregated statistics
  const stats = {
    totalCompletions: engagements.filter((e) => e.completed).length,
    averageRating: engagements.filter((e) => e.rating).length > 0
      ? (engagements.reduce((sum, e) => sum + (e.rating || 0), 0) / engagements.filter((e) => e.rating).length)
      : 0,
    averageEffectiveness: engagements.filter((e) => e.effectiveness).length > 0
      ? (engagements.reduce((sum, e) => sum + (e.effectiveness || 0), 0) / engagements.filter((e) => e.effectiveness).length)
      : 0,
    totalTimeSpent: engagements.reduce((sum, e) => sum + (e.timeSpent || 0), 0),
    moodImprovements: engagements.filter((e) => e.moodBefore && e.moodAfter)
      .map((e) => calculateMoodImprovement(e.moodBefore!, e.moodAfter!)),
    positiveMoodShifts: 0
  };

  stats.positiveMoodShifts = stats.moodImprovements.filter((improvement) => improvement > 0).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Engagement Insights</CardTitle>
          <CardDescription>Track your progress and wellness journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (engagements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Your Engagement Insights
          </CardTitle>
          <CardDescription>Track your progress and wellness journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No engagement data yet</p>
            <p className="text-sm mt-2">
              Start exploring content to see your insights and track your progress!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Your Engagement Insights
        </CardTitle>
        <CardDescription>
          Based on {engagements.length} engagement{engagements.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              Completions
            </div>
            <div className="text-2xl font-bold">{stats.totalCompletions}</div>
          </div>

          <div className="p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Star className="h-4 w-4" />
              Avg Rating
            </div>
            <div className="text-2xl font-bold">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </div>

          <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Effectiveness
            </div>
            <div className="text-2xl font-bold">
              {stats.averageEffectiveness > 0 ? stats.averageEffectiveness.toFixed(1) : '-'}
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </div>

          <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Time Spent
            </div>
            <div className="text-2xl font-bold">
              {stats.totalTimeSpent > 0 ? formatTime(stats.totalTimeSpent) : '-'}
            </div>
          </div>
        </div>

        {/* Mood Improvement Section */}
        {stats.moodImprovements.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smile className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Mood Improvements</h3>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                {stats.positiveMoodShifts} positive shifts
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {((stats.positiveMoodShifts / stats.moodImprovements.length) * 100).toFixed(0)}% of
              sessions showed mood improvement
            </p>
          </div>
        )}

        {/* Recent Engagement History */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Recent Activity
          </h3>
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-3">
              {engagements
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((engagement) => {
                  const moodImprovement = engagement.moodBefore && engagement.moodAfter
                    ? calculateMoodImprovement(engagement.moodBefore, engagement.moodAfter)
                    : null;

                  return (
                    <div
                      key={engagement.id}
                      className="p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {engagement.contentTitle}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {engagement.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {engagement.rating}/5
                              </span>
                            )}
                            {engagement.effectiveness && (
                              <span>
                                Effectiveness: {engagement.effectiveness}/10
                              </span>
                            )}
                            {engagement.timeSpent && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(engagement.timeSpent)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(engagement.createdAt).toLocaleDateString()}
                          </span>
                          {moodImprovement !== null && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                moodImprovement > 0
                                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                  : moodImprovement < 0
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                  : 'bg-gray-500/10'
                              }`}
                            >
                              {engagement.moodBefore && getMoodEmoji(engagement.moodBefore)}
                              {' → '}
                              {engagement.moodAfter && getMoodEmoji(engagement.moodAfter)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
