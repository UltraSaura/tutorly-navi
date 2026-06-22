import { useState, useCallback, useRef, useEffect, useMemo, createContext, useContext, type ReactNode, type TouchEvent as RTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, BookOpen, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUserCurriculumProfile } from '@/hooks/useUserCurriculumProfile';
import { showXpToast } from '@/components/game/XpToast';
import { trackLearningInteraction } from '@/services/learningAnalytics';
import { TopicVisual } from './visuals/TopicVisual';
import { QuestionCard } from './QuestionCard';
import { getAgeConfig } from './lesson/ageConfig';
import { useLessonResume } from '@/hooks/useLessonResume';
import type { LessonContent, LessonExample, LessonExampleStep } from '@/types/learning';
import type { Question } from '@/types/quiz-bank';
import { evaluateQuestion } from '@/utils/quizEvaluation';

// ── Persistent bottom action bar ──────────────────────────────────────
// Each card renders its primary (and secondary) button(s) inside <LessonFooter>,
// which portals them into the single fixed bar at the bottom of the player. This
// keeps the button in the SAME screen position on every card (best-app pattern)
// while leaving each button's state/closures inside its own card.
const LessonFooterContext = createContext<HTMLElement | null>(null);

function LessonFooter({ children }: { children: ReactNode }) {
  const barEl = useContext(LessonFooterContext);
  // Until the bar mounts, render inline as a fallback so the CTA is never lost.
  if (!barEl) return <>{children}</>;
  return createPortal(children, barEl);
}

interface LessonCardPlayerProps {
  topicId: string;
  topicName: string;
  lessonContent: LessonContent | null;
  inlineBankId: string | null;
  onSexercer: () => void;
  subjectId?: string | null;
  // ── Level mode (driven by LessonLevelPath) ──────────────────────────
  // When `levelContent` is set, the player runs ONE level as a flat lesson:
  // no whole-lesson XP write (the path owns it), per-level localStorage resume,
  // and a level-aware completion card.
  levelContent?: LessonContent;
  levelIndex?: number;        // 0-based level position
  totalLevelsCount?: number;  // total levels in the topic (for "Niveau N/total" + isFinal)
  onLevelComplete?: () => void; // fired once when the level's flow reaches the end
  onExitToPath?: () => void;    // return to the path (complete-card button)
}

type CardType = 'intro' | 'vocabulary' | 'examples' | 'quiz' | 'mistake' | 'complete';

interface Card {
  type: CardType;
  label: string;
  stepIdx: number; // which level (step) this card draws its content from
}

// Flatten all progressive levels into one continuous forward sequence:
// for each level → concept → vocab? → example → teste-toi? → piège? ; then one final complete card.
function buildFlowCards(steps: LessonContent[], hasTopicQuiz: boolean): Card[] {
  const cards: Card[] = [];
  steps.forEach((content, i) => {
    cards.push({ type: 'intro', label: 'Leçon', stepIdx: i });
    if (content?.vocabulary?.length) cards.push({ type: 'vocabulary', label: 'Vocabulaire', stepIdx: i });
    if (content?.examples?.length || content?.example_steps?.length) cards.push({ type: 'examples', label: 'Exemple', stepIdx: i });
    // Per-level "Teste-toi": use the in-content quiz; for a single flat lesson, fall back to the topic bank.
    if (content?.quiz || (steps.length === 1 && hasTopicQuiz)) cards.push({ type: 'quiz', label: 'Teste-toi', stepIdx: i });
    if (content?.common_mistakes?.length) cards.push({ type: 'mistake', label: 'Piège', stepIdx: i });
  });
  cards.push({ type: 'complete', label: 'Terminé', stepIdx: Math.max(0, steps.length - 1) });
  return cards;
}

