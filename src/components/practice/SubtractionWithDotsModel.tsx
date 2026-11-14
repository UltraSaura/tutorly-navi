import { Apple, BookOpen, Pencil, Star, type LucideIcon } from 'lucide-react';
import { countSubtractionObjectsByColor, makeScatteredObjectPositions, normalizeSubtractionObject, subtractionObjectColor, subtractionObjectName, SUBTRACTION_COLOR_STYLES, type SubtractionColor, type SubtractionObject } from '@/features/practice/subtractionWithDots';

type SubtractionWithDotsModelProps = {
  targetCount: number;
  dotsAdded: number;
  dotsRemoved: number;
  object?: SubtractionObject;
  seed?: string;
  showAllRemoved?: boolean;
  countColor?: SubtractionColor;
  /** Hide computed totals while the learner is still answering. */
  revealAnswerCount?: boolean;
};

const objectIcons: Partial<Record<SubtractionObject, LucideIcon>> = {
  pencil: Pencil,
  apple: Apple,
  book: BookOpen,
  star: Star,
};

export function SubtractionWithDotsModel({ targetCount, dotsAdded, dotsRemoved, object: objectValue, seed = 'subtraction', showAllRemoved = true, countColor, revealAnswerCount = true }: SubtractionWithDotsModelProps) {
  const object = normalizeSubtractionObject(objectValue);
  const plural = subtractionObjectName(object, targetCount);
  const totalVisible = Math.min(targetCount, Math.max(0, dotsAdded));
  const removed = Math.min(totalVisible, Math.max(0, dotsRemoved));
  const remaining = totalVisible - removed;
  const positions = makeScatteredObjectPositions(totalVisible, seed);
  const Icon = objectIcons[object];
  const colorCount = countColor ? countSubtractionObjectsByColor(remaining, seed, countColor) : null;
  const sizeClass = totalVisible > 50 ? 'h-3 w-3' : totalVisible > 24 ? 'h-4 w-4' : totalVisible > 12 ? 'h-6 w-6' : 'h-8 w-8 sm:h-9 sm:w-9';

  const renderObject = (index: number, takenAway = false) => {
    const position = positions[index];
    const color = subtractionObjectColor(index, seed);
    const palette = SUBTRACTION_COLOR_STYLES[color];
    return (
      <span
        key={`${takenAway ? 'taken' : 'left'}-${index}`}
        data-testid={takenAway ? 'subtraction-object-taken' : 'subtraction-object-left'}
        data-object-color={color}
        role={revealAnswerCount ? undefined : 'img'}
        aria-label={revealAnswerCount ? undefined : `${palette.label} ${subtractionObjectName(object, 1)}${takenAway ? ', crossed out' : ', still here'}`}
        aria-hidden={revealAnswerCount ? 'true' : undefined}
        className={`absolute flex ${sizeClass} -translate-x-1/2 -translate-y-1/2 items-center justify-center ${takenAway ? 'opacity-40 grayscale' : 'drop-shadow-sm'}`}
        style={{ left: `${position.left}%`, top: `${position.top}%` }}
      >
        {object === 'bubble'
          ? <span className={`${sizeClass} rounded-full border-2`} style={{ backgroundColor: takenAway ? '#F2F4F7' : palette.fill, borderColor: takenAway ? '#98A2B3' : palette.stroke }} />
          : Icon && <Icon className={sizeClass} stroke={takenAway ? '#98A2B3' : palette.stroke} strokeWidth={2.4} fill={takenAway ? '#E4E7EC' : palette.fill} />}
        {takenAway && <span className="absolute text-lg font-bold leading-none text-[#667085]">×</span>}
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-[#F6F5FF] p-4" data-testid="subtraction-with-dots-model">
      {revealAnswerCount && <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#344054]">{removed > 0 ? `${plural[0].toUpperCase()}${plural.slice(1)} left: ${remaining}` : `${plural[0].toUpperCase()}${plural.slice(1)}: ${totalVisible} of ${targetCount}`}</p>
        {showAllRemoved && <p className="text-sm font-semibold text-[#667085]">Taken away: {removed}</p>}
      </div>}
      <div role={revealAnswerCount ? 'img' : 'group'} aria-label={revealAnswerCount
        ? `${remaining} ${subtractionObjectName(object, remaining)} left; ${removed} taken away${countColor ? `; ${colorCount} ${SUBTRACTION_COLOR_STYLES[countColor].label} ${subtractionObjectName(object, colorCount)} left` : ''}`
        : `Count the ${countColor ? `${SUBTRACTION_COLOR_STYLES[countColor].label} ` : ''}${plural}. Objects marked with a cross have been taken away.`} className="relative mt-3 aspect-[1.65/1] min-h-40 overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        {Array.from({ length: remaining }, (_, index) => renderObject(index))}
        {showAllRemoved && Array.from({ length: removed }, (_, index) => renderObject(remaining + index, true))}
        {totalVisible === 0 && <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#667085]">No {plural} yet</span>}
      </div>
      {countColor && <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-[#475467]"><span aria-hidden="true" className="h-4 w-4 rounded-full border" style={{ backgroundColor: SUBTRACTION_COLOR_STYLES[countColor].fill, borderColor: SUBTRACTION_COLOR_STYLES[countColor].stroke }} />Count the {SUBTRACTION_COLOR_STYLES[countColor].label} {plural}</p>}
      {revealAnswerCount && <p className="mt-3 text-center text-sm font-semibold text-[#475467]" aria-live="polite">
        {removed > 0 ? `${removed} of ${targetCount} ${plural} taken away` : `${totalVisible} of ${targetCount} ${plural} added`}
      </p>}
    </div>
  );
}
