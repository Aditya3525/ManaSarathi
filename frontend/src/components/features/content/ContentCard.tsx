import { BookOpen, CheckCircle2, Clock, Headphones, Play, Video } from 'lucide-react';

import { ImageWithFallback } from '../../common/ImageWithFallback';
import { Badge } from '../../ui/badge';

interface ContentCardProps {
  title: string;
  thumbnail?: string | null;
  type: string;
  duration?: string | null;
  difficulty?: string | null;
  isCompleted?: boolean;
  onClick: () => void;
}

const getTypeIcon = (type: string) => {
  if (type === 'video') return <Video className="h-3 w-3" />;
  if (type === 'audio') return <Headphones className="h-3 w-3" />;
  return <BookOpen className="h-3 w-3" />;
};

export function ContentCard({ title, thumbnail, type, duration, difficulty, isCompleted = false, onClick }: ContentCardProps) {
  const typeIcon = getTypeIcon(type);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-[200px] flex-none cursor-pointer touch-manipulation snap-start sm:w-[220px]"
    >
      <div className="relative mb-2 aspect-[16/10] overflow-hidden rounded-xl bg-muted">
        {thumbnail ? (
          <ImageWithFallback
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            {typeIcon}
          </div>
        )}

        {(type === 'video' || type === 'audio') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="ml-0.5 h-4 w-4 text-foreground" />
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </div>
        )}

        {duration && (
          <div className="absolute bottom-2 right-2">
            <Badge className="flex items-center gap-1 border-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              <Clock className="h-2.5 w-2.5" />
              {duration}
            </Badge>
          </div>
        )}
      </div>

      <h4 className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
        {title}
      </h4>

      <div className="mt-1 flex items-center gap-2">
        <span className="text-muted-foreground">{typeIcon}</span>
        <span className="text-[11px] capitalize text-muted-foreground">{type}</span>
        {difficulty && <span className="text-[11px] text-muted-foreground">{difficulty}</span>}
      </div>
    </button>
  );
}

export default ContentCard;