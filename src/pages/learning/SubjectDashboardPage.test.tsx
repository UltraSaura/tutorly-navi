import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SubjectDashboardPage, { learningThemePath } from './SubjectDashboardPage';

vi.mock('@/hooks/useSubjectDashboard', () => ({
  useSubjectDashboard: () => ({
    isLoading: false,
    error: null,
    data: {
      subject: { name: 'Mathématiques', slug: 'mathematiques' },
      categories: [
        { name: 'Calcul', topics: [
          { id: 'proportion-canonical', slug: 'proportion', name: 'Proportionnalité', order_index: 1, lesson_content: { version: '2.1' } },
          { id: 'proportion-numbers', slug: 'proportion-numbers', name: 'Proportionnalité (nombres)', order_index: 2, lesson_content: { version: '2.1' } },
          { id: 'proportion-geometry', slug: 'proportion-geometry', name: 'Proportionnalité (géométrie)', order_index: 3, lesson_content: { version: '2.1' } },
        ] },
        { name: 'Géométrie', topics: [
          { id: 'aires-canonical', slug: 'aires', name: 'Aires', order_index: 4, lesson_content: { version: '2.1' } },
          { id: 'aires-legacy', slug: 'les-aires', name: 'Les aires', order_index: 5, lesson_content: { version: '2.1' } },
          { id: 'draft', slug: 'draft', name: 'Solides', order_index: 6, lesson_content: null },
        ] },
      ],
    },
  }),
}));

vi.mock('@/i18n/useInterfaceTranslation', () => ({
  useInterfaceTranslation: () => (value: string) => value,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'fr' }, t: (value: string) => value }),
}));

vi.mock('@/utils/examSubjectMapping', () => ({
  getSubjectNameForSlug: () => 'Mathématiques',
}));

vi.mock('@/components/seo/PageMeta', () => ({
  PageMeta: () => null,
}));

describe('learning canonical theme route', () => {
  it('renders one canonical tile per theme without child titles or accordions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/learning/mathematiques']}>
        <Routes>
          <Route path="/learning/:subjectSlug" element={<SubjectDashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((html.match(/data-testid="lesson-theme-tile"/g) ?? [])).toHaveLength(2);
    expect(html).toContain('>Proportionnalité</span>');
    expect(html).toContain('>Aires</span>');
    expect(html).not.toContain('Proportionnalité (nombres)');
    expect(html).not.toContain('Proportionnalité (géométrie)');
    expect(html).not.toContain('Proportionnalité (mesures)');
    expect(html).not.toContain('Les aires');
    expect(html).not.toContain('<details');
  });

  it('keeps the learning route and theme id for the existing topic-backed page', () => {
    expect(learningThemePath('mathematiques', 'proportionnalite')).toBe('/learning/mathematiques/theme/proportionnalite');
  });
});
