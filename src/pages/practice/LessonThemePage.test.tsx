import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LessonThemePage from './LessonThemePage';

const { state, dashboard } = vi.hoisted(() => ({
  state: {
    isLoading: false,
    data: { categories: [{ name: 'Géométrie', topics: [
      { id: 'published', slug: 'aires', name: 'Aires', order_index: 1, lesson_content: { explanation: 'Fixture', example: 'Fixture example' } },
      { id: 'unpublished', slug: 'draft', name: 'Solides', order_index: 2, lesson_content: null },
    ] }] },
  },
  dashboard: vi.fn(),
}));

vi.mock('@/hooks/useSubjectDashboard', () => ({ useSubjectDashboard: (subject: string) => { dashboard(subject); return state; } }));
vi.mock('@/components/seo/PageMeta', () => ({ PageMeta: () => null }));
vi.mock('@/components/learning/LessonV21Path', () => ({ LessonV21Path: () => <div>V2.1 path</div> }));
vi.mock('@/components/learning/LegacyThemePath', () => ({ LegacyThemePath: ({ entries }: { entries: Array<{ topicId: string }> }) => <div>{entries.map((entry) => entry.topicId).join(',')}</div> }));

function render(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/learning/:subjectSlug/theme/:themeId" element={<LessonThemePage />} />
      <Route path="/practice/:subject/theme/:themeId" element={<LessonThemePage />} />
    </Routes></MemoryRouter>,
  );
}

describe('published theme reader data source', () => {
  beforeEach(() => { state.isLoading = false; dashboard.mockClear(); });

  it.each(['/learning/mathematiques/theme/aires', '/practice/mathematiques/theme/aires'])('loads published content for %s', (path) => {
    const html = render(path);
    expect(dashboard).toHaveBeenCalledWith('mathematiques');
    expect(html).toContain('data-topic-ids="published"');
    expect(html).toContain('published</div>');
    expect(html).not.toContain('unpublished');
  });

  it('keeps loading and unavailable states', () => {
    state.isLoading = true;
    expect(render('/learning/mathematiques/theme/aires')).toContain('Chargement');
    state.isLoading = false;
    expect(render('/learning/mathematiques/theme/solides')).toContain('Ce thème n’est pas disponible.');
  });
});
