import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Heart, Clock, TrendingUp, Filter, Loader2, Star } from 'lucide-react';

import { getApiBaseUrl } from '../../../config/apiConfig';
import { useToast } from '../../../contexts/ToastContext';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface ContentRecommendation {
  id: number;
  title: string;
  type: string;
  contentType?: string;
  category: string;
  approach: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  intensityLevel?: string;
  focusAreas: string[];
  immediateRelief: boolean;
  averageRating?: number;
  completionCount?: number;
  recommendationReason?: string;
  score?: number;
}

interface RecommendationsResponse {
  recommendations: ContentRecommendation[];
  crisisLevel?: string;
  message?: string;
}

export function ContentRecommendations() {
  const { push } = useToast();
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [crisisLevel, setCrisisLevel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproach, setSelectedApproach] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/recommendations/personalized`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data: RecommendationsResponse = await response.json();
      setRecommendations(data.recommendations || []);
      setCrisisLevel(data.crisisLevel || null);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      push({
        title: 'Error',
        description: 'Failed to load personalized recommendations',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [push]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const filteredRecommendations = recommendations.filter(rec => {
    if (selectedApproach !== 'all' && rec.approach !== selectedApproach) return false;
    if (selectedCategory !== 'all' && rec.category !== selectedCategory) return false;
    return true;
  });

  const crisisRecommendations = filteredRecommendations.filter(r => r.immediateRelief);
  const regularRecommendations = filteredRecommendations.filter(r => !r.immediateRelief);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading personalized recommendations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Crisis Alert Banner */}
      {crisisLevel && crisisLevel !== 'none' && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 text-lg mb-2">
                  {crisisLevel === 'high' ? 'Immediate Support Available' : 'We\'re Here for You'}
                </h3>
                <p className="text-red-800 mb-4">
                  {crisisLevel === 'high'
                    ? 'It looks like you might be going through a difficult time. Please consider reaching out for immediate support.'
                    : 'We notice you might benefit from some extra support. Here are some resources that might help.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => window.open('tel:988', '_self')}
                  >
                    Call 988 (Suicide & Crisis Lifeline)
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    onClick={() => window.open('https://988lifeline.org/chat/', '_blank')}
                  >
                    Chat with Crisis Counselor
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    onClick={() => window.open('sms:741741', '_self')}
                  >
                    Text HOME to 741741
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Your Personalized Recommendations</h2>
          <p className="text-gray-600 mt-1">Based on your journey and current needs</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchRecommendations}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-2">Approach</div>
              <div className="flex gap-2">
                {['all', 'western', 'eastern', 'hybrid'].map(approach => (
                  <Button
                    key={approach}
                    variant={selectedApproach === approach ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedApproach(approach)}
                  >
                    {approach === 'all' ? 'All' : approach.charAt(0).toUpperCase() + approach.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-2">Category</div>
              <div className="flex flex-wrap gap-2">
                {['all', 'anxiety', 'depression', 'stress', 'mindfulness'].map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crisis/Immediate Relief Section */}
      {crisisRecommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Quick Relief Resources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crisisRecommendations.map(rec => (
              <ContentCard key={rec.id} recommendation={rec} isCrisis />
            ))}
          </div>
        </div>
      )}

      {/* Regular Recommendations */}
      {regularRecommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Recommended for You
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularRecommendations.map(rec => (
              <ContentCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {filteredRecommendations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No recommendations match your current filters.</p>
            <Button
              variant="link"
              onClick={() => {
                setSelectedApproach('all');
                setSelectedCategory('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ContentCardProps {
  recommendation: ContentRecommendation;
  isCrisis?: boolean;
}

function ContentCard({ recommendation, isCrisis = false }: ContentCardProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getIntensityColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'BEGINNER': return 'bg-green-100 text-green-700';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-700';
      case 'ADVANCED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getApproachIcon = (approach: string) => {
    switch (approach.toLowerCase()) {
      case 'eastern': return '🧘';
      case 'western': return '🧠';
      case 'hybrid': return '🌍';
      default: return '💡';
    }
  };

  return (
    <Card
      className={`hover:shadow-lg transition-shadow cursor-pointer ${isCrisis ? 'border-red-500 border-2' : ''
        }`}
      onClick={() => window.location.href = `/content/${recommendation.id}`}
    >
      {/* Thumbnail */}
      {recommendation.thumbnailUrl && (
        <div className="relative h-40 bg-gray-200 rounded-t-lg overflow-hidden">
          <img
            src={recommendation.thumbnailUrl}
            alt={recommendation.title}
            className="w-full h-full object-cover"
          />
          {isCrisis && (
            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Quick Relief
            </div>
          )}
        </div>
      )}

      <CardContent className="p-4">
        {/* Title */}
        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {getApproachIcon(recommendation.approach)} {recommendation.title}
        </h4>

        {/* Description */}
        {recommendation.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {recommendation.description}
          </p>
        )}

        {/* Recommendation Reason */}
        {recommendation.recommendationReason && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-2 mb-3">
            <p className="text-xs text-blue-800">
              <strong>Why for you:</strong> {recommendation.recommendationReason}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-3">
          {recommendation.duration && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(recommendation.duration)}
            </Badge>
          )}
          {recommendation.intensityLevel && (
            <Badge className={getIntensityColor(recommendation.intensityLevel)}>
              {recommendation.intensityLevel}
            </Badge>
          )}
          <Badge variant="secondary">
            {recommendation.category}
          </Badge>
        </div>

        {/* Focus Areas */}
        {recommendation.focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recommendation.focusAreas.slice(0, 3).map((area, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
              >
                {area}
              </span>
            ))}
            {recommendation.focusAreas.length > 3 && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                +{recommendation.focusAreas.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Rating and Completion */}
        <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-3">
          {recommendation.averageRating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{recommendation.averageRating.toFixed(1)}</span>
            </div>
          )}
          {recommendation.completionCount && (
            <span className="text-xs">
              {recommendation.completionCount} completed
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
