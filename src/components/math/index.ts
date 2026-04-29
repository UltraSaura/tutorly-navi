import { lazy } from 'react';

export const MathLiveInput = lazy(() =>
  import('./MathLiveInput').then(m => ({ default: m.MathLiveInput }))
);
export { MathRenderer } from './MathRenderer';
export { MathInputToggle } from './MathInputToggle';
