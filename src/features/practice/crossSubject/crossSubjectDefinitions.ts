import type { PedagogicalAgeBand } from '@/config/ageConfig';
import type { SkillActivityDefinition, SkillActivityEngine } from '@/types/skill-activity';

export type LocalizedText = { en: string; fr: string };

export type StructuredPracticeItem =
  | { id: string; type: 'choice'; prompt: LocalizedText; choices: LocalizedText[]; expected: string }
  | { id: string; type: 'order'; prompt: LocalizedText; tokens: LocalizedText[]; expectedOrder: string[] }
  | { id: string; type: 'classify'; prompt: LocalizedText; choices: LocalizedText[]; expected: string };

export interface StructuredPracticeConfiguration {
  items: StructuredPracticeItem[];
  localizedTitle?: LocalizedText;
  localizedDescription?: LocalizedText;
}

type SubjectId = 'francais' | 'anglais' | 'sciences' | 'histoire' | 'geographie';
const BANDS: PedagogicalAgeBand[] = ['early_primary', 'upper_primary', 'middle_school', 'high_school'];

const l = (en: string, fr: string): LocalizedText => ({ en, fr });
const choice = (id: string, prompt: LocalizedText, choices: LocalizedText[], expected: string): StructuredPracticeItem => ({ id, type: 'choice', prompt, choices, expected });
const order = (id: string, prompt: LocalizedText, tokens: LocalizedText[], expectedOrder: string[]): StructuredPracticeItem => ({ id, type: 'order', prompt, tokens, expectedOrder });
const classify = (id: string, prompt: LocalizedText, choices: LocalizedText[], expected: string): StructuredPracticeItem => ({ id, type: 'classify', prompt, choices, expected });

function definition(subjectId: SubjectId, ageBand: PedagogicalAgeBand, suffix: string, engine: SkillActivityEngine, conceptId: string, title: LocalizedText, description: LocalizedText, items: StructuredPracticeItem[], difficulty = 2): SkillActivityDefinition {
  return {
    id: `${subjectId}-${suffix}-${ageBand}`,
    subjectId,
    conceptId,
    engine,
    ageBand,
    masteryLevels: [1, 2, 3, 4],
    difficulty,
    title: title.en,
    description: description.en,
    estimatedMinutes: ageBand === 'early_primary' ? 3 : 5,
    contentVersion: 'phase-12-v1',
    tags: ['cross-subject-practice', subjectId, suffix],
    configuration: { items, localizedTitle: title, localizedDescription: description } satisfies StructuredPracticeConfiguration,
  };
}

