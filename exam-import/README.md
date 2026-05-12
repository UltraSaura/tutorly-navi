# Exam Import

Pipeline dédié aux annales d'examens. Il est volontairement séparé de `curriculum-import`: les annales restent des documents sources, et les liens vers les programmes sont seulement proposés.

## Sources DNB

- Éduscol: annales DNB récentes avec filtres session, discipline et série.
- Académie d'Amiens maths: historique prioritaire pour les sujets de mathématiques métropole 2007-2021.

## Commandes

Pré-requis recommandé pour une extraction PDF fiable: Poppler, qui fournit `pdftotext` sur macOS via Homebrew. Sans Poppler, une extraction de secours est tentée et `raw_text` est quand même conservé, même vide ou partiel.

```bash
brew install poppler
```

Générer un bundle:

```bash
npm run build:dnb-annales -- --source all --discipline mathematiques --out exam-import/bundles/dnb-maths.json
```

Options utiles: `--source eduscol | amiens | all`, `--year 2021`, `--discipline mathematiques`, `--out exam-import/bundles/dnb-maths.json`, `--program-entries path/to/existing-program-entries.json`.

Générer un bundle avec captures visuelles d'exercices:

```bash
npm run build:dnb-annales -- --source amiens --year 2021 --discipline mathematiques --with-assets --out exam-import/bundles/dnb-amiens-2021-maths.json
```

Avec `--with-assets`, Poppler (`pdftoppm`) génère au minimum une capture PNG de page par exercice dans `exam-import/assets/<paper-id>/<exercise-id>/`. Ces captures complètent le parsing texte sans le remplacer et sont référencées dans `parsed_content.documents[]`.

Importer dans Supabase:

Les annales sont importées dans des tables dédiées:

- `exam_sources`
- `exam_papers`
- `exam_exercises`
- `exam_assets` (optionnel, pour les captures et documents visuels)
- `exam_exercise_program_links`
- `exam_attempts` / `exam_exercise_answers` (préparation des réponses étudiant)

Elles ne touchent pas aux tables de programmes scolaires et ne créent aucune tâche pédagogique.

Les images locales référencées par `documents[].local_path` sont uploadées par `npm run import:dnb-annales` dans le bucket Supabase Storage `exam-assets`. Le script remplace ensuite les documents par `storage_path` et `public_url` avant l'appel à la fonction d'import. L'UI étudiant consomme ces URLs depuis `parsed_content.documents[]`, avec fallback compatible pour les exercices sans assets.

La migration des tables `exam_*` s'applique avec le workflow Supabase du repo. Si l'historique distant est aligné avec les migrations locales:

```bash
supabase db push
```

Dans ce repo, l'historique distant contient aussi des versions absentes localement. Pour appliquer uniquement `20260507120000_create_exam_import_tables.sql`, la commande qui a fonctionné est un `supabase db push` depuis un workdir temporaire contenant les versions distantes en placeholders et la migration `exam_*`; le dry-run doit afficher uniquement:

```text
Would push these migrations:
 • 20260507120000_create_exam_import_tables.sql
```

Déployer la fonction avec la vérification JWT désactivée, car la fonction gère elle-même l'autorisation admin ou service-role:

```bash
supabase functions deploy import-exam-bundle --no-verify-jwt
```

```bash
npm run import:dnb-annales -- --bundle exam-import/bundles/dnb-maths.json --mode upsert
```

Si `SUPABASE_SERVICE_ROLE_KEY` n'est pas déjà présent dans l'environnement, la commande validée dans ce repo utilise la CLI Supabase sans écrire ni afficher la clé:

```bash
tmpfile=$(mktemp)
supabase projects api-keys --project-ref sibprjxhbxahouejygeu -o env > "$tmpfile"
set -a && source .env && source "$tmpfile" && set +a
npm run import:dnb-annales -- --bundle exam-import/bundles/dnb-maths.json --mode upsert
rm -f "$tmpfile"
```

Modes:

- `upsert`: insère ou met à jour par `source_url`, `pdf_hash`, `import_id` et lien exercice-programme.
- `replace`: supprime d'abord les sujets du bundle, leurs exercices et leurs liens proposés, puis réinsère.

La fonction retourne toujours HTTP 200 avec un JSON:

```json
{
  "success": true,
  "mode": "upsert",
  "counts": {
    "sources": 1,
    "papers": 1,
    "exercises": 5,
    "exercise_program_links": 0
  },
  "diagnostics": [],
  "verification": {
    "sources": 1,
    "papers": 1,
    "exercises": 5,
    "exercise_program_links": 0,
    "fk_errors": [],
    "count_mismatches": []
  }
}
```

Smoke test:

```bash
npm run smoke:dnb-annales
```

Avec les policies RLS admin-only, la clé publishable peut retourner des compteurs à zéro. Pour vérifier les compteurs réels après import, injecter la clé service-role en mémoire comme pour l'import avant de lancer le smoke test.

Mode fixture hors ligne:

