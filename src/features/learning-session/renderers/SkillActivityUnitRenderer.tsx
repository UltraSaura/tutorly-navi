import React from 'react';
import type { SkillActivityLearningUnit } from '@/types/learning-unit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Sparkles, CheckCircle2 } from 'lucide-react';

export interface SkillActivityUnitRendererProps {
  unit: SkillActivityLearningUnit;
  onComplete?: (result?: unknown) => void;
}

/**
 * SkillActivityUnitRenderer acts as the boundary for Skills Lab activities.
 * Actual activity engines (fact_sprint, sentence_builder, timeline, etc.)
 * will be registered and implemented in Phase 9+.
 */
export function SkillActivityUnitRenderer({
  unit,
  onComplete,
}: SkillActivityUnitRendererProps) {
  const { activity, sessionTargetCount, timeLimitSeconds } = unit.payload;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-[#12C6A0]" />
            <span>Activité d’entraînement : {activity.engine}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
            <span>⏱️ {activity.estimatedMinutes ?? 3} min</span>
            <span>⭐ Niveau {activity.difficulty}</span>
            {sessionTargetCount && <span>🎯 {sessionTargetCount} items</span>}
            {timeLimitSeconds && <span>⌛ {timeLimitSeconds}s</span>}
          </div>

          <div className="p-6 bg-emerald-50/40 dark:bg-emerald-950/20 border border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
            <Sparkles className="w-6 h-6 text-[#12C6A0] mx-auto mb-2" />
            <p className="font-semibold text-foreground text-sm">
              Session d’entraînement ({activity.engine})
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les moteurs de jeu Skills Lab seront activés dans la Phase 9.
            </p>
          </div>
        </CardContent>
      </Card>

      {onComplete && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onComplete({ completedActivity: activity.id })}
            className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white font-medium gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider l’activité</span>
          </Button>
        </div>
      )}
    </div>
  );
}
