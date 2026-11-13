type SubtractionWithDotsModelProps = {
  targetCount: number;
  dotsAdded: number;
  dotsRemoved: number;
  showAllRemoved?: boolean;
};

export function SubtractionWithDotsModel({ targetCount, dotsAdded, dotsRemoved, showAllRemoved = true }: SubtractionWithDotsModelProps) {
  const totalVisible = Math.min(targetCount, Math.max(0, dotsAdded));
  const removed = Math.min(totalVisible, Math.max(0, dotsRemoved));
  const remaining = totalVisible - removed;

  return (
    <div className="rounded-2xl bg-[#F6F5FF] p-4" data-testid="subtraction-with-dots-model">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#344054]">{removed > 0 ? `Bubbles left: ${remaining}` : `Bubbles: ${totalVisible} of ${targetCount}`}</p>
        {showAllRemoved && <p className="text-sm font-semibold text-[#667085]">Taken away: {removed}</p>}
      </div>
      <div role="img" aria-label={`${remaining} bubbles left; ${removed} taken away`} className="mt-3 flex min-h-32 flex-wrap content-center justify-center gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4">
        {Array.from({ length: remaining }, (_, index) => <span key={`left-${index}`} aria-hidden="true" className="h-9 w-9 rounded-full bg-[#7565D8] shadow-sm sm:h-11 sm:w-11" />)}
        {showAllRemoved && Array.from({ length: removed }, (_, index) => <span key={`taken-${index}`} aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-[#98A2B3] bg-[#F2F4F7] text-lg text-[#667085] sm:h-11 sm:w-11"><span aria-hidden="true">×</span></span>)}
        {totalVisible === 0 && <span className="text-sm font-semibold text-[#667085]">No bubbles yet</span>}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-[#475467]" aria-live="polite">
        {removed > 0 ? `${removed} of ${targetCount} bubbles taken away` : `${totalVisible} of ${targetCount} bubbles added`}
      </p>
    </div>
  );
}
