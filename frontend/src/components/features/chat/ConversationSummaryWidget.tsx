import { Brain, TrendingUp, MessageSquare, CheckCircle2, Heart } from 'lucide-react';
import React from 'react';

import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface ConversationSummaryWidgetProps {
  summary: {
    summary: string;
    keyInsights: string[];
    emotionalTrends: string[];
    topicsDiscussed: string[];
    actionItems: string[];
    overallSentiment: string;
  };
}

export function ConversationSummaryWidget({ summary }: ConversationSummaryWidgetProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😔';
      default:
        return '😐';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-blue-600" />
          Conversation Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Sentiment */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Mood:</span>
          <Badge className={getSentimentColor(summary.overallSentiment)}>
            {getSentimentEmoji(summary.overallSentiment)} {summary.overallSentiment}
          </Badge>
        </div>

        {/* Main Summary */}
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
        </div>

        {/* Key Insights */}
        {summary.keyInsights.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Key Insights
            </h4>
            <ul className="space-y-1">
              {summary.keyInsights.map((insight, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Emotional Trends */}
        {summary.emotionalTrends.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <Heart className="h-4 w-4 text-pink-600" />
              Emotional Patterns
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.emotionalTrends.map((trend, index) => (
                <Badge key={index} variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                  {trend}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Topics Discussed */}
        {summary.topicsDiscussed.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              Topics Discussed
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.topicsDiscussed.map((topic, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {summary.actionItems.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Suggested Next Steps
            </h4>
            <ul className="space-y-1">
              {summary.actionItems.map((item, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
