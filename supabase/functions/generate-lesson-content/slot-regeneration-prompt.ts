import type { BlueprintAnswerType } from './lesson-blueprint.ts';

type SlotLike = {
  slotId: string;
  kind?: string;
  blockType?: string;
  type?: string;
  visualRequirement?: string;
  allowedVisualKinds?: string[];
  requiresKeyPoints?: boolean;
  keyPointCount?: { min: number; max: number };
  requiresTakeaway?: boolean;
  questionCount?: { min: number; max: number };
  answerTypes?: BlueprintAnswerType[];
  allowedAnswerTypes?: BlueprintAnswerType[];
};

export type SlotRegenerationPromptInput = {
  topic: string;
  levelNumber: number;
  levelTitle: string;
  objectiveText: string;
  curriculumScope?: string;
  slot: SlotLike;
  acceptedContext?: string;
};

const conceptContract = (slot: SlotLike): string => {
  const visual = slot.visualRequirement === 'required'
    ? 'visual est obligatoire'
    : slot.visualRequirement === 'preferred' ? 'visual est préféré' : 'visual est optionnel';
  const kinds = (slot.allowedVisualKinds ?? []).join(', ') || 'aucun';
  const points = slot.requiresKeyPoints
    ? `${slot.keyPointCount?.min ?? 1} à ${slot.keyPointCount?.max ?? 4}`
    : 'optionnels';
  const takeaway = slot.requiresTakeaway ? 'obligatoire' : 'optionnel';
  return `Contrat concept (et uniquement concept): title:string non vide, content:string non vide, key_points: tableau optionnel de ${points} objets {label:string,text:string}, takeaway:string ${takeaway}, visual: objet ${visual} {kind,purpose,alt_text,data}. Rôles obligatoires: content explique l’idée dans un langage enfantin avec au plus un exemple simple; key_points extrait quelques faits ou relations distincts; takeaway donne UNE stratégie actionnable, règle de décision, vérification ou méthode répondant à « que faire quand je rencontre ce problème ? ». Le takeaway ne doit pas répéter la définition, l’exemple ni les faits numériques des key_points, et doit avoir une fonction pédagogique différente. Kinds visuels autorisés: ${kinds}. Les données visuelles doivent être structurées et sémantiques; clock={hour entier 1–12,minute entier 0–59}, unit_conversion={relations/units non vides ou from,to,factor positif}, timeline={au moins 2 units ou 1 relation}; chaque endpoint from/to d’une relation doit exister dans units.`;
};

const contractFor = (slot: SlotLike): string => {
  const family = slot.kind === 'interaction' ? slot.blockType : (slot.kind ?? slot.type);
  switch (family) {
    case 'concept': return conceptContract(slot);
    case 'mastery': return `Contrat mastery (et uniquement mastery): {questions:[...]}; ${slot.questionCount?.min ?? 1} à ${slot.questionCount?.max ?? 4} questions distinctes. Chaque question contient uniquement id,question,answer_type,choices?,correct_answer,skill,difficulty,success_feedback,error_feedback. answer_type autorisés: ${(slot.answerTypes ?? slot.allowedAnswerTypes ?? []).join(', ') || 'multiple_choice, numeric, time, short_text, selection, ordering'}. Pour toute quantité avec unité (durée, longueur, masse, etc.), utilise multiple_choice avec des choix et correct_answer sous forme de chaîne complète avec unité; n’utilise jamais numeric/time pour une quantité avec unité. numeric est réservé à un nombre sans unité et time à une heure de la journée.`;
    case 'prerequisite': return `Contrat prerequisite (et uniquement prerequisite): description,check_question,answer_type,choices?,expected_answer,remediation_hint,visual?. answer_type autorisés: ${(slot.answerTypes ?? slot.allowedAnswerTypes ?? []).join(', ') || 'multiple_choice, numeric, time, short_text, selection, ordering'}. La question vérifie uniquement une compétence antérieure.`;
    case 'level_content': return 'Contrat level-content (et uniquement level-content): lesson_goal, success_criteria, misconceptions.';
    case 'guided_example': return 'Contrat guided_example (et uniquement guided_example): context:string, steps: tableau non vide de {instruction:string,reason:string,representation?:string}.';
    case 'prediction': return `Contrat prediction (et uniquement prediction): question:string, choices: tableau d'options, correct_answer, explanation:string.`;
    case 'student_try':
    case 'feedback_checkpoint': return `Contrat ${family} (et uniquement ${family}): question:string, answer_type, choices?, correct_answer, success_feedback, error_feedback. answer_type autorisés: ${(slot.answerTypes ?? []).join(', ') || 'multiple_choice, numeric, time, short_text, selection, ordering'}.`;
    default: return `Contrat du slot ${String(family)}: retourne uniquement les champs définis par son adaptateur; aucun champ structurel.`;
  }
};

/** Builds the closed, single-slot request used by bounded regeneration. */
export function buildSlotRegenerationPrompt(input: SlotRegenerationPromptInput): string {
  const family = input.slot.kind === 'interaction' ? input.slot.blockType : (input.slot.kind ?? input.slot.type);
  const context = input.acceptedContext?.trim() || 'Aucun contenu voisin n’est fourni.';
  return [
    `Génère uniquement le contenu frais du slot ${input.slot.slotId}.`,
    `Sujet: ${input.topic}; niveau ${input.levelNumber} — ${input.levelTitle}; objectif: ${input.objectiveText}.`,
    `Périmètre curriculaire déterministe (autorité de sortie): ${input.curriculumScope ?? 'uniquement les notions explicitement couvertes par l’objectif fourni; aucune extension.'}`,
    `Famille de slot: ${family}.`,
    contractFor(input.slot),
    'Réponse obligatoire: exactement un objet JSON de forme {"slot":{...}}. Le slot doit contenir uniquement les champs de son contrat ci-dessus.',
    'INTERDIT: retourner un niveau complet, lesson_goal, success_criteria, misconceptions, prerequisites, sequence, mastery, guided_example, prediction, student_try, feedback_checkpoint ou un champ concept imbriqué. Ne retourne jamais {"slot":{"concept":{...}}}; les champs concept sont directement dans slot.',
    `CONTEXTE ACCEPTÉ (lecture seule, ne pas recopier dans la réponse): ${context}`,
    'N’inclus aucun commentaire, Markdown, enveloppe supplémentaire, champ structural, placeholder ou réponse révélée. Retourne du JSON strict en français.',
    'Enseigne uniquement les concepts, unités, relations et opérations autorisés par ce périmètre. Une connaissance mathématique connexe mais non autorisée ne doit pas être ajoutée.',
  ].join('\n');
}
