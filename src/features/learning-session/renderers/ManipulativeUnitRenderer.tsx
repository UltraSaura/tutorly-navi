import React from 'react';
import type { ManipulativeLearningUnit } from '@/types/learning-unit';
import { ObjectCounter } from '@/components/kids/ObjectCounter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, HelpCircle, Layers } from 'lucide-react';

export interface ManipulativeUnitRendererProps {
  unit: ManipulativeLearningUnit;
  onComplete?: (result?: unknown) => void;
}

export function ManipulativeUnitRenderer({
  unit,
  onComplete,
}: ManipulativeUnitRendererProps) {
  const { manipulativeType, instructions, initialState } = unit.payload;

  // Support currently available manipulatives (ObjectCounter)
  if (manipulativeType === 'object_counter') {
    const a = typeof initialState?.a === 'number' ? initialState.a : 5;
    const b = typeof initialState?.b === 'number' ? initialState.b : 3;
    const operation = (initialState?.operation as '+' | '-' | '×') ?? '+';
    const emoji = typeof initialState?.emoji === 'string' ? initialState.emoji : '🍎';

    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <Card className="border shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#12C6A0]" />
              <span>Manipulation interactive</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructions && (
              <p className="text-sm text-muted-foreground font-medium">{instructions}</p>
            )}

            <div className="bg-muted/40 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px]">
              <ObjectCounter
                a={a}
                b={b}
                operation={operation}
                emoji={emoji}
                autoPlay={true}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onComplete?.({ manipulated: true })}
            className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white font-medium gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Terminer la manipulation</span>
          </Button>
        </div>
      </div>
    );
  }

  // Safe fallback for future registered manipulatives (NumberLine, ArrayBuilder, etc. - Phase 11)
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card className="border border-border/80 bg-muted/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <span>Outil de manipulation : {manipulativeType}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {instructions && (
            <p className="text-sm text-muted-foreground">{instructions}</p>
          )}
          <div className="p-6 bg-background border border-dashed rounded-xl text-center text-sm text-muted-foreground">
            <p className="font-medium">Outil interactif en cours de préparation</p>
            <p className="text-xs text-muted-foreground mt-1">
              (Module {manipulativeType} — disponible prochainement)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onComplete?.({ skipped: true })}
          className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white font-medium gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Continuer</span>
        </Button>
      </div>
    </div>
  );
}
