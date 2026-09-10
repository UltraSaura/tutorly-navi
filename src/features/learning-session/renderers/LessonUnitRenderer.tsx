import React from 'react';
import type { LessonLearningUnit } from '@/types/learning-unit';
import { getAgeLearningConfig } from '@/config/ageConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export interface LessonUnitRendererProps {
  unit: LessonLearningUnit;
  onComplete?: (result?: unknown) => void;
}

export function LessonUnitRenderer({
  unit,
  onComplete,
}: LessonUnitRendererProps) {
  const ageConfig = getAgeLearningConfig(unit.ageBand);
  const { title, explanation, example, commonMistakes, vocabulary } = unit.payload;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Lesson Header */}
      <div className="border-b border-border pb-3">
        <h2
          className="font-bold text-foreground flex items-center gap-2"
          style={{ fontSize: `${ageConfig.titleSize}px` }}
        >
          <BookOpen className="w-5 h-5 text-[#12C6A0]" />
          <span>{title}</span>
        </h2>
      </div>

      {/* Vocabulary definitions if available */}
      {vocabulary && vocabulary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {vocabulary.map((vocab, i) => (
            <div
              key={i}
              className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 text-xs"
            >
              <span className="font-bold text-sky-900 dark:text-sky-200">{vocab.term} : </span>
              <span className="text-muted-foreground">{vocab.definition}</span>
            </div>
          ))}
        </div>
      )}

      {/* Explanation Card */}
      <Card className="border shadow-sm border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-foreground">
            📖 Ce qu’il faut savoir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: `${ageConfig.bodySize}px` }}
          >
            {explanation}
          </p>
        </CardContent>
      </Card>

      {/* Example Card */}
      {example && (
        <Card className="border shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground">
              💡 Exemple
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/60 border border-border/80 rounded-lg p-3 text-sm font-medium text-foreground whitespace-pre-wrap">
              {example}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Mistakes */}
      {commonMistakes && commonMistakes.length > 0 && (
        <Card className="border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Attention aux pièges courants</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {commonMistakes.map((item, idx) => {
              if (typeof item === 'string') {
                return (
                  <div key={idx} className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span>{item}</span>
                  </div>
                );
              }
              return (
                <div key={idx} className="text-xs space-y-0.5 text-amber-800 dark:text-amber-300">
                  <div className="font-semibold">⚠️ {item.mistake}</div>
                  <div className="text-muted-foreground pl-4">👉 {item.why}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Completion Button */}
      {onComplete && (
        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => onComplete({ lessonRead: true })}
            className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white font-medium gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Continuer la leçon</span>
          </Button>
        </div>
      )}
    </div>
  );
}
