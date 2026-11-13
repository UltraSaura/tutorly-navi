import { Apple, BookOpen, Pencil, Star } from 'lucide-react';
import { CountableObject } from '@/features/practice/countingExercise';

const objectDetails = {
  pencil: { singular: 'pencil', plural: 'pencils', Icon: Pencil },
  apple: { singular: 'apple', plural: 'apples', Icon: Apple },
  book: { singular: 'book', plural: 'books', Icon: BookOpen },
  star: { singular: 'star', plural: 'stars', Icon: Star },
} satisfies Record<CountableObject, { singular: string; plural: string; Icon: typeof Pencil }>;

type CountableObjectModelProps = {
  object: CountableObject;
  value: number;
};

/** Renders exercise data as countable groups and loose objects; it never reveals the total. */
export function CountableObjectModel({ object, value }: CountableObjectModelProps) {
  const safeValue = Math.max(0, Math.min(100, Math.floor(value)));
  const bundles = Math.floor(safeValue / 10);
  const ones = safeValue % 10;
  const { Icon, plural } = objectDetails[object];
  return (
    <div role="img" aria-label={`Picture of ${plural} arranged in groups of ten and single ${plural}`} className="rounded-2xl bg-[#F7F8FC] p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: bundles }, (_, groupIndex) => (
          <div key={`group-${groupIndex}`} data-testid="countable-group" className="rounded-xl border-2 border-[#5145B5] bg-[#F0EEFF] p-2">
            <div className="grid grid-cols-5 justify-items-center gap-y-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, itemIndex) => <Icon key={itemIndex} className="h-4 w-4 text-[#5145B5]" strokeWidth={2.6} />)}
            </div>
          </div>
        ))}
        {ones > 0 && (
          <div data-testid="single-objects" className="flex min-h-14 flex-wrap content-center justify-center gap-1 rounded-xl border border-dashed border-[#D99A2B] bg-[#FFF9EB] p-2" aria-hidden="true">
            {Array.from({ length: ones }, (_, itemIndex) => <Icon key={`single-${itemIndex}`} className="h-4 w-4 text-[#A96B08]" strokeWidth={2.6} />)}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#667085]" aria-hidden="true">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-[#5145B5] bg-[#F0EEFF]" />Each group has 10</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-[#D99A2B] bg-[#FFF9EB]" />Single {plural}</span>
      </div>
    </div>
  );
}

