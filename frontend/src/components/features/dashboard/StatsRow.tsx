import { BarChart3, Calendar, CheckCircle, Flame } from 'lucide-react';
import { type ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'stable';
  onClick?: () => void;
}

function StatCard({ icon, value, label, trend, trendDirection, onClick }: StatCardProps) {
  const trendColor =
    trendDirection === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
    trendDirection === 'down' ? 'text-rose-600 dark:text-rose-400' :
    'text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-[var(--shadow-soft)] transition-all duration-300 min-w-[80px] flex-1 touch-manipulation cursor-pointer"
    >
      <div className="text-primary/70">{icon}</div>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground leading-tight text-center">{label}</span>
      {trend && (
        <span className={`text-[10px] font-medium ${trendColor}`}>{trend}</span>
      )}
    </button>
  );
}

interface StatsRowProps {
  streak: number;
  wellnessScore: number | null;
  wellnessTrend?: number | null;
  weeklyCheckIns: number;
  habitsCompleted: number;
  habitsTotal: number;
  onStatClick?: (stat: string) => void;
}

export function StatsRow({
  streak,
  wellnessScore,
  wellnessTrend,
  weeklyCheckIns,
  habitsCompleted,
  habitsTotal,
  onStatClick,
}: StatsRowProps) {
  const trendLabel = wellnessTrend
    ? `${wellnessTrend > 0 ? '↑' : '↓'} ${Math.abs(Math.round(wellnessTrend))}%`
    : undefined;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
      <StatCard
        icon={<Flame className="h-4 w-4" />}
        value={`${streak}d`}
        label="streak"
        onClick={() => onStatClick?.('streak')}
      />
      <StatCard
        icon={<BarChart3 className="h-4 w-4" />}
        value={wellnessScore !== null ? `${wellnessScore}%` : '—'}
        label="wellness"
        trend={trendLabel}
        trendDirection={wellnessTrend ? (wellnessTrend > 0 ? 'up' : 'down') : 'stable'}
        onClick={() => onStatClick?.('wellness')}
      />
      <StatCard
        icon={<Calendar className="h-4 w-4" />}
        value={`${weeklyCheckIns}/7`}
        label="this week"
        onClick={() => onStatClick?.('checkins')}
      />
      <StatCard
        icon={<CheckCircle className="h-4 w-4" />}
        value={`${habitsCompleted}/${habitsTotal}`}
        label="habits"
        onClick={() => onStatClick?.('habits')}
      />
    </div>
  );
}
