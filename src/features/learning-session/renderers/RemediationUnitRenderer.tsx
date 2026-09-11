import React from 'react';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import type { RemediationLearningUnit } from '@/types/learning-unit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, ArrowRight, Sparkles } from 'lucide-react';

export interface RemediationUnitRendererProps {
  unit: RemediationLearningUnit;
  onComplete?: (result?: unknown) => void;
}

export function RemediationUnitRenderer({
  unit,
  onComplete,
}: RemediationUnitRendererProps) {
  const ui = useInterfaceTranslation();
  const { targetProblemContext, diagnosedGap, remediationAction } = unit.payload;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Context banner explaining the remediation handoff */}
      <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sky-800 dark:text-sky-200 font-semibold text-sm mb-1">
          <Stethoscope className="w-4 h-4 text-sky-600" />
          <span>{ui("Pause Remédiation :")} {diagnosedGap.prerequisiteName}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {ui("Sur le problème")} <strong className="text-foreground">{targetProblemContext}</strong> : {diagnosedGap.reason}
        </p>
      </div>

      {/* Remediation Action Display */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{ui("Étape de remédiation ciblée")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {remediationAction.type === 'mini_explanation' && (
            <div className="bg-muted/50 p-4 rounded-xl text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {remediationAction.content}
            </div>
          )}

          {remediationAction.type === 'manipulative_drill' && (
            <div className="p-6 bg-muted/30 border border-dashed rounded-xl text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{ui("Exercice de manipulation ciblé")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {ui("Tool: {{tool}}", { tool: remediationAction.manipulativeType })}
              </p>
            </div>
          )}

          {remediationAction.type === 'skill_sprint' && (
            <div className="p-6 bg-emerald-50/40 dark:bg-emerald-950/20 border border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
              <p className="font-medium text-foreground">
                {ui("Skill sprint: {{engine}}", { engine: remediationAction.activity.engine })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {ui("Review the prerequisite ({{minutes}} min)", { minutes: remediationAction.activity.estimatedMinutes ?? 3 })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action to complete remediation and resume original task */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onComplete?.({ remediated: true, prerequisiteId: diagnosedGap.prerequisiteConceptId })}
          className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white font-medium gap-2"
        >
          <span>{ui("Reprendre le devoir")}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
