export type SlotPipelineSlot = { slotId: string; family: string };
export type SlotPipelineOutcome = { ok: true; value?: unknown } | { ok: false; errors: unknown[] };

export async function runBoundedSlotPipeline<T>({
  slots,
  initial,
  adapt,
  regenerate,
}: {
  slots: SlotPipelineSlot[];
  initial: Record<string, T>;
  adapt: (slot: SlotPipelineSlot, raw: T) => SlotPipelineOutcome;
  regenerate: (slot: SlotPipelineSlot, firstErrors: unknown[]) => Promise<T>;
}): Promise<{ results: Record<string, { attempt: number; ok: boolean; raw: T; errors: unknown[] }>; regenerationCalls: number }> {
  const results: Record<string, { attempt: number; ok: boolean; raw: T; errors: unknown[] }> = {};
  let regenerationCalls = 0;
  for (const slot of slots) {
    const firstRaw = initial[slot.slotId];
    const first = adapt(slot, firstRaw);
    if (first.ok) {
      results[slot.slotId] = { attempt: 1, ok: true, raw: firstRaw, errors: [] };
      continue;
    }
    regenerationCalls += 1;
    const regeneratedRaw = await regenerate(slot, first.errors);
    const regenerated = adapt(slot, regeneratedRaw);
    results[slot.slotId] = { attempt: 2, ok: regenerated.ok, raw: regeneratedRaw, errors: regenerated.ok ? [] : regenerated.errors };
  }
  return { results, regenerationCalls };
}