```bash
npm run smoke:dnb-annales -- --offline
```

Le smoke test réutilise la configuration Supabase déjà présente dans le projet. Il lit dans cet ordre:

1. Les variables déjà présentes dans `process.env`.
2. Le fichier `.env` existant du repo (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` et variantes `VITE_...`).
3. Une erreur explicite si la configuration est introuvable.

Le script n'affiche jamais les clés.

## Vérification en base

Le smoke test vérifie les compteurs des quatre tables dédiées: sources, sujets, exercices et liens programme proposés. Si les tables ne sont pas migrées ou si la configuration Supabase est absente, l'erreur indique la cause sans exposer de secret.

## Interface admin

Les annales importées sont consultables dans l'admin à l'adresse `/admin/exams`, entrée **Annales** dans la navigation.

Limites actuelles:

- Interface en lecture seule.
- Les liens vers programmes sont affichés comme propositions, sans validation active.
- Les actions accepter, rejeter et convertir en tâche sont volontairement désactivées.
- Aucun exercice n'est converti automatiquement en tâche pédagogique.

Prochaines étapes:

- Ajouter un statut persistant `accepted` / `rejected` pour les liens programme.
- Brancher la validation humaine avec audit admin.
- Concevoir séparément une conversion contrôlée vers tâches, sans modifier ce pipeline de consultation.

## Premier lot validé

Premier import réel validé pour contrôler l'interface `/admin/exams`:

- Source: Académie d'Amiens maths (`ac-amiens-maths`)
- Année: 2021
- Discipline: `mathematiques`
- Examen: `dnb`
- Sujets importés: 1
- Exercices importés: 5
- Statut parsing: `parsed`
- Bundle: `exam-import/bundles/dnb-amiens-2021-maths.json` (environ 24 Ko, versionnable)

Commande utilisée:

```bash
npm run build:dnb-annales -- --source amiens --year 2021 --discipline mathematiques --out exam-import/bundles/dnb-amiens-2021-maths.json
npm run build:dnb-annales -- --source amiens --year 2021 --discipline mathematiques --with-assets --out exam-import/bundles/dnb-amiens-2021-maths.json
npm run import:dnb-annales -- --bundle exam-import/bundles/dnb-amiens-2021-maths.json --mode upsert
npm run smoke:dnb-annales
```

### Parsing multi-parties validé sur DNB Amiens 2021

- **Cas couvert** : saut de page `\f` + Partie B + questions 3–5
- **Nettoyage métadonnées Amiens** : titre importé validé `Sujet de Juin 2021` sans fragment HTML/DOM (`page 65'});">`), avec `discipline=mathematiques`, `session_year=2021`, `location=metropole`, `source_name=ac-amiens-maths`.
- **Commande d'import utilisée** :
  ```bash
  npm run import:dnb-annales -- --bundle exam-import/bundles/dnb-amiens-2021-maths.json --mode upsert
  ```
- **Commandes de test utilisées** :
  ```bash
  npm run test -- exam-import/utils/cleanText.test.ts exam-import/parsers/pdf-to-exam.test.ts --run
  npm run build
  ```
- **Vérification locale** : lancement du navigateur sur `http://127.0.0.1:8080/practice/session/:paperId` après import pour validation visuelle mobile 360px.

### MVP exercices étudiants complets

- **Court terme validé** : chaque exercice Amiens 2021 possède une capture visuelle de page PDF, les questions structurées restent présentes, et l'UI étudiant affiche des champs de réponse locaux sous chaque question.
- **Exercice 1 validé** : le tableau des températures est détecté comme document structuré `type="table"` et affiché en tableau HTML responsive. La capture PDF complète reste disponible comme fallback dans “Voir la capture originale”.
- **Commande de rebuild avec assets** :
  ```bash
  npm run build:dnb-annales -- --source amiens --year 2021 --discipline mathematiques --with-assets --out exam-import/bundles/dnb-amiens-2021-maths.json
  ```
- **Limites assumées** : les captures sont actuellement des pages complètes ou pages d'exercice, pas encore des crops précis de tableaux/figures. La sauvegarde des réponses est préparée par les migrations, mais l'UI reste local-only.


## Rattacher aux programmes scolaires

Le mapping se fait après parsing avec `--program-entries`, qui doit pointer vers un JSON d'entrées existantes:

```json
[
  {
    "id": "existing-objective-id",
    "level": "3eme",
    "subject": "mathematiques",
    "domain": "Nombres et calculs",
    "objective": "Résoudre des problèmes utilisant les nombres rationnels",
    "keywords": ["proportionnalite", "fraction", "equation"]
  }
]
```

Le script produit alors `exercise_program_links[]` avec `confidence` et `rationale`. Il ne crée aucune entrée de programme et ne convertit pas les exercices en tâches pédagogiques.

## Extension

Les types du module prévoient d'autres examens et sources. Pour ajouter bac, bac pro ou CAP, créer un nouveau collecteur dans `exam-import/sources/`, garder le même schéma de bundle et ajouter un script dédié.
