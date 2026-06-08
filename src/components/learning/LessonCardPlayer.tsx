import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, BookOpen, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showXpToast } from '@/components/game/XpToast';
import { trackLearningInteraction } from '@/services/learningAnalytics';
import { TopicVisual } from './visuals/TopicVisual';
import { QuestionCard } from './QuestionCard';
import type { LessonContent, LessonExample } from '@/types/learning';
import type { Question } from '@/types/quiz-bank';

interface LessonCardPlayerProps {
  topicId: string;
  topicName: string;
  lessonContent: LessonContent | null;
  inlineBankId: string | null;
  onSexercer: () => void;
  subjectId?: string | null;
}

type CardType = 'hook' | 'vocabulary' | 'concept' | 'examples' | 'quiz' | 'mistake' | 'complete';

interface Card {
  type: CardType;
  label: string;
}

function buildCards(content: LessonContent | null, hasQuiz: boolean): Card[] {
  const cards: Card[] = [{ type: 'hook', label: 'Accroche' }];
  if (content?.vocabulary?.length) cards.push({ type: 'vocabulary', label: 'Vocabulaire' });
  cards.push({ type: 'concept', label: 'Concept' });
  if (content?.examples?.length) cards.push({ type: 'examples', label: 'Exemples' });
  if (hasQuiz) cards.push({ type: 'quiz', label: 'Quiz' });
  if (content?.common_mistakes?.length) cards.push({ type: 'mistake', label: 'Erreur fréquente' });
  cards.push({ type: 'complete', label: 'Terminé' });
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
        marginTop: 'auto',
      }}
    >
      {label}
    </button>
  );
}

function HookCard({ topicName, explanation, onNext }: { topicName: string; explanation: string; onNext: () => void }) {
  const hook = explanation.split(/(?<=[.!?])\s+/)[0] ?? explanation;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<BookOpen className="h-3 w-3" />} label="Leçon" color="teal" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
        {topicName}
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <TopicVisual topicName={topicName} total={4} taken={1} animated size={100} />
      </div>
      <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.75, background: '#F2FBF8', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #9FE1CB' }}>
        {hook}
      </p>
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>Appuie sur Suivant pour apprendre !</p>
      <NextButton onClick={onNext} />
    </div>
  );
}

function VocabularyCard({ vocabulary, onNext }: { vocabulary: NonNullable<LessonContent['vocabulary']>; onNext: () => void }) {
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
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
        Appuie sur chaque mot
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
              <span style={{ flex: 1, fontSize: 12, color: isOpen ? '#374151' : '#9CA3AF', lineHeight: 1.5, textAlign: 'left' }}>
                {isOpen ? item.definition : '· · ·'}
              </span>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: '#9CA3AF', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
          );
        })}
      </div>
      <NextButton onClick={onNext} label="J'ai compris →" />
    </div>
  );
}

function ConceptCard({ topicName, explanation, onNext }: { topicName: string; explanation: string; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<BookOpen className="h-3 w-3" />} label="Le concept" color="teal" />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <TopicVisual topicName={topicName} total={4} taken={1} animated size={95} />
      </div>
      <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 14 }}>
        <p style={{ fontSize: 15, color: '#374151', margin: 0, lineHeight: 1.85 }}>
          {explanation}
        </p>
      </div>
      <NextButton onClick={onNext} />
    </div>
  );
}

