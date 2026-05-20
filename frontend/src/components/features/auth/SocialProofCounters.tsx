import { useEffect, useMemo, useState } from 'react';

interface CounterProps {
  end: number;
  suffix?: string;
  label: string;
  duration?: number;
  decimals?: number;
}

function AnimatedCounter({
  end,
  suffix = '',
  label,
  duration = 2000,
  decimals,
}: CounterProps) {
  const inferredDecimals = useMemo(
    () => (decimals ?? (Number.isInteger(end) ? 0 : 1)),
    [decimals, end]
  );
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame = 0;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = eased * end;
      setCount(Number(value.toFixed(inferredDecimals)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, end, inferredDecimals]);

  const formatted = count.toLocaleString(undefined, {
    minimumFractionDigits: inferredDecimals,
    maximumFractionDigits: inferredDecimals,
  });

  return (
    <div className="space-y-1 text-center">
      <div className="text-2xl font-bold text-foreground sm:text-3xl">
        {formatted}
        {suffix}
      </div>
      <div className="text-xs text-muted-foreground sm:text-sm">{label}</div>
    </div>
  );
}

export function SocialProofCounters() {
  return (
    <div className="grid grid-cols-2 gap-6 rounded-2xl border border-border/50 bg-background/70 px-4 py-6 backdrop-blur-sm sm:grid-cols-4">
      <AnimatedCounter end={5200} suffix="+" label="Active members" />
      <AnimatedCounter end={92} suffix="%" label="Feel better in 2 weeks" />
      <AnimatedCounter end={4.8} suffix="★" label="Assessment accuracy" decimals={1} />
      <AnimatedCounter end={24} suffix="/7" label="Always available" />
    </div>
  );
}

export default SocialProofCounters;