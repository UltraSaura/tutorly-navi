import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Play, ArrowLeft, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLessonLevelProgress } from '@/hooks/useLessonLevelProgress';
import { LessonCardPlayer, CelebrationOverlay, buzz } from './LessonCardPlayer';
import type { LessonContent } from '@/types/learning';

interface LessonLevelPathProps {
  topicId: string;
  topicName: string;
  lessonContent: LessonContent;
  inlineBankId: string | null;
  onSexercer: () => void;
  subjectId?: string | null;
}

type LevelState = 'completed' | 'current' | 'locked';

function firstSentence(text?: string): string {
  if (!text) return '';
  const s = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return s.length > 90 ? s.slice(0, 88) + '…' : s;
}

const TEAL = '#12C6A0';
const TEAL_DARK = '#085041';

export function LessonLevelPath({
  topicId, topicName, lessonContent, inlineBankId, onSexercer, subjectId,
}: LessonLevelPathProps) {
  const ui = useInterfaceTranslation();
  const { user } = useAuth();
  const steps = (lessonContent.steps ?? []) as unknown as LessonContent[];
  const total = steps.length;

  const { completedCount, ready, isUnlocked, markLevelComplete } = useLessonLevelProgress(
    topicId, user?.id, total, subjectId,
  );

  const [openLevel, setOpenLevel] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const justCompletedRef = useRef<number | null>(null);
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const celebrateTimer = useRef<number | null>(null);
  useEffect(() => () => { if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current); }, []);

  const allDone = completedCount >= total;

  const stateOf = useCallback((i: number): LevelState => {
    if (i < completedCount) return 'completed';
    if (i === completedCount) return 'current';
    return 'locked';
  }, [completedCount]);

  const openIfAllowed = useCallback((i: number) => {
    if (isUnlocked(i)) setOpenLevel(i);
  }, [isUnlocked]);

  // Level session finished its flow → persist; remember which to celebrate on return.
  const handleLevelComplete = useCallback(() => {
    if (openLevel == null) return;
    justCompletedRef.current = openLevel;
    void markLevelComplete(openLevel);
  }, [openLevel, markLevelComplete]);

  // Return to the path → celebrate the just-finished level + scroll to the next.
  const handleExitToPath = useCallback(() => {
    const done = justCompletedRef.current;
    setOpenLevel(null);
    if (done != null) {
      justCompletedRef.current = null;
      const finishedLesson = done >= total - 1;
      buzz(finishedLesson ? [0, 40, 30, 40, 30, 60] : [0, 35, 30, 35]);
      setCelebration(finishedLesson ? ui("Bravo, leçon terminée !") : ui("levelCompleted", { level: done + 1 }));
      if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current);
      celebrateTimer.current = window.setTimeout(() => setCelebration(null), 1700);
      // scroll the next bubble into view
      window.setTimeout(() => {
        bubbleRefs.current[Math.min(done + 1, total - 1)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  }, [total, ui]);

  if (!ready) {
    return <div style={{ minHeight: 320 }} />; // avoid flashing locked state before restore
  }

  return (
    <div style={{ position: 'relative', padding: '14px 16px 24px' }}>
      {celebration && <CelebrationOverlay label={celebration} />}

      {/* Progress line */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: allDone ? TEAL_DARK : '#667085', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
          {allDone ? ui("✓ Parcours terminé") : ui("levelProgress", { level: Math.min(completedCount + 1, total), total })}
        </p>
      </div>

      {/* Bubble path */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((step, i) => {
          const st = stateOf(i);
          const tappable = st !== 'locked';
          const isLast = i === total - 1;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
              {/* Rail: connector line + bubble */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                <div style={{ width: 2, flex: 1, minHeight: 10, background: i <= completedCount ? TEAL : '#EAECEF', opacity: i === 0 ? 0 : 1 }} />
                <div ref={(el) => { bubbleRefs.current[i] = el; }} style={{ position: 'relative', flexShrink: 0 }}>
                  {st === 'current' && (
                    <div
                      aria-hidden
                      className="stuwy-pulse-ring"
                      style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${TEAL}` }}
                    />
                  )}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: st === 'completed' ? TEAL : st === 'current' ? 'white' : '#F3F6FA',
                    border: st === 'current' ? `2.5px solid ${TEAL}` : st === 'completed' ? 'none' : '1.5px solid #EAECEF',
                    boxShadow: st === 'current' ? '0 4px 12px rgba(18,198,160,0.25)' : 'none',
                  }}>
                    {st === 'completed' && <Check className="h-5 w-5" style={{ color: 'white' }} strokeWidth={3} />}
                    {st === 'current' && <Play className="h-5 w-5" style={{ color: TEAL, marginLeft: 2 }} fill={TEAL} />}
                    {st === 'locked' && <Lock className="h-4 w-4" style={{ color: '#9CA3AF' }} />}
                  </div>
                </div>
                <div style={{ width: 2, flex: 1, minHeight: 10, background: i < completedCount ? TEAL : '#EAECEF', opacity: isLast ? 0 : 1 }} />
              </div>

              {/* Content card */}
              <button
                onClick={() => tappable && openIfAllowed(i)}
                disabled={!tappable}
                style={{
                  flex: 1, textAlign: 'left', margin: '6px 0', padding: '12px 14px',
                  borderRadius: 14, cursor: tappable ? 'pointer' : 'default',
                  fontFamily: 'Poppins, sans-serif',
                  background: st === 'current' ? '#F2FBF8' : st === 'completed' ? 'white' : '#F8FAFC',
                  border: st === 'current' ? '1px solid #9FE1CB' : '0.5px solid #EAECEF',
                  opacity: st === 'locked' ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: st === 'locked' ? '#9CA3AF' : TEAL, letterSpacing: '0.03em' }}>
                    {ui("NIVEAU")} {i + 1}
                  </span>
                  {st === 'completed' && <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_DARK }}>{ui("· Terminé ✓")}</span>}
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: st === 'locked' ? '#9CA3AF' : '#0F172A', margin: '3px 0 0', lineHeight: 1.3 }}>
                  {step.step_name || ui("levelNumber", { level: i + 1 })}
                </p>
                {st === 'current' && (
                  <>
                    {firstSentence(step.explanation) && (
                      <p style={{ fontSize: 12, color: '#667085', margin: '5px 0 0', lineHeight: 1.5 }}>
                        {firstSentence(step.explanation)}
                      </p>
                    )}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                      padding: '7px 14px', borderRadius: 999, background: TEAL, color: '#0F172A',
                      fontSize: 12, fontWeight: 800,
                    }}>
                      {ui("Commencer →")}
                    </span>
                  </>
                )}
                {st === 'completed' && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', fontWeight: 600 }}>{ui("Appuie pour revoir")}</p>
                )}
                {st === 'locked' && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', fontWeight: 600 }}>{ui("Termine le niveau précédent")}</p>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Finished state → practice CTA */}
      {allDone && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 18, padding: '16px', background: '#F2FBF8', border: '1px solid #9FE1CB', borderRadius: 14 }}>
          <Trophy className="h-8 w-8" style={{ color: TEAL }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif' }}>{ui("Tu as terminé tous les niveaux !")}</p>
          <button onClick={onSexercer} style={{ width: '100%', maxWidth: 280, padding: 13, borderRadius: 14, border: 'none', background: TEAL, color: '#0F172A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Zap className="h-4 w-4" /> {ui("S'exercer sur")} {topicName}
          </button>
        </div>
      )}

      {/* Level session overlay — a plain opaque fixed container.
          (A framer enter animation here can stall at partial opacity, letting the
          path show through; and a nested AnimatePresence stalls the inner card
          switcher. So: no animation wrapper here.) */}
      {openLevel != null && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F3F6FA', display: 'flex', flexDirection: 'column' }}
          >
            {/* Overlay header (fixed top) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'white', borderBottom: '0.5px solid #EAECEF', flexShrink: 0, zIndex: 2 }}>
              <button onClick={() => setOpenLevel(null)} aria-label={ui("Retour au parcours")} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #EAECEF', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowLeft className="h-4 w-4" style={{ color: '#667085' }} />
              </button>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: TEAL, margin: 0, letterSpacing: '0.03em' }}>{ui("NIVEAU")} {openLevel + 1} / {total}</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Poppins, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {steps[openLevel]?.step_name}
                </p>
              </div>
            </div>
            {/* Player fills the remaining height; it owns its own scroll + bottom bar */}
            <div style={{ flex: 1, minHeight: 0 }}>
            <LessonCardPlayer
              topicId={topicId}
              topicName={topicName}
              lessonContent={lessonContent}
              inlineBankId={inlineBankId}
              onSexercer={onSexercer}
              subjectId={subjectId}
              levelContent={steps[openLevel]}
              levelIndex={openLevel}
              totalLevelsCount={total}
              onLevelComplete={handleLevelComplete}
              onExitToPath={handleExitToPath}
            />
            </div>
          </div>
        )}
    </div>
  );
}