function ExamplesCard({ topicName, examples, onNext }: { topicName: string; examples: LessonExample[]; onNext: () => void }) {
  const [active, setActive] = useState(0);
  const ex = examples[active];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<Zap className="h-3 w-3" />} label="Vois le pattern" color="amber" />
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
        La même règle, des chiffres différents
      </h2>

      <div style={{ display: 'flex', gap: 6 }}>
        {examples.map((e, i) => (
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
            {e.fraction ?? `${e.taken}/${e.total}`}
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
          <div style={{ display: 'flex', justifyContent: 'center', background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 14 }}>
            <TopicVisual topicName={topicName} total={ex.total} taken={ex.taken} animated size={95} />
          </div>
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
            {ex.context}
          </p>
          <div style={{ background: '#F2FBF8', borderRadius: 12, border: '0.5px solid #9FE1CB', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#12C6A0', margin: 0, borderBottom: '2.5px solid #12C6A0', paddingBottom: 2, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
                {ex.taken}
              </p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2, fontFamily: 'Poppins, sans-serif' }}>
                {ex.total}
              </p>
            </div>
            <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6, flex: 1 }}>
              {ex.explanation}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>
        Appuie sur chaque fraction pour voir le changement
      </p>
      <NextButton onClick={onNext} />
    </div>
  );
}

function QuizCard({
  inlineBankId,
  topicId,
  onNext,
}: {
  topicName: string;
  inlineBankId: string;
  topicId: string;
  onNext: () => void;
}) {
  const [answer, setAnswer] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: question } = useQuery<Question | null>({
    queryKey: ['lesson-inline-q', topicId, inlineBankId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('quiz_bank_questions')
        .select('payload, position')
        .eq('bank_id', inlineBankId)
        .order('position');
      if (!rows?.length) return null;
      const questions = rows.map((r) => r.payload as unknown as Question);
      return questions[Math.floor(Math.random() * questions.length)] ?? null;
    },
    enabled: !!inlineBankId,
    staleTime: Infinity,
  });

  if (!question) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
        <CardBadge icon={<Zap className="h-3 w-3" />} label="Petit test" color="amber" />
        <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 24, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Quiz non disponible.</p>
        </div>
        <NextButton onClick={onNext} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', flex: 1 }}>
      <CardBadge icon={<Zap className="h-3 w-3" />} label="Petit test" color="amber" />
      <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #EAECEF', padding: 14 }}>
        <QuestionCard question={question} onChange={setAnswer} submittedAnswer={submitted ? answer : undefined} isCorrect={undefined} />
      </div>
      {!submitted ? (
        <button
          onClick={() => { if (answer != null) setSubmitted(true); }}
          disabled={answer == null}
          style={{
            width: '100%',
            padding: 13,
            borderRadius: 14,
            border: 'none',
            background: answer != null ? '#12C6A0' : '#EAECEF',
            color: answer != null ? '#0F172A' : '#B4B2A9',
            fontSize: 13,
            fontWeight: 700,
            cursor: answer != null ? 'pointer' : 'not-allowed',
            fontFamily: 'Poppins, sans-serif',
            marginTop: 'auto',
          }}
        >
          Valider
        </button>
      ) : (
        <NextButton onClick={onNext} />
      )}
    </div>
  );
}

function MistakeCard({ mistakes, onNext }: { mistakes: LessonContent['common_mistakes']; onNext: () => void }) {
  const first = mistakes[0];
  const text = typeof first === 'string' ? first : (first as any)?.mistake ?? '';
  const why = typeof first === 'object' && first !== null ? (first as any)?.why ?? '' : '';
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
        const t2 = typeof second === 'string' ? second : (second as any)?.mistake ?? '';
        const w2 = typeof second === 'object' && second !== null ? (second as any)?.why ?? '' : '';
        return (
          <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #EAECEF', padding: '12px 14px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', lineHeight: 1.5 }}>{t2}</p>
            {w2 && <p style={{ fontSize: 12, color: '#667085', margin: 0, lineHeight: 1.6 }}>{w2}</p>}
          </div>
        );
      })()}
      <NextButton onClick={onNext} label="Voir mon résultat →" />
    </div>
  );
}