function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ height: 6, background: '#EAECEF', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(((current + 1) / total) * 100)}%`, height: '100%', background: '#12C6A0', borderRadius: 999, transition: 'width .35s ease' }} />
      </div>
      <p style={{ fontSize: 9, color: '#667085', margin: '2px 0 0', fontFamily: 'Poppins, sans-serif' }}>
        {label} · {current + 1}/{total}
      </p>
    </div>
  );
}

function CardBadge({ icon, label, color }: { icon: ReactNode; label: string; color: string }) {
  const configs: Record<string, { bg: string; border: string; text: string }> = {
    teal: { bg: '#F2FBF8', border: '#9FE1CB', text: '#085041' },
    amber: { bg: '#FFF3DC', border: '#FAC775', text: '#B45309' },
    purple: { bg: '#EDE9FE', border: '#A78BFA', text: '#5B21B6' },
    red: { bg: '#FCEBEB', border: '#F7C1C1', text: '#A32D2D' },
  };
  const c = configs[color] ?? configs.teal;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 999, padding: '3px 10px', width: 'fit-content' }}>
      {icon}
      <span style={{ fontSize: 10, fontWeight: 700, color: c.text, fontFamily: 'Poppins, sans-serif' }}>{label}</span>
    </div>
  );
}

function NextButton({ onClick, label = 'Suivant →', disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-primary-cta=""
      style={{
        width: '100%',
        padding: 13,
        borderRadius: 14,
        border: 'none',
        background: disabled ? '#EAECEF' : '#12C6A0',
        color: disabled ? '#B4B2A9' : '#0F172A',
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {label}
    </button>
  );
}

// Lightweight haptic feedback. Uses the web Vibration API (Android web/PWA);
// a no-op where unsupported (iOS Safari). Native iOS haptics would use @capacitor/haptics later.
export function buzz(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}

const CONFETTI_COLORS = ['#12C6A0', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];

// A short confetti burst + label, shown when a level is cleared or the lesson is finished.
export function CelebrationOverlay({ label }: { label: string }) {
  const pieces = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: (Math.random() * 2 - 1) * 150,
      rot: Math.random() * 540,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.12,
      size: 6 + Math.random() * 5,
    })),
  ).current;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: -20, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: 380, rotate: p.rot }}
          transition={{ duration: 1.3, delay: p.delay, ease: 'easeOut' }}
          style={{ position: 'absolute', top: '32%', width: p.size, height: p.size * 0.6, background: p.color, borderRadius: 2 }}
        />
      ))}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        style={{ background: '#0F172A', color: 'white', padding: '10px 18px', borderRadius: 999, fontWeight: 800, fontSize: 14, fontFamily: 'Poppins, sans-serif', display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
      >
        🎉 {label}
      </motion.div>
    </div>
  );
}

function IntroCard({
  topicName,
  lessonContent,
  onNext,
  visualSize,
  bodySize,
  compact = false,
  heading,
}: {
  topicName: string;
  lessonContent: LessonContent | null;
  onNext: () => void;
  visualSize: number;
  bodySize: number;
  compact?: boolean;   // levels 2+ : lighter header, no big topic visual
  heading?: string;    // override the H2 (e.g. the level name)
}) {
  const explanation = lessonContent?.explanation ?? '';
  const sentences = explanation.split(/(?<=[.!?])\s+/).filter(Boolean);
  const hookSentence = sentences[0] ?? explanation;
  const conceptSentences = sentences.slice(1, 4);

  // Concept points reveal one at a time so the idea is worked through, not scrolled past.
  const [revealed, setRevealed] = useState(1);
  const total = conceptSentences.length;
  const allRevealed = revealed >= total;

  const isFraction = /fraction|diviser|partager|moitié|tiers|quart/i.test(topicName);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<BookOpen className="h-3 w-3" />} label={compact ? 'On continue' : 'Nouvelle leçon'} color="teal" />
      <h2 style={{ fontSize: compact ? 16 : 18, fontWeight: 900, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', lineHeight: 1.25 }}>
        {heading ?? topicName}
      </h2>

      {/* Big topic visual — only on the first level (skipped on compact level intros) */}
      {!compact && (
        <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 14, display: 'flex', alignItems: 'center', justifyContent: isFraction ? 'flex-start' : 'center', gap: 14 }}>
          <TopicVisual topicName={topicName} total={isFraction ? 4 : 6} taken={isFraction ? 1 : 3} animated size={visualSize} />
          {isFraction && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#12C6A0', margin: 0, borderBottom: '2.5px solid #12C6A0', paddingBottom: 2, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>1</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1.2, fontFamily: 'Poppins, sans-serif' }}>4</p>
                </div>
                <div style={{ fontSize: 9, color: '#667085', lineHeight: 1.9 }}>← prises<br />← total</div>
              </div>
              <span style={{ fontSize: 9, color: '#12C6A0', fontWeight: 700 }}>= 1 part sur 4</span>
            </div>
          )}
        </div>
      )}

      {/* Hook - first sentence, big and teal */}
      <div style={{ background: '#F2FBF8', borderRadius: 12, border: '0.5px solid #9FE1CB', padding: '12px 14px' }}>
        <p style={{ fontSize: bodySize + 1, color: '#374151', margin: 0, lineHeight: 1.85, fontWeight: 600 }}>
          {hookSentence}
        </p>
      </div>

      {/* Concept - each sentence revealed one at a time as a numbered visual card */}
      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conceptSentences.slice(0, revealed).map((sentence, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'white', borderRadius: 12, border: '0.5px solid #EAECEF',
                padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: '#F2FBF8', border: '0.5px solid #9FE1CB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#12C6A0', marginTop: 2,
              }}>{i + 1}</span>
              <p style={{ fontSize: bodySize, color: '#374151', margin: 0, lineHeight: 1.85 }}>
                {sentence}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <LessonFooter>
      {total > 1 && !allRevealed ? (
        <button
          onClick={() => setRevealed((r) => Math.min(r + 1, total))}
          data-primary-cta=""
          style={{
            width: '100%', padding: 13, borderRadius: 14,
            border: '1.5px solid #9FE1CB', background: '#F2FBF8', color: '#085041',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          }}
        >
          Continuer ↓
        </button>
      ) : (
        <NextButton onClick={onNext} />
      )}
      </LessonFooter>
    </div>
  );
}

function VocabularyCard({
  vocabulary,
  onNext,
  bodySize = 14,
  isYoung = false,
}: {
  vocabulary: NonNullable<LessonContent['vocabulary']>;
  onNext: () => void;
  bodySize?: number;
  isYoung?: boolean;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const chipColors = [
    { bg: '#F2FBF8', border: '#9FE1CB', text: '#085041' },
    { bg: '#FFF3DC', border: '#FAC775', text: '#B45309' },
    { bg: '#FCEBEB', border: '#F7C1C1', text: '#A32D2D' },
    { bg: '#EDE9FE', border: '#A78BFA', text: '#5B21B6' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<span style={{ fontSize: 11 }}>📖</span>} label={`${vocabulary.length} mots à connaître`} color="purple" />
      <h2 style={{ fontSize: isYoung ? 18 : 16, fontWeight: isYoung ? 900 : 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
        {isYoung ? 'Apprends ces mots !' : 'Appuie sur chaque mot'}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vocabulary.map((item, i) => {
          const c = chipColors[i % chipColors.length];
          const isOpen = openIdx === i;
          return (
            <button
              key={i}
              onClick={() => setOpenIdx(isOpen ? null : i)}
              style={{
                width: '100%',
                background: isOpen ? c.bg : 'white',
                border: `1px solid ${isOpen ? c.border : '#EAECEF'}`,
                borderRadius: 12,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all .2s',
              }}
            >
              <span style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: c.text, flexShrink: 0 }}>
                {item.term}
              </span>
              <span style={{ flex: 1, fontSize: bodySize - 2, color: isOpen ? '#374151' : '#9CA3AF', lineHeight: 1.5, textAlign: 'left' }}>
                {isOpen ? item.definition : '· · ·'}
              </span>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: '#9CA3AF', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
          );
        })}
      </div>
      <LessonFooter><NextButton onClick={onNext} label="J'ai compris →" /></LessonFooter>
    </div>
  );
}

function ExamplesCard({
  topicName,
  examples,
  onNext,
  bodySize = 14,
  visualSize = 95,
  exampleCount = 3,
}: {
  topicName: string;
  examples: LessonExample[];
  onNext: () => void;
  bodySize?: number;
  visualSize?: number;
  exampleCount?: number;
}) {
  const [active, setActive] = useState(0);
  const shownExamples = examples.slice(0, exampleCount);
  const ex = shownExamples[active] ?? shownExamples[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<Zap className="h-3 w-3" />} label="Vois le pattern" color="amber" />
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
        La même règle, des chiffres différents
      </h2>

      <div style={{ display: 'flex', gap: 6 }}>
        {shownExamples.map((e, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 8,
              border: `1.5px solid ${i === active ? '#12C6A0' : '#EAECEF'}`,
              background: i === active ? '#F2FBF8' : 'white',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              color: i === active ? '#085041' : '#9CA3AF',
              fontFamily: 'Poppins, sans-serif',
              transition: 'all .15s',
            }}
          >
            {e.fraction ?? (e.taken != null && e.total != null ? `${e.taken}/${e.total}` : `Ex. ${i + 1}`)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {ex.taken != null && ex.total != null && (
            <div style={{ display: 'flex', justifyContent: 'center', background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 14 }}>
              <TopicVisual topicName={topicName} total={ex.total} taken={ex.taken} animated size={visualSize} />
            </div>
          )}
          <p style={{ fontSize: bodySize - 1, color: '#374151', margin: 0, lineHeight: 1.6 }}>
            {ex.context}
          </p>
          <div style={{ background: '#F2FBF8', borderRadius: 12, border: '0.5px solid #9FE1CB', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {ex.taken != null && ex.total != null && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#12C6A0', margin: 0, borderBottom: '2.5px solid #12C6A0', paddingBottom: 2, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
                  {ex.taken}
                </p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2, fontFamily: 'Poppins, sans-serif' }}>
                  {ex.total}
                </p>
              </div>
            )}
            <p style={{ fontSize: bodySize - 2, color: '#374151', margin: 0, lineHeight: 1.6, flex: 1 }}>
              {ex.explanation}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>
        Appuie sur chaque exemple pour voir le changement
      </p>
      <LessonFooter><NextButton onClick={onNext} /></LessonFooter>
    </div>
  );
}

// Worked example revealed one step at a time (Brilliant-style).
// Renders structured example_steps ({ label, line }) with a tap-to-reveal sequence.
function ExampleStepsCard({
  exampleSteps,
  context,
  onNext,
  bodySize = 14,
}: {
  exampleSteps: LessonExampleStep[];
  context?: string;
  onNext: () => void;
  bodySize?: number;
}) {
  const [revealed, setRevealed] = useState(1);
  const allRevealed = revealed >= exampleSteps.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<Zap className="h-3 w-3" />} label="Exemple résolu" color="amber" />
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
        Suis la résolution, étape par étape
      </h2>

      {context && (
        <div style={{ background: '#F2FBF8', borderRadius: 12, border: '0.5px solid #9FE1CB', padding: '11px 13px' }}>
          <p style={{ fontSize: bodySize - 1, color: '#374151', margin: 0, lineHeight: 1.7 }}>{context}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {exampleSteps.slice(0, revealed).map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            style={{ background: 'white', borderRadius: 12, border: '0.5px solid #EAECEF', padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: 10 }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: '#FFF3DC', border: '0.5px solid #FAC775',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#B45309', marginTop: 2,
            }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {s.label && (
                <p style={{ fontSize: 10, fontWeight: 700, color: '#B45309', margin: '0 0 3px', letterSpacing: '0.02em' }}>{s.label}</p>
              )}
              <p style={{ fontSize: bodySize, color: '#0F172A', margin: 0, lineHeight: 1.6, fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>{s.line}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <LessonFooter>
      {!allRevealed ? (
        <button
          onClick={() => setRevealed((r) => Math.min(r + 1, exampleSteps.length))}
          data-primary-cta=""
          style={{
            width: '100%', padding: 13, borderRadius: 14,
            border: '1.5px solid #FAC775', background: '#FFF3DC', color: '#B45309',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          }}
        >
          Étape suivante ↓
        </button>
      ) : (
        <NextButton onClick={onNext} />
      )}
      </LessonFooter>
    </div>
  );
}

function hasAnswer(question: Question | null | undefined, answer: any): boolean {
  if (!question) return false;
  if (question.kind === 'multi') return Array.isArray(answer) && answer.length > 0;
  if (question.kind === 'numeric' && (question as any).answerFormat === 'fraction') {
    return Boolean(answer?.numerator) && Boolean(answer?.denominator);
  }
  if (question.kind === 'match') return Array.isArray(answer) && answer.length > 0;
  if (question.kind === 'fill-expr') return answer && Object.keys(answer).length > 0;
  if (question.kind === 'ordering') return Array.isArray(answer) && answer.length > 0;
  return answer !== null && answer !== undefined && answer !== '';
}

function QuizCard({
  inlineBankId,
  topicId,
  onNext,
  presetQuestion,
}: {
  topicName?: string;
  inlineBankId?: string | null;
  topicId: string;
  onNext: () => void;
  presetQuestion?: Question | null;
}) {
  const [answer, setAnswer]   = useState<any>(null);
  const [correct, setCorrect] = useState(false);      // solved this card
  const [wrong, setWrong]     = useState(false);      // last attempt was wrong (showing nudge)
  const [attempts, setAttempts] = useState(0);

  // When the level carries its own quiz, use it directly; otherwise fetch from the topic bank.
  const { data: fetchedQuestion } = useQuery<Question | null>({
    queryKey: ['lesson-inline-q', topicId, inlineBankId],
    queryFn: async () => {
      if (!inlineBankId) return null;
      const { data: rows } = await supabase
        .from('quiz_bank_questions')
        .select('payload, position')
        .eq('bank_id', inlineBankId)
        .order('position');
      if (!rows?.length) return null;
      const qs = rows.map(r => r.payload as unknown as Question);
      return qs[Math.floor(Math.random() * qs.length)] ?? null;
    },
    enabled: !presetQuestion && !!inlineBankId,
    staleTime: Infinity,
  });
  const question = presetQuestion ?? fetchedQuestion;
  const hint = (question as any)?.hint as string | undefined;

  const handleValidate = () => {
    if (!hasAnswer(question, answer) || correct) return;
    const ok = question ? evaluateQuestion(question, answer) : true;
    if (ok) {
      setCorrect(true);
      setWrong(false);
      buzz([0, 35]);
    } else {
      setAttempts((a) => a + 1);
      setWrong(true);
      buzz([0, 25, 40, 25]);
    }
  };

  // Let the student change their answer → clears the wrong-nudge so they can re-validate.
  const handleRetry = () => setWrong(false);
  const onAnswerChange = (v: any) => { setAnswer(v); if (wrong) setWrong(false); };

  if (!question) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
        <CardBadge icon={<Zap className="h-3 w-3" />} label="Teste-toi" color="amber" />
        <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 24, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Quiz non disponible.</p>
        </div>
        <LessonFooter><NextButton onClick={onNext} /></LessonFooter>
      </div>
    );
  }

  const canValidate = hasAnswer(question, answer) && !correct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<Zap className="h-3 w-3" />} label="Teste-toi" color="amber" />

      {/* QuestionCard - interactive mode, never shows the correct answer */}
      <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 14, opacity: correct ? 0.85 : 1, pointerEvents: correct ? 'none' : 'auto' }}>
        <QuestionCard
          question={question}
          onChange={onAnswerChange}
          allowRetry={false}
          submittedAnswer={wrong ? answer : undefined}
          isCorrect={false}
          hideCorrect={true}
        />
      </div>

      {/* Success banner */}
      {correct && (
        <div style={{ borderRadius: 12, padding: '11px 14px', background: '#EAF3DE', border: '0.5px solid #9FE1CB', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎉</span>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, flex: 1, color: '#27500A' }}>Parfait ! Tu as bien compris.</p>
        </div>
      )}

      {/* Wrong → encouraging nudge + hint (never reveals the answer) */}
      {wrong && !correct && (
        <div style={{ borderRadius: 12, padding: '11px 14px', background: '#FFF3DC', border: '0.5px solid #FAC775', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18, lineHeight: 1.2 }}>💪</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#B45309' }}>
              Pas tout à fait — réessaie, tu y es presque !
            </p>
            {hint && (
              <p style={{ fontSize: 12, fontWeight: 500, margin: '4px 0 0', color: '#92500A', lineHeight: 1.5 }}>
                💡 Indice : {hint}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <LessonFooter>
      {correct ? (
        <NextButton onClick={onNext} />
      ) : wrong ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleRetry}
            data-primary-cta=""
            style={{
              width: '100%', padding: 13, borderRadius: 14, border: 'none',
              background: '#12C6A0', color: '#0F172A', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
            }}
          >
            Réessayer
          </button>
          {attempts >= 2 && (
            <button
              onClick={onNext}
              style={{
                width: '100%', padding: 8, borderRadius: 12, border: 'none', background: 'transparent',
                color: '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}
            >
              Continuer quand même →
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleValidate}
          disabled={!canValidate}
          data-primary-cta=""
          style={{
            width: '100%', padding: 13, borderRadius: 14, border: 'none',
            background: canValidate ? '#12C6A0' : '#EAECEF',
            color: canValidate ? '#0F172A' : '#B4B2A9',
            fontSize: 13, fontWeight: 700,
            cursor: canValidate ? 'pointer' : 'not-allowed',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Valider
        </button>
      )}
      </LessonFooter>
    </div>
  );
}

function getMistakeText(mistake: LessonContent['common_mistakes'][number] | undefined) {
  if (!mistake) return { text: '', why: '' };
  if (typeof mistake === 'string') return { text: mistake, why: '' };
  return { text: mistake.mistake, why: mistake.why };
}

function MistakeCard({ mistakes, onNext }: { mistakes: LessonContent['common_mistakes']; onNext: () => void }) {
  const first = mistakes[0];
  const { text, why } = getMistakeText(first);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<AlertCircle className="h-3 w-3" />} label="Erreur fréquente" color="red" />
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
        Attention à ce piège !
      </h2>
      <div style={{ background: '#FCEBEB', borderRadius: 14, border: '0.5px solid #F7C1C1', padding: '12px 14px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#A32D2D', margin: '0 0 6px', lineHeight: 1.5 }}>{text}</p>
        {why && <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>{why}</p>}
      </div>
      {mistakes.length > 1 && (() => {
        const second = mistakes[1];
        const { text: t2, why: w2 } = getMistakeText(second);
        return (
          <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #EAECEF', padding: '12px 14px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', lineHeight: 1.5 }}>{t2}</p>
            {w2 && <p style={{ fontSize: 12, color: '#667085', margin: 0, lineHeight: 1.6 }}>{w2}</p>}
          </div>
        );
      })()}
      <LessonFooter><NextButton onClick={onNext} label="Voir mon résultat →" /></LessonFooter>
    </div>
  );
}

function CompleteCard({
  topicName,
  actualMinutes,
  lessonContent,
  onSexercer,
  onReplay,
  title,
  xpLabel = '+5 XP',
  primaryLabel,
  onPrimary,
  onExitToPath,
}: {
  topicName: string;
  actualMinutes: number | null;
  lessonContent: LessonContent | null;
  onSexercer: () => void;
  onReplay: () => void;
  title?: string;            // level mode: "Niveau N terminé !"
  xpLabel?: string;
  primaryLabel?: string;     // level mode: "Continuer le parcours →"
  onPrimary?: () => void;    // overrides the default S'exercer primary
  onExitToPath?: () => void; // level mode: secondary "Retour au parcours"
}) {
  const recap = lessonContent?.vocabulary?.slice(0, 3).map((v) => v.term) ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '20px 16px', flex: 1 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: '#F2FBF8', border: '1.5px solid #12C6A0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trophy className="h-10 w-10" style={{ color: '#12C6A0' }} />
      </div>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', fontFamily: 'Poppins, sans-serif' }}>
          {title ?? 'Leçon terminée !'}
        </h2>
        <p style={{ fontSize: 13, color: '#667085', margin: 0 }}>{topicName}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, width: '100%', maxWidth: 280 }}>
        <div style={{ background: '#F2FBF8', borderRadius: 12, padding: '10px 8px', border: '0.5px solid #9FE1CB', textAlign: 'center' }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#085041', margin: '0 0 2px', fontFamily: 'Poppins, sans-serif' }}>
            {actualMinutes ?? '—'} min
          </p>
          <p style={{ fontSize: 10, color: '#0F6E56', margin: 0 }}>Durée</p>
        </div>
        <div style={{ background: '#FAEEDA', borderRadius: 12, padding: '10px 8px', border: '0.5px solid #FAC775', textAlign: 'center' }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#633806', margin: '0 0 2px', fontFamily: 'Poppins, sans-serif' }}>{xpLabel}</p>
          <p style={{ fontSize: 10, color: '#854F0B', margin: 0 }}>Gagné</p>
        </div>
      </div>
      {recap.length > 0 && (
        <div style={{ width: '100%', maxWidth: 280, background: '#F2FBF8', borderRadius: 12, border: '0.5px solid #9FE1CB', padding: '10px 12px', textAlign: 'left' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', margin: '0 0 6px' }}>Tu sais maintenant :</p>
          {recap.map((term, i) => (
            <p key={i} style={{ fontSize: 11, color: '#085041', margin: '0 0 3px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: '#12C6A0', fontWeight: 800, flexShrink: 0 }}>✦</span>
              {term}
            </p>
          ))}
        </div>
      )}
      <LessonFooter>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {onPrimary ? (
          <button onClick={onPrimary} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#12C6A0', color: '#0F172A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {primaryLabel ?? 'Continuer →'}
          </button>
        ) : (
          <button onClick={onSexercer} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#12C6A0', color: '#0F172A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Zap className="h-4 w-4" /> S'exercer sur {topicName}
          </button>
        )}
        {onExitToPath ? (
          <button onClick={onExitToPath} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #EAECEF', background: 'white', color: '#667085', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            Retour au parcours
          </button>
        ) : (
          <button onClick={onReplay} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #EAECEF', background: 'white', color: '#667085', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            Recommencer la leçon
          </button>
        )}
      </div>
      </LessonFooter>
    </div>
  );
}

// Continuous segmented progress: one segment per level, the current level fills as you advance.
function SegmentedProgress({ cards, cardIndex, totalLevels }: {
  cards: Card[];
  cardIndex: number;
  totalLevels: number;
}) {
  const curLevel = cards[cardIndex]?.stepIdx ?? 0;
  return (
    <div style={{ flex: 1, display: 'flex', gap: 4 }}>
      {Array.from({ length: totalLevels }).map((_, L) => {
        const levelCardIdxs = cards
          .map((c, idx) => ({ c, idx }))
          .filter((x) => x.c.stepIdx === L && x.c.type !== 'complete');
        const size = levelCardIdxs.length || 1;
        let fill = 0;
        if (curLevel > L) fill = 1;
        else if (curLevel === L) {
          const pos = levelCardIdxs.filter((x) => x.idx <= cardIndex).length;
          fill = Math.min(1, pos / size);
        }
        return (
          <div key={L} style={{ flex: 1, height: 6, background: '#EAECEF', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round(fill * 100)}%`, height: '100%', background: '#12C6A0', borderRadius: 999, transition: 'width .35s ease' }} />
          </div>
        );
      })}
    </div>
  );
}

