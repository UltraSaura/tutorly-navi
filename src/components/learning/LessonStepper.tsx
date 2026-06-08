import { useRef, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, BookOpen, Lightbulb, AlertCircle } from 'lucide-react';
import { QuestionCard } from '@/components/learning/QuestionCard';
import { useAuth } from '@/context/AuthContext';
import { showXpToast } from '@/components/game/XpToast';
import { trackLearningInteraction } from '@/services/learningAnalytics';
import type { LessonContent } from '@/types/learning';
import type { Question } from '@/types/quiz-bank';

// ── Types ──────────────────────────────────────────────────
interface LessonStepperProps {
  topicId: string;
  topicName: string;
  lessonContent: LessonContent | null;
  inlineBankId: string | null;
  onSexercer: () => void;
  subjectId?: string | null;
}

// ── Helpers ────────────────────────────────────────────────

// Extract the first N complete sentences from the explanation
// to show as "En bref" bullet points
function extractKeyPoints(text: string, max: number): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 180)
    .slice(0, max);
}

// Split the example text into progressive reveal steps.
// Tries numbered steps first ("1." or "Étape 1:"),
// then paragraph breaks, then sentence chunks.
function parseExampleSteps(example: string): string[] {
  const numbered = example
    .split(/(?:^|\n)(?:\d+\.\s|Étape\s*\d+\s*:)/i)
    .map(s => s.trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered;

  const paragraphs = example.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;

  // Last resort: split into up to 3 sentence groups
  const sentences = example.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [example];
  const size = Math.ceil(sentences.length / 3);
  return [0, 1, 2]
    .map(i => sentences.slice(i * size, (i + 1) * size).join(' '))
    .filter(Boolean);
}

// ── Sub-components ─────────────────────────────────────────

// Progress indicator: coloured dots that widen on the active step
function ProgressDots({ current, total }: { current: number; total: number }) {
  const stepLabels = ['Concept', 'Quiz', 'Exemple', 'Erreurs', 'Terminé'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 16px 10px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 8,
            borderRadius: 4,
            width: i === current ? 20 : 8,
            background: i <= current ? '#12C6A0' : '#EAECEF',
            transition: 'all 0.25s ease',
          }}
        />
      ))}
      <span style={{ fontSize: 10, color: '#667085', marginLeft: 6, fontFamily: 'Poppins, sans-serif' }}>
        {stepLabels[current]} · {current + 1}/{total}
      </span>
    </div>
  );
}

