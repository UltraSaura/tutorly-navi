import { describe, expect, it } from 'vitest';
import { isExplanationDemoHost } from './previewAccess';
describe('Explanation V2 preview route access', () => {
  it('accepts the actual Vercel preview hostnames', () => {
    expect(isExplanationDemoHost('tutorly-navi-7qlw5tkp0-stuwy.vercel.app', false)).toBe(true);
    expect(isExplanationDemoHost('stuwy-git-feature-explanation-v2-interactive-math-stuwy.vercel.app', false)).toBe(true);
  });
  it('does not expose the demo on production or unrelated hostnames', () => {
    expect(isExplanationDemoHost('stuwy.vercel.app', false)).toBe(false);
    expect(isExplanationDemoHost('tutorly.example.com', false)).toBe(false);
    expect(isExplanationDemoHost('fake-stuwy.vercel.app.evil.com', false)).toBe(false);
  });
  it('allows local development', () => {
    expect(isExplanationDemoHost('localhost', true)).toBe(true);
  });
});