// "Niveau N/total · {name}" banner shown as each new level begins.
function LevelBanner({ levelIdx, totalLevels, stepName }: {
  levelIdx: number;
  totalLevels: number;
  stepName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '0 16px 8px', padding: '7px 12px',
        background: '#F2FBF8', border: '0.5px solid #9FE1CB', borderRadius: 10,
      }}
    >
      <span style={{
        flexShrink: 0, fontSize: 10, fontWeight: 800, color: 'white',
        background: '#12C6A0', borderRadius: 999, padding: '2px 9px',
        fontFamily: 'Poppins, sans-serif',
      }}>
        Niveau {levelIdx + 1}/{totalLevels}
      </span>
      {stepName && (
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: '#085041', fontFamily: 'Poppins, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stepName}
        </span>
      )}
    </motion.div>
  );
}

export function LessonCardPlayer({
  topicId,
  topicName,
  lessonContent,
  inlineBankId,
  onSexercer,
  subjectId,
  levelContent,
  levelIndex,
  totalLevelsCount,
  onLevelComplete,
  onExitToPath,
}: LessonCardPlayerProps) {
  const levelMode = !!levelContent;
  const isFinalLevel = levelMode && totalLevelsCount != null && (levelIndex ?? 0) === totalLevelsCount - 1;
  const { user } = useAuth();
  const { profile } = useUserCurriculumProfile();
  const queryClient = useQueryClient();
  const startTimeRef = useRef<number>(Date.now());
  const [cardIndex, setCardIndex] = useState(0);
  const [actualMinutes, setActualMinutes] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [barEl, setBarEl] = useState<HTMLElement | null>(null); // bottom action bar node (footer portal target)
  const celebrateTimer = useRef<number | null>(null);

  const celebrate = useCallback((label: string, haptic: number[] = [0, 35, 30, 35]) => {
    buzz(haptic);
    setCelebration(label);
    if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current);
    celebrateTimer.current = window.setTimeout(() => setCelebration(null), 1700);
  }, []);
  useEffect(() => () => { if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current); }, []);
  const ageConfig = getAgeConfig(profile?.levelCode);
  const isYoung = ageConfig.group === 'young';
  const visualSize = ageConfig.visualSize;
  const bodySize = ageConfig.bodySize;

  // Level mode → render the single passed level as a flat lesson.
  // Otherwise flatten progressive levels into one continuous flow (a flat lesson = one level).
  // Memoized so the array identity is stable across renders — an unstable steps/cards
  // array churns the card-switcher and stalls its AnimatePresence exit animation.
  const steps: LessonContent[] = useMemo(() => (
    levelMode
      ? [levelContent as LessonContent]
      : (lessonContent?.steps?.length
          ? (lessonContent.steps as unknown as LessonContent[])
          : lessonContent ? [lessonContent] : [])
  ), [levelMode, levelContent, lessonContent]);
  const totalLevels = steps.length;

  const cards = useMemo(() => buildFlowCards(steps, !levelMode && !!inlineBankId), [steps, levelMode, inlineBankId]);
  const lastIndex = Math.max(1, cards.length - 1);

  // ── Resume: restore saved position, persist on each move ────────────
  // Level sessions resume from localStorage only, namespaced per level, so multiple
  // levels of one topic don't collide on the single lesson_in_progress DB row.
  const { restoredIndex, save: saveProgress, clear: clearProgress } = useLessonResume(
    topicId, user?.id, lastIndex,
    levelMode ? { keySuffix: `:lvl${levelIndex ?? 0}`, dbEnabled: false } : undefined,
  );
  const didRestore = useRef(false);
  useEffect(() => {
    if (!didRestore.current && restoredIndex != null && restoredIndex <= lastIndex) {
      didRestore.current = true;
      setCardIndex(restoredIndex);
    }
  }, [restoredIndex, lastIndex]);

  const goTo = useCallback((index: number) => {
    setCardIndex(index);
    if (index > 0 && index < lastIndex) {
      saveProgress(index, Math.round((index / lastIndex) * 100));
    }
  }, [lastIndex, saveProgress]);

  const recordCompletion = useCallback(async () => {
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setActualMinutes(Math.max(1, Math.ceil(secs / 60)));
    // Level mode: the path (useLessonLevelProgress) owns persistence + XP. Just notify it.
    if (levelMode) {
      clearProgress();
      onLevelComplete?.();
      return;
    }
    if (!user?.id) return;
    try {
      const { data: existing } = await supabase
        .from('user_learning_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('progress_type', 'lesson_completed')
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('user_learning_progress').insert({
          user_id: user.id,
          topic_id: topicId,
          subject_id: subjectId ?? null,
          progress_type: 'lesson_completed',
          progress_percentage: 100,
          time_spent_seconds: secs,
        });
        if (!error) {
          showXpToast(5, 'Leçon terminée !');
          window.setTimeout(() => showXpToast(0, '🔥 Continue comme ça !'), 900);
          celebrate('Bravo, leçon terminée !', [0, 40, 30, 40, 30, 60]);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['student-stats'] });
      trackLearningInteraction({ studentId: user.id, eventType: 'lesson_completed', topicId });
    } catch (err) {
      console.warn('[LessonCardPlayer] completion error:', err);
    } finally {
      clearProgress(); // finished → don't resume into a completed lesson
    }
  }, [user?.id, topicId, subjectId, queryClient, clearProgress, celebrate, levelMode, onLevelComplete]);

  const goNext = useCallback(() => {
    const next = cardIndex + 1;
    const cur = cards[cardIndex];
    const nxt = cards[next];
    // Crossing into a new level (but not the final complete card) = level cleared → reward beat.
    if (cur && nxt && nxt.type !== 'complete' && nxt.stepIdx > cur.stepIdx) {
      showXpToast(3, `Niveau ${cur.stepIdx + 1} terminé !`);
      celebrate(`Niveau ${nxt.stepIdx + 1} débloqué`);
    }
    if (next === cards.length - 1) void recordCompletion();
    if (next < cards.length) goTo(next);
  }, [cardIndex, cards, recordCompletion, goTo, celebrate]);

  // ── Swipe + keyboard navigation ─────────────────────────────────────
  // Forward = click the card's own primary CTA, so per-card gating (reveal /
  // validate / next) is respected rather than bypassed.
  const cardContentRef = useRef<HTMLDivElement>(null);
  const triggerPrimary = useCallback(() => {
    // CTAs now live in the bottom action bar (portaled), so look there first,
    // with the card content as a fallback (in the brief frame before the bar mounts).
    const btn = (barEl?.querySelector('button[data-primary-cta]:not([disabled])')
      ?? cardContentRef.current?.querySelector('button[data-primary-cta]:not([disabled])')) as HTMLButtonElement | null;
    btn?.click();
  }, [barEl]);
  const goForward = useCallback(() => {
    if (cards[cardIndex]?.type === 'complete') return;
    triggerPrimary();
  }, [cards, cardIndex, triggerPrimary]);
  const goBack = useCallback(() => {
    if (cardIndex > 0) goTo(cardIndex - 1);
  }, [cardIndex, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); goForward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goForward, goBack]);

  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: RTouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: RTouchEvent) => {
    const s = touchRef.current;
    touchRef.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return; // ignore taps / vertical scroll
    if (dx < 0) goForward(); else goBack();
  };

  const replay = useCallback(() => {
    clearProgress();
    setCardIndex(0);
    startTimeRef.current = Date.now();
    setActualMinutes(null);
  }, [clearProgress]);

  const currentCard = cards[cardIndex];
  if (!currentCard) return null;
  const stepContent = steps[currentCard.stepIdx] ?? null;
  // A new level "begins" on its intro card — show the level banner there (only when >1 level).
  const isLevelStart = currentCard.type === 'intro' && totalLevels > 1;

  return (
    <LessonFooterContext.Provider value={barEl}>
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {celebration && <CelebrationOverlay label={celebration} />}
      <div style={{ padding: '8px 16px 6px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {cardIndex > 0 && (
          <button
            onClick={() => goTo(cardIndex - 1)}
            aria-label="Carte précédente"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '0.5px solid #EAECEF', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M8 2L4 6l4 4" stroke="#667085" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {totalLevels > 1 ? (
          <SegmentedProgress cards={cards} cardIndex={cardIndex} totalLevels={totalLevels} />
        ) : (
          <ProgressBar current={cardIndex} total={cards.length} label={currentCard.label} />
        )}
      </div>

      {isLevelStart && (
        <LevelBanner
          levelIdx={currentCard.stepIdx}
          totalLevels={totalLevels}
          stepName={stepContent?.step_name ?? undefined}
        />
      )}

      {/* Scrollable content region — the card scrolls here; the action bar below stays put. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Keyed motion.div (no AnimatePresence): the changing key remounts the card and
          plays the enter animation each step. We dropped AnimatePresence/exit because its
          mode="wait" exit could stall and leave a card stuck mounted. */}
        <motion.div
          ref={cardContentRef}
          key={cardIndex}
          initial={{ x: 24 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {currentCard.type === 'intro' && (
            <IntroCard
              topicName={topicName}
              lessonContent={stepContent}
              onNext={goNext}
              visualSize={visualSize}
              bodySize={bodySize}
              compact={currentCard.stepIdx > 0}
              heading={currentCard.stepIdx > 0 ? (stepContent?.step_name ?? undefined) : undefined}
            />
          )}
          {currentCard.type === 'vocabulary' && stepContent?.vocabulary && (
            <VocabularyCard vocabulary={stepContent.vocabulary} onNext={goNext} bodySize={bodySize} isYoung={isYoung} />
          )}
          {currentCard.type === 'examples' && stepContent?.example_steps?.length ? (
            <ExampleStepsCard
              exampleSteps={stepContent.example_steps}
              onNext={goNext}
              bodySize={bodySize}
            />
          ) : currentCard.type === 'examples' && stepContent?.examples ? (
            <ExamplesCard
              topicName={topicName}
              examples={stepContent.examples}
              onNext={goNext}
              bodySize={bodySize}
              visualSize={visualSize}
              exampleCount={ageConfig.exampleCount}
            />
          ) : null}
          {currentCard.type === 'quiz' && (
            <QuizCard
              topicName={topicName}
              topicId={topicId}
              onNext={goNext}
              presetQuestion={stepContent?.quiz ?? null}
              inlineBankId={stepContent?.quiz ? null : inlineBankId}
            />
          )}
          {currentCard.type === 'mistake' && stepContent?.common_mistakes?.length && (
            <MistakeCard mistakes={stepContent.common_mistakes} onNext={goNext} />
          )}
          {currentCard.type === 'complete' && (
            levelMode ? (
              <CompleteCard
                topicName={topicName}
                actualMinutes={actualMinutes}
                lessonContent={steps[0] ?? null}
                onSexercer={onSexercer}
                onReplay={replay}
                title={isFinalLevel ? 'Leçon terminée !' : `Niveau ${(levelIndex ?? 0) + 1} terminé !`}
                xpLabel={isFinalLevel ? '+5 XP' : '✓'}
                primaryLabel={isFinalLevel ? 'Terminer le parcours →' : 'Continuer le parcours →'}
                onPrimary={onExitToPath}
              />
            ) : (
              <CompleteCard topicName={topicName} actualMinutes={actualMinutes} lessonContent={lessonContent} onSexercer={onSexercer} onReplay={replay} />
            )
          )}
        </motion.div>
      </div>

      {/* Persistent bottom action bar — every card's CTA(s) portal in here (via <LessonFooter>),
          so the primary button stays in the same spot on every step. */}
      <div style={{
        flexShrink: 0, background: 'white', borderTop: '0.5px solid #EAECEF',
        boxShadow: '0 -2px 10px rgba(15,23,42,0.05)',
        padding: '10px 16px', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}>
        <div ref={setBarEl} style={{ maxWidth: 680, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }} />
      </div>
    </div>
    </LessonFooterContext.Provider>
  );
}
