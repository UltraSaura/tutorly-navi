import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

/**
 * Simple rule-based generator that turns a success criterion text
 * into 3 practice tasks + 1 exit ticket with stems, expected solutions,
 * and rubrics. No external API calls.
 */

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Utilities */
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const gcd = (a,b)=>b?gcd(b,a%b):Math.abs(a);

/** Tiny helpers to build fractions and decimals */
function randFrac(max=12){
  let n = rnd(1,max), d = rnd(2,max);
  if (n===d) n = Math.max(1, n-1);
  return {n, d};
}
function simplify({n,d}){
  const g = gcd(n,d);
  return {n:n/g, d:d/g};
}
function toMixed({n,d}){
  const q = Math.floor(n/d), r = n%d;
  return {q, r, d};
}
function randDecimal(){
  const i = rnd(0,99);
  const t = rnd(0,9);
  const h = rnd(0,9);
  return {i,t,h, str: `${i},${t}${h}`}; // comma for French decimal
}

/** Very small NLG snippets */
function stemCompareFractions(a,b){
  return `Compare les fractions ${a.n}/${a.d} et ${b.n}/${b.d}. Choisis <, = ou >.`;
}
function solCompareFractions(a,b){
  const L = a.n*b.d;
  const R = b.n*a.d;
  return L<R ? '<' : (L>R ? '>' : '=');
}
function stemPlaceFractionOnLine(f){
  return `Place la fraction ${f.n}/${f.d} sur une droite graduée de 0 à 2. Indique l'intervalle correct (entre quels entiers).`;
}
function solPlaceFractionOnLine(f){
  const val = f.n/f.d;
  const k = Math.floor(val);
  return `Entre ${k} et ${k+1}`;
}
function stemMixedFromImproper(f){
  return `Écris ${f.n}/${f.d} sous la forme d'un nombre entier et d'une fraction (écriture mixte).`;
}
function solMixedFromImproper(f){
  const {q,r,d} = toMixed(f);
  return `${q} et ${r}/${d}`;
}

function stemDecimalRead(dec){
  return `Lis et écris ce nombre en chiffres: ${dec.str}.`;
}
function solDecimalRead(dec){
  return dec.str;
}
function stemRounding(dec){
  return `Arrondis ${dec.str} à l'unité la plus proche.`;
}
function solRounding(dec){
  const [i,rest] = dec.str.split(',');
  const t = parseInt(rest?.[0]??'0',10);
  return (t>=5) ? String(parseInt(i,10)+1) : i;
}

function stemBarChart(){
  return `On a compté des fruits: Pommes 6, Poires 4, Bananes 8. Quel fruit est le plus fréquent et de combien dépasse-t-il le second?`;
}
function solBarChart(){
  return `Bananes. 8 - 6 = 2 de plus que les pommes.`;
}

function stemProbability(){
  return `Dans un sac: 3 billes bleues, 1 bille rouge. Dire si « tirer une bille bleue » est impossible, possible, certain, peu probable ou probable.`;
}
function solProbability(){
  return `Probable (3 sur 4).`;
}

function stemPerimeter(){
  const L = rnd(3,12), W = rnd(2,9);
  return {stem:`Un rectangle mesure ${L} cm sur ${W} cm. Calcule le périmètre.`, sol:`${2*(L+W)} cm`};
}
function stemAreaGrid(){
  const a = rnd(3,6), b = rnd(3,6);
  return {stem:`Sur une grille, un rectangle couvre ${a} cases sur ${b} cases. Quelle est l'aire en « carrés unités » ?`, sol:`${a*b} unités²`};
}
function stemPerpParallel(){
  return `Sur la figure, la droite (d1) est perpendiculaire à (d2). Indique une autre paire de droites parallèles si elle existe.`;
}
function solPerpParallel(){
  return `Réponse dépendante du dessin. Exemple attendu: identifier deux droites marquées //.`;
}

function classify(scText, domain, subdomain){
  const t = (scText + ' ' + domain + ' ' + subdomain).toLowerCase();

  if (t.includes('fraction')) return 'fractions';
  if (t.includes('décimal') || t.includes('virgule')) return 'decimals';
  if (t.includes('probabil')) return 'prob';
  if (t.includes('donnée') || t.includes('diagramme') || t.includes('graph')) return 'data';
  if (t.includes('aire')) return 'area';
  if (t.includes('périmètre')) return 'perimeter';
  if (t.includes('angle') || t.includes('perpend') || t.includes('parall')) return 'angles';
  if (t.includes('addition') || t.includes('soustraction') || t.includes('multiplication') || t.includes('division') || t.includes('opération')) return 'ops';
  return 'generic';
}

