export type VisualRequirement = 'required' | 'preferred' | 'optional';

export type VisualPolicy = {
  requirement: VisualRequirement;
  suggestedKinds: string[];
  reason: string;
};

const REQUIRED: Array<{ pattern: RegExp; kinds: string[]; reason: string }> = [
  { pattern: /heure exacte|lire l'heure|lire une heure|horloge|aiguille|minutes? sur une horloge/i, kinds: ['clock'], reason: "La lecture d'une horloge dépend de la position des aiguilles." },
  { pattern: /fraction|numérateur|dénominateur|parts? égales?|partie(?:s)?[- ]tout/i, kinds: ['fraction_bar', 'fraction_circle'], reason: 'La relation partie/tout doit être visible.' },
  { pattern: /droite graduée|ligne numérique|position(?:ner|nement)? .*nombre|repérer un nombre/i, kinds: ['number_line'], reason: 'La position et les écarts doivent être visibles.' },
  { pattern: /angle|symétrie|coordonnée|repère cartésien|triangle|rectangle|cercle|polygone|solide|géométrie/i, kinds: ['angle', 'triangle', 'rectangle', 'circle', 'polygon', 'symmetry', 'coordinate_plane', 'geometric_solid', 'solid_section'], reason: 'La propriété géométrique doit être montrée par une figure.' },
  { pattern: /conversion|convertir|unités? de durée|durée.*unités?|unités?.*(?:seconde|minute|heure|jour)|(?:60|24|100|1000)\s*(?:secondes?|minutes?|heures?|jours?|ans?)/i, kinds: ['unit_conversion', 'timeline'], reason: 'La relation entre unités ou facteurs doit être visible.' },
];

export function determineVisualRequirement(concept: { title?: unknown; content?: unknown; representation?: unknown }): VisualPolicy {
  const text = [concept.title, concept.content, concept.representation].filter((value) => typeof value === 'string').join(' ');
  const match = REQUIRED.find((entry) => entry.pattern.test(text));
  if (match) return { requirement: 'required', suggestedKinds: match.kinds, reason: match.reason };
  if (/mesur|comparer|ordre|processus|étapes?|relation|évolution/i.test(text)) {
    return { requirement: 'preferred', suggestedKinds: ['measurement', 'comparison', 'sequence', 'diagram'], reason: 'Une représentation peut clarifier cette idée, mais une explication précise peut suffire.' };
  }
  return { requirement: 'optional', suggestedKinds: [], reason: 'Une explication en prose est suffisante si elle reste claire.' };
}

export function isSupportedVisualKind(kind: unknown): boolean {
  return typeof kind === 'string' && ['clock','timeline','number_line','fraction_bar','fraction_circle','triangle','rectangle','circle','polygon','angle','symmetry','coordinate_plane','geometric_solid','solid_section','measurement','unit_conversion','groups','comparison','part_whole','table','equation','diagram','sequence'].includes(kind);
}
