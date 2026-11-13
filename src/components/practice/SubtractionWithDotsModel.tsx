import { Apple, BookOpen, Pencil, Star, type LucideIcon } from 'lucide-react';
import { makeScatteredObjectPositions, normalizeSubtractionObject, subtractionObjectName, type SubtractionObject } from '@/features/practice/subtractionWithDots';

type SubtractionWithDotsModelProps = {
  targetCount: number;
  dotsAdded: number;
  dotsRemoved: number;
  object?: SubtractionObject;
  seed?: string;
  showAllRemoved?: boolean;
};

const objectIcons: Partial<Record<SubtractionObject, LucideIcon>> = {
  pencil: Pencil,
  apple: Apple,
  book: BookOpen,
  star: Star,
};

export function SubtractionWithDotsModel({ targetCount, dotsAdded, dotsRemoved, object: objectValue, seed = 'subtraction', showAllRemoved = true }: SubtractionWithDotsModelProps) {
  const object = normalizeSubtractionObject(objectValue);
  const plural = subtractionObjectName(object, targetCount);
  const totalVisible = Math.min(targetCount, Math.max(0, dotsAdded));
  const removed = Math.min(totalVisible, Math.max(0, dotsRemoved));
  const remaining = totalVisible - removed;
  const positions = makeScatteredObjectPositions(totalVisible, seed);
  const Icon = objectIcons[object];

  const renderObject = (index: number, takenAway = false) => {
    const position = positions[index];
    return (
      <span
        key={`${takenAway ? 'taken' : 'left'}-${index}`}
        data-testid={takenAway ? 'subtraction-object-taken' : 'subtraction-object-left'}
        aria-hidden="true"
        className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:h-10 sm:w-10 ${takenAway ? 'text-[#98A2B3]' : 'text-[#5145B5]'}`}
        style={{ left: `${position.left}%`, top: `${position.top}%` }}
      >
        {object === 'bubble'
          ? <span className={`h-8 w-8 rounded-full sm:h-9 sm:w-9 ${takenAway ? 'border-2 border-dashed border-[#98A2B3] bg-[#F2F4F7]' : 'bg-[#7565D8] shadow-sm'}`} />
          : Icon && <Icon className={`h-8 w-8 sm:h-9 sm:w-9 ${takenAway ? 'opacity-40' : 'drop-shadow-sm'}`} strokeWidth={2.4} fill={object === 'star' && !takenAway ? 'currentColor' : 'none'} />}
        {takenAway && <span className="absolute text-lg font-bold leading-none text-[#667085]">×</span>}
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-[#F6F5FF] p-4" data-testid="subtraction-with-dots-model">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#344054]">{removed > 0 ? `${plural[0].toUpperCase()}${plural.slice(1)} left: ${remaining}` : `${plural[0].toUpperCase()}${plural.slice(1)}: ${totalVisible} of ${targetCount}`}</p>
        {showAllRemoved && <p className="text-sm font-semibold text-[#667085]">Taken away: {removed}</p>}
      </div>
      <div role="img" aria-label={`${remaining} ${subtractionObjectName(object, remaining)} left; ${removed} taken away`} className="relative mt-3 aspect-[1.65/1] min-h-40 overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        {Array.from({ length: remaining }, (_, index) => renderObject(index))}
        {showAllRemoved && Array.from({ length: removed }, (_, index) => renderObject(remaining + index, true))}
        {totalVisible === 0 && <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#667085]">No {plural} yet</span>}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-[#475467]" aria-live="polite">
        {removed > 0 ? `${removed} of ${targetCount} ${plural} taken away` : `${totalVisible} of ${targetCount} ${plural} added`}
      </p>
    </div>
  );
}