// The main teal "Suivant" button used across steps
function SuivantButton({ onClick, label = 'Suivant →', disabled = false }: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '13px',
        borderRadius: 14,
        border: 'none',
        background: disabled ? '#EAECEF' : '#12C6A0',
        color: disabled ? '#B4B2A9' : '#0F172A',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────
export function LessonStepper({
  topicId,
  topicName,
  lessonContent,
  inlineBankId,
  onSexercer,
  subjectId,
}: LessonStepperProps) {
  const TOTAL_STEPS = 5;
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const [actualMinutes, setActualMinutes] = useState<number | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<any>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  // ── Fetch one question from this topic's quiz bank ────────
  // We look for a bank assigned to this topic with no video trigger
  // (meaning it is always available, not locked behind a video).
  const { data: inlineQuestion } = useQuery<Question | null>({
    queryKey: ['lesson-inline-q', topicId, inlineBankId],
    queryFn: async () => {
      if (!inlineBankId) return null;
      const { data: rows } = await supabase
        .from('quiz_bank_questions')
        .select('payload, position')
        .eq('bank_id', inlineBankId)
        .order('position');

      if (!rows || rows.length === 0) return null;

      const questions = rows.map((row) => row.payload as unknown as Question);
      return questions[Math.floor(Math.random() * questions.length)] ?? null;
    },
    enabled: !!inlineBankId,
    staleTime: Infinity,
  });

  // ── Derived data from lesson_content ─────────────────────
  const explanation = lessonContent?.explanation ?? '';
  const exampleText = lessonContent?.example ?? '';
  const mistakes = lessonContent?.common_mistakes ?? [];
  const keyPoints = explanation ? extractKeyPoints(explanation, 4) : [];
  const exampleSteps = exampleText ? parseExampleSteps(exampleText) : [];

  const recordLessonCompletion = useCallback(async () => {
    if (!user?.id) return;

    const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setActualMinutes(Math.max(1, Math.ceil(timeSpentSeconds / 60)));

    try {
      const { data: existing } = await supabase
        .from('user_learning_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('progress_type', 'lesson_completed')
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('user_learning_progress')
          .insert({
            user_id: user.id,
            topic_id: topicId,
            subject_id: subjectId ?? null,
            progress_type: 'lesson_completed',
            progress_percentage: 100,
            time_spent_seconds: timeSpentSeconds,
          });

        if (!error) {
          showXpToast(5, 'Leçon terminée !');
        }
      }

      trackLearningInteraction({
        studentId: user.id,
        eventType: 'lesson_completed',
        topicId,
        metadata: { timeSpentSeconds, isFirstCompletion: !existing },
      });
    } catch (err) {
      console.warn('[LessonStepper] Failed to record completion:', err);
    }
  }, [user?.id, topicId, subjectId]);

  // ── Step navigation helpers ───────────────────────────────
  const goNext = useCallback(() => {
    const nextStep = Math.min(currentStep + 1, TOTAL_STEPS - 1);

    if (nextStep === 4) {
      recordLessonCompletion();
    }

    setCurrentStep(nextStep);
    // Reset step-local state when leaving that step
    if (currentStep === 1) {
      setQuizAnswer(null);
      setQuizSubmitted(false);
    }
    if (currentStep === 2) {
      setRevealedCount(0);
    }
  }, [currentStep, recordLessonCompletion]);

  const resetLesson = useCallback(() => {
    setCurrentStep(0);
    setQuizAnswer(null);
    setQuizSubmitted(false);
    setRevealedCount(0);
    setActualMinutes(null);
    startTimeRef.current = Date.now();
  }, []);

  // ── Render ────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >

        {/* ═══════════════════════════════════════════════════
            STEP 0 — Concept intro
            Shows "En bref" bullet points and the full
            lesson explanation text.
        ════════════════════════════════════════════════════ */}
        {currentStep === 0 && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProgressDots current={0} total={TOTAL_STEPS} />

            {/* En bref strip */}
            {keyPoints.length > 0 && (
              <div style={{ background: '#F2FBF8', borderRadius: 14, padding: 14, border: '0.5px solid #9FE1CB' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', letterSpacing: '0.06em', margin: '0 0 8px', fontFamily: 'Poppins, sans-serif' }}>
                  EN BREF
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {keyPoints.map((point, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#085041', lineHeight: 1.6 }}>
                      <span style={{ color: '#12C6A0', fontWeight: 800, flexShrink: 0 }}>✦</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Le cours card */}
            <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#E2F7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen className="h-3.5 w-3.5" style={{ color: '#085041' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
                  Le cours
                </p>
              </div>
              <p style={{ fontSize: 15, color: '#374151', margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                {explanation || 'Leçon en cours de préparation.'}
              </p>
            </div>

            <SuivantButton onClick={goNext} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 1 — Inline quiz
            Shows one question from the topic's quiz bank.
            The student must submit an answer before Suivant
            appears. Correct/incorrect shown via QuestionCard's
            submittedAnswer prop. Correct answer never revealed.
        ════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProgressDots current={1} total={TOTAL_STEPS} />

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF3DC', borderRadius: 999, padding: '4px 12px', border: '0.5px solid #FAC775', width: 'fit-content' }}>
              <Zap className="h-3 w-3" style={{ color: '#B45309' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', fontFamily: 'Poppins, sans-serif' }}>
                Petit test — vérifie ta compréhension !
              </span>
            </div>

            {inlineQuestion ? (
              <>
                <div style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${quizSubmitted ? '#EAECEF' : '#EAECEF'}`, padding: 14 }}>
                  <QuestionCard
                    question={inlineQuestion}
                    onChange={setQuizAnswer}
                    submittedAnswer={quizSubmitted ? quizAnswer : undefined}
                    isCorrect={undefined}
                  />
                </div>

                {!quizSubmitted ? (
                  <button
                    onClick={() => {
                      if (quizAnswer !== null && quizAnswer !== undefined) {
                        setQuizSubmitted(true);
                      }
                    }}
                    disabled={quizAnswer === null || quizAnswer === undefined}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                      background: (quizAnswer !== null && quizAnswer !== undefined) ? '#12C6A0' : '#EAECEF',
                      color: (quizAnswer !== null && quizAnswer !== undefined) ? '#0F172A' : '#B4B2A9',
                      fontSize: 14, fontWeight: 700,
                      cursor: (quizAnswer !== null && quizAnswer !== undefined) ? 'pointer' : 'not-allowed',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    Valider
                  </button>
                ) : (
                  <SuivantButton onClick={goNext} />
                )}
              </>
            ) : (
              // No quiz bank assigned yet — skip gracefully
              <>
                <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                    Quiz non disponible pour ce sujet.
                  </p>
                </div>
                <SuivantButton onClick={goNext} />
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 2 — Interactive example
            The example text is split into steps. Each step
            is hidden until the student taps "Révéler".
            Suivant only unlocks after all steps revealed.
        ════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProgressDots current={2} total={TOTAL_STEPS} />

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF3DC', borderRadius: 999, padding: '3px 10px', border: '0.5px solid #FAC775', width: 'fit-content' }}>
              <Lightbulb className="h-3 w-3" style={{ color: '#B45309' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', fontFamily: 'Poppins, sans-serif' }}>
                Exemple interactif
              </span>
            </div>

            {exampleSteps.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {exampleSteps.map((step, idx) => {
                    const isRevealed = idx < revealedCount;
                    return (
                      <div
                        key={idx}
                        style={{
                          background: isRevealed ? '#EAF3DE' : '#F3F6FA',
                          border: `0.5px solid ${isRevealed ? '#9FE1CB' : '#EAECEF'}`,
                          borderRadius: 12,
                          padding: '10px 14px',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{
                            background: isRevealed ? '#9FE1CB' : '#EAECEF',
                            color: isRevealed ? '#085041' : '#9CA3AF',
                            fontSize: 10, fontWeight: 700, padding: '2px 8px',
                            borderRadius: 999, flexShrink: 0, marginTop: 2,
                            transition: 'all 0.3s ease',
                          }}>
                            {idx + 1}
                          </span>
                          <p style={{
                            fontSize: 12,
                            color: isRevealed ? '#374151' : '#9CA3AF',
                            margin: 0,
                            lineHeight: 1.65,
                            transition: 'color 0.3s ease',
                          }}>
                            {isRevealed ? step : '· · ·'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {revealedCount < exampleSteps.length ? (
                  <button
                    onClick={() => setRevealedCount(c => Math.min(c + 1, exampleSteps.length))}
                    style={{
                      width: '100%', padding: 12, borderRadius: 12,
                      border: '1.5px solid #12C6A0', background: 'white',
                      color: '#085041', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    Révéler l'étape {revealedCount + 1} →
                  </button>
                ) : (
                  <SuivantButton onClick={goNext} />
                )}
              </>
            ) : (
              // No example content — skip gracefully
              <>
                <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Exemple non disponible.</p>
                </div>
                <SuivantButton onClick={goNext} />
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 3 — Common mistakes
            Shows each mistake as a red-numbered card with
            the optional "why" explanation below.
        ════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProgressDots current={3} total={TOTAL_STEPS} />

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FCEBEB', borderRadius: 999, padding: '3px 10px', border: '0.5px solid #F7C1C1', width: 'fit-content' }}>
              <AlertCircle className="h-3 w-3" style={{ color: '#A32D2D' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#A32D2D', fontFamily: 'Poppins, sans-serif' }}>
                Erreurs fréquentes
              </span>
            </div>

            {mistakes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mistakes.map((mistake, idx) => {
                  const m = mistake as any;
                  const text = typeof mistake === 'string'
                    ? mistake
                    : m?.mistake || m?.tip || '';
                  const why = typeof mistake === 'object' && mistake !== null
                    ? m?.why ?? null
                    : null;
                  return (
                    <div
                      key={idx}
                      style={{ background: 'white', borderRadius: 12, border: '0.5px solid #EAECEF', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}
                    >
                      <span style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, flexShrink: 0, marginTop: 1 }}>
                        {idx + 1}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: '0 0 3px', lineHeight: 1.5 }}>
                          {text}
                        </p>
                        {why && (
                          <p style={{ fontSize: 11, color: '#667085', margin: 0, lineHeight: 1.5 }}>
                            {why}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Aucune erreur fréquente listée.</p>
              </div>
            )}

            <SuivantButton onClick={goNext} label="Voir le résultat →" />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 4 — Completion screen
            Trophy + stats + two CTAs:
            - S'exercer (primary, navigates to practice)
            - Recommencer (secondary, resets to step 0)
        ════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <ProgressDots current={4} total={TOTAL_STEPS} />

            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#F2FBF8', border: '1.5px solid #12C6A0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy className="h-10 w-10" style={{ color: '#12C6A0' }} />
            </div>

            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', fontFamily: 'Poppins, sans-serif' }}>
                Leçon terminée !
              </h2>
              <p style={{ fontSize: 13, color: '#667085', margin: 0 }}>
                {topicName}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, width: '100%', maxWidth: 280 }}>
              <div style={{ background: '#F2FBF8', borderRadius: 12, padding: '10px 8px', border: '0.5px solid #9FE1CB', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#085041', margin: '0 0 2px', fontFamily: 'Poppins, sans-serif' }}>
                  {actualMinutes ?? '—'} min
                </p>
                <p style={{ fontSize: 10, color: '#0F6E56', margin: 0 }}>Durée</p>
              </div>
              <div style={{ background: '#FAEEDA', borderRadius: 12, padding: '10px 8px', border: '0.5px solid #FAC775', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#633806', margin: '0 0 2px', fontFamily: 'Poppins, sans-serif' }}>+5 XP</p>
                <p style={{ fontSize: 10, color: '#854F0B', margin: 0 }}>Gagné</p>
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={onSexercer}
                style={{
                  width: '100%', padding: 14, borderRadius: 14, border: 'none',
                  background: '#12C6A0', color: '#0F172A', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Zap className="h-4 w-4" />
                S'exercer sur {topicName}
              </button>

              <button
                onClick={resetLesson}
                style={{
                  width: '100%', padding: 12, borderRadius: 12,
                  border: '1.5px solid #EAECEF', background: 'white',
                  color: '#667085', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                }}
              >
                Recommencer la leçon
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </AnimatePresence>
  );
}
