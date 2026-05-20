import { Clock, Play } from 'lucide-react';

import { ImageWithFallback } from '../../common/ImageWithFallback';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface FeaturedBannerProps {
  title: string;
  description: string;
  thumbnail?: string | null;
  duration?: string | null;
  type?: string;
  onPlay: () => void;
}

export function FeaturedBanner({ title, description, thumbnail, duration, type, onPlay }: FeaturedBannerProps) {
  return (
    <div className="page-enter relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20">
      <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:gap-6 sm:p-6">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-48 sm:aspect-square">
          {thumbnail ? (
            <ImageWithFallback src={thumbnail} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <Badge variant="secondary" className="text-xs">Featured</Badge>
            {type && (
              <Badge variant="outline" className="text-xs capitalize">
                {type}
              </Badge>
            )}
            {duration && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {duration}
              </Badge>
            )}
          </div>

          <h2 className="text-xl font-bold leading-tight sm:text-2xl">{title}</h2>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

          <Button onClick={onPlay} className="gap-2 rounded-xl shadow-sm">
            <Play className="h-4 w-4" />
            {duration ? `Play - ${duration}` : 'Play Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FeaturedBanner;