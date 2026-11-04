import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';
import { getSubjectPastelVisuals, subjectPastelIcons } from './subjectPastelVisuals';

type SubjectPastelCardProps = {
  slug: string;
  title: string;
  iconName?: string | null;
  iconImageUrl?: string | null;
  colorScheme?: string | null;
  textColor?: string | null;
  titleFontSize?: number;
  titleFontFamily?: string;
  meta?: ReactNode;
  progress?: { completed: number; total: number };
  onClick: () => void;
};

export function SubjectPastelCard({
  slug,
  title,
  iconName,
  iconImageUrl,
  colorScheme,
  textColor,
  titleFontSize = 18,
  titleFontFamily = 'Poppins, sans-serif',
  meta,
  progress,
  onClick,
}: SubjectPastelCardProps) {
  const colors = getSubjectPastelVisuals(slug, colorScheme);
  const Icon = subjectPastelIcons[slug] ?? null;
  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <button
      type="button"
      aria-label={title}
      data-testid="subject-pastel-card"
      data-subject-slug={slug}
      onClick={onClick}
      className="relative flex aspect-square min-h-[160px] w-full flex-col items-center justify-between rounded-[28px] p-4 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ backgroundColor: colors.bg, ['--tw-ring-color' as string]: colors.icon }}
    >
      <span
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/65 p-3"
        style={{ color: colors.icon }}
      >
        {iconImageUrl ? (
          <img src={iconImageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
        ) : Icon ? (
          <Icon className="h-10 w-10 stroke-[2.6]" aria-hidden="true" />
        ) : (
          <DynamicIcon name={iconName ?? 'book-open'} className="h-10 w-10 stroke-[2.6]" aria-hidden="true" />
        )}
      </span>
      <div className="w-full space-y-1.5 rounded-2xl bg-white/70 px-2 py-2">
        <h2
          className="line-clamp-2 font-extrabold leading-tight tracking-normal"
          style={{ color: textColor ?? '#162033', fontSize: `${titleFontSize}px`, fontFamily: titleFontFamily }}
        >
          {title}
        </h2>
        {meta}
        {progress && (
          <div aria-label={`${progressPercent}% terminé`} className="pt-1">
            <div className="h-1 overflow-hidden rounded-full bg-slate-900/10">
              <div className="h-full rounded-full bg-[#12C6A0]" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-0.5 text-[9px] text-slate-900/50">{progress.completed}/{progress.total}</p>
          </div>
        )}
      </div>
      <span className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#162033] shadow-[0_8px_20px_rgba(15,23,42,0.09)]">
        <ArrowRight className="h-5 w-5 stroke-[3]" aria-hidden="true" />
      </span>
    </button>
  );
}
