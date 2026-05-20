import { useMemo } from 'react';

interface GreetingHeaderProps {
  userName?: string;
}

export function GreetingHeader({ userName }: GreetingHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return { text: 'Good night', emoji: '🌙' };
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    if (hour < 21) return { text: 'Good evening', emoji: '🌇' };
    return { text: 'Good night', emoji: '🌙' };
  }, []);

  const dayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  const firstName = userName?.split(' ')[0] || '';

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">
          {greeting.text}{firstName ? `, ${firstName}` : ''} {greeting.emoji}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dayLabel}</p>
      </div>
    </div>
  );
}
