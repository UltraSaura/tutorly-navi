// Read-only regression fixture copied from the stored staging payload for
// “La géométrie plane”. Non-visual blocks are intentionally omitted; the
// visual block shapes and data are kept verbatim for mapping coverage.
export const storedGeometryVisualFixture = {
  version: '2.1', topic_goal: 'Maîtriser les notions fondamentales de la géométrie plane.',
  levels: [
    { level_number: 1, lesson: { sequence: [
      { id: 'c2', type: 'concept', title: 'Le cercle et le disque', visual: { data: { label: 'Le cercle et le disque' }, kind: 'circle' } },
      { id: 'c3', type: 'concept', title: "Utiliser l'équerre pour vérifier un angle droit", visual: { data: { label: "Utiliser l'équerre pour vérifier un angle droit" }, kind: 'angle' } },
      { id: 'v1', type: 'visual', title: 'Reconnaître points, segments et droites', visual: { data: { droite: '(AB)', points: ['A', 'B'], segment: '[AB]', annotations: ['A et B sont des points', '[AB] est un segment', '(AB) est une droite'] }, kind: 'diagram' } },
      { id: 'v2', type: 'visual', title: 'Cercle et disque', visual: { data: { rayon: '[OA]', centre: 'O', diametre: '[BC]', annotations: ['O est le centre'] }, kind: 'circle' } },
      { id: 'v3', type: 'visual', title: 'Vérifier un angle droit', visual: { data: { annotation: "Le coin de l'équerre est un angle droit.", angle_droit: true }, kind: 'angle' } },
      { id: 'c4', type: 'concept', title: 'Le compas pour reporter une longueur', visual: { data: { label: 'Le compas pour reporter une longueur' }, kind: 'circle' } },
      { id: 'v4', type: 'visual', title: 'Reporter une longueur avec le compas', visual: { data: { etapes: ["Mesurer l'écartement sur la règle", "Piquer la pointe sur le point de départ", "Tracer l'arc de cercle"] }, kind: 'diagram' } },
    ] } },
    { level_number: 2, lesson: { sequence: [
      { id: 'v1', type: 'visual', title: 'Droites perpendiculaires et parallèles', visual: { data: { parallel: { lines: ['(d3)', '(d4)'], arrows: true }, perpendicular: { lines: ['(d1)', '(d2)'], right_angle_mark: true } }, kind: 'diagram' } },
      { id: 'c1', type: 'concept', title: 'Reconnaître des droites perpendiculaires', visual: { data: { lines: ['(d1)', '(d2)'], angle_degrees: 90, right_angle_symbol: true }, kind: 'angle' } },
      { id: 'c2', type: 'concept', title: 'Reconnaître des droites parallèles', visual: { data: { lines: ['(d3)', '(d4)'], arrows: true, distance: 'constante' }, kind: 'diagram' } },
    ] } },
    { level_number: 3, lesson: { sequence: [
      { id: 'c1', type: 'concept', title: 'Reconnaître les figures planes', visual: { data: { label: 'Reconnaître les figures planes' }, kind: 'angle' } },
      { id: 'v1', type: 'visual', title: 'Les triangles', visual: { data: { shape: 'triangle', vertices: [{ x: 60, y: 150, label: 'A' }, { x: 150, y: 30, label: 'B' }, { x: 240, y: 150, label: 'C' }] }, kind: 'polygon' } },
      { id: 'c2', type: 'concept', title: 'Les triangles', visual: { data: { label: 'Les triangles' }, kind: 'angle' } },
      { id: 'c3', type: 'concept', title: 'Les quadrilatères', visual: { data: { label: 'Les quadrilatères' }, kind: 'angle' } },
      { id: 'c4', type: 'concept', title: 'Le cercle et le disque', visual: { data: { label: 'Le cercle et le disque' }, kind: 'circle' } },
      { id: 'v2', type: 'visual', title: 'Cercle et rayon', visual: { data: { unit: 'cm', center: 'O', points: ['A', 'B', 'C', 'D'], radius: 3 }, kind: 'circle' } },
    ] } },
    { level_number: 4, lesson: { sequence: [
      { id: 'c1', type: 'concept', title: 'Le vocabulaire de base', visual: { data: { lines: [{ label: '(CD)', arrows: true, through: ['C', 'D'] }], points: [{ x: 1, y: 2, label: 'A' }, { x: 4, y: 2, label: 'B' }, { x: 1, y: 4, label: 'C' }, { x: 4, y: 4, label: 'D' }], segments: [{ to: 'B', from: 'A', label: '[AB]' }] }, kind: 'diagram' } },
      { id: 'c2', type: 'concept', title: 'Perpendiculaire ou parallèle ?', visual: { data: { label: 'Perpendiculaire ou parallèle ?' }, kind: 'angle' } },
      { id: 'c3', type: 'concept', title: 'Les figures usuelles et leurs propriétés', visual: { data: { label: 'Les figures usuelles et leurs propriétés' }, kind: 'angle' } },
      { id: 'c4', type: 'concept', title: 'Le cercle et le compas', visual: { data: { center: 'O', radius: { to: 'A', from: 'O', label: 'rayon' }, diameter: { to: 'C', from: 'B', label: 'diamètre' } }, kind: 'circle' } },
      { id: 'c5', type: 'concept', title: 'La symétrie axiale sur quadrillage', visual: { data: { axis: 'vertical', grid: true, figure: [[1, 2], [1, 3], [2, 3]], symmetric_figure: [[5, 2], [5, 3], [4, 3]] }, kind: 'symmetry' } },
    ] } },
  ],
};
