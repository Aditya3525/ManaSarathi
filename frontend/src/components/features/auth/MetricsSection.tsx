import { BarChart3, CalendarCheck, Shield, Smile, TrendingUp } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useDevice } from '../../../hooks/use-device';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface Metric {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  helper: string;
  accent: string;
  bgAccent: string;
}

const METRICS: Metric[] = [
  {
    icon: Smile,
    value: '92%',
    label: 'Feel calmer in 2 weeks',
    helper: 'Based on post-program self-reports',
    accent: 'text-emerald-600',
    bgAccent: 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
  },
  {
    icon: BarChart3,
    value: '4.8/5',
    label: 'Average member rating',
    helper: 'Across 5k+ coaching sessions',
    accent: 'text-blue-600',
    bgAccent: 'bg-blue-500/10 group-hover:bg-blue-500/20'
  },
  {
    icon: CalendarCheck,
    value: '3x',
    label: 'Faster habit formation',
    helper: 'When pairing practices with AI nudges',
    accent: 'text-violet-600',
    bgAccent: 'bg-violet-500/10 group-hover:bg-violet-500/20'
  },
  {
    icon: Shield,
    value: '100%',
    label: 'HIPAA-ready infrastructure',
    helper: 'Built with privacy and compliance first',
    accent: 'text-amber-600',
    bgAccent: 'bg-amber-500/10 group-hover:bg-amber-500/20'
  }
];

export function MetricsSection() {
  const device = useDevice();
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const metricsContainerRef = useRef<HTMLDivElement>(null);

  // Metrics carousel intersection observer
  useEffect(() => {
    const container = metricsContainerRef.current;
    if (!container || !device.isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(container.children).indexOf(entry.target);
            if (index !== -1) setActiveMetricIndex(index);
          }
        });
      },
      { root: container, threshold: 0.5 }
    );

    Array.from(container.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [device.isMobile]);

  return (
    <section className="relative overflow-hidden border-y bg-gradient-to-b from-muted/30 via-background to-muted/30 px-4 py-16 sm:px-6 md:py-20" id="metrics">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-10 text-center md:mb-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            Proven Results
          </div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Trusted by <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">thousands</span> on their wellness journey
          </h2>
        </div>
        
        {/* Mobile: Swipeable Carousel */}
        <div className="md:hidden">
          <div 
            ref={metricsContainerRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="region"
            aria-label="Impact metrics carousel"
          >
            {METRICS.map(({ icon: Icon, value, label, helper, accent, bgAccent }, index) => (
              <Card 
                key={label}
                className="group min-w-[80vw] flex-shrink-0 snap-center border-none bg-background/80 backdrop-blur-sm shadow-lg ring-1 ring-border/40 transition-all duration-300 hover:shadow-xl hover:ring-primary/30"
                role="group"
                aria-roledescription="slide"
                aria-label={`Metric ${index + 1} of ${METRICS.length}: ${label}`}
              >
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <span className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${bgAccent} ${accent} transition-all duration-300`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <p className={`text-5xl font-bold ${accent}`}>{value}</p>
                  <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-foreground">{label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Enhanced Pagination Dots */}
          <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Metrics pagination">
            {METRICS.map((stat, index) => (
              <button
                key={stat.label}
                role="tab"
                aria-selected={activeMetricIndex === index}
                aria-label={`View metric ${index + 1} of ${METRICS.length}: ${stat.label}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeMetricIndex === index 
                    ? 'w-8 bg-primary shadow-md shadow-primary/30' 
                    : 'w-2.5 bg-muted-foreground/25 hover:bg-muted-foreground/40'
                }`}
                onClick={() => {
                  const container = metricsContainerRef.current;
                  const child = container?.children[index] as HTMLElement;
                  child?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                  });
                  setActiveMetricIndex(index);
                }}
              />
            ))}
          </div>
        </div>

        {/* Tablet: 2x2 Grid */}
        <div className="hidden grid-cols-2 gap-6 md:grid lg:hidden">
          {METRICS.map(({ icon: Icon, value, label, helper, accent, bgAccent }) => (
            <Card key={label} className="group border-none bg-background/80 backdrop-blur-sm shadow-lg ring-1 ring-border/40 transition-all duration-300 hover:shadow-xl hover:ring-primary/30 hover:-translate-y-1">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <span className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${bgAccent} ${accent} transition-all duration-300`}>
                  <Icon className="h-7 w-7" />
                </span>
                <p className={`text-4xl font-bold ${accent}`}>{value}</p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-foreground">{label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: 4-column Grid */}
        <div className="hidden gap-6 lg:grid lg:grid-cols-4">
          {METRICS.map(({ icon: Icon, value, label, helper, accent, bgAccent }) => (
            <Card key={label} className="group relative overflow-hidden border-none bg-background/80 backdrop-blur-sm shadow-lg ring-1 ring-border/40 transition-all duration-300 hover:shadow-xl hover:ring-primary/30 hover:-translate-y-1">
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              <CardContent className="relative flex flex-col items-center p-8 text-center">
                <span className={`mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${bgAccent} ${accent} transition-all duration-300 group-hover:scale-110`}>
                  <Icon className="h-8 w-8" />
                </span>
                <p className={`text-5xl font-bold ${accent}`}>{value}</p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-foreground">{label}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
