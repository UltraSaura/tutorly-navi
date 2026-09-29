import { describe, expect, it } from 'vitest';
import { LessonBlockSchema, LessonV2Schema, parseLessonContent } from './lesson-generator';

const lesson = {
  version: '2.0', lesson_goal: 'Convertir les durées', success_criteria: ['Je peux convertir des minutes'],
  prerequisites: [{ id: 'p1', description: 'Compter par 10', check_question: '10 + 10 ?', answer_type: 'numeric', expected_answer: '20', remediation_hint: 'Compte deux dizaines.' }],
  sequence: [{ id: 's1', type: 'concept', title: 'Une minute', content: 'Une minute contient 60 secondes.' }],
  misconceptions: [], mastery: { skills: ['conversion'], threshold: .8 },
};

describe('Lesson Generator V2 validation', () => {
  it('accepts a valid V2 lesson', () => expect(parseLessonContent(lesson)?.version).toBe('2.0'));
  it('rejects malformed AI output safely', () => expect(parseLessonContent({ version: '2.0' })).toBeNull());
  it('keeps legacy content outside the V2 parser', () => expect(LessonV2Schema.safeParse({ explanation: 'old lesson' }).success).toBe(false));
  it('accepts the stored CM2 duration lesson shape', () => {
    const stored = {
      ...lesson,
      lesson_goal: 'Comprendre les durées',
      prerequisites: [{ ...lesson.prerequisites[0], id: 'prereq-1' }],
      sequence: [
        { id: 'bloc-1', type: 'hook', title: 'Le sablier', content: 'Réfléchis.' },
        { id: 'bloc-3', type: 'visual', title: 'La frise', content: 'Les relations.', visual: { kind: 'timeline', data: { items: [] } } },
        { id: 'bloc-9', type: 'worked_example', context: '90 minutes', steps: [{ instruction: 'Former une heure', representation: '90 = 60 + 30', reason: 'Une heure vaut 60 minutes.' }], conclusion: '1 h 30' },
        { id: 'bloc-11', type: 'mastery_check', hints: [], questions: [{ id: 'm1', question: '1 h 20 ?', answer_type: 'text', choices: [], correct_answer: '80 minutes', skill: 'conversion', difficulty: 1, success_feedback: 'Exact', error_feedback: 'Pense à 60.' }] },
      ],
    };
    expect(parseLessonContent(stored)?.sequence).toHaveLength(4);
  });
});

describe('structured concept fixtures', () => {
  it('accepts a concise duration concept with a timeline and relationships', () => {
    const result = LessonBlockSchema.safeParse({
      id: 'duration-concept',
      type: 'concept',
      title: 'Les unités de durée',
      content: 'On choisit une unité selon la durée que l’on veut mesurer.',
      visual: {
        kind: 'timeline',
        purpose: 'Comparer les unités du plus court au plus long',
        alt_text: 'Unités de durée ordonnées',
        data: { units: ['seconde', 'minute', 'heure', 'jour'], relations: ['×60', '×60', '×24'] },
      },
      key_points: [
        { label: 'Minute', text: '60 secondes = 1 minute' },
        { label: 'Heure', text: '60 minutes = 1 heure' },
        { label: 'Jour', text: '24 heures = 1 jour' },
      ],
      takeaway: 'On choisit l’unité adaptée à la durée mesurée.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts fraction and geometry concepts with deterministic visuals', () => {
    expect(LessonBlockSchema.safeParse({
      id: 'clock-concept', type: 'concept', title: "Lire l'heure exacte",
      content: "Une horloge utilise deux aiguilles pour lire l'heure.",
      visual: { kind: 'clock', purpose: 'Distinguer les deux aiguilles', alt_text: 'Horloge annotée', data: {
        hour: 3, minute: 45,
        hand_labels: { hours: 'Petite aiguille → heures', minutes: 'Grande aiguille → minutes' },
        relationships: ['9 × 5 = 45 min'],
      } },
      key_points: [{ label: 'Minutes', text: 'Chaque grand chiffre correspond à 5 minutes.' }],
      takeaway: 'Petite aiguille → heures • Grande aiguille → minutes.',
    }).success).toBe(true);
    expect(LessonBlockSchema.safeParse({
      id: 'fraction-concept', type: 'concept', title: 'Une fraction',
      content: 'Une fraction partage un tout en parts égales.',
      visual: { kind: 'fraction_circle', purpose: 'Voir les parts', alt_text: 'Un disque partagé', data: { numerator: 1, denominator: 4 } },
      key_points: [{ label: 'Numérateur', text: 'Il compte les parts prises.' }],
      takeaway: 'Le dénominateur indique le nombre total de parts.',
    }).success).toBe(true);
    expect(LessonBlockSchema.safeParse({
      id: 'geometry-concept', type: 'concept', title: 'Le triangle',
      content: 'Un triangle est une figure à trois côtés.',
      visual: { kind: 'triangle', purpose: 'Observer les côtés', alt_text: 'Triangle', data: { sides: 3 } },
      key_points: [{ label: 'Propriété', text: 'Il possède trois sommets.' }],
      takeaway: 'Compter les côtés aide à reconnaître un triangle.',
    }).success).toBe(true);
    expect(LessonBlockSchema.safeParse({
      id: 'conversion-concept', type: 'concept', title: 'Convertir des unités',
      content: 'On utilise une relation connue pour changer d’unité.',
      visual: { kind: 'unit_conversion', purpose: 'Voir la relation entre les unités', alt_text: 'Conversion', data: { from: 'minutes', to: 'heures', factor: 60, relationships: ['60 min = 1 h'] } },
      key_points: [{ label: 'Relation', text: '60 minutes font 1 heure.' }],
      takeaway: 'Pour convertir, utilise le facteur connu.',
    }).success).toBe(true);
  });

  it('keeps prose-only and legacy concepts valid without decorative structure', () => {
    expect(LessonBlockSchema.safeParse({ id: 'prose', type: 'concept', title: 'Une définition', content: 'Une règle simple.' }).success).toBe(true);
    expect(LessonBlockSchema.safeParse({ id: 'legacy', type: 'concept', title: 'Ancienne leçon', content: 'Un paragraphe existant.' }).success).toBe(true);
  });
});
