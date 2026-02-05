import { ArrowRight, CheckCircle, Play, Shield, Sparkles } from 'lucide-react';
import React from 'react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface HeroSectionProps {
  onStartJourney: () => void;
  onSignUp: () => void;
  onDemo?: () => void;
}

export function HeroSection({ onStartJourney, onSignUp, onDemo }: HeroSectionProps) {
  return (
    <section 
      className="relative overflow-hidden bg-gradient-to-br from-background via-muted/30 to-accent/20 px-6 py-16 md:py-20 lg:py-28"
      aria-labelledby="hero-heading"
    >
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-1/2 -right-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
      </div>
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-background/80 to-transparent lg:block" aria-hidden="true" />
      
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        {/* Left Column - Text Content */}
        <div className="space-y-8 lg:space-y-10">
          <div className="space-y-5 lg:space-y-6">
            <Badge 
              variant="secondary" 
              className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm hover:shadow-md transition-all hover:scale-105"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
              New: Mini-IPIP personality insights
            </Badge>
            
            {/* Headline - Enhanced typography for WCAG AA */}
            <h1 
              id="hero-heading"
              className="text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl"
            >
              <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                MaanaSarathi
              </span>
              <span className="mt-2 block text-[0.85em] font-semibold text-foreground/90">
                Your personal wellbeing companion
              </span>
            </h1>
            
            {/* Subheading - Improved contrast and size */}
            <p className="max-w-xl text-base font-medium leading-relaxed text-foreground/80 sm:text-lg lg:text-xl">
              Pair clinically grounded assessments with daily micro-practices, reflective journaling, and an empathetic AI guide who meets you exactly where you are.
            </p>
          </div>

          {/* Feature checklist - Improved readability */}
          <ul className="grid gap-3 text-sm font-medium text-foreground/70 sm:grid-cols-2 sm:text-base" role="list">
            <li className="flex items-start gap-2.5">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
              <span>Evidence-based assessments (GAD-7, Mini-IPIP, PHQ-9)</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
              <span>Personalized daily plan with breathwork & journaling</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
              <span>Clinician-reviewed, culturally mindful content</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
              <span>Secure data sharing with your care team</span>
            </li>
          </ul>

          {/* CTA Buttons - Enhanced styling for conversions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button 
              size="lg" 
              className="group min-h-[52px] rounded-xl bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-lg" 
              onClick={onStartJourney}
            >
              Start your free 7-day plan
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="group min-h-[52px] rounded-xl border-2 border-primary/40 px-7 py-4 text-base font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-lg" 
              onClick={onDemo || onSignUp}
            >
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              See a demo
            </Button>
          </div>

          {/* Trust indicators - Enhanced visibility */}
          <div className="space-y-3 border-t border-border/50 pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Data secure & encrypted • Trusted by teams at
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/70">
              <span className="font-semibold text-foreground transition-colors hover:text-primary">Mindful Care</span>
              <span className="text-foreground/40" aria-hidden="true">•</span>
              <span className="font-semibold text-foreground transition-colors hover:text-primary">Wellness Institute</span>
              <span className="text-foreground/40" aria-hidden="true">•</span>
              <span className="font-semibold text-foreground transition-colors hover:text-primary">Serenity Health</span>
            </div>
          </div>
        </div>

        {/* Right Column - Hero Image */}
        <div className="relative" aria-hidden="true">
          <picture>
            <source
              srcSet="https://images.unsplash.com/photo-1687180948607-9ba1dd045e10?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxtJTIwbWVkaXRhdGlvbiUyMHdlbGxuZXNzfGVufDF8fHx8MTc1NjcxMDg4Nnww&ixlib=rb-4.1.0&q=80&w=800 800w, https://images.unsplash.com/photo-1687180948607-9ba1dd045e10?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxtJTIwbWVkaXRhdGlvbiUyMHdlbGxuZXNzfGVufDF8fHx8MTc1NjcxMDg4Nnww&ixlib=rb-4.1.0&q=80&w=1080 1080w"
              sizes="(max-width: 768px) 100vw, 50vw"
              type="image/webp"
            />
            <img
              src="https://images.unsplash.com/photo-1687180948607-9ba1dd045e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxtJTIwbWVkaXRhdGlvbiUyMHdlbGxuZXNzfGVufDF8fHx8MTc1NjcxMDg4Nnww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Person practicing mindful meditation in a serene natural setting – MaanaSarathi wellness companion helps you find calm"
              className="h-[400px] w-full rounded-3xl object-cover shadow-2xl lg:h-[500px]"
              loading="eager"
              width={1080}
              height={500}
              decoding="async"
            />
          </picture>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-primary/10 to-transparent" />
          
          {/* Testimonial overlay */}
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-background/85 p-4 shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-6">
            <blockquote>
              <p className="text-sm font-medium text-foreground sm:text-base">
                &ldquo;The app is like having a compassionate coach in my pocket.&rdquo;
              </p>
              <footer className="mt-1 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  P
                </div>
                <cite className="text-xs text-muted-foreground not-italic sm:text-sm">
                  Priya, Product Designer • <span className="text-primary">Verified user</span>
                </cite>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
