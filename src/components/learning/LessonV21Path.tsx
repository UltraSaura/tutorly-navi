import { learnerStorageKey } from '@/features/family/profileRuntime';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Play, Check, ArrowLeft } from 'lucide-react';
import { useLearner } from '@/context/FamilyProfileContext';
import { LessonV2Player } from './LessonV2Player';
import type { LessonV21 } from '@/types/lesson-generator';
import { updateMasteryFromTaskResult } from '@/lib/mastery';

type Props = { topicId: string; subjectId?: string | null; topicName: string; lesson: LessonV21; levelLabelsOnly?: boolean; levelTopicIds?: string[] };
const key = (topicId: string, learnerId?: string) => learnerStorageKey(`stuwy:v21-levels:${topicId}`, learnerId);
const positionKey = (topicId: string, learnerId?: string) => learnerStorageKey(`stuwy:v21-level-position:${topicId}`, learnerId);
export const LESSON_LEVEL_LABELS = ['Découverte', 'Comprendre', "S’entraîner", 'Maîtriser'] as const;

export function getLessonLevelState(index: number, completedCount: number, totalLevels: number) {
  if (index < completedCount) return 'completed' as const;
  if (index === completedCount && index < totalLevels) return 'current' as const;
  return 'locked' as const;
}

export function LessonV21Path({ topicId, subjectId, topicName, lesson, levelLabelsOnly = false, levelTopicIds }: Props) {
  const { user } = useLearner();
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(topicId, user?.id));
      setCompleted(raw ? JSON.parse(raw) : {});
      const saved = localStorage.getItem(positionKey(topicId, user?.id));
      setPositions(saved ? JSON.parse(saved) : {});
    } catch { /* ignore corrupt local progress */ }
  }, [topicId, user?.id]);
  const current = useMemo(() => lesson.levels.findIndex((level) => !((completed[level.id] ?? 0) >= (level.lesson.mastery.threshold ?? 0.8))), [completed, lesson.levels]);
  const persist = async (index: number, score: number) => {
    const level = lesson.levels[index];
    if (!level) return;
    const sourceTopicId = levelTopicIds?.[index] ?? topicId;
    const next = { ...completed, [level.id]: Math.max(completed[level.id] ?? 0, score) };
    setCompleted(next);
    try { localStorage.setItem(key(topicId, user?.id), JSON.stringify(next)); } catch { /* ignore */ }
    if (user?.id) await Promise.all(level.objective_ids.map((objectiveId) => updateMasteryFromTaskResult({ studentId: user.id, topicId: sourceTopicId, objectiveId, scorePercent: Math.round(score * 100) })));
  };
  const rememberPosition = useCallback((index: number, position: number) => {
    const levelId = lesson.levels[index]?.id;
    if (!levelId) return;
    setPositions((previous) => {
      if (previous[levelId] === position) return previous;
      const next = { ...previous, [levelId]: position };
      try { localStorage.setItem(positionKey(topicId, user?.id), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [lesson.levels, topicId, user?.id]);
  const handleSequencePosition = useCallback((position: number) => { if (selected != null) rememberPosition(selected, position); }, [rememberPosition, selected]);

  if (selected != null) {
    const level = lesson.levels[selected];
    if (!level) return null;
    const levelLabel = LESSON_LEVEL_LABELS[level.level_number - 1] ?? `Étape ${level.level_number}`;
    return <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b bg-white p-3"><button onClick={() => setSelected(null)} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase text-primary">Niveau {level.level_number} — {levelLabel}</p>{!levelLabelsOnly && <p className="font-bold">{level.title}</p>}</div></div>
      <div className="min-h-0 flex-1"><LessonV2Player topicId={levelTopicIds?.[selected] ?? topicId} subjectId={subjectId} topicName={topicName} lesson={level.lesson} onMasteryResult={(score) => persist(selected, score)} onSequencePosition={handleSequencePosition} /></div>
    </div>;
  }

  return <div style={{ position: 'relative', padding: '14px 16px 24px' }}>
    <p style={{ fontSize: 14, fontWeight: 700, color: '#667085', margin: '0 0 16px' }}>{current >= lesson.levels.length ? '✓ Parcours terminé' : `Niveau ${Math.min(current + 1, lesson.levels.length)} sur ${lesson.levels.length}`}</p>
    <div style={{ display: 'flex', flexDirection: 'column' }}>{lesson.levels.map((level, index) => {
      const mastered = (completed[level.id] ?? 0) >= (level.lesson.mastery.threshold ?? 0.8);
      const state = mastered ? 'completed' : getLessonLevelState(index, Math.max(0, current), lesson.levels.length);
      const resumable = state === 'current' && (positions[level.id] ?? 0) > 0;
      const levelLabel = LESSON_LEVEL_LABELS[level.level_number - 1] ?? `Étape ${level.level_number}`;
      return <div key={level.id} data-testid="lesson-level-card" data-level-state={state} style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}><div style={{ width: 2, flex: 1, minHeight: 10, background: index <= current ? '#12C6A0' : '#EAECEF', opacity: index === 0 ? 0 : 1 }} /><div style={{ position: 'relative', flexShrink: 0 }}><div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: state === 'completed' ? '#12C6A0' : state === 'current' ? 'white' : '#F3F6FA', border: state === 'current' ? '2.5px solid #12C6A0' : state === 'completed' ? 'none' : '1.5px solid #EAECEF' }}>{state === 'completed' && <Check className="h-5 w-5" style={{ color: 'white' }} strokeWidth={3} />}{state === 'current' && <Play className="h-5 w-5" style={{ color: '#12C6A0', marginLeft: 2 }} fill="#12C6A0" />}{state === 'locked' && <Lock className="h-4 w-4" style={{ color: '#9CA3AF' }} />}</div></div><div style={{ width: 2, flex: 1, minHeight: 10, background: index < current ? '#12C6A0' : '#EAECEF', opacity: index === lesson.levels.length - 1 ? 0 : 1 }} /></div>
        <button disabled={state === 'locked'} onClick={() => setSelected(index)} style={{ flex: 1, minWidth: 0, textAlign: 'left', margin: '6px 0', padding: '14px 16px', borderRadius: 16, cursor: state === 'locked' ? 'default' : 'pointer', fontFamily: 'Poppins, sans-serif', background: state === 'current' ? '#F2FBF8' : state === 'completed' ? 'white' : '#F8FAFC', border: state === 'current' ? '1px solid #9FE1CB' : '0.5px solid #EAECEF', opacity: state === 'locked' ? 0.7 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 11, fontWeight: 800, color: state === 'locked' ? '#9CA3AF' : '#12B894', letterSpacing: '0.03em' }}>NIVEAU {level.level_number} — {levelLabel}</span>{state === 'completed' && <span style={{ fontSize: 11, fontWeight: 700, color: '#085041' }}>· Terminé ✓</span>}</div>
          {!levelLabelsOnly && <p style={{ fontSize: 16, fontWeight: 800, color: state === 'locked' ? '#9CA3AF' : '#0F172A', margin: '4px 0 0', lineHeight: 1.3 }}>{level.title}</p>}
          {state === 'current' && <><p style={{ fontSize: 13, color: '#667085', margin: '6px 0 0', lineHeight: 1.45 }}>{level.lesson.lesson_goal}</p><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 11, padding: '8px 16px', borderRadius: 999, background: '#55C6A5', color: '#0F172A', fontSize: 13, fontWeight: 800 }}>{resumable ? 'Continuer →' : 'Commencer →'}</span></>}
          {state === 'completed' && <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0', fontWeight: 600 }}>Appuie pour revoir</p>}
          {state === 'locked' && <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0', fontWeight: 600 }}>Termine le niveau précédent</p>}
        </button>
      </div>;
    })}</div>
  </div>;
}