function makeTasksForCriterion(sc, obj){
  const bucket = classify(sc.text, obj.domain, obj.subdomain);
  const out = [];

  if (bucket === 'fractions') {
    const f1 = simplify(randFrac(12)), f2 = simplify(randFrac(12));
    out.push({type:'open', stem: stemCompareFractions(f1,f2), solution: solCompareFractions(f1,f2), rubric:'Signe correct et justification.'});
    const f3 = {n:rnd(5,15), d:rnd(2,6)};
    out.push({type:'open', stem: stemPlaceFractionOnLine(f3), solution: solPlaceFractionOnLine(f3), rubric:'Bon intervalle indiqué.'});
    const f4 = {n:rnd(7,20), d:rnd(2,6)};
    out.push({type:'open', stem: stemMixedFromImproper(f4), solution: solMixedFromImproper(f4), rubric:'Partie entière et fraction restantes correctes.'});
    // Exit ticket
    const f5 = {n:rnd(7,20), d:rnd(2,6)};
    out.push({type:'exit', stem:`Exit ticket: ${stemMixedFromImproper(f5)}`, solution: solMixedFromImproper(f5), rubric:'Réponse exacte.'});
    return out;
  }

  if (bucket === 'decimals') {
    const d1 = randDecimal();
    const d2 = randDecimal();
    out.push({type:'open', stem: stemDecimalRead(d1), solution: solDecimalRead(d1), rubric:'Écriture correcte.'});
    out.push({type:'open', stem: stemRounding(d2), solution: solRounding(d2), rubric:'Arrondi correct.'});
    out.push({type:'open', stem:`Place ${d1.str} sur une droite graduée de l'unité. Indique l'intervalle entre deux entiers.`, solution:`Entre ${Math.floor(parseInt(d1.str)/1)} et ${Math.floor(parseInt(d1.str)/1)+1}`, rubric:'Intervalle approprié.'});
    out.push({type:'exit', stem:`Exit ticket: ${stemRounding(randDecimal())}`, solution: solRounding(randDecimal()), rubric:'Arrondi exact.'});
    return out;
  }

  if (bucket === 'data') {
    out.push({type:'open', stem: stemBarChart(), solution: solBarChart(), rubric:'Fruit le plus fréquent et différence corrects.'});
    out.push({type:'open', stem:`Dans un tableau de 20 élèves: 12 aiment le foot, 8 le basket. Combien préfèrent le foot en pourcentage (arrondi à l'unité)?`, solution:`60%`, rubric:'Calcul 12/20 correct.'});
    out.push({type:'open', stem:`Un relevé quotidien de température affiche: 10, 9, 11, 12, 8. Calcule la moyenne.`, solution:`10`, rubric:'Somme 50, divisé par 5.'});
    out.push({type:'exit', stem:`Exit ticket: ${stemBarChart()}`, solution: solBarChart(), rubric:'Réponse exacte.'});
    return out;
  }

  if (bucket === 'prob') {
    out.push({type:'open', stem: stemProbability(), solution: solProbability(), rubric:'Bon vocabulaire de probabilité.'});
    out.push({type:'open', stem:`Un dé équilibré. Dire si « obtenir un 6 » est impossible, possible, ou certain.`, solution:`Possible.`, rubric:'Qualification correcte.'});
    out.push({type:'open', stem:`Deux issues: pile ou face. Dire la probabilité de « face » en langage naturel.`, solution:`Une chance sur deux.`, rubric:'Langage correct.'});
    out.push({type:'exit', stem:`Exit ticket: ${stemProbability()}`, solution: solProbability(), rubric:'Réponse exacte.'});
    return out;
  }

  if (bucket === 'area') {
    const a1 = stemAreaGrid();
    out.push({type:'open', stem:a1.stem, solution:a1.sol, rubric:'Comptage correct.'});
    out.push({type:'open', stem:`Sur une grille, une figure occupe 7 cases entières et 6 demi-cases. Estime l'aire.`, solution:`10 unités²`, rubric:'6 demi-cases font 3 unités.'});
    out.push({type:'open', stem:`Vrai ou faux: deux figures peuvent avoir le même périmètre mais des aires différentes. Explique.`, solution:`Vrai, exemples possibles.`, rubric:'Explication cohérente.'});
    out.push({type:'exit', stem:`Exit ticket: ${a1.stem}`, solution:a1.sol, rubric:'Réponse exacte.'});
    return out;
  }

  if (bucket === 'perimeter') {
    const p = stemPerimeter();
    out.push({type:'open', stem:p.stem, solution:p.sol, rubric:'Formule 2(L+W).'});
    out.push({type:'open', stem:`Carré de côté 7 cm. Calcule le périmètre.`, solution:`28 cm`, rubric:'4c correct.'});
    out.push({type:'open', stem:`Un triangle isocèle a côtés 5 cm, 5 cm, 8 cm. Périmètre?`, solution:`18 cm`, rubric:'Somme des côtés.'});
    out.push({type:'exit', stem:`Exit ticket: ${p.stem}`, solution:p.sol, rubric:'Réponse exacte.'});
    return out;
  }

  if (bucket === 'angles') {
    out.push({type:'open', stem: stemPerpParallel(), solution: solPerpParallel(), rubric:'Identification correcte.'});
    out.push({type:'open', stem:`Trace avec l'équerre un angle droit et nomme-le. Explique comment tu sais que c'est un angle droit.`, solution:`Alignement avec l'équerre.`, rubric:'Méthode décrite.'});
    out.push({type:'open', stem:`Classe ces angles: 30°, 90°, 120° en aigu, droit, obtus.`, solution:`Aigu: 30°, Droit: 90°, Obtus: 120°`, rubric:'Classement correct.'});
    out.push({type:'exit', stem:`Exit ticket: ${stemPerpParallel()}`, solution: solPerpParallel(), rubric:'Identification correcte.'});
    return out;
  }

  if (bucket === 'ops') {
    out.push({type:'open', stem:`Calcule: 384 + 159 = ?`, solution:`543`, rubric:'Addition correcte.'});
    out.push({type:'open', stem:`Calcule: 705 - 468 = ?`, solution:`237`, rubric:'Soustraction correcte.'});
    out.push({type:'open', stem:`Calcule: 36 × 7 = ?`, solution:`252`, rubric:'Multiplication correcte.'});
    out.push({type:'exit', stem:`Exit ticket: 128 ÷ 4 = ?`, solution:`32`, rubric:'Division correcte.'});
    return out;
  }

  // Fallback generic
  out.push({type:'open', stem:`Explique avec tes mots: ${sc.text}`, solution:`Réponse rédigée attendue.`, rubric:'Pertinence et précision.'});
  out.push({type:'open', stem:`Donne un exemple et un contre-exemple liés à: ${sc.text}`, solution:`Exemple et contre-exemple pertinents.`, rubric:'Correct.'});
  out.push({type:'open', stem:`Résous un petit problème qui utilise: ${sc.text}`, solution:`Solution structurée.`, rubric:'Étapes claires.'});
  out.push({type:'exit', stem:`Exit ticket: question essentielle liée à: ${sc.text}`, solution:`Réponse exacte et concise.`, rubric:'Clarté.'});
  return out;
}

