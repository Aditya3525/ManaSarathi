import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, StickyNote } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { NoteFormat, THERAPIST_NOTE_FORMATS } from '../constants/therapist';

import { therapistQueryKeys } from './hooks/useTherapistQueries';
import { therapistFetch } from './useTherapistAuth';

interface SessionNotesEditorProps {
  clientId?: string | null;
  onSaved?: () => void;
}

function emptyStateFor(format: NoteFormat) {
  return {
    format,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    narrative: '',
    tags: '',
  };
}

function looksLikeBookingId(value: string) {
  return /^[a-z0-9]{20,40}$/i.test(value);
}

export function SessionNotesEditor({ clientId, onSaved }: SessionNotesEditorProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [form, setForm] = useState(emptyStateFor('SOAP'));

  const trimmedPayload = useMemo(() => {
    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      format: form.format,
      subjective: form.subjective.trim(),
      objective: form.objective.trim(),
      assessment: form.assessment.trim(),
      plan: form.plan.trim(),
      narrative: form.narrative.trim(),
      bookingId: bookingId.trim() || null,
      tags,
    };
  }, [bookingId, form]);

  const validate = () => {
    if (!clientId) {
      return 'Select a client before creating a note';
    }

    if (trimmedPayload.format === 'NARRATIVE' && !trimmedPayload.narrative) {
      return 'Narrative note content is required';
    }

    if (
      trimmedPayload.format !== 'NARRATIVE' &&
      !trimmedPayload.subjective &&
      !trimmedPayload.objective &&
      !trimmedPayload.assessment &&
      !trimmedPayload.plan
    ) {
      return 'Add at least one SOAP section before saving';
    }

    if (trimmedPayload.bookingId && !looksLikeBookingId(trimmedPayload.bookingId)) {
      return 'Linked booking ID looks invalid. Leave it empty unless you are linking a real booking.';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    try {
      setSaving(true);

      const response = await therapistFetch(`/clients/${clientId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          format: trimmedPayload.format,
          subjective: trimmedPayload.subjective || null,
          objective: trimmedPayload.objective || null,
          assessment: trimmedPayload.assessment || null,
          plan: trimmedPayload.plan || null,
          narrative: trimmedPayload.narrative || null,
          bookingId: trimmedPayload.bookingId,
          tags: trimmedPayload.tags,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save note');
      }

      toast.success('Session note saved');
      setForm(emptyStateFor(form.format));
      setBookingId('');

      if (clientId) {
        await queryClient.invalidateQueries({ queryKey: therapistQueryKeys.clientNotes(clientId) });
      }

      onSaved?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-emerald-600" /> Session Notes
        </CardTitle>
        <CardDescription>Create structured progress notes for the selected client.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Note format</Label>
            <Select
              value={form.format}
              onValueChange={(value) => setForm((prev) => ({ ...prev, format: value as NoteFormat }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose note format" />
              </SelectTrigger>
              <SelectContent>
                {THERAPIST_NOTE_FORMATS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Linked booking ID (optional)</Label>
            <Input
              value={bookingId}
              onChange={(event) => setBookingId(event.target.value)}
              placeholder="Attach note to a booking"
            />
          </div>
        </div>

        {form.format === 'NARRATIVE' ? (
          <div className="space-y-1.5">
            <Label>Narrative</Label>
            <Textarea
              value={form.narrative}
              onChange={(event) => setForm((prev) => ({ ...prev, narrative: event.target.value }))}
              rows={8}
              placeholder="Document key observations, interventions, response, and next actions"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Subjective</Label>
              <Textarea
                value={form.subjective}
                onChange={(event) => setForm((prev) => ({ ...prev, subjective: event.target.value }))}
                rows={3}
                placeholder="Client-reported concerns and experiences"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Objective</Label>
              <Textarea
                value={form.objective}
                onChange={(event) => setForm((prev) => ({ ...prev, objective: event.target.value }))}
                rows={3}
                placeholder="Observable behavior and measurable indicators"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assessment</Label>
              <Textarea
                value={form.assessment}
                onChange={(event) => setForm((prev) => ({ ...prev, assessment: event.target.value }))}
                rows={3}
                placeholder="Clinical interpretation and progress assessment"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Textarea
                value={form.plan}
                onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value }))}
                rows={3}
                placeholder="Interventions and follow-up plan"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Tags (optional)</Label>
          <Input
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="progress, anxiety, sleep"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(emptyStateFor(form.format));
              setBookingId('');
            }}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={saving || !clientId}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
