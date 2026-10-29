import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Lock, Play } from 'lucide-react';
import { LessonV2Player } from './LessonV2Player';
import { LessonContentStudent } from './LessonContentStudent';
import type { LessonV2 } from '@/types/lesson-generator';
import { learnerStorageKey } from '@/features/family/profileRuntime';

type Entry = { topicId: string; topicLabel: string; lesson?: LessonV2 };
type Props = { entries: Entry[]; topicName: string; subjectId?: string | null };

/** Compatibility path for persisted V2 lessons; it never pads a legacy payload. */
export function LegacyThemePath({ entries, topicName, subjectId }: Props) {
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const storageKey = learnerStorageKey(`stuwy:legacy-theme:${entries.map((entry) => entry.topicId).join(',')}`);

  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) setCompleted(JSON.parse(raw)); } catch { /* ignore corrupt local progress */ }
  }, [storageKey]);

  if (selected != null) {
    const entry = entries[selected];
    if (!entry) return null;
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b bg-white p-3">
          <button onClick={() => setSelected(null)} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></button>
          <p className="text-xs font-bold uppercase text-primary">Leçon {selected + 1}</p>
        </div>
        <div className="min-h-0 flex-1">
          {entry.lesson ? <LessonV2Player topicId={entry.topicId} subjectId={subjectId} topicName={topicName} lesson={entry.lesson} onMasteryResult={(score) => {
            const next = { ...completed, [entry.topicId]: Math.max(completed[entry.topicId] ?? 0, score) };
            setCompleted(next);
            try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
          }} /> : <LessonContentStudent topicId={entry.topicId} />}
        </div>
      </div>
    );
  }

  const firstIncomplete = entries.findIndex((entry) => (completed[entry.topicId] ?? 0) < (entry.lesson?.mastery.threshold ?? 0.8));
  const nextIndex = firstIncomplete === -1 ? entries.length : firstIncomplete;
  return (
    <div style={{ position: 'relative', padding: '14px 16px 24px', fontFamily: 'Poppins, sans-serif' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#667085', margin: '0 0 16px' }}>{nextIndex >= entries.length ? '✓ Parcours terminé' : `Leçon ${nextIndex + 1} sur ${entries.length}`}</p>
      {entries.map((entry, index) => {
        const isCompleted = (completed[entry.topicId] ?? 0) >= (entry.lesson?.mastery.threshold ?? 0.8);
        const state = isCompleted ? 'completed' : index === nextIndex ? 'current' : 'locked';
        return (
          <div key={entry.topicId} data-testid="lesson-level-card" data-level-state={state} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0' }}>
            {state === 'completed' ? <Check className="h-5 w-5 text-emerald-500" /> : state === 'locked' ? <Lock className="h-5 w-5 text-slate-400" /> : <Play className="h-5 w-5 text-emerald-500" />}
            <button disabled={state === 'locked'} onClick={() => setSelected(index)} className="flex-1 rounded-2xl border bg-white p-4 text-left">
              <span className="font-bold">Leçon {index + 1}</span>
              {state === 'locked' && <span className="ml-2 text-xs text-slate-500">Termine la précédente</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
