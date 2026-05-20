import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Edit3, Loader2, StickyNote } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

import {
  therapistQueryKeys,
  TherapistNoteRecord,
  useTherapistClientNotesQuery,
} from './hooks/useTherapistQueries';
import { therapistFetch } from './useTherapistAuth';

type TherapistNote = TherapistNoteRecord;

interface NoteDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  narrative: string;
  tags: string;
}

interface SessionNotesListProps {
  clientId?: string | null;
  refreshSignal?: number;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function parseTags(raw?: string | null) {
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    return raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [] as string[];
}

export function SessionNotesList({ clientId, refreshSignal = 0 }: SessionNotesListProps) {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading: loading } = useTherapistClientNotesQuery(clientId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteDraft>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    narrative: '',
    tags: '',
  });

  useEffect(() => {
    if (clientId) {
      queryClient.invalidateQueries({ queryKey: therapistQueryKeys.clientNotes(clientId) });
    }
  }, [clientId, queryClient, refreshSignal]);

  const startEditing = (note: TherapistNote) => {
    setEditingId(note.id);
    setDraft({
      subjective: note.subjective || '',
      objective: note.objective || '',
      assessment: note.assessment || '',
      plan: note.plan || '',
      narrative: note.narrative || '',
      tags: parseTags(note.tags).join(', '),
    });
  };

  const saveEdit = async (noteId: string) => {
    try {
      const tags = draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const response = await therapistFetch(`/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify({
          subjective: draft.subjective || null,
          objective: draft.objective || null,
          assessment: draft.assessment || null,
          plan: draft.plan || null,
          narrative: draft.narrative || null,
          tags,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update note');
      }

      toast.success('Note updated');
      setEditingId(null);
      if (clientId) {
        await queryClient.invalidateQueries({ queryKey: therapistQueryKeys.clientNotes(clientId) });
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update note');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-emerald-600" /> Saved Notes
        </CardTitle>
        <CardDescription>Review and refine previous session notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!clientId ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Select a client to view historical notes.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No notes yet for this client.
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingId === note.id;
            const tags = parseTags(note.tags);

            return (
              <div key={note.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{note.format} Note</p>
                    <p className="text-xs text-muted-foreground">Created {formatDateTime(note.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {note.booking?.preferredDate ? (
                      <Badge variant="outline" className="text-[11px]">
                        <CalendarDays className="mr-1 h-3 w-3" />
                        {new Date(note.booking.preferredDate).toLocaleDateString()}
                        {note.booking.preferredTime ? ` at ${note.booking.preferredTime}` : ''}
                      </Badge>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => startEditing(note)}>
                      <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Subjective</Label>
                        <Textarea
                          value={draft.subjective}
                          onChange={(event) => setDraft((prev) => ({ ...prev, subjective: event.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Objective</Label>
                        <Textarea
                          value={draft.objective}
                          onChange={(event) => setDraft((prev) => ({ ...prev, objective: event.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Assessment</Label>
                        <Textarea
                          value={draft.assessment}
                          onChange={(event) => setDraft((prev) => ({ ...prev, assessment: event.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Plan</Label>
                        <Textarea
                          value={draft.plan}
                          onChange={(event) => setDraft((prev) => ({ ...prev, plan: event.target.value }))}
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Narrative</Label>
                      <Textarea
                        value={draft.narrative}
                        onChange={(event) => setDraft((prev) => ({ ...prev, narrative: event.target.value }))}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tags</Label>
                      <Input
                        value={draft.tags}
                        onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => saveEdit(note.id)}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {note.subjective ? (
                      <p>
                        <span className="font-medium">S:</span> {note.subjective}
                      </p>
                    ) : null}
                    {note.objective ? (
                      <p>
                        <span className="font-medium">O:</span> {note.objective}
                      </p>
                    ) : null}
                    {note.assessment ? (
                      <p>
                        <span className="font-medium">A:</span> {note.assessment}
                      </p>
                    ) : null}
                    {note.plan ? (
                      <p>
                        <span className="font-medium">P:</span> {note.plan}
                      </p>
                    ) : null}
                    {note.narrative ? (
                      <p>
                        <span className="font-medium">Narrative:</span> {note.narrative}
                      </p>
                    ) : null}

                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {tags.map((tag) => (
                          <Badge key={`${note.id}-${tag}`} variant="secondary" className="text-[10px] uppercase tracking-wide">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
