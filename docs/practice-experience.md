# Practice Experience

## Nouvelle philosophie annales

Les annales ne sont plus l'interface principale de travail pour l'eleve. Elles restent la source officielle complete, utile pour la tracabilite, l'audit et la consultation admin.

Le produit pedagogique utilise par l'application est `exam_training_items` : une couche normalisee d'items reutilisables construits depuis les exercices et questions d'annales.

Modele logique :

- `exam_papers` conserve le sujet officiel complet.
- `exam_exercises` conserve les blocs bruts issus du papier.
- `exam_training_items` contient les unites pedagogiques exploitables dans l'app.
- `exam_papers.level` porte le niveau scolaire du sujet officiel ; `exam_exercises` l'herite via `paper_id`.
- `exam_training_items.level` est denormalise et toujours renseigne a l'import pour filtrer les sessions eleves.

Cette separation permet de garder l'origine officielle sans obliger l'eleve a travailler dans le format PDF.

## Filtrage par niveau scolaire

Les annales et les items d'entrainement sont filtres par le niveau actif de l'eleve dans `/practice`, `/practice/:subject`, `/practice/:subject/annales`, `/practice/session` et la consultation d'annale.

Le DNB est reserve au niveau `3eme`. Un eleve en `4eme` ne doit voir ni les sujets DNB, ni les `exam_training_items` issus du DNB. Les futurs examens suivent le mapping central `EXAM_LEVEL_MAP` dans `src/domain/exams.ts` :

- `dnb` -> `3eme`
- `bac` -> `terminale`
- `bac_francais` -> `1ere`
- `cap` -> `cap`

Validation distante du 2026-05-09 :

- migration `20260509100000_add_exam_paper_level` appliquee sur Supabase distant et schema PostgREST recharge ;
- bundle DNB Amiens 2021 reimporte en `upsert` : 1 sujet, 5 exercices ;
- training items DNB reimportes en `upsert` : 20 items ;
- verification base : 1/1 sujet DNB en `level = 3eme`, 20/20 training items DNB en `level = 3eme`, aucun DNB sans niveau ;
- verification filtres Practice : niveau `3eme` voit 1 annale mathematiques et 5 items publies ; niveau `4eme` voit 0 annale DNB et 0 item DNB ;
- les requetes Practice utilisent le niveau normalise depuis `EXAM_LEVEL_MAP` / `normalizeStudentLevelForExamFilter`.

## Experience eleve avec training items

La page `/practice` presente les matieres et compte les items publies comme source principale d'entrainement.

La page `/practice/:subject` propose une session courte depuis `exam_training_items`. Les annales completes restent accessibles separement dans `/practice/:subject/annales`.

La session `/practice/session?subject=mathematiques&mode=mixed` charge des items publies et les affiche un par un avec :

- prompt normalise ;
- contexte ;
- documents structures, par exemple tableaux HTML ;
- champ de reponse adapte au type d'item ;
- cycle de guidance par question : reponse, verification, indices progressifs, feedback ;
- progression.

Le guidage est strictement lie a `item_id + question_id`. Un indice demande sur une question ne modifie pas les autres questions du meme item. La verification d'une reponse affiche un feedback de methode, jamais la solution complete.

Le PDF original reste une preuve de source, mais il n'est plus necessaire a la comprehension de l'exercice quand un item pedagogique est publie.

Les exercices mal extraits restent en `draft` ou avec une confidence faible. Ils peuvent produire des items individuels exploitables sans chercher a reconstruire fidelement tout le sujet.

## Corrections et guidance

Il n'y a plus de correction globale visible pour l'eleve dans `/practice/session`.

- `expected_answer` et `solution` restent stockes dans les donnees.
- L'UI eleve n'affiche jamais `expected_answer` ni `solution`.
- Les solutions completes sont reservees aux vues admin/teacher futures.
- Les reponses eleves sont sauvegardees dans `training_item_answers` avec `item_id`, `question_id`, `answer_text`, `hint_level`, `guidance_feedback`, `is_correct` et `submitted_at`.
- La future guidance IA operera sur le couple `item_id + question_id`.

## Preparation IA

Les metadonnees des items preparent les usages futurs :

- `can_generate_similar` ;
- `source_pattern_summary` ;
- `transformation_notes`.

Ces champs serviront a generer des exercices similaires, creer des devoirs, composer des sujets blancs, proposer des indices et corriger des reponses d'eleves.

## Commandes training items

Validation Amiens 2021 :

- migration `exam_training_items` appliquee sur le projet Supabase `sibprjxhbxahouejygeu` ;
- Edge Function `import-training-items` deployee avec `--no-verify-jwt` ;
- import `upsert` valide : 20 items importes ;
- items publies : 5 ;
- types publies couverts : `short_answer`, `numeric`, `free_response`, `multiple_choice` ;
- route QA validee : `/practice/session?subject=mathematiques&mode=mixed` ;
- QA mobile 360px : session chargee, tableau HTML visible, guidance par question, aucun `expected_answer`, `solution`, `raw_text` ni PDF complet expose.

