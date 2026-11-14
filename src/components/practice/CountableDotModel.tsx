type CountableDotModelProps = {
  value: number;
  maximum?: number;
  showTotal?: boolean;
};

/** Countable dots shown as distinct groups of ten plus loose ones. */
export function CountableDotModel({ value, maximum = 100, showTotal = true }: CountableDotModelProps) {
  const safeValue = Math.max(0, Math.min(maximum, Math.floor(value)));
  const tens = Math.floor(safeValue / 10);
  const ones = safeValue % 10;
  const tensLabel = tens === 1 ? 'group of ten' : 'groups of ten';
  const groups = Array.from({ length: tens }, (_, index) => index);
  const onesDots = Array.from({ length: ones }, (_, index) => index);

  const modelDescription = showTotal
    ? `${safeValue} dots: ${tens} ${tensLabel} and ${ones} ones`
    : `Countable dots arranged as ${tens} ${tensLabel} and ${ones} ones`;

  return (
    <div role="img" className="rounded-2xl bg-[#F7F8FC] p-4 sm:p-5" aria-label={modelDescription}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#475467]">{tens} {tensLabel}{ones > 0 ? ` and ${ones} ones` : ''}</span>
        {showTotal && <span className="rounded-full bg-white px-3 py-1 text-lg font-extrabold tabular-nums" aria-live="polite">{safeValue}</span>}
      </div>
      <div className="flex flex-wrap items-start gap-2" aria-hidden="true">
        {groups.map((group) => <div key={`ten-${group}`} className="grid grid-cols-5 gap-1 rounded-xl border-2 border-[#5145B5] bg-[#F0EEFF] p-2" aria-label="Group of ten">
          {Array.from({ length: 10 }, (_, dot) => <span key={dot} data-dot="true" className="h-3.5 w-3.5 rounded-full bg-[#5145B5] sm:h-4 sm:w-4" />)}
        </div>)}
        {onesDots.length > 0 && <div className="flex max-w-40 flex-wrap content-start gap-1.5 rounded-xl border border-dashed border-[#D99A2B] bg-[#FFF9EB] p-2">
          {onesDots.map((dot) => <span key={`one-${dot}`} data-dot="true" className="h-3.5 w-3.5 rounded-full bg-[#E7A841] sm:h-4 sm:w-4" />)}
        </div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#667085]">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#5145B5]" />Each group of 10</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#E7A841]" />Extra ones</span>
      </div>
    </div>
  );
}
