import { Pencil } from 'lucide-react';

type PenCountModelProps = {
  value: number;
};

/** A static, countable picture made from pen icons in packs of ten and loose ones. */
export function PenCountModel({ value }: PenCountModelProps) {
  const safeValue = Math.max(0, Math.min(100, Math.floor(value)));
  const bundles = Math.floor(safeValue / 10);
  const ones = safeValue % 10;

  return (
    <div role="img" aria-label={`Picture of pens arranged in bundles of ten and single pens`} className="rounded-2xl bg-[#F7F8FC] p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: bundles }, (_, bundleIndex) => (
          <div key={`bundle-${bundleIndex}`} data-testid="pen-bundle" className="rounded-xl border-2 border-[#5145B5] bg-[#F0EEFF] p-2">
            <div className="grid grid-cols-5 justify-items-center gap-y-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, penIndex) => <Pencil key={penIndex} className="h-4 w-4 text-[#5145B5]" strokeWidth={2.6} />)}
            </div>
          </div>
        ))}
        {ones > 0 && (
          <div data-testid="single-pens" className="flex min-h-14 flex-wrap content-center justify-center gap-1 rounded-xl border border-dashed border-[#D99A2B] bg-[#FFF9EB] p-2" aria-hidden="true">
            {Array.from({ length: ones }, (_, penIndex) => <Pencil key={`single-${penIndex}`} className="h-4 w-4 text-[#A96B08]" strokeWidth={2.6} />)}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#667085]" aria-hidden="true">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-[#5145B5] bg-[#F0EEFF]" />Each outlined bundle has 10 pens</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-[#D99A2B] bg-[#FFF9EB]" />Single pens</span>
      </div>
    </div>
  );
}