function french(ageBand: PedagogicalAgeBand): SkillActivityDefinition[] {
  if (ageBand === 'early_primary') return [
    definition('francais', ageBand, 'sentence', 'sentence_builder', 'fr:sentence_structure', l('Build a sentence', 'Construis une phrase'), l('Put the words in the right order.', 'Remets les mots dans le bon ordre.'), [order('fr-s1', l('Build the sentence.', 'Construis la phrase.'), [l('chat','chat'), l('Le','Le'), l('dort.','dort.')], ['Le','chat','dort.'])], 1),
    definition('francais', ageBand, 'grammar', 'multiple_choice_challenge', 'fr:basic_grammar', l('Words and sentences', 'Mots et phrases'), l('Recognize simple language patterns.', 'Reconnais des formes simples de la langue.'), [choice('fr-g1', l('Which word is a noun?', 'Quel mot est un nom ?'), [l('cat','chat'), l('runs','court'), l('quickly','vite')], 'chat')], 1),
  ];
  if (ageBand === 'upper_primary') return [
    definition('francais', ageBand, 'sentence', 'sentence_builder', 'fr:sentence_structure', l('Sentence Builder', 'Construction de phrase'), l('Build grammatically correct sentences.', 'Construis des phrases grammaticalement correctes.'), [order('fr-s2', l('Put the sentence in order.', 'Remets la phrase dans l’ordre.'), [l('demain.','demain.'), l('Nous','Nous'), l('partirons','partirons')], ['Nous','partirons','demain.'])], 2),
    definition('francais', ageBand, 'homophones', 'error_detective', 'fr:homophones', l('Error Detective', 'Détective des erreurs'), l('Spot common spelling and grammar mistakes.', 'Repère les erreurs fréquentes d’orthographe et de grammaire.'), [choice('fr-e1', l('Choose the correct sentence.', 'Choisis la phrase correcte.'), [l('Il a un livre.','Il a un livre.'), l('Il à un livre.','Il à un livre.')], 'Il a un livre.')], 2),
    definition('francais', ageBand, 'conjugation', 'multiple_choice_challenge', 'fr:conjugation', l('Conjugation Challenge', 'Défi conjugaison'), l('Choose the correct verb form.', 'Choisis la bonne forme du verbe.'), [choice('fr-c1', l('Nous ___ à l’école.', 'Nous ___ à l’école.'), [l('allons','allons'), l('allez','allez'), l('va','va')], 'allons')], 2),
  ];
  if (ageBand === 'middle_school') return [
    definition('francais', ageBand, 'sentence', 'sentence_builder', 'fr:complex_sentence', l('Sentence Builder', 'Construction de phrase'), l('Build a coherent complex sentence.', 'Construis une phrase complexe cohérente.'), [order('fr-s3', l('Order the clause.', 'Remets la proposition dans l’ordre.'), [l('parce','parce'), l('Il','Il'), l('pleut.','pleut.'), l('reste','reste'), l('que','que')], ['Il','reste','parce','que','pleut.'])], 3),
    definition('francais', ageBand, 'agreement', 'error_detective', 'fr:agreement', l('Agreement Detective', 'Détective des accords'), l('Find the correct agreement.', 'Repère le bon accord.'), [choice('fr-a1', l('Choose the correct form.', 'Choisis la forme correcte.'), [l('Les filles sont arrivées.','Les filles sont arrivées.'), l('Les filles sont arrivés.','Les filles sont arrivés.')], 'Les filles sont arrivées.')], 3),
    definition('francais', ageBand, 'grammar', 'multiple_choice_challenge', 'fr:grammar', l('Grammar Challenge', 'Défi grammaire'), l('Identify grammatical functions.', 'Identifie les fonctions grammaticales.'), [choice('fr-g3', l('In “Paul mange une pomme”, what is “une pomme”?', 'Dans « Paul mange une pomme », quelle est la fonction de « une pomme » ?'), [l('subject','sujet'), l('direct object','COD'), l('adverbial','complément circonstanciel')], 'COD')], 3),
  ];
  return [
    definition('francais', ageBand, 'style', 'error_detective', 'fr:writing_style', l('Style and Precision', 'Style et précision'), l('Choose the most precise formulation.', 'Choisis la formulation la plus précise.'), [choice('fr-h1', l('Choose the clearest sentence.', 'Choisis la phrase la plus claire.'), [l('The argument is supported by two precise examples.','L’argument est appuyé par deux exemples précis.'), l('There are things that show it.','Il y a des choses qui le montrent.')], 'L’argument est appuyé par deux exemples précis.')], 4),
    definition('francais', ageBand, 'syntax', 'sentence_builder', 'fr:syntax', l('Advanced Syntax', 'Syntaxe avancée'), l('Organize a logical sentence.', 'Organise une phrase logique.'), [order('fr-h2', l('Build the sentence.', 'Construis la phrase.'), [l('cependant,','cependant,'),l('reste','reste'),l('Cette','Cette'),l('discutable.','discutable.'),l('thèse','thèse')], ['Cette','thèse','reste','cependant,','discutable.'])], 4),
  ];
}

