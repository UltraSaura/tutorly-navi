import { useEffect, useMemo, useState } from 'react';
import { Lock, Play, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { LessonV2Player } from './LessonV2Player';
import type { LessonV21 } from '@/types/lesson-generator';
import { updateMasteryFromTaskResult } from '@/lib/mastery';

type Props = { topicId: string; subjectId?: string | null; topicName: string; lesson: LessonV21 };
const key = (topicId: string) => `stuwy:v21-levels:${topicId}`;

export function LessonV21Path({ topicId, subjectId, topicName, lesson }: Props) {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { try { const raw = localStorage.getItem(key(topicId)); if (raw) setCompleted(JSON.parse(raw)); } catch { /* ignore */ } }, [topicId]);
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
  if (selected != null) {
    const level = lesson.levels[selected];
    return <div className="fixed inset-0 z-50 flex flex-col bg-background"><div className="flex items-center gap-3 border-b bg-white p-3"><button onClick={() => setSelected(null)} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase text-primary">NIVEAU {selected + 1} / {lesson.levels.length}</p><p className="font-bold">{level.title}</p></div></div><div className="min-h-0 flex-1"><LessonV2Player topicId={topicId} subjectId={subjectId} topicName={topicName} lesson={level.lesson} onMasteryResult={(score) => persist(selected, score)} /></div></div>;
  }
  return <div className="space-y-3 p-4"><p className="text-sm font-bold text-muted-foreground">{current >= lesson.levels.length ? '✓ Parcours terminé' : `Niveau ${Math.min(current + 1, lesson.levels.length)} / ${lesson.levels.length}`}</p>{lesson.levels.map((level, index) => { const mastered = (completed[level.id] ?? 0) >= (level.lesson.mastery.threshold ?? 0.8); const open = unlock(index); return <button key={level.id} disabled={!open} onClick={() => setSelected(index)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${mastered ? 'border-primary bg-primary/5' : open ? 'border-primary/40 bg-white' : 'border-muted bg-muted/30 opacity-60'}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">{mastered ? <Check className="h-5 w-5" /> : open ? <Play className="h-5 w-5" /> : <Lock className="h-4 w-4" />}</span><span><span className="block text-xs font-bold uppercase text-primary">NIVEAU {index + 1}</span><span className="block font-bold">{level.title}</span><span className="block text-sm text-muted-foreground">{level.purpose}</span></span></button>; })}</div>;
}
