import { PedagogicalVisual } from '@/components/learning/PedagogicalVisual';
import { SOLID_GALLERY_FIXTURES } from '../../../shared/solid-visual-contract';
import { INVALID_DISJOINT_CUBE_NET, VALID_CUBE_NET, VALID_RECTANGULAR_PRISM_NET } from '../../../shared/solid-net-contract';

const labels: Record<string, string> = {
  cube: 'Cube', rectangular_prism: 'Pavé droit', sphere: 'Boule', cone: 'Cône',
  cylinder: 'Cylindre', pyramid: 'Pyramide', prism: 'Prisme droit',
};

const card = (title: string, kind: string, data: unknown, content: string) => ({
  title, content, visual: { kind, data, purpose: 'Galerie provider-free', alt_text: title },
});

export default function SolidVisualGalleryPage() {
  const mobilePreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('viewport') === 'mobile';
  return <main className={`${mobilePreview ? 'max-w-[375px]' : 'max-w-7xl'} mx-auto space-y-6 p-6`} data-testid="solid-visual-gallery">
    <header>
      <h1 className="text-2xl font-bold">Galerie provider-free · solides et patrons</h1>
      <p className="mt-2 text-sm text-slate-600">Contrôle visuel local. Les schémas ne sont pas à l’échelle et ne servent pas à mesurer directement.</p>
      <p className="mt-1 text-sm text-slate-600">Les patrons sont vérifiés structurellement ; aucune construction interactive n’est évaluée ici.</p>
    </header>
    <section className={`grid gap-4 ${mobilePreview ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`} aria-label="Solides">
      {Object.entries(SOLID_GALLERY_FIXTURES).map(([type, data]) => <article key={type} className="rounded-xl border bg-white p-3 shadow-sm">
        <h2 className="mb-2 font-semibold">{labels[type]}</h2>
        <PedagogicalVisual block={card(labels[type], 'geometric_solid', data, 'Schéma non à l’échelle.')} />
      </article>)}
    </section>
    <section className={`grid gap-4 ${mobilePreview ? 'grid-cols-1' : 'lg:grid-cols-3'}`} aria-label="Patrons">
      <article className="rounded-xl border bg-white p-3 shadow-sm"><h2 className="mb-2 font-semibold">Fixture structurelle de cube</h2><PedagogicalVisual block={card('Fixture structurelle de cube', 'diagram', VALID_CUBE_NET, 'Structure plane acceptée ; pliage 3D non démontré.')} /></article>
      <article className="rounded-xl border bg-white p-3 shadow-sm"><h2 className="mb-2 font-semibold">Fixture structurelle de pavé</h2><PedagogicalVisual block={card('Fixture structurelle de pavé', 'diagram', VALID_RECTANGULAR_PRISM_NET, 'Structure plane acceptée ; pliage 3D non démontré.')} /></article>
      <article className="rounded-xl border bg-white p-3 shadow-sm"><h2 className="mb-2 font-semibold">Six carrés disjoints</h2><PedagogicalVisual block={card('Patron invalide', 'diagram', INVALID_DISJOINT_CUBE_NET, 'Rejeté par le contrat structurel.')} /></article>
    </section>
  </main>;
}