function english(ageBand: PedagogicalAgeBand): SkillActivityDefinition[] {
  if (ageBand === 'early_primary') return [
    definition('anglais', ageBand, 'vocabulary', 'multiple_choice_challenge', 'en:basic_vocabulary', l('Word Match', 'Mots anglais'), l('Recognize everyday English words.', 'Reconnais des mots anglais du quotidien.'), [choice('en-e1', l('Which word means “rouge”?', 'Quel mot signifie « rouge » ?'), [l('red','red'),l('blue','blue'),l('green','green')], 'red')], 1),
    definition('anglais', ageBand, 'sentence', 'sentence_builder', 'en:sentence_structure', l('Build an English Sentence', 'Construis une phrase en anglais'), l('Put simple English words in order.', 'Remets les mots anglais dans l’ordre.'), [order('en-e2', l('Build the sentence.', 'Construis la phrase.'), [l('am','am'),l('I','I'),l('happy.','happy.')], ['I','am','happy.'])], 1),
  ];
  if (ageBand === 'upper_primary') return [
    definition('anglais', ageBand, 'sentence', 'sentence_builder', 'en:sentence_structure', l('Sentence Builder', 'Construction de phrase en anglais'), l('Practice English word order.', 'Entraîne-toi à l’ordre des mots en anglais.'), [order('en-u1', l('Build the sentence.', 'Construis la phrase.'), [l('football.','football.'),l('plays','plays'),l('She','She')], ['She','plays','football.'])], 2),
    definition('anglais', ageBand, 'verbs', 'multiple_choice_challenge', 'en:present_simple', l('Verb Challenge', 'Défi des verbes'), l('Choose the correct present-simple form.', 'Choisis la bonne forme au présent simple.'), [choice('en-u2', l('He ___ to school every day.', 'He ___ to school every day.'), [l('go','go'),l('goes','goes'),l('going','going')], 'goes')], 2),
    definition('anglais', ageBand, 'vocabulary', 'multiple_choice_challenge', 'en:vocabulary', l('Vocabulary Challenge', 'Défi vocabulaire'), l('Choose the word that matches the meaning.', 'Choisis le mot correspondant au sens.'), [choice('en-u3', l('Which word means “bibliothèque”?', 'Quel mot signifie « bibliothèque » ?'), [l('library','library'),l('bookshop','bookshop'),l('classroom','classroom')], 'library')], 2),
  ];
  if (ageBand === 'middle_school') return [
    definition('anglais', ageBand, 'past', 'multiple_choice_challenge', 'en:past_tense', l('Past Tense Challenge', 'Défi prétérit'), l('Choose the correct past-tense form.', 'Choisis la bonne forme au prétérit.'), [choice('en-m1', l('Yesterday, we ___ a film.', 'Yesterday, we ___ a film.'), [l('see','see'),l('saw','saw'),l('seen','seen')], 'saw')], 3),
    definition('anglais', ageBand, 'sentence', 'sentence_builder', 'en:sentence_structure', l('Sentence Builder', 'Construction de phrase en anglais'), l('Build a natural English sentence.', 'Construis une phrase anglaise naturelle.'), [order('en-m2', l('Build the sentence.', 'Construis la phrase.'), [l('already','already'),l('has','has'),l('finished.','finished.'),l('She','She')], ['She','has','already','finished.'])], 3),
    definition('anglais', ageBand, 'grammar', 'error_detective', 'en:grammar', l('Grammar Detective', 'Détective de grammaire'), l('Spot the grammatically correct sentence.', 'Repère la phrase grammaticalement correcte.'), [choice('en-m3', l('Choose the correct sentence.', 'Choisis la phrase correcte.'), [l('She doesn’t like coffee.','She doesn’t like coffee.'),l('She don’t like coffee.','She don’t like coffee.')], 'She doesn’t like coffee.')], 3),
  ];
  return [
    definition('anglais', ageBand, 'conditionals', 'multiple_choice_challenge', 'en:conditionals', l('Conditionals', 'Conditionnels'), l('Choose the correct conditional structure.', 'Choisis la bonne structure conditionnelle.'), [choice('en-h1', l('If I had known, I ___ earlier.', 'If I had known, I ___ earlier.'), [l('would have come','would have come'),l('will come','will come'),l('came','came')], 'would have come')], 4),
    definition('anglais', ageBand, 'syntax', 'sentence_builder', 'en:advanced_syntax', l('Advanced Sentence Builder', 'Construction avancée'), l('Build a formal English sentence.', 'Construis une phrase anglaise soutenue.'), [order('en-h2', l('Build the sentence.', 'Construis la phrase.'), [l('evidence.','evidence.'),l('supported','supported'),l('is','is'),l('The','The'),l('claim','claim'),l('by','by')], ['The','claim','is','supported','by','evidence.'])], 4),
  ];
}

