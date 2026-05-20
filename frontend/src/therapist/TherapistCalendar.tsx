import { CalendarClock, CheckCircle2, Clock3 } from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

interface CalendarBooking {
  id: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  userEmail: string;
  user?: { name?: string | null };
}

interface TherapistCalendarProps {
  bookings: CalendarBooking[];
}

function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getBookingDate(booking: CalendarBooking) {
  if (booking.preferredDate) {
    const preferred = new Date(booking.preferredDate);
    if (!Number.isNaN(preferred.getTime())) {
      return preferred;
    }
  }

  return new Date(booking.createdAt);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

export function TherapistCalendar({ bookings }: TherapistCalendarProps) {
  const upcoming = useMemo(() => {
    const now = toDateOnly(new Date());

    return bookings
      .filter((booking) => {
        const date = toDateOnly(getBookingDate(booking));
        return date >= now && booking.status !== 'CANCELLED';
      })
      .sort((a, b) => getBookingDate(a).getTime() - getBookingDate(b).getTime());
  }, [bookings]);

  const grouped = useMemo(() => {
    const bucket = new Map<string, CalendarBooking[]>();

    for (const booking of upcoming) {
      const date = getBookingDate(booking);
      const key = toDateOnly(date).toISOString();
      const current = bucket.get(key) || [];
      current.push(booking);
      bucket.set(key, current);
    }

    return Array.from(bucket.entries()).map(([key, values]) => ({
      key,
      date: new Date(key),
      values,
    }));
  }, [upcoming]);

  const pendingCount = bookings.filter((booking) => booking.status === 'PENDING').length;
  const confirmedCount = bookings.filter((booking) => booking.status === 'CONFIRMED').length;
  const completedCount = bookings.filter((booking) => booking.status === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Pending sessions</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Confirmed sessions</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{confirmedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Completed sessions</p>
            <p className="mt-1 text-2xl font-semibold text-blue-700">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-emerald-600" /> Upcoming Calendar
          </CardTitle>
          <CardDescription>View upcoming bookings grouped by day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {grouped.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No upcoming sessions found.
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.key} className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-semibold">{formatDayLabel(group.date)}</p>
                <div className="space-y-2">
                  {group.values.map((booking) => (
                    <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
                      <div>
                        <p className="text-sm font-medium">{booking.user?.name || booking.userEmail}</p>
                        <p className="text-xs text-muted-foreground">{booking.userEmail}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.preferredTime ? (
                          <Badge variant="outline" className="text-[11px]">
                            <Clock3 className="mr-1 h-3 w-3" /> {booking.preferredTime}
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className={
                            booking.status === 'CONFIRMED'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : booking.status === 'PENDING'
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-blue-300 bg-blue-50 text-blue-700'
                          }
                        >
                          {booking.status === 'COMPLETED' ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : null}
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
