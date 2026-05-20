import type { LucideIcon } from 'lucide-react';
import { Heart, LogOut, Menu, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';

interface TherapistShellNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
}

interface TherapistShellProps {
  therapist: { name: string; email?: string | null; credential?: string | null } | null;
  onLogout: () => void;
  navItems: TherapistShellNavItem[];
  activeItem: string;
  onSelect: (value: string) => void;
  children: React.ReactNode;
}

export function TherapistShell({
  therapist,
  onLogout,
  navItems,
  activeItem,
  onSelect,
  children
}: TherapistShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderNav = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = item.value === activeItem;
        return (
          <Button
            key={item.value}
            type="button"
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3 text-sm',
              isActive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-l-2 border-emerald-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              onSelect(item.value);
              setMobileOpen(false);
            }}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
            {item.badge ? (
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {item.badge}
              </span>
            ) : null}
          </Button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/40 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20">
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" aria-modal="true" role="dialog">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-72 overflow-y-auto bg-background shadow-xl border-r">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-600" />
                <p className="font-semibold text-sm">Therapist Portal</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="px-3 py-4 space-y-4">
              {renderNav()}
              <Button
                variant="outline"
                className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                onClick={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen min-w-0 max-w-7xl flex-col px-4 py-4 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl border bg-background/90 shadow-sm backdrop-blur">
            <div className="rounded-t-2xl border-b bg-gradient-to-r from-emerald-600/15 to-teal-500/10 px-4 py-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold">Therapist Portal</p>
                  <p className="text-xs text-muted-foreground">Clinical workspace</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 px-3 py-4">
              {renderNav()}
              <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                <p className="font-semibold text-sm">{therapist?.name || 'Therapist'}</p>
                {therapist?.email ? <p className="text-muted-foreground break-all">{therapist.email}</p> : null}
                {therapist?.credential ? <p className="text-muted-foreground">{therapist.credential}</p> : null}
              </div>
              <Button
                variant="outline"
                className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-4 lg:space-y-6">
          <header className="rounded-2xl border bg-background/90 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Therapist Dashboard</p>
                  <p className="text-lg font-semibold text-foreground">Care management workspace</p>
                </div>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