function science(ageBand: PedagogicalAgeBand): SkillActivityDefinition[] {
  if (ageBand === 'early_primary') return [
    definition('sciences', ageBand, 'classify', 'sort_classify', 'science:living_things', l('Living or Not?', 'Vivant ou non ?'), l('Classify familiar things.', 'Classe des éléments familiers.'), [classify('sc-e1', l('Is a tree living?', 'Un arbre est-il vivant ?'), [l('Living','Vivant'),l('Not living','Non vivant')], 'Vivant')], 1),
    definition('sciences', ageBand, 'sequence', 'sequence', 'science:life_cycle', l('Life Cycle', 'Cycle de vie'), l('Put a simple life cycle in order.', 'Remets un cycle de vie simple dans l’ordre.'), [order('sc-e2', l('Order the butterfly life cycle.', 'Remets le cycle du papillon dans l’ordre.'), [l('adult','adulte'),l('egg','œuf'),l('caterpillar','chenille'),l('chrysalis','chrysalide')], ['œuf','chenille','chrysalide','adulte'])], 1),
  ];
  if (ageBand === 'upper_primary') return [
    definition('sciences', ageBand, 'matter', 'sort_classify', 'science:states_of_matter', l('States of Matter', 'États de la matière'), l('Classify examples by state of matter.', 'Classe des exemples selon leur état.'), [classify('sc-u1', l('Water vapor is…', 'La vapeur d’eau est…'), [l('solid','solide'),l('liquid','liquide'),l('gas','gaz')], 'gaz')], 2),
    definition('sciences', ageBand, 'water-cycle', 'sequence', 'science:water_cycle', l('Water Cycle', 'Cycle de l’eau'), l('Put water-cycle stages in order.', 'Remets les étapes du cycle de l’eau dans l’ordre.'), [order('sc-u2', l('Order these stages.', 'Remets ces étapes dans l’ordre.'), [l('condensation','condensation'),l('precipitation','précipitations'),l('evaporation','évaporation')], ['évaporation','condensation','précipitations'])], 2),
    definition('sciences', ageBand, 'food-chain', 'multiple_choice_challenge', 'science:food_chain', l('Food Chains', 'Chaînes alimentaires'), l('Reason about simple food chains.', 'Raisonne sur des chaînes alimentaires simples.'), [choice('sc-u3', l('Which is a producer?', 'Lequel est un producteur ?'), [l('grass','herbe'),l('rabbit','lapin'),l('fox','renard')], 'herbe')], 2),
  ];
  if (ageBand === 'middle_school') return [
    definition('sciences', ageBand, 'cells', 'multiple_choice_challenge', 'science:cells', l('Cells', 'Cellules'), l('Identify basic cell structures.', 'Identifie les structures de base d’une cellule.'), [choice('sc-m1', l('Which structure contains genetic material?', 'Quelle structure contient le matériel génétique ?'), [l('nucleus','noyau'),l('membrane','membrane'),l('cytoplasm','cytoplasme')], 'noyau')], 3),
    definition('sciences', ageBand, 'forces', 'sort_classify', 'science:forces', l('Forces', 'Forces'), l('Classify forces as contact or non-contact.', 'Classe les forces en contact ou à distance.'), [classify('sc-m2', l('Gravity is…', 'La gravité est…'), [l('contact','de contact'),l('non-contact','à distance')], 'à distance')], 3),
    definition('sciences', ageBand, 'method', 'sequence', 'science:scientific_method', l('Scientific Method', 'Démarche scientifique'), l('Order key investigation steps.', 'Remets les étapes d’une investigation dans l’ordre.'), [order('sc-m3', l('Order the steps.', 'Remets les étapes dans l’ordre.'), [l('conclusion','conclusion'),l('hypothesis','hypothèse'),l('experiment','expérience'),l('question','question')], ['question','hypothèse','expérience','conclusion'])], 3),
  ];
  return [
    definition('sciences', ageBand, 'chemistry', 'multiple_choice_challenge', 'science:chemistry', l('Chemistry Reasoning', 'Raisonnement en chimie'), l('Apply basic chemical reasoning.', 'Applique des notions fondamentales de chimie.'), [choice('sc-h1', l('A solution with pH 2 is…', 'Une solution de pH 2 est…'), [l('acidic','acide'),l('neutral','neutre'),l('basic','basique')], 'acide')], 4),
    definition('sciences', ageBand, 'biology', 'sequence', 'science:gene_expression', l('Biology Sequence', 'Séquence de biologie'), l('Order a simplified information pathway.', 'Remets dans l’ordre une voie simplifiée de l’information génétique.'), [order('sc-h2', l('Order the simplified pathway.', 'Remets la voie simplifiée dans l’ordre.'), [l('protein','protéine'),l('DNA','ADN'),l('RNA','ARN')], ['ADN','ARN','protéine'])], 4),
  ];
}

