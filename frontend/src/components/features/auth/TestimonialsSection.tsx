import { BadgeCheck, ChevronLeft, ChevronRight, Heart, MessageCircle, Pause, Play, Shield, Star } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useDevice } from '../../../hooks/use-device';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  rating: number;
  avatar?: string;
  verified?: boolean;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'This app helped me understand my anxiety patterns and gave me practical tools to manage them. The AI chat feature feels like having a therapist available anytime.',
    name: 'Sarah Mitchell',
    role: 'Product Designer',
    rating: 5,
    verified: true
  },
  {
    quote: 'The personalized meditation recommendations were spot-on. I\'ve never been more consistent with my mindfulness practice. The progress tracking keeps me motivated.',
    name: 'David Chen',
    role: 'Software Engineer',
    rating: 5,
    verified: true
  },
  {
    quote: 'Finally, a wellbeing app that doesn\'t feel clinical. The interface is beautiful and the guidance feels genuinely caring. It\'s become part of my daily routine.',
    name: 'Maria Rodriguez',
    role: 'Teacher',
    rating: 5,
    verified: true
  }
];

export function TestimonialsSection() {
  const device = useDevice();
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const testimonialsContainerRef = useRef<HTMLDivElement>(null);

  // Testimonials carousel intersection observer
  useEffect(() => {
    const container = testimonialsContainerRef.current;
    if (!container || !device.isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(container.children).indexOf(entry.target);
            if (index !== -1) setActiveTestimonialIndex(index);
          }
        });
      },
      { root: container, threshold: 0.5 }
    );

    Array.from(container.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [device.isMobile]);

  // Auto-slide testimonials carousel with pause control
  useEffect(() => {
    if (!device.isMobile || isPaused) return;

    const interval = setInterval(() => {
      const container = testimonialsContainerRef.current;
      if (!container) return;

      setActiveTestimonialIndex((prev) => {
        const next = (prev + 1) % TESTIMONIALS.length;
        const child = container.children[next] as HTMLElement;
        if (child) {
          container.scrollTo({ left: child.offsetLeft - container.offsetLeft, behavior: 'smooth' });
        }
        return next;
      });
    }, 5000); // Increased from 2s to 5s for better readability

    return () => clearInterval(interval);
  }, [device.isMobile, isPaused]);

  const handlePrevious = () => {
    const newIndex = Math.max(0, activeTestimonialIndex - 1);
    const container = testimonialsContainerRef.current;
    const child = container?.children[newIndex] as HTMLElement;
    if (child && container) {
      container.scrollTo({ left: child.offsetLeft - container.offsetLeft, behavior: 'smooth' });
    }
    setActiveTestimonialIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(TESTIMONIALS.length - 1, activeTestimonialIndex + 1);
    const container = testimonialsContainerRef.current;
    const child = container?.children[newIndex] as HTMLElement;
    if (child && container) {
      container.scrollTo({ left: child.offsetLeft - container.offsetLeft, behavior: 'smooth' });
    }
    setActiveTestimonialIndex(newIndex);
  };

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-background via-accent/5 to-background px-4 py-16 sm:px-6 md:py-20 lg:py-28"
      id="testimonials"
      aria-labelledby="testimonials-heading"
    >
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 -left-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-12 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 space-y-4 text-center md:mb-16">
          <Badge variant="secondary" className="mb-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Heart className="mr-1.5 inline-block h-3.5 w-3.5" aria-hidden="true" />
            User Stories
          </Badge>
          <h2 id="testimonials-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Trusted by <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">thousands</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base font-medium text-foreground/70 sm:text-lg lg:text-xl">
            Real stories from members who rediscovered calm, confidence, and joy in their daily lives.
          </p>
        </div>

        {/* Mobile: Enhanced Swipeable Cards */}
        <div className="md:hidden">
          <div
            ref={testimonialsContainerRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="region"
            aria-label="Testimonials carousel"
            aria-roledescription="carousel"
          >
            {TESTIMONIALS.map(({ quote, name, role, rating, verified }, index) => (
              <div
                key={name}
                className="min-w-[90vw] flex-shrink-0 snap-center"
                role="group"
                aria-roledescription="slide"
                aria-label={`Testimonial ${index + 1} of ${TESTIMONIALS.length}`}
              >
                <Card className="group relative overflow-hidden border-2 border-primary/10 bg-background/95 shadow-lg backdrop-blur hover:border-primary/20 hover:shadow-xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  <CardContent className="relative space-y-5 p-6">
                    {/* Quote Icon */}
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageCircle className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="flex items-center gap-1" aria-label={`${rating} star rating`}>
                        {Array.from({ length: rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
                        ))}
                      </div>
                    </div>

                    {/* Quote - constrained width */}
                    <blockquote className="max-w-[60ch] text-base leading-relaxed text-foreground">
                      &ldquo;{quote}&rdquo;
                    </blockquote>

                    {/* Author with Avatar and Verified Badge */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
                        {name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          {verified && (
                            <span className="inline-flex items-center gap-0.5 text-primary" title="Verified user">
                              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Verified user</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground/60">{role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Enhanced Navigation */}
          <div className="mt-8 flex flex-col items-center gap-4">
            {/* Progress Bar */}
            <div className="w-full max-w-xs">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 ease-out"
                  style={{ width: `${((activeTestimonialIndex + 1) / TESTIMONIALS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-2"
                onClick={handlePrevious}
                aria-label="Previous testimonial"
                disabled={activeTestimonialIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Pause/Play Button */}
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-2"
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? 'Resume carousel' : 'Pause carousel'}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>

              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                <span className="text-sm font-semibold text-foreground">{activeTestimonialIndex + 1}</span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">{TESTIMONIALS.length}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-2"
                onClick={handleNext}
                aria-label="Next testimonial"
                disabled={activeTestimonialIndex === TESTIMONIALS.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            Testimonial {activeTestimonialIndex + 1} of {TESTIMONIALS.length}
            {isPaused ? ' - Paused' : ' - Auto-playing'}
          </div>
        </div>

        {/* Tablet+: Enhanced 3-column Grid */}
        <div className="hidden gap-8 md:grid md:grid-cols-3" role="list">
          {TESTIMONIALS.map(({ quote, name, role, rating, verified }) => (
            <Card
              key={name}
              className="group h-full border-2 border-primary/10 bg-background/90 shadow-md transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:-translate-y-1"
              role="listitem"
            >
              <CardContent className="flex h-full flex-col space-y-4 p-6 text-left">
                {/* Stars */}
                <div className="flex items-center gap-1 text-primary" aria-label={`${rating} star rating`}>
                  {Array.from({ length: rating }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
                  ))}
                </div>

                {/* Quote - constrained width */}
                <blockquote className="flex-1 max-w-[60ch] text-base leading-relaxed text-foreground/80 italic">
                  &ldquo;{quote}&rdquo;
                </blockquote>

                {/* Author with Avatar and Verified Badge */}
                <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
                    {name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      {verified && (
                        <span className="inline-flex items-center text-primary" title="Verified user">
                          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Verified user</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60">{role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators - Enhanced */}
        <div className="mt-12 md:mt-16 lg:mt-20">
          {/* Security Badge */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>Data protected with bank-level encryption</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary lg:text-4xl">5,000+</p>
              <p className="mt-1 text-sm font-medium text-foreground/60">Active Members</p>
            </div>
            <div className="h-12 w-px bg-border" aria-hidden="true" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-3xl font-bold text-primary lg:text-4xl">4.8</p>
                <Star className="h-6 w-6 fill-primary text-primary" aria-hidden="true" />
              </div>
              <p className="mt-1 text-sm font-medium text-foreground/60">Average Rating</p>
            </div>
            <div className="h-12 w-px bg-border" aria-hidden="true" />
            <div className="text-center">
              <p className="text-3xl font-bold text-primary lg:text-4xl">92%</p>
              <p className="mt-1 text-sm font-medium text-foreground/60">Feel Better in 2 Weeks</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
