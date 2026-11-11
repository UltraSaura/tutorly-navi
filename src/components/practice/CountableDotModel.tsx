type CountableDotModelProps = {
  value: number;
  maximum?: number;
};

/** A responsive dot model where each full row represents ten countable dots. */
export function CountableDotModel({ value, maximum = 100 }: CountableDotModelProps) {
  const safeValue = Math.max(0, Math.min(maximum, Math.floor(value)));
  const tens = Math.floor(safeValue / 10);
  const ones = safeValue % 10;
  const tensLabel = tens === 1 ? 'group of ten' : 'groups of ten';
  const dots = Array.from({ length: safeValue }, (_, index) => index);

  return (
    <div role="img" className="rounded-2xl bg-[#F7F8FC] p-4 sm:p-5" aria-label={`${safeValue} dots: ${tens} ${tensLabel} and ${ones} ones`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#475467]">{tens} {tensLabel}{ones > 0 ? ` and ${ones} ones` : ''}</span>
        <span className="rounded-full bg-white px-3 py-1 text-lg font-extrabold tabular-nums" aria-live="polite">{safeValue}</span>
      </div>
      <div className="grid grid-cols-10 justify-items-center gap-1.5 sm:gap-2" aria-hidden="true">
        {dots.map((dot) => <span key={dot} data-dot="true" className={`h-4 w-4 rounded-full sm:h-5 sm:w-5 ${dot < tens * 10 ? 'bg-[#5145B5]' : 'bg-[#E7A841]'}`} />)}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#667085]">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#5145B5]" />Each group of 10</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#E7A841]" />Extra ones</span>
      </div>
    </div>
  );
}