async function main(){
  // 1) Pull all CM1 criteria with their objective context
  const { data: objectives, error: e1 } = await supabase.from('objectives').select('*').eq('level','CM1');
  if (e1) throw e1;
  const objById = new Map(objectives.map(o => [o.id, o]));

  const { data: criteria, error: e2 } = await supabase.from('success_criteria').select('*');
  if (e2) throw e2;

  // 2) For each criterion, if it has fewer than 4 tasks, generate up to 4
  const { data: existingTasks, error: e3 } = await supabase.from('tasks').select('id, success_criterion_id');
  if (e3) throw e3;
  const countBySC = existingTasks.reduce((m,t)=> (m[t.success_criterion_id]=(m[t.success_criterion_id]||0)+1, m), {});

  const inserts = [];
  for (const sc of criteria) {
    const need = Math.max(0, 4 - (countBySC[sc.id] || 0));
    if (need === 0) continue;

    const obj = objById.get(sc.objective_id) || { domain:'', subdomain:'' };
    const batch = makeTasksForCriterion(sc, obj).slice(0, need);

    for (const t of batch) {
      inserts.push({
        id: id('task'),
        success_criterion_id: sc.id,
        type: t.type,
        stem: t.stem,
        solution: t.solution,
        rubric: t.rubric,
        difficulty: t.type === 'exit' ? 'mastery' : 'core',
        tags: [`${obj.domain}`, `${obj.subdomain}`, 'auto'],
        source: 'auto'
      });
    }
  }

  // 3) Upsert in chunks
  console.log(`Generating ${inserts.length} tasks...`);
  for (let i=0; i<inserts.length; i+=500){
    const slice = inserts.slice(i, i+500);
    const { error } = await supabase.from('tasks').upsert(slice, { onConflict: 'id' });
    if (error) throw error;
  }
  console.log('Done. Added or completed 4 per success criterion.');
}

main().catch(e => { console.error(e); process.exit(1); });