Validation Supabase du guidage par question :

- migration `training_item_answers` appliquee via la meme Edge Function d'import quand `db push` est indisponible ;
- `questions[]` present sur les `exam_training_items` publies ;
- sauvegarde reelle validee pour deux questions : `user_id`, `item_id`, `question_id`, `answer_text`, `hint_level`, `guidance_feedback`, `is_correct`, `submitted_at` ;
- `hint_level` persiste apres clic sur `Indice` ;
- retour a la question precedente : reponse, indice et feedback restent visibles ;
- aucun `expected_answer` ni `solution` sauvegarde comme feedback ou rendu dans le DOM eleve.

Generation des items :

```bash
npm run generate:training-items -- --bundle exam-import/bundles/dnb-amiens-2021-maths.json --out exam-import/bundles/training-items-dnb-2021-maths.json
```

Import des items :

```bash
npm run import:training-items -- --bundle exam-import/bundles/training-items-dnb-2021-maths.json --mode upsert
```

Build de verification :

```bash
npm run build
```

## UX Philosophy

The `Practice` destination is the new training hub for students.

Core principles:

- **Start instantly**: one tap to begin an exercise.
- **Minimal cognitive load**: large cards, short labels, clear CTA.
- **Mobile-first**: vertical flow, compact sections, thumb-friendly controls.
- **One unified surface**: quiz, AI practice placeholders, official exams, and targeted drills in one place.
- **No internal data exposure**: learners never see parsing internals, raw metadata, or admin terminology.
- **Clean-academic tone**: calm panels, generous whitespace, readable line length.

## Naming (FR/EN)

- **French**: we use **“S'entraîner”** because it is direct, encouraging, and study-first (no jargon, no gamification).
- **English**: we keep **“Practice”** because it’s the most standard label for short, repeatable training sessions in learning apps.

## Product Inspiration

The design direction borrows from:

- **Khan Academy**: clear learning pathways and progress orientation
- **Brilliant**: focused one-problem-at-a-time interaction
- **Quizlet**: lightweight cards and low-friction repetition
- **Photomath**: hint/correction reveal on demand

### Why not Duolingo-like (for now)

Duolingo-like UI patterns (dense gamification, streak cues, “path” metaphors, high-saturation reward loops) can be great, but they are not the right default for this phase:

- the app is still building its core practice surface (exams + skills + future AI)
- we want a **study-first** feeling: calm, credible, low distraction
- we keep the UX simple so future AI features can land without reworking the entire visual language

## Current Architecture

### Routes

- `/practice` -> student practice hub
- `/practice/session` -> normalized item session from `exam_training_items`
- `/practice/session/:paperId` -> immersive exam session (one exercise at a time)

### Main UI Blocks (hub)

- Continue Learning
- Practice by Skill
- Exam Practice
- AI Practice (placeholder actions)
- Quick Challenges

### Reusable Components

- `PracticeCard`
- `SkillCard`
- `ExamCard`
- `ExerciseViewer`
- `SessionProgress`
- `CorrectionReveal`
- `HintBox`

## Exam Integration

The student practice experience uses imported annales data through two layers:

- `exam_training_items` for the primary student practice experience
- `exam_papers` and `exam_exercises` for official paper consultation and exam sessions

Important UX constraint: the learner UI only surfaces student-friendly information:

- exam title/year/subject
- exercise statement or normalized item prompt
- optional per-question hint and feedback

It intentionally hides:

- `parsing_status`
- `raw_text` labels/internals
- source metadata internals
- technical import pipeline details

## Exam Session UX

The exam session is intentionally immersive and simple:

- one exercise at a time
- clear but discreet progress bar
- previous/next navigation
- per-question hidden hints by default
- explicit `Hint` and `Check my answer` actions per question
- no global correction in the student UI

This keeps challenge-first behavior while still supporting guided help.

### Focus session mode

The official paper session supports a distraction-free mode via query param:

- `/practice/session/:paperId?focus=1`

In focus mode:

- minimal header (no global navigation, no mobile bottom tabs)
- sticky bottom controls on mobile for prev/next
- calm per-question guidance panels to keep attention on the current question

## Curriculum Integration Direction

`Practice by Skill` is currently a curated set of skill cards.
Next step is to map these cards to curriculum entities (topics/objectives/success criteria) and generate dynamic recommendations from student mastery data.

## AI Integration Roadmap

The hub is prepared for future AI actions via placeholder cards and consistent card API:

- Generate similar exercise
- Train weak skills
- Generate full mock exam

Next evolutions:

- enable “Generate similar exercises” from the current exercise context
- “Train weak skills” from mastery signals (curriculum mapping + student history)
- “Create mock exam” assembled from skills/objectives with pacing and difficulty rules

Future implementation should plug these actions into existing service boundaries without changing the student navigation model.

## Non-Goals (current phase)

Not implemented in this phase:

- advanced scoring model
- advanced persistence/session resume logic
- real AI generation
- automatic exam generation pipelines

This phase focuses on UX unification and extensible structure while preserving existing learning/quiz flows.
