import { CheckCircle2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Input } from '../../../ui/input';

interface GroundingChecklistProps {
  title?: string;
  steps?: string[];
  onComplete?: () => void;
}

type GroundingGroup = {
  key: string;
  label: string;
  count: number;
};

const defaultGroups: GroundingGroup[] = [
  { key: 'see', label: '5 things you can SEE', count: 5 },
  { key: 'touch', label: '4 things you can TOUCH', count: 4 },
  { key: 'hear', label: '3 things you can HEAR', count: 3 },
  { key: 'smell', label: '2 things you can SMELL', count: 2 },
  { key: 'taste', label: '1 thing you can TASTE', count: 1 },
];

export function GroundingChecklist({ title = '5-4-3-2-1 Grounding', steps, onComplete }: GroundingChecklistProps) {
  const groups = useMemo(() => {
    if (!steps || steps.length < 5) {
      return defaultGroups;
    }

    return defaultGroups.map((group, index) => ({
      ...group,
      label: steps[index] || group.label,
    }));
  }, [steps]);

  const [values, setValues] = useState<Record<string, string[]>>(() => {
    return groups.reduce<Record<string, string[]>>((acc, group) => {
      acc[group.key] = Array.from({ length: group.count }, () => '');
      return acc;
    }, {});
  });
  const [reaction, setReaction] = useState<string | null>(null);

  const completedCount = useMemo(() => {
    return groups.reduce((sum, group) => {
      const filled = (values[group.key] || []).filter((entry) => entry.trim().length > 0).length;
      return sum + filled;
    }, 0);
  }, [groups, values]);

  const totalCount = groups.reduce((sum, group) => sum + group.count, 0);
  const isComplete = completedCount >= totalCount;

  return (
    <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Move slowly through each sense. You do not need perfect answers, only present ones.
        </p>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((completedCount / totalCount) * 100))}%` }}
          />
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2 rounded-lg border border-border/70 bg-background/80 p-3">
              <h4 className="text-sm font-medium">{group.label}</h4>
              <div className="grid gap-2">
                {Array.from({ length: group.count }).map((_, index) => (
                  <Input
                    key={`${group.key}-${index}`}
                    value={(values[group.key] || [])[index] || ''}
                    onChange={(event) => {
                      setValues((prev) => {
                        const current = [...(prev[group.key] || [])];
                        current[index] = event.target.value;
                        return {
                          ...prev,
                          [group.key]: current,
                        };
                      });
                    }}
                    placeholder={`Notice ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {isComplete && (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="text-sm font-medium flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Well done. How do you feel now?
            </p>
            <div className="flex flex-wrap gap-2">
              {['Calmer 😌', 'A bit better 🙂', 'Still tense 😟'].map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={reaction === option ? 'default' : 'outline'}
                  onClick={() => {
                    setReaction(option);
                    onComplete?.();
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GroundingChecklist;
