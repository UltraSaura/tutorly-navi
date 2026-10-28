// Read-only provider-free regression fixture based on the stored staging
// payload for “La géométrie plane”. Non-visual blocks are intentionally
// omitted; geometry visuals are completed with compact, drawable data so the
// admin preview and student renderer can be verified end to end.
export const storedGeometryVisualFixture = {
  version: '2.1', topic_goal: 'Maîtriser les notions fondamentales de la géométrie plane.',
  levels: [
    { level_number: 1, lesson: { sequence: [
      { id: 'c2', type: 'concept', title: 'Le cercle et le disque', visual: { data: { center: { x: 150, y: 100, label: 'O' }, radius: 55, radius_label: 'rayon', diameter: true, diameter_label: 'diamètre' }, kind: 'circle' } },
      { id: 'c3', type: 'concept', title: "Utiliser l'équerre pour vérifier un angle droit", visual: { data: { vertex: { x: 100, y: 120, label: 'B' }, rays: [{ x: 100, y: 35, label: 'A' }, { x: 205, y: 120, label: 'C' }], degrees: 90 }, kind: 'angle' } },
      { id: 'v1', type: 'visual', title: 'Reconnaître points, segments et droites', visual: { data: { points: [{ x: 55, y: 110, label: 'A' }, { x: 245, y: 110, label: 'B' }], segments: [{ from: 'A', to: 'B', label: '[AB]' }], lines: [{ through: ['A', 'B'], extends: true, label: '(AB)' }] }, kind: 'diagram' } },
      { id: 'v2', type: 'visual', title: 'Cercle et disque', visual: { data: { center: { x: 150, y: 100, label: 'O' }, radius: 55, radiusEnd: { x: 205, y: 100, label: 'A' }, radius_label: '[OA]', diameter: true, diameter_label: '[BC]' }, kind: 'circle' } },
      { id: 'v3', type: 'visual', title: 'Vérifier un angle droit', visual: { data: { vertex: { x: 100, y: 120, label: 'B' }, rays: [{ x: 100, y: 35, label: 'A' }, { x: 205, y: 120, label: 'C' }], rightAngle: true }, kind: 'angle' } },
      { id: 'c4', type: 'concept', title: 'Le compas pour reporter une longueur', visual: { data: { center: { x: 150, y: 100, label: 'O' }, radius: 45, radius_label: 'rayon' }, kind: 'circle' } },
      { id: 'v4', type: 'visual', title: 'Reporter une longueur avec le compas', visual: { data: { points: [{ x: 55, y: 110, label: 'A' }, { x: 245, y: 110, label: 'B' }], segments: [{ from: 'A', to: 'B', label: 'longueur à reporter' }], annotations: ["Mesurer l'écartement", "Tracer l'arc"] }, kind: 'diagram' } },
    ] } },
    { level_number: 2, lesson: { sequence: [
      { id: 'v1', type: 'visual', title: 'Droites perpendiculaires et parallèles', visual: { data: { points: [{ x: 80, y: 100, label: 'A' }, { x: 220, y: 100, label: 'B' }, { x: 80, y: 45, label: 'C' }, { x: 220, y: 45, label: 'D' }], segments: [{ from: 'A', to: 'B', label: '(d1)' }, { from: 'C', to: 'D', label: '(d2)' }], annotations: ['(d1) ∥ (d2)'] }, kind: 'diagram' } },
      { id: 'c1', type: 'concept', title: 'Reconnaître des droites perpendiculaires', visual: { data: { vertex: { x: 150, y: 105, label: 'A' }, rays: [{ x: 150, y: 30, label: 'B' }, { x: 235, y: 105, label: 'C' }], degrees: 90, rightAngle: true }, kind: 'angle' } },
      { id: 'c2', type: 'concept', title: 'Reconnaître des droites parallèles', visual: { data: { points: [{ x: 60, y: 60, label: 'A' }, { x: 240, y: 60, label: 'B' }, { x: 60, y: 130, label: 'C' }, { x: 240, y: 130, label: 'D' }], segments: [{ from: 'A', to: 'B', label: '(d3)' }, { from: 'C', to: 'D', label: '(d4)' }], annotations: ['(d3) ∥ (d4)'] }, kind: 'diagram' } },
    ] } },
    { level_number: 3, lesson: { sequence: [
      { id: 'c1', type: 'concept', title: 'Reconnaître les figures planes', visual: { data: { vertex: { x: 100, y: 120, label: 'B' }, rays: [{ x: 100, y: 35, label: 'A' }, { x: 205, y: 120, label: 'C' }], degrees: 90 }, kind: 'angle' } },
      { id: 'v1', type: 'visual', title: 'Les triangles', visual: { data: { shape: 'triangle', vertices: [{ x: 60, y: 150, label: 'A' }, { x: 150, y: 30, label: 'B' }, { x: 240, y: 150, label: 'C' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'A', label: 'CA' }] }, kind: 'polygon' } },
      { id: 'c2', type: 'concept', title: 'Les triangles', visual: { data: { vertex: { x: 100, y: 120, label: 'A' }, rays: [{ x: 40, y: 45, label: 'B' }, { x: 220, y: 45, label: 'C' }], degrees: 60 }, kind: 'angle' } },
      { id: 'c3', type: 'concept', title: 'Les quadrilatères', visual: { data: { vertex: { x: 100, y: 120, label: 'B' }, rays: [{ x: 100, y: 35, label: 'A' }, { x: 205, y: 120, label: 'C' }], degrees: 90 }, kind: 'angle' } },
      { id: 'c4', type: 'concept', title: 'Le cercle et le disque', visual: { data: { center: { x: 150, y: 100, label: 'O' }, radius: 50, radius_label: 'rayon' }, kind: 'circle' } },
      { id: 'v2', type: 'visual', title: 'Cercle et rayon', visual: { data: { unit: 'cm', center: { x: 150, y: 100, label: 'O' }, radius: 55, radiusEnd: { x: 205, y: 100, label: 'A' }, radius_label: 'OA = 3 cm', diameter: true, diameter_label: 'BC = 6 cm' }, kind: 'circle' } },
      { id: 'rectangle', type: 'visual', title: 'Rectangle ABCD et son périmètre', visual: { data: { shape: 'rectangle', vertices: [{ x: 45, y: 45, label: 'A' }, { x: 255, y: 45, label: 'B' }, { x: 255, y: 155, label: 'C' }, { x: 45, y: 155, label: 'D' }], side_labels: [{ from: 'A', to: 'B', label: 'AB = 6 cm' }, { from: 'B', to: 'C', label: 'BC = 4 cm' }, { from: 'C', to: 'D', label: 'CD = 6 cm' }, { from: 'D', to: 'A', label: 'DA = 4 cm' }], annotations: ['P = 2 × (6 + 4) = 20 cm'] }, kind: 'rectangle' } },
    ] } },
    { level_number: 4, lesson: { sequence: [
      { id: 'c1', type: 'concept', title: 'Le vocabulaire de base', visual: { data: { lines: [{ label: '(CD)', arrows: true, through: ['C', 'D'] }], points: [{ x: 1, y: 2, label: 'A' }, { x: 4, y: 2, label: 'B' }, { x: 1, y: 4, label: 'C' }, { x: 4, y: 4, label: 'D' }], segments: [{ to: 'B', from: 'A', label: '[AB]' }] }, kind: 'diagram' } },
      { id: 'c2', type: 'concept', title: 'Perpendiculaire ou parallèle ?', visual: { data: { vertex: { x: 100, y: 120, label: 'B' }, rays: [{ x: 100, y: 35, label: 'A' }, { x: 205, y: 120, label: 'C' }], degrees: 90, rightAngle: true }, kind: 'angle' } },
      { id: 'c3', type: 'concept', title: 'Les figures usuelles et leurs propriétés', visual: { data: { shape: 'rectangle', vertices: [{ x: 55, y: 50, label: 'A' }, { x: 245, y: 50, label: 'B' }, { x: 245, y: 145, label: 'C' }, { x: 55, y: 145, label: 'D' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'D', label: 'CD' }, { from: 'D', to: 'A', label: 'DA' }] }, kind: 'rectangle' } },
      { id: 'c4', type: 'concept', title: 'Le cercle et le compas', visual: { data: { center: { x: 150, y: 100, label: 'O' }, radius: 50, radius_label: 'OA = 3 cm', diameter: true, diameter_label: 'BC = 6 cm' }, kind: 'circle' } },
      { id: 'c5', type: 'concept', title: 'La symétrie axiale sur quadrillage', visual: { data: { axis: { x: 150, y: 0 }, grid: { width: 8, height: 8 }, original: [{ x: 80, y: 60 }, { x: 80, y: 100 }, { x: 120, y: 100 }], reflected: [{ x: 220, y: 60 }, { x: 220, y: 100 }, { x: 180, y: 100 }] }, kind: 'symmetry' } },
    ] } },
  ],
};