function history(ageBand: PedagogicalAgeBand): SkillActivityDefinition[] {
  if (ageBand === 'early_primary') return [
    definition('histoire', ageBand, 'chronology', 'timeline', 'history:chronology', l('Before and After', 'Avant et après'), l('Put everyday events in chronological order.', 'Remets des événements du quotidien dans l’ordre chronologique.'), [order('hi-e1', l('Order the day.', 'Remets la journée dans l’ordre.'), [l('evening','soir'),l('morning','matin'),l('afternoon','après-midi')], ['matin','après-midi','soir'])], 1),
  ];
  if (ageBand === 'upper_primary') return [
    definition('histoire', ageBand, 'eras', 'timeline', 'history:historical_periods', l('Historical Periods', 'Grandes périodes'), l('Put major historical periods in order.', 'Remets les grandes périodes historiques dans l’ordre.'), [order('hi-u1', l('Order the periods.', 'Remets les périodes dans l’ordre.'), [l('Middle Ages','Moyen Âge'),l('Antiquity','Antiquité'),l('Modern era','Temps modernes'),l('Contemporary era','Époque contemporaine')], ['Antiquité','Moyen Âge','Temps modernes','Époque contemporaine'])], 2),
    definition('histoire', ageBand, 'dates', 'multiple_choice_challenge', 'history:key_dates', l('Key Dates', 'Dates repères'), l('Recognize a few major chronology markers.', 'Reconnais quelques grands repères chronologiques.'), [choice('hi-u2', l('1789 marks the beginning of…', '1789 marque le début de…'), [l('the French Revolution','la Révolution française'),l('the Middle Ages','le Moyen Âge'),l('the Roman Empire','l’Empire romain')], 'la Révolution française')], 2),
  ];
  if (ageBand === 'middle_school') return [
    definition('histoire', ageBand, 'timeline', 'timeline', 'history:chronology', l('Timeline Builder', 'Frise chronologique'), l('Place major events in chronological order.', 'Place des événements majeurs dans l’ordre chronologique.'), [order('hi-m1', l('Order these events.', 'Remets ces événements dans l’ordre.'), [l('French Revolution','Révolution française'),l('First World War','Première Guerre mondiale'),l('Second World War','Seconde Guerre mondiale')], ['Révolution française','Première Guerre mondiale','Seconde Guerre mondiale'])], 3),
    definition('histoire', ageBand, 'cause', 'multiple_choice_challenge', 'history:cause_consequence', l('Cause and Consequence', 'Cause et conséquence'), l('Connect events to historical consequences.', 'Relie les événements à leurs conséquences historiques.'), [choice('hi-m2', l('Which event began in 1914?', 'Quel événement débute en 1914 ?'), [l('First World War','Première Guerre mondiale'),l('Second World War','Seconde Guerre mondiale'),l('French Revolution','Révolution française')], 'Première Guerre mondiale')], 3),
  ];
  return [
    definition('histoire', ageBand, 'analysis', 'multiple_choice_challenge', 'history:source_reasoning', l('Source Reasoning', 'Analyse de source'), l('Reason about evidence and historical context.', 'Raisonne sur les sources et leur contexte historique.'), [choice('hi-h1', l('A primary source is created…', 'Une source primaire est produite…'), [l('during the period studied','pendant la période étudiée'),l('only by historians later','uniquement par des historiens après coup'),l('without any author','sans auteur')], 'pendant la période étudiée')], 4),
    definition('histoire', ageBand, 'chronology', 'timeline', 'history:modern_chronology', l('Modern Chronology', 'Chronologie contemporaine'), l('Order major twentieth-century markers.', 'Remets de grands repères du XXe siècle dans l’ordre.'), [order('hi-h2', l('Order these events.', 'Remets ces événements dans l’ordre.'), [l('Fall of Berlin Wall','Chute du mur de Berlin'),l('First World War','Première Guerre mondiale'),l('Second World War','Seconde Guerre mondiale')], ['Première Guerre mondiale','Seconde Guerre mondiale','Chute du mur de Berlin'])], 4),
  ];
}

