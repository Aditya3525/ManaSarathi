import { Mail, Search, UserRound } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';

import { useTherapistClientsQuery } from './hooks/useTherapistQueries';

interface ClientsListProps {
  selectedClientId?: string | null;
  onSelectClient: (userId: string) => void;
}

export function ClientsList({ selectedClientId, onSelectClient }: ClientsListProps) {
  const [search, setSearch] = useState('');

  const { data: clients = [], isLoading: loading, error } = useTherapistClientsQuery();
  const errorMessage = error instanceof Error ? error.message : null;

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.email, client.approach || '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [clients, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Profiles</CardTitle>
        <CardDescription>Search and open detailed client wellness summaries.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients by name, email, or approach"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No matching clients found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const isSelected = selectedClientId === client.id;

              return (
                <div
                  key={client.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isSelected ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-emerald-600" />
                        <p className="font-semibold text-sm">{client.name}</p>
                        {client.approach ? (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            {client.approach}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {client.email}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{client.bookingCount} bookings</span>
                        <span>{client.completedSessions} completed</span>
                        <span>Last status: {client.lastStatus}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => onSelectClient(client.id)}
                    >
                      {isSelected ? 'Viewing' : 'View Client'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
