import { validateLessonV21 } from '@/types/lesson-v21-contract';

const visualBlock = (id: string, title: string, content: string, visual: Record<string, unknown>) => ({ id, type: 'visual', title, content, visual });

export const geometryDraftLesson = {
  version: '2.1',
  topic_goal: 'Construire et décrire des figures planes avec des mesures cohérentes.',
  levels: [{
    id: 'geometry-draft-cm2', level_number: 1, title: 'Exemples complets de géométrie', purpose: 'Observer des figures entièrement dessinables.', difficulty: 'foundation', objective_ids: ['geometry-draft'],
    lesson: {
      lesson_goal: 'Identifier les éléments et propriétés de figures planes.',
      success_criteria: ['Je reconnais les sommets et les côtés.', 'Je relie chaque mesure à la bonne figure.'],
      prerequisites: [],
      misconceptions: [{ id: 'm1', description: 'Confondre rayon et diamètre.', detect_if: 'emploie diamètre pour un segment du centre au cercle', feedback: 'Le rayon part du centre ; le diamètre traverse le centre.', remediation_strategy: 'Comparer les deux segments sur le cercle.' }],
      sequence: [
        visualBlock('rectangle', 'Rectangle ABCD — 6 cm × 4 cm', 'Les côtés opposés du rectangle sont de même longueur.', { kind: 'rectangle', alt_text: 'Rectangle ABCD avec ses quatre côtés mesurés.', purpose: 'Relier chaque longueur au côté correspondant.', data: { shape: 'rectangle', vertices: [{ x: 45, y: 45, label: 'A' }, { x: 255, y: 45, label: 'B' }, { x: 255, y: 155, label: 'C' }, { x: 45, y: 155, label: 'D' }], side_labels: [{ from: 'A', to: 'B', label: 'AB = 6 cm' }, { from: 'B', to: 'C', label: 'BC = 4 cm' }, { from: 'C', to: 'D', label: 'CD = 6 cm' }, { from: 'D', to: 'A', label: 'DA = 4 cm' }] } }),
        visualBlock('triangle', 'Triangle ABC', 'Un triangle possède trois sommets et trois côtés.', { kind: 'polygon', alt_text: 'Triangle ABC avec les côtés AB, BC et CA.', purpose: 'Nommer les trois côtés du triangle.', data: { shape: 'triangle', vertices: [{ x: 60, y: 150, label: 'A' }, { x: 150, y: 30, label: 'B' }, { x: 240, y: 150, label: 'C' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'A', label: 'CA' }] } }),
        visualBlock('circle', 'Cercle — centre, rayon et diamètre', 'Le rayon relie le centre O au cercle ; le diamètre passe par O.', { kind: 'circle', alt_text: 'Cercle de centre O avec rayon OA et diamètre BC.', purpose: 'Distinguer le rayon du diamètre.', data: { center: { x: 150, y: 100, label: 'O' }, radius: 55, radiusEnd: { x: 205, y: 100, label: 'A' }, radius_label: 'OA = 3 cm', diameterEnd: { x: 95, y: 100, label: 'B' }, diameter: true, diameter_label: 'BC = 6 cm' } }),
        visualBlock('angle', 'Angle ABC', 'L’angle ABC a pour sommet B et ses côtés sont les deux demi-droites BA et BC.', { kind: 'angle', alt_text: 'Angle ABC de 90 degrés avec marque d’angle droit.', purpose: 'Repérer le sommet et les deux côtés.', data: { vertex: { x: 100, y: 120, label: 'B' }, rays: [{ x: 100, y: 35, label: 'A' }, { x: 205, y: 120, label: 'C' }], degrees: 90, rightAngle: true } }),
        visualBlock('symmetry', 'Symétrie axiale sur quadrillage', 'La figure de gauche est réfléchie de l’autre côté de l’axe.', { kind: 'symmetry', alt_text: 'Figure et image symétrique séparées par un axe vertical sur quadrillage.', purpose: 'Compter les carreaux de part et d’autre de l’axe.', data: { axis: { x: 150 }, grid: { width: 8, height: 8 }, figure: [{ x: 80, y: 60 }, { x: 80, y: 100 }, { x: 120, y: 100 }], symmetric_figure: [{ x: 220, y: 60 }, { x: 220, y: 100 }, { x: 180, y: 100 }] } }),
      ],
      mastery: { skills: ['figures_planes'], threshold: 0.8 },
    },
  }],
} as const;

export function validateGeometryDraft() {
  const canonical = validateLessonV21(geometryDraftLesson);
  const requiredKinds = ['rectangle', 'polygon', 'circle', 'angle', 'symmetry'];
  const blocks = geometryDraftLesson.levels[0].lesson.sequence;
  const kinds = blocks.map((block) => String(block.visual.kind));
  const missingKinds = requiredKinds.filter((kind) => !kinds.includes(kind));
  const pedagogicalIssues = blocks.flatMap((block, index) => {
    const content = block.content.trim();
    return content.length === 0 || /voir la figure/i.test(content) ? [`sequence[${index}].content must describe the visible figure`] : [];
  });
  return { canonicalValid: canonical.success, canonicalIssues: canonical.success ? [] : (canonical as any).issues, pedagogicalValid: pedagogicalIssues.length === 0 && missingKinds.length === 0, pedagogicalIssues: [...pedagogicalIssues, ...missingKinds.map((kind) => `missing required visual kind: ${kind}`)] };
}
