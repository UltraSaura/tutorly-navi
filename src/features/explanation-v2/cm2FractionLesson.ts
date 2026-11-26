/** Self-contained, pedagogically coherent CM2 sample. Preview and QA only; not published. */
import { LessonV2Schema } from '@/types/lesson-generator';

export const cm2FractionLesson = LessonV2Schema.parse({
  version: '2.0',
  lesson_goal: 'Comprendre les quarts et additionner des fractions simples',
  success_criteria: [
    'Reconnaître trois quarts sur une barre divisée en quatre parts égales',
    'Comprendre que 1/2 correspond à 2/4',
    'Additionner 3/4 et 1/2 en comptant des quarts',
  ],
  prerequisites: [{
    id: 'cm2-quarters-prerequisite',
    description: 'Avant de commencer, vérifions ce que signifie un quart.',
    check_question: 'Une barre entière est partagée en quatre parts égales. Combien de quarts faut-il pour reconstituer la barre entière ? Écris seulement le nombre.',
    answer_type: 'short_text',
    expected_answer: '4',
    remediation_hint: 'Compte les quatre parts égales : un quart + un quart + un quart + un quart.',
  }],
  sequence: [
    {
      id: 'cm2-introduction', type: 'concept', title: 'Un quart, c’est une part sur quatre',
      content: 'Imagine une tablette de chocolat partagée en quatre morceaux de même taille. Chaque morceau représente un quart (1/4). Si tu prends trois morceaux, tu as trois quarts (3/4).',
      representation: '3/4 = trois morceaux parmi quatre morceaux égaux',
      key_points: [
        { label: '4', text: 'La barre entière est partagée en quatre parts égales.' },
        { label: '3', text: 'Trois de ces quatre parts sont coloriées.' },
      ],
      takeaway: 'Pour représenter 3/4, il faut colorier 3 parts parmi 4 parts égales.',
    },
    {
      id: 'cm2-select-quarters', type: 'interactive_activity',
      activity: {
        schemaVersion: 1, id: 'cm2-lesson-select-3-4', kind: 'fraction-select', schoolLevel: 'CM2',
        title: 'À toi de construire 3/4',
        prompt: 'Cette barre a quatre parts égales. Sélectionne trois parts.',
        target: { n: 3, d: 4 }, transfer: { n: 2, d: 5 },
      },
    },
    {
      id: 'cm2-half-into-quarters', type: 'guided_example',
      context: 'Tu viens de représenter 3/4. Pour additionner 3/4 et 1/2, il faut que les morceaux soient de même taille.',
      steps: [
        {
          instruction: 'Observe la moitié d’une barre.',
          representation: '1/2 : une des deux moitiés est coloriée.',
          reason: 'La barre entière est divisée en deux morceaux égaux.',
        },
        {
          instruction: 'Coupe chaque moitié en deux.',
          representation: 'La barre est maintenant divisée en 4 quarts égaux.',
          reason: 'La quantité coloriée ne change pas : une moitié représente deux quarts (1/2 = 2/4).',
        },
        {
          instruction: 'Prépare l’addition.',
          representation: '3/4 + 2/4',
          reason: 'Les deux fractions utilisent maintenant des quarts : on peut compter les morceaux coloriés.',
        },
      ],
    },
    {
      id: 'cm2-add-quarters', type: 'interactive_activity',
      activity: {
        schemaVersion: 1, id: 'cm2-lesson-add-quarters', kind: 'fraction-bar', schoolLevel: 'CM2',
        title: 'Additionne 3/4 et 1/2',
        prompt: 'Transforme la moitié en quarts, puis compte les quarts coloriés.',
        left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4,
        transfer: { left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 },
      },
    },
    {
      id: 'cm2-conclusion', type: 'concept', title: 'Exemple guidé terminé',
      content: 'Tu as terminé l’exemple guidé et essayé un autre calcul. Dans l’exemple, le résultat est 5/4, soit 1 + 1/4. Pour additionner des fractions, exprime d’abord les quantités avec des parts de même taille.',
      representation: '3/4 + 1/2 = 3/4 + 2/4 = 5/4 = 1 + 1/4',
      key_points: [
        { label: 'Même taille', text: 'Avant d’additionner, exprime les deux fractions avec le même dénominateur.' },
        { label: 'Compte', text: 'Additionne les nombres de quarts : 3 + 2 = 5.' },
      ],
      takeaway: 'On additionne les parts de même taille, sans additionner les dénominateurs.',
    },
  ],
  misconceptions: [{
    id: 'cm2-fraction-denominator-sum',
    description: 'L’élève additionne les dénominateurs.',
    detect_if: 'Répond 4/6 ou additionne 4 et 2 au dénominateur.',
    feedback: 'On ne peut pas additionner des moitiés et des quarts directement : partage d’abord les moitiés en quarts.',
    remediation_strategy: 'Revenir à la barre en quatre parts et recompter les morceaux coloriés.',
  }],
  mastery: { skills: ['fractions:part-whole', 'fractions:equivalence', 'fractions:addition'], threshold: 0.8 },
});
