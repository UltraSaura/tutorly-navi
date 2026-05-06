import React from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { GroupedRetryPractice, ProblemSubmission } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { useUserContext } from '@/hooks/useUserContext';
import { extractExpressionFromText } from '@/utils/mathStepper/parser';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import { GeometryDiagram } from './GeometryDiagram';

interface GroupedProblemExplanationModalProps {
  problem: ProblemSubmission | null;
  practice: GroupedRetryPractice | null;
  loading: boolean;
  error: string | null;
  rowId?: string;
  onClose: () => void;
  onRetry?: () => void;
}

const selectedEvaluatedRows = (problem: ProblemSubmission, rowId?: string) =>
  problem.sections.flatMap(section => section.rows.filter(row =>
    row.selected && row.evaluation && (!rowId || row.id === rowId)
  ));

const isPureArithmeticProblem = (text: string): boolean => {
  const lower = text.toLowerCase();
  const conceptualKeywords = [
    'heure', 'minute', 'départ', 'arrivée', 'durée', 'temps',
    'hour', 'time', 'clock', 'am', 'pm',
    'périmètre', 'aire', 'surface', 'triangle', 'rectangle',
    'perimeter', 'area', 'angle', 'circle', 'cercle',
    'km', 'mètre', 'litre', 'gramme', 'meter', 'kilogram',
    '€', '$', 'prix', 'coût', 'monnaie', 'price', 'cost',
  ];
  if (conceptualKeywords.some(keyword => lower.includes(keyword))) return false;
  if (/\d{1,2}:\d{2}/.test(text)) return false;
  return /\d+\s*[+\-×÷*/]\s*\d+/.test(text);
};

const GroupedProblemExplanationModal = ({
  problem,
  practice,
  loading,
  error,
  rowId,
  onClose,
  onRetry,
}: GroupedProblemExplanationModalProps) => {
  const { language } = useLanguage();
  const { userContext } = useUserContext();
  if (!problem) return null;

  const fallbackRows = selectedEvaluatedRows(problem, rowId);
  const practiceExpression = practice?.similarProblem
    ? extractExpressionFromText(practice.similarProblem)
    : null;
  const shouldShowInteractiveStepper = !!(
    practice?.similarProblem &&
    practiceExpression &&
    userContext?.student_level &&
    isUnder11YearsOld(userContext.student_level) &&
    isPureArithmeticProblem(practice.similarProblem)
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground">
            {language === 'fr' ? 'Explication' : 'Explanation'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6" aria-label="Close">
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              {language === 'fr'
                ? 'Préparation de l’explication avec un exemple différent...'
                : 'Preparing an explanation with a different example...'}
            </div>
          )}

          {!loading && practice && (
            <>
              <section className="rounded-lg border bg-muted/40 p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {language === 'fr' ? 'Idée à travailler' : 'Concept to practice'}
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{practice.concept}</p>
              </section>

              <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="text-sm font-semibold text-blue-950 mb-2">
                  {language === 'fr' ? 'Exemple similaire' : 'Similar problem'}
                </h4>
                {practice.diagram && (
                  <div className="mb-3">
                    <GeometryDiagram diagram={practice.diagram} />
                  </div>
                )}
                <p className="text-sm text-blue-950 whitespace-pre-wrap">{practice.similarProblem}</p>
              </section>

              {shouldShowInteractiveStepper && (
                <section className="rounded-lg border bg-card p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    {language === 'fr' ? 'Pratique interactive' : 'Interactive practice'}
                  </h4>
                  <CompactMathStepper expression={practiceExpression} className="text-sm" />
                </section>
              )}

              <section className="rounded-lg border bg-card p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {language === 'fr' ? 'Méthode' : 'Method'}
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{practice.method}</p>
              </section>

              {practice.commonMistake && (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-sm font-semibold text-amber-950 mb-2">
                    {language === 'fr' ? 'Attention' : 'Watch out'}
                  </h4>
                  <p className="text-sm text-amber-950 whitespace-pre-wrap">{practice.commonMistake}</p>
                </section>
              )}

              <section className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h4 className="text-sm font-semibold text-green-950 mb-2">
                  {language === 'fr' ? 'À toi de réessayer' : 'Now try again'}
                </h4>
                <p className="text-sm text-green-950 whitespace-pre-wrap">{practice.retryPrompt}</p>
              </section>
            </>
          )}

          {!loading && error && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {language === 'fr'
                      ? 'L’explication n’a pas pu être générée.'
                      : 'The explanation could not be generated.'}
                  </p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>

              {onRetry && (
                <Button type="button" onClick={onRetry} className="w-full">
                  {language === 'fr' ? 'Réessayer de générer l’explication' : 'Try generating the explanation again'}
                </Button>
              )}

              {fallbackRows.length > 0 && (
                <section className="rounded-lg border bg-muted/40 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    {language === 'fr' ? 'Correction déjà disponible' : 'Available correction'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr'
                      ? 'La correction exacte reste visible sur la carte. Cet encadré est seulement un secours si l’explication échoue.'
                      : 'The exact correction remains visible on the card. This section is only a fallback if the explanation fails.'}
                  </p>
                  {fallbackRows.map(row => (
                    <div key={row.id} className="rounded-md border bg-card p-3 text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.label}</Badge>
                        <span className="font-medium">
                          {language === 'fr' ? 'Affirmation sélectionnée' : 'Selected assertion'}
                        </span>
                      </div>
                      {row.evaluation?.feedback && (
                        <p className="text-muted-foreground whitespace-pre-wrap">{row.evaluation.feedback}</p>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupedProblemExplanationModal;
