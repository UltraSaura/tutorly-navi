import { countersToNextTen, getUnitsDigit } from '@/features/practice/additionAcrossTen';

type AdditionAcrossTenModelProps = {
  startNumber: number;
  addend: number;
  movedToTen: number;
};

export function AdditionAcrossTenModel({ startNumber, addend, movedToTen }: AdditionAcrossTenModelProps) {
  const startUnits = getUnitsDigit(startNumber);
  const moveLimit = Math.min(countersToNextTen(startNumber), addend);
  const moved = Math.max(0, Math.min(moveLimit, movedToTen));
  const remaining = addend - moved;
  const nextTen = startNumber - startUnits + 10;

  return (
    <div className="rounded-2xl bg-[#F6F5FF] p-4" data-testid="addition-across-ten-model">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-center">
          <p className="text-xs font-semibold text-[#667085]">Start at</p>
          <p className="text-2xl font-extrabold text-[#27346A]">{startNumber}</p>
        </div>
        <span className="text-xl font-extrabold text-[#5145B5]" aria-hidden="true">+</span>
        <div className="text-center">
          <p className="text-xs font-semibold text-[#667085]">Add</p>
          <p className="text-2xl font-extrabold text-[#27346A]">{addend}</p>
        </div>
        <span className="text-xl font-extrabold text-[#5145B5]" aria-hidden="true">=</span>
        <div className="text-center">
          <p className="text-xs font-semibold text-[#667085]">Total</p>
          <p className="text-2xl font-extrabold text-[#667085]">?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-2 text-sm font-bold text-[#344054]">Fill the next ten: {nextTen}</p>
          <div role="img" aria-label={`${startUnits + moved} of 10 spaces filled`} className="grid grid-cols-5 gap-1.5 rounded-xl border-2 border-[#5145B5] bg-white p-2">
            {Array.from({ length: 10 }, (_, index) => {
              const isStarting = index < startUnits;
              const isMoved = index >= startUnits && index < startUnits + moved;
              const isFilled = isStarting || isMoved;
              return <span key={index} aria-hidden="true" className={`flex aspect-square items-center justify-center rounded-md border ${isStarting ? 'border-[#5145B5] bg-[#E8E5FF]' : isMoved ? 'border-[#087F68] bg-[#DDF6EE]' : 'border-[#D0D5DD] bg-white'}`}>
                {isFilled && <span className={`h-3 w-3 rounded-full sm:h-4 sm:w-4 ${isMoved ? 'bg-[#087F68]' : 'bg-[#5145B5]'}`} />}
              </span>;
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[#475467]">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#5145B5]" />Already in the number</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#087F68]" />Moved to the ten</span>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-[#344054]">Counters left: {remaining}</p>
          <div role="img" aria-label={`${remaining} counters left to add`} className="flex min-h-[88px] flex-wrap content-start gap-1.5 rounded-xl border border-[#E4E7EC] bg-white p-2 sm:min-h-[112px] sm:gap-2 sm:p-3">
            {Array.from({ length: remaining }, (_, index) => <span key={index} aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-[#E8AA37] bg-[#FFF7E3] sm:h-7 sm:w-7"><span className="h-2.5 w-2.5 rounded-full bg-[#E8AA37] sm:h-3 sm:w-3" /></span>)}
            {remaining === 0 && <span className="text-sm font-semibold text-[#087F68]">All counters moved</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
