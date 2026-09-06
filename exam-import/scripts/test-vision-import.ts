/**
 * Test script: manually-extracted vision data from the 2018 DNB PDF.
 * Crops figures using Python PIL, uploads to Supabase Storage, builds bundle.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);

const PDF_PAGES_DIR = "/tmp/brevet-test";
const ASSETS_DIR = "exam-import/assets/vision-test";
const PAGE_W = 1700;
const PAGE_H = 2200;

// ── Extraction result (produced by reading all 6 pages) ───────────────────────

const EXTRACTION = {
  year: 2018,
  location: "metropole-reunion",
  title: "DNB Brevet Métropole La Réunion 28 juin 2018",
  exercises: [
    {
      number: 1, points: 11,
      context: "Le gros globe de cristal est un trophée attribué au vainqueur de la coupe du monde de ski. Ce trophée pèse 9 kg et mesure 46 cm de hauteur.",
      figures: [
        { page: 1, label: "Globe de cristal", alt: "Photo du trophée globe de cristal", bbox: { x: 0.77, y: 0.10, w: 0.13, h: 0.14 } },
        { page: 1, label: "Carte — localisation de Pyeongchang", alt: "Mappemonde avec Pyeongchang marqué en Corée du Sud (latitude ~37°N, longitude ~128°E)", bbox: { x: 0.03, y: 0.28, w: 0.88, h: 0.27 } },
        { page: 1, label: "Schéma du trophée", alt: "Cylindre de 23 cm surmonté d'une sphère de diamètre 23 cm", bbox: { x: 0.72, y: 0.60, w: 0.23, h: 0.30 } },
      ],
      tables: [],
      questions: [
        { id: "q1", label: "1.", text: "Le biathlète Martin Fourcade a remporté le sixième gros globe de cristal en 2017 à Pyeongchang en Corée du Sud. Donner approximativement la latitude et la longitude de ce lieu repéré sur la carte.", answer_type: "short_text" as const },
        { id: "q2", label: "2.", text: "On considère que le globe est composé d'un cylindre en cristal de diamètre 6 cm surmonté d'une boule de cristal. Montrer qu'une valeur approchée du volume de la boule est de 6 371 cm³. Rappel : volume d'une boule de rayon R : V = (4/3)·π·R³ ; volume d'un cylindre de rayon r et hauteur h : V = π·r²·h.", answer_type: "free_text" as const },
        { id: "q3", label: "3.", text: "Marie affirme que le volume de la boule de cristal représente environ 90 % du volume total du trophée. A-t-elle raison ?", answer_type: "free_text" as const },
      ],
    },
    {
      number: 2, points: 14,
      context: "Parmi les nombreux polluants de l'air, les particules fines sont régulièrement surveillées. Les PM10 sont des particules fines dont le diamètre est inférieur à 0,01 mm. En janvier 2017, les villes de Lyon et Grenoble ont connu un épisode de pollution aux particules fines.",
      figures: [],
      tables: [
        {
          label: "Données statistiques PM10 — Lyon (16 au 25 janvier 2017)",
          headers: ["Statistique", "Valeur"],
          rows: [["Moyenne", "72,5 μg/m³"], ["Médiane", "83,5 μg/m³"], ["Concentration minimale", "22 μg/m³"], ["Concentration maximale", "107 μg/m³"]],
        },
        {
          label: "Relevés journaliers PM10 — Grenoble (16 au 25 janvier 2017)",
          headers: ["Date", "Concentration PM10 (μg/m³)"],
          rows: [["16 janvier", "32"], ["17 janvier", "39"], ["18 janvier", "52"], ["19 janvier", "57"], ["20 janvier", "78"], ["21 janvier", "63"], ["22 janvier", "60"], ["23 janvier", "82"], ["24 janvier", "82"], ["25 janvier", "89"]],
        },
      ],
      questions: [
        { id: "q1", label: "1.", text: "Laquelle de ces deux villes a eu la plus forte concentration moyenne en PM10 entre le 16 et le 25 janvier ?", answer_type: "short_text" as const },
        { id: "q2", label: "2.", text: "Calculer l'étendue des séries des relevés en PM10 à Lyon et à Grenoble. Laquelle de ces deux villes a eu l'étendue la plus importante ? Interpréter ce résultat.", answer_type: "free_text" as const },
        { id: "q3", label: "3.", text: "L'affirmation suivante est-elle exacte ? « Du 16 au 25 janvier, le seuil d'alerte de 80 μg/m³ par jour a été dépassé au moins 5 fois à Lyon. » Justifier.", answer_type: "free_text" as const },
      ],
    },
    {
      number: 3, points: 12,
      context: "Dans son lecteur audio, Théo a téléchargé 375 morceaux de musique. Parmi eux, il y a 125 morceaux de rap. Il appuie sur la touche « lecture aléatoire » qui lui permet d'écouter un morceau choisi au hasard parmi tous les morceaux disponibles.",
      figures: [], tables: [],
      questions: [
        { id: "q1", label: "1.", text: "Quelle est la probabilité qu'il écoute du rap ?", answer_type: "numeric" as const },
        { id: "q2", label: "2.", text: "La probabilité qu'il écoute du rock est égale à 7/15. Combien Théo a-t-il de morceaux de rock dans son lecteur audio ?", answer_type: "numeric" as const },
        { id: "q3", label: "3.", text: "Alice possède 40 % de morceaux de rock dans son lecteur audio. Si Théo et Alice appuient tous les deux sur « lecture aléatoire », lequel a le plus de chances d'écouter un morceau de rock ?", answer_type: "free_text" as const },
      ],
    },
    {
      number: 4, points: 14,
      context: "La figure ci-dessous n'est pas représentée en vraie grandeur. Les points C, B et E sont alignés. Le triangle ABC est rectangle en A. Le triangle BDC est rectangle en B.",
      figures: [
        { page: 3, label: "Figure géométrique — triangles semblables", alt: "Figure avec triangles ABC rectangle en A, BDC rectangle en B, et BFE. Mesures : CB=7,5 cm, BE=6,8 cm, BF=6 cm, EF=3,2 cm, BD=8,5 cm, angle ACB=61°", bbox: { x: 0.03, y: 0.03, w: 0.90, h: 0.30 } },
      ],
      tables: [],
      questions: [
        { id: "q1", label: "1.", text: "Montrer que la longueur BD est égale à 4 cm.", answer_type: "free_text" as const },
        { id: "q2", label: "2.", text: "Montrer que les triangles CBD et BFE sont semblables.", answer_type: "free_text" as const },
        { id: "q3", label: "3.", text: "Sophie affirme que l'angle BFE est un angle droit. A-t-elle raison ?", answer_type: "free_text" as const },
        { id: "q4", label: "4.", text: "Max affirme que l'angle ACD est un angle droit. A-t-il raison ?", answer_type: "free_text" as const },
      ],
    },
    {
      number: 5, points: 16,
      context: "Programme de calcul : Choisir un nombre → Multiplier ce nombre par 4 → Ajouter 8 → Multiplier le résultat par 2.",
      figures: [], tables: [],
      questions: [
        { id: "q1", label: "1.", text: "Vérifier que si on choisit le nombre −1, ce programme donne 8 comme résultat final.", answer_type: "numeric" as const },
        { id: "q2", label: "2.", text: "Le programme donne 30 comme résultat final. Quel est le nombre choisi au départ ?", answer_type: "numeric" as const },
        { id: "q3", label: "3.", text: "L'expression A = 2(4x + 8) donne le résultat du programme pour un nombre x. On pose B = (4 + x)² − x². Prouver que A et B sont égales pour toutes les valeurs de x.", answer_type: "free_text" as const },
        { id: "q4", label: "4.", text: "Affirmation 1 : Ce programme donne un résultat positif pour toutes les valeurs de x. Affirmation 2 : Si x est un entier, le résultat est un multiple de 8. Pour chacune, indiquer si elle est vraie ou fausse en justifiant.", answer_type: "free_text" as const },
      ],
    },
    {
      number: 6, points: 16,
      context: "Les longueurs sont en pixels. L'expression « s'orienter à 90 » signifie que l'on s'oriente vers la droite. Un programme Scratch dessine un carré (côté = Longueur) puis un triangle équilatéral (côté = Longueur), avance de Longueur÷6, puis répète avec une nouvelle Longueur.",
      figures: [
        { page: 4, label: "Programme Scratch", alt: "Blocs Scratch : initialisation, carré (répéter 4 fois : avancer Longueur, tourner 90°), triangle (répéter 3 fois : avancer Longueur, tourner 120°)", bbox: { x: 0.01, y: 0.02, w: 0.98, h: 0.40 } },
        { page: 4, label: "Figure obtenue par le programme Scratch", alt: "Grand carré avec un grand triangle équilatéral inscrit, et à l'intérieur un petit carré avec un petit triangle, axe de symétrie vertical", bbox: { x: 0.22, y: 0.53, w: 0.56, h: 0.23 } },
      ],
      tables: [],
      questions: [
        { id: "q1", label: "1.", text: "On prend comme échelle 1 cm pour 50 pixels. a. Représenter sur votre copie la figure obtenue si le programme est exécuté jusqu'à la ligne 7 comprise. b. Quelles sont les coordonnées du stylo après l'exécution de la ligne 8 ?", answer_type: "free_text" as const },
        { id: "q2", label: "2.", text: "On exécute le programme complet et on obtient la figure ci-dessus qui possède un axe de symétrie vertical. Recopier et compléter la ligne 9 du programme pour obtenir cette figure.", answer_type: "short_text" as const },
        { id: "q3", label: "3.", text: "a. Parmi les transformations suivantes, translation, homothétie, rotation, symétrie axiale, quelle est la transformation géométrique qui permet d'obtenir le petit carré à partir du grand carré ? Préciser le rapport de réduction. b. Quel est le rapport des aires entre les deux carrés dessinés ?", answer_type: "free_text" as const },
      ],
    },
    {
      number: 7, points: 17,
      context: "Le « hand-spinner » est une sorte de toupie plate qui tourne sur elle-même. On lui donne une vitesse de rotation initiale au temps t = 0, puis sa vitesse diminue jusqu'à l'arrêt complet. Sa vitesse de rotation est relevée en nombre de tours par seconde. Pour calculer la vitesse V(t) en fonction du temps t : V(t) = −0,214 × t + V_initiale.",
      figures: [
        { page: 5, label: "Photo du hand-spinner", alt: "Photo d'un hand-spinner à trois branches", bbox: { x: 0.68, y: 0.05, w: 0.20, h: 0.14 } },
        { page: 5, label: "Graphique — vitesse de rotation du hand-spinner en fonction du temps", alt: "Graphique linéaire décroissant : vitesse (tours/s) de 20 à 0 en fonction du temps (s) de 0 à 94s. Droite de pente −0,214.", bbox: { x: 0.02, y: 0.27, w: 0.92, h: 0.44 } },
      ],
      tables: [],
      questions: [
        { id: "q1", label: "1.", text: "Le temps et la vitesse de rotation du hand-spinner sont-ils proportionnels ? Justifier.", answer_type: "free_text" as const },
        { id: "q2", label: "2.", text: "Par lecture graphique : a. Quelle est la vitesse de rotation initiale (en tours par seconde) ? b. Quelle est la vitesse au bout d'une minute et vingt secondes ? c. Au bout de combien de temps le hand-spinner va-t-il s'arrêter ?", answer_type: "free_text" as const },
        { id: "q3", label: "3.", text: "On lance le hand-spinner à une vitesse initiale de 20 tours/s. a. Calculer sa vitesse au bout de 30 s avec V(t) = −0,214 × t + 20. b. Au bout de combien de temps va-t-il s'arrêter ? Justifier par un calcul. c. Est-il vrai que, si l'on fait tourner le hand-spinner deux fois plus vite au départ, il tournera deux fois plus longtemps ? Justifier.", answer_type: "free_text" as const },
      ],
    },
  ],
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await loadDotEnv();
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  await mkdir(ASSETS_DIR, { recursive: true });

  const fetched_at = new Date().toISOString();
  const paper_id = `dnb:apmep:2018:mathematiques:toutes-series:metropole-reunion:standard:vision`;

  console.log("Cropping and uploading figures...");
  const uploadedFigures = await uploadAllFigures(db, paper_id);

  console.log("Building bundle...");
  const bundle = buildBundle(paper_id, fetched_at, uploadedFigures);

  const outPath = "exam-import/bundles/dnb-2018-metropole-reunion-vision.json";
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

  console.log(`\nWrote ${outPath}`);
  console.log(`Exercises: ${bundle.exercises.length}`);
  console.log(`Figures uploaded: ${uploadedFigures.size}`);
  console.log(`Tables: ${EXTRACTION.exercises.reduce((n, e) => n + e.tables.length, 0)}`);
}

// ── Figure cropping + upload ──────────────────────────────────────────────────

async function uploadAllFigures(db: ReturnType<typeof createClient>, paperId: string): Promise<Map<string, { storage_path: string; public_url: string }>> {
  const result = new Map<string, { storage_path: string; public_url: string }>();

  for (const ex of EXTRACTION.exercises) {
    for (const [fi, fig] of ex.figures.entries()) {
      const key = `ex${ex.number}-fig${fi + 1}`;
      const localPath = `${ASSETS_DIR}/${key}.png`;
      const storagePath = `${paperId}/ex${String(ex.number).padStart(2, "0")}/${key}.png`;

      try {
        await cropFigure(fig.page, fig.bbox, localPath);
        const publicUrl = await uploadToSupabase(db, localPath, storagePath);
        result.set(key, { storage_path: storagePath, public_url: publicUrl });
        console.log(`  ✓ ${key}: ${fig.label}`);
      } catch (err) {
        console.warn(`  ✗ ${key} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return result;
}

async function cropFigure(
  page: number,
  bbox: { x: number; y: number; w: number; h: number },
  outPath: string,
): Promise<void> {
  const srcPath = `${PDF_PAGES_DIR}/page-${page}.png`;
  const x = Math.round(bbox.x * PAGE_W);
  const y = Math.round(bbox.y * PAGE_H);
  const w = Math.round(bbox.w * PAGE_W);
  const h = Math.round(bbox.h * PAGE_H);

  const script = `
from PIL import Image
img = Image.open("${srcPath}")
crop = img.crop((${x}, ${y}, ${x + w}, ${y + h}))
crop.save("${outPath}")
print("ok")
`.trim();

  const { stdout } = await execFileAsync("python3", ["-c", script]);
  if (!stdout.trim().startsWith("ok")) throw new Error("PIL crop failed");
}

async function uploadToSupabase(
  db: ReturnType<typeof createClient>,
  localPath: string,
  storagePath: string,
): Promise<string> {
  const bytes = await readFile(localPath);
  const { error } = await db.storage
    .from("exam-assets")
    .upload(storagePath, bytes, { contentType: "image/png", upsert: true });
  if (error) throw new Error(error.message);
  return db.storage.from("exam-assets").getPublicUrl(storagePath).data.publicUrl;
}

// ── Bundle builder ────────────────────────────────────────────────────────────

function buildBundle(paperId: string, fetched_at: string, figures: Map<string, { storage_path: string; public_url: string }>) {
  const sourceUrl = "https://www.apmep.fr/Brevet-2018";

  const exercises = EXTRACTION.exercises.map((ex, idx) => {
    const exId = `${paperId}:ex${String(idx + 1).padStart(2, "0")}`;

    const imgDocs = ex.figures.map((fig, fi) => {
      const key = `ex${ex.number}-fig${fi + 1}`;
      const uploaded = figures.get(key);
      return {
        type: "image" as const,
        label: fig.label,
        alt: fig.alt,
        ...(uploaded ?? {}),
      };
    });

    const tableDocs = ex.tables.map((t) => ({
      type: "table" as const,
      label: t.label,
      table: { headers: t.headers, rows: t.rows },
    }));

    const questions = ex.questions.map((q) => ({
      id: q.id,
      label: q.label,
      text: q.text,
      points: null,
      answer_type: q.answer_type,
      expected_answer: null,
      student_answer: null,
      subquestions: [],
    }));

    return {
      id: exId,
      paper_id: paperId,
      source_name: "apmep" as const,
      source_url: sourceUrl,
      fetched_at,
      exam: "dnb" as const,
      session_year: EXTRACTION.year,
      discipline: "mathematiques",
      series: "generale" as const,
      location: EXTRACTION.location,
      variant: "standard" as const,
      pdf_url: "",
      pdf_hash: "vision-extracted",
      exercise_number: ex.number,
      title: `Exercice ${ex.number} (${ex.points} points)`,
      raw_text: ex.context,
      parsing_status: "parsed" as const,
      parsing_confidence: "high" as const,
      parsed_content: {
        title: `Exercice ${ex.number}`,
        context: ex.context,
        documents: [...imgDocs, ...tableDocs],
        questions,
        raw_excerpt: ex.context.slice(0, 500),
        confidence: "high" as const,
      },
    };
  });

  return {
    sources: [{ id: `apmep:${sourceUrl}`, source_name: "apmep", source_url: sourceUrl, fetched_at }],
    papers: [{
      id: paperId,
      source_name: "apmep" as const,
      source_url: sourceUrl,
      fetched_at,
      exam: "dnb" as const,
      session_year: EXTRACTION.year,
      discipline: "mathematiques",
      series: "generale" as const,
      location: EXTRACTION.location,
      variant: "standard" as const,
      pdf_url: "",
      title: EXTRACTION.title,
      level: "3eme",
      school_cycle: "cycle_4",
      pdf_hash: "vision-extracted",
      raw_text: EXTRACTION.exercises.map((e) => e.context).join("\n\n"),
      exercises: exercises.map((e) => e.id),
      parsing_status: "parsed" as const,
    }],
    exercises,
    exercise_program_links: [],
  };
}

async function loadDotEnv() {
  try {
    const contents = await readFile(".env", "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=["']?(.+?)["']?$/.exec(line.trim());
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
