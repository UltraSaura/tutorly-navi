import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SubjectPastelCard } from './SubjectPastelCard';
import { getSubjectPastelVisuals } from './subjectPastelVisuals';

describe('SubjectPastelCard', () => {
  it('shares the pastel subject identity and accessible navigation between lesson and practice cards', () => {
    const html = renderToStaticMarkup(
      <SubjectPastelCard
        slug="mathematiques"
        title="Maths"
        meta={<span>12 leçons</span>}
        onClick={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="Maths"');
    expect(html).toContain('data-testid="subject-pastel-card"');
    expect(html).toContain('data-subject-slug="mathematiques"');
    expect(html).toContain('#E6EDFF');
    expect(html).toContain('12 leçons');
  });

  it('keeps the progress indicator readable at mobile-sized cards', () => {
    const html = renderToStaticMarkup(
      <SubjectPastelCard
        slug="fractions"
        title="Fractions"
        progress={{ completed: 1, total: 4 }}
        onClick={vi.fn()}
      />,
    );

    expect(html).toContain('25% terminé');
    expect(html).toContain('1/4');
  });
});

describe('subject pastel visuals', () => {
  it.each([
    ['mathematiques', '#285AC4'],
    ['francais', '#9445A8'],
    ['sciences', '#168A52'],
    ['histoire', '#B77716'],
    ['geographie', '#2584B8'],
    ['autre', '#667085'],
  ])('maps %s to the expected pastel icon color', (slug, icon) => {
    expect(getSubjectPastelVisuals(slug).icon).toBe(icon);
  });
});
