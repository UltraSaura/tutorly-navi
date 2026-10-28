import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PedagogicalVisual } from './PedagogicalVisual';
import { SOLID_GALLERY_FIXTURES } from '../../../shared/solid-visual-contract';
import { INVALID_DISJOINT_CUBE_NET } from '../../../shared/solid-net-contract';

const block = (data: unknown) => ({
  title: 'Solide',
  content: 'Représentation du solide.',
  visual: { kind: 'geometric_solid', data, alt_text: 'Solide de test' },
});

describe('geometric_solid renderer parity', () => {
  it('renders a distinct SVG representation for every supported solid', () => {
    const markup = Object.entries(SOLID_GALLERY_FIXTURES).map(([type, data]) => renderToStaticMarkup(<PedagogicalVisual block={block(data)} />));
    for (const [index, type] of Object.keys(SOLID_GALLERY_FIXTURES).entries()) {
      expect(markup[index]).toContain(`data-testid="visual-card"`);
      expect(markup[index]).toContain(type === 'rectangular_prism' ? 'Pavé droit' : type === 'sphere' ? 'Boule' : type === 'cube' ? 'Cube' : type === 'cone' ? 'Cône' : type === 'cylinder' ? 'Cylindre' : type === 'pyramid' ? 'Pyramide' : 'Prisme droit');
      expect(markup[index]).toContain('<svg');
      expect(markup[index]).toContain('schéma non à l’échelle');
    }
    expect(markup[0]).not.toBe(markup[1]);
  });

  it('shows unavailability instead of silently drawing another solid', () => {
    const markup = renderToStaticMarkup(<PedagogicalVisual block={block({ solidType: 'unknown', dimensions: { edge: 2 } })} />);
    expect(markup).toContain('Solide indisponible');
    expect(markup).not.toContain('6 faces carrées');
  });

  it('does not render a structurally invalid net', () => {
    const markup = renderToStaticMarkup(<PedagogicalVisual block={{ ...block(INVALID_DISJOINT_CUBE_NET), visual: { kind: 'diagram', data: INVALID_DISJOINT_CUBE_NET, alt_text: 'Patron' } }} />);
    expect(markup).toContain('Patron indisponible');
    expect(markup).not.toContain('diagram-arrow');
  });
});
