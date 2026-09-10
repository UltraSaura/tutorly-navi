import React from 'react';
import type { ExplanationLearningUnit } from '@/types/learning-unit';
import { getAgeLearningConfig } from '@/config/ageConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ExplanationUnitRendererProps {
  unit: ExplanationLearningUnit;
  onComplete?: (result?: unknown) => void;
}

export function ExplanationUnitRenderer({
  unit,
  onComplete,
}: ExplanationUnitRendererProps) {
  const ageConfig = getAgeLearningConfig(unit.ageBand);
  const { conceptCard, practiceCard, prompt } = unit.payload;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header Prompt */}
      {prompt && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold text-sm mb-1">
            <BookOpen className="w-4 h-4 text-[#12C6A0]" />
            <span>Question / Objectif</span>
          </div>
          <p className="text-foreground text-sm font-medium">{prompt}</p>
        </div>
      )}

      {/* Concept Card (Card 1: Intuition & Concept) */}
      {conceptCard && (
        <Card className="border shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="text-lg">🌟</span>
              <span>{conceptCard.title || 'Comprendre le concept'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p
              className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
              style={{ fontSize: `${ageConfig.bodySize}px` }}
            >
              {conceptCard.content}
            </p>
            {conceptCard.intuition && (
              <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 text-xs text-sky-900 dark:text-sky-200 font-medium">
                💡 {conceptCard.intuition}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Practice / Example Card (Card 2: Application) */}
      {practiceCard && (
        <Card className="border shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{practiceCard.title || 'Exemple guidé'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p
              className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
              style={{ fontSize: `${ageConfig.bodySize}px` }}
            >
              {practiceCard.content}
            </p>
            {practiceCard.exampleProblem && (
              <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs font-mono text-amber-900 dark:text-amber-200">
                {practiceCard.exampleProblem}
              </div>
            )}
            {practiceCard.steps && practiceCard.steps.length > 0 && (
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-1">
                {practiceCard.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Action */}
      {onComplete && (
        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => onComplete({ understood: true })}
            className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white font-medium gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>J’ai compris !</span>
          </Button>
        </div>
      )}
    </div>
  );
}
