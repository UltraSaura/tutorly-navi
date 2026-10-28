import { GraduatedNumberLineActivity } from '@/features/practice/numberLine/GraduatedNumberLineActivity';
import type { GraduatedNumberLineConfiguration, GraduatedNumberLineResult } from '@/features/practice/numberLine/numberLineTypes';

/** Reusable lesson block adapter. Lesson content can render the same engine without duplicating validation. */
export function GraduatedNumberLineBlock({ configuration, onResult }: { configuration: GraduatedNumberLineConfiguration; onResult?: (result: GraduatedNumberLineResult) => void }) {
  return <GraduatedNumberLineActivity config={configuration} onResult={onResult} />;
}

export default GraduatedNumberLineBlock;