function geography(ageBand: PedagogicalAgeBand): SkillActivityDefinition[] {
  if (ageBand === 'early_primary') return [
    definition('geographie', ageBand, 'spaces', 'sort_classify', 'geo:spaces', l('Places Around Me', 'Les lieux autour de moi'), l('Classify familiar places.', 'Classe des lieux familiers.'), [classify('geo-e1', l('A classroom belongs to…', 'Une salle de classe appartient à…'), [l('school','l’école'),l('home','la maison')], 'l’école')], 1),
  ];
  if (ageBand === 'upper_primary') return [
    definition('geographie', ageBand, 'map', 'map_interaction', 'geo:continents', l('World Map Challenge', 'Défi carte du monde'), l('Identify continents and oceans.', 'Identifie les continents et les océans.'), [choice('geo-u1', l('France is in which continent?', 'La France se trouve sur quel continent ?'), [l('Europe','Europe'),l('Africa','Afrique'),l('Asia','Asie')], 'Europe')], 2),
    definition('geographie', ageBand, 'capitals', 'multiple_choice_challenge', 'geo:capitals', l('Capital Cities', 'Capitales'), l('Match countries with familiar capitals.', 'Associe des pays à des capitales familières.'), [choice('geo-u2', l('What is the capital of France?', 'Quelle est la capitale de la France ?'), [l('Paris','Paris'),l('Lyon','Lyon'),l('Marseille','Marseille')], 'Paris')], 2),
  ];
  if (ageBand === 'middle_school') return [
    definition('geographie', ageBand, 'map', 'map_interaction', 'geo:europe', l('Europe Map Challenge', 'Défi carte de l’Europe'), l('Identify countries and spatial relationships.', 'Identifie des pays et des relations spatiales.'), [choice('geo-m1', l('Which country borders France?', 'Quel pays partage une frontière avec la France ?'), [l('Spain','Espagne'),l('Portugal','Portugal'),l('Denmark','Danemark')], 'Espagne')], 3),
    definition('geographie', ageBand, 'classify', 'sort_classify', 'geo:urban_rural', l('Urban or Rural?', 'Urbain ou rural ?'), l('Classify geographic characteristics.', 'Classe des caractéristiques géographiques.'), [classify('geo-m2', l('High population density is usually associated with…', 'Une forte densité de population est généralement associée à…'), [l('urban space','un espace urbain'),l('rural space','un espace rural')], 'un espace urbain')], 3),
  ];
  return [
    definition('geographie', ageBand, 'globalization', 'multiple_choice_challenge', 'geo:globalization', l('Globalization', 'Mondialisation'), l('Reason about global flows and territories.', 'Raisonne sur les flux mondiaux et les territoires.'), [choice('geo-h1', l('A major port is primarily a node for…', 'Un grand port est avant tout un nœud de…'), [l('flows and exchanges','flux et échanges'),l('agricultural isolation','isolement agricole'),l('mountain formation','formation des montagnes')], 'flux et échanges')], 4),
    definition('geographie', ageBand, 'map', 'map_interaction', 'geo:world_regions', l('World Regions', 'Régions du monde'), l('Identify major world regions and spatial patterns.', 'Identifie de grandes régions du monde et des logiques spatiales.'), [choice('geo-h2', l('Which ocean separates Europe and North America?', 'Quel océan sépare l’Europe et l’Amérique du Nord ?'), [l('Atlantic Ocean','océan Atlantique'),l('Indian Ocean','océan Indien'),l('Arctic only','uniquement l’océan Arctique')], 'océan Atlantique')], 4),
  ];
}

export const CROSS_SUBJECT_ACTIVITIES: readonly SkillActivityDefinition[] = BANDS.flatMap((band) => [
  ...french(band),
  ...english(band),
  ...science(band),
  ...history(band),
  ...geography(band),
]);

export function getCrossSubjectActivities(subjectId?: SubjectId, ageBand?: PedagogicalAgeBand): SkillActivityDefinition[] {
  return CROSS_SUBJECT_ACTIVITIES.filter((activity) => (!subjectId || activity.subjectId === subjectId) && (!ageBand || activity.ageBand === ageBand));
}