function CompleteCard({
  topicName,
  actualMinutes,
  lessonContent,
  onSexercer,
  onReplay,
}: {
  topicName: string;
  actualMinutes: number | null;
  lessonContent: LessonContent | null;
  onSexercer: () => void;
  onReplay: () => void;
}) {
  const recap = lessonContent?.vocabulary?.slice(0, 3).map((v) => v.term) ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '20px 16px', flex: 1 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: '#F2FBF8', border: '1.5px solid #12C6A0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trophy className="h-10 w-10" style={{ color: '#12C6A0' }} />
      </div>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', fontFamily: 'Poppins, sans-serif' }}>
          Leçon terminée !
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
          <p style={{ fontSize: 20, fontWeight: 800, color: '#633806', margin: '0 0 2px', fontFamily: 'Poppins, sans-serif' }}>+5 XP</p>
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
      <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onSexercer} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#12C6A0', color: '#0F172A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Zap className="h-4 w-4" /> S'exercer sur {topicName}
        </button>
        <button onClick={onReplay} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #EAECEF', background: 'white', color: '#667085', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
          Recommencer la leçon
        </button>
      </div>
    </div>
  );
}

export function LessonCardPlayer({
  topicId,
  topicName,
  lessonContent,
  inlineBankId,
  onSexercer,
  subjectId,
}: LessonCardPlayerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const startTimeRef = useRef<number>(Date.now());
  const [cardIndex, setCardIndex] = useState(0);
  const [actualMinutes, setActualMinutes] = useState<number | null>(null);

  const cards = buildCards(lessonContent, !!inlineBankId);

  const recordCompletion = useCallback(async () => {
    if (!user?.id) return;
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setActualMinutes(Math.max(1, Math.ceil(secs / 60)));
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
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['student-stats'] });
      trackLearningInteraction({ studentId: user.id, eventType: 'lesson_completed', topicId });
    } catch (err) {
      console.warn('[LessonCardPlayer] completion error:', err);
    }
  }, [user?.id, topicId, subjectId, queryClient]);

  const goNext = useCallback(() => {
    const next = cardIndex + 1;
    if (next === cards.length - 1) void recordCompletion();
    if (next < cards.length) setCardIndex(next);
  }, [cardIndex, cards.length, recordCompletion]);

  const replay = useCallback(() => {
    setCardIndex(0);
    startTimeRef.current = Date.now();
    setActualMinutes(null);
  }, []);

  const currentCard = cards[cardIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 520 }}>
      <div style={{ padding: '8px 16px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ProgressBar current={cardIndex} total={cards.length} label={currentCard.label} />
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {cards.map((_, i) => (
            <div key={i} style={{ width: i === cardIndex ? 16 : 6, height: 6, borderRadius: 999, background: i <= cardIndex ? '#12C6A0' : '#EAECEF', transition: 'all .25s ease' }} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={cardIndex}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {currentCard.type === 'hook' && (
            <HookCard topicName={topicName} explanation={lessonContent?.explanation ?? ''} onNext={goNext} />
          )}
          {currentCard.type === 'vocabulary' && lessonContent?.vocabulary && (
            <VocabularyCard vocabulary={lessonContent.vocabulary} onNext={goNext} />
          )}
          {currentCard.type === 'concept' && (
            <ConceptCard topicName={topicName} explanation={lessonContent?.explanation ?? ''} onNext={goNext} />
          )}
          {currentCard.type === 'examples' && lessonContent?.examples && (
            <ExamplesCard topicName={topicName} examples={lessonContent.examples} onNext={goNext} />
          )}
          {currentCard.type === 'quiz' && inlineBankId && (
            <QuizCard topicName={topicName} inlineBankId={inlineBankId} topicId={topicId} onNext={goNext} />
          )}
          {currentCard.type === 'mistake' && lessonContent?.common_mistakes?.length && (
            <MistakeCard mistakes={lessonContent.common_mistakes} onNext={goNext} />
          )}
          {currentCard.type === 'complete' && (
            <CompleteCard topicName={topicName} actualMinutes={actualMinutes} lessonContent={lessonContent} onSexercer={onSexercer} onReplay={replay} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
