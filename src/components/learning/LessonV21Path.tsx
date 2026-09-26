import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Play, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { LessonV2Player } from './LessonV2Player';
import type { LessonV21 } from '@/types/lesson-generator';
import { updateMasteryFromTaskResult } from '@/lib/mastery';

type Props = { topicId: string; subjectId?: string | null; topicName: string; lesson: LessonV21 };
const key = (topicId: string) => `stuwy:v21-levels:${topicId}`;
const positionKey = (topicId: string) => `stuwy:v21-level-position:${topicId}`;

export function LessonV21Path({ topicId, subjectId, topicName, lesson }: Props) {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { try { const raw = localStorage.getItem(key(topicId)); if (raw) setCompleted(JSON.parse(raw)); const saved = localStorage.getItem(positionKey(topicId)); if (saved) setPositions(JSON.parse(saved)); } catch { /* ignore */ } }, [topicId]);
  const current = useMemo(() => lesson.levels.findIndex((level) => !((completed[level.id] ?? 0) >= (level.lesson.mastery.threshold ?? 0.8))), [completed, lesson.levels]);
  const unlock = (index: number) => index <= Math.max(0, current);
  const persist = async (index: number, score: number, position = 0) => {
    const level = lesson.levels[index]; if (!level) return;
    const threshold = level.lesson.mastery.threshold ?? 0.8;
    const next = { ...completed, [level.id]: Math.max(completed[level.id] ?? 0, score) };
    setCompleted(next); try { localStorage.setItem(key(topicId), JSON.stringify(next)); } catch { /* ignore */ }
    if (user?.id) {
      await (supabase as any).from('topic_lesson_level_progress').upsert({ user_id: user.id, topic_id: topicId, level_id: level.id, status: score >= threshold ? 'mastered' : 'remediation', score, sequence_position: position, attempts: 1, mastered_at: score >= threshold ? new Date().toISOString() : null }, { onConflict: 'user_id,topic_id,level_id' });
      await Promise.all(level.objective_ids.map((objectiveId) => updateMasteryFromTaskResult({ studentId: user.id, topicId, objectiveId, scorePercent: Math.round(score * 100) })));
    }
  };
  const rememberPosition = useCallback((index: number, position: number) => {
    const levelId = lesson.levels[index]?.id;
    if (!levelId) return;
    setPositions((previous) => {
      if (previous[levelId] === position) return previous;
      const next = { ...previous, [levelId]: position };
      try { localStorage.setItem(positionKey(topicId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [lesson.levels, topicId]);
  const handleSequencePosition = useCallback((position: number) => {
    if (selected != null) rememberPosition(selected, position);
  }, [rememberPosition, selected]);
  if (selected != null) {
    const level = lesson.levels[selected];
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b bg-white p-3">
          <button onClick={() => setSelected(null)} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase text-primary">NIVEAU {selected + 1} / {lesson.levels.length}</p>
            <p className="font-bold">{level.title}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <LessonV2Player
            topicId={topicId}
            subjectId={subjectId}
            topicName={topicName}
            lesson={level.lesson}
            onMasteryResult={(score) => persist(selected, score, positions[level.id] ?? 0)}
            onSequencePosition={handleSequencePosition}
          />
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', padding: '14px 16px 24px', fontFamily: 'Poppins, sans-serif' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#667085', margin: '0 0 16px' }}>
        {current >= lesson.levels.length ? '✓ Parcours terminé' : `Niveau ${Math.min(current + 1, lesson.levels.length)} sur ${lesson.levels.length}`}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lesson.levels.map((level, index) => {
          const mastered = (completed[level.id] ?? 0) >= (level.lesson.mastery.threshold ?? 0.8);
          const open = unlock(index);
          const state = mastered ? 'completed' : open ? 'current' : 'locked';
          const resumable = state === 'current' && (positions[level.id] ?? 0) > 0;
          return (
            <div key={level.id} style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                <div style={{ width: 2, flex: 1, minHeight: 10, background: index <= current ? '#12C6A0' : '#EAECEF', opacity: index === 0 ? 0 : 1 }} />
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {state === 'current' && <div aria-hidden style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '4px solid rgba(18,198,160,0.16)' }} />}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: state === 'completed' ? '#12C6A0' : state === 'current' ? 'white' : '#F3F6FA', border: state === 'current' ? '2.5px solid #12C6A0' : state === 'completed' ? 'none' : '1.5px solid #EAECEF', boxShadow: state === 'current' ? '0 4px 12px rgba(18,198,160,0.25)' : 'none' }}>
                    {state === 'completed' && <Check className="h-5 w-5" style={{ color: 'white' }} strokeWidth={3} />}
                    {state === 'current' && <Play className="h-5 w-5" style={{ color: '#12C6A0', marginLeft: 2 }} fill="#12C6A0" />}
                    {state === 'locked' && <Lock className="h-4 w-4" style={{ color: '#9CA3AF' }} />}
                  </div>
                </div>
                <div style={{ width: 2, flex: 1, minHeight: 10, background: index < current ? '#12C6A0' : '#EAECEF', opacity: index === lesson.levels.length - 1 ? 0 : 1 }} />
              </div>
              <button disabled={state === 'locked'} onClick={() => setSelected(index)} style={{ flex: 1, minWidth: 0, textAlign: 'left', margin: '6px 0', padding: '14px 16px', borderRadius: 16, cursor: state === 'locked' ? 'default' : 'pointer', fontFamily: 'Poppins, sans-serif', background: state === 'current' ? '#F2FBF8' : state === 'completed' ? 'white' : '#F8FAFC', border: state === 'current' ? '1px solid #9FE1CB' : '0.5px solid #EAECEF', opacity: state === 'locked' ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 11, fontWeight: 800, color: state === 'locked' ? '#9CA3AF' : '#12B894', letterSpacing: '0.03em' }}>NIVEAU {level.level_number}</span>{state === 'completed' && <span style={{ fontSize: 11, fontWeight: 700, color: '#085041' }}>· Terminé ✓</span>}</div>
                <p style={{ fontSize: 16, fontWeight: 800, color: state === 'locked' ? '#9CA3AF' : '#0F172A', margin: '4px 0 0', lineHeight: 1.3 }}>{level.title}</p>
                {state === 'current' && <><p style={{ fontSize: 13, color: '#667085', margin: '6px 0 0', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{level.lesson.lesson_goal}</p><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 11, padding: '8px 16px', borderRadius: 999, background: '#55C6A5', color: '#0F172A', fontSize: 13, fontWeight: 800 }}>{resumable ? 'Continuer →' : 'Commencer →'}</span></>}
                {state === 'completed' && <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0', fontWeight: 600 }}>Appuie pour revoir</p>}
                {state === 'locked' && <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0', fontWeight: 600 }}>Termine le niveau précédent</p>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
