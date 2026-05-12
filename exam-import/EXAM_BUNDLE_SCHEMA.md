# Exam Bundle Schema

Ce format est distinct du `curriculum-import/bundle.json`. Il décrit des annales d'examens et des propositions de rattachement aux programmes existants.

```json
{
  "sources": [],
  "papers": [],
  "exercises": [],
  "exam_assets": [],
  "exercise_program_links": []
}
```

## `sources[]`

- `id`: identifiant stable de source.
- `source_name`: `"eduscol"` ou `"ac-amiens-maths"`.
- `source_url`: page de collecte.
- `fetched_at`: date ISO de collecte.

## `papers[]`

- `id`: identifiant déterministe du sujet.
- `source_name`, `source_url`, `fetched_at`: traçabilité source.
- `exam`: `"dnb"`.
- `level`: niveau scolaire cible, par exemple `"3eme"` pour le DNB.
- `school_cycle`: cycle scolaire optionnel si le modèle le transporte, par exemple `"cycle_4"` pour le DNB.
- `session_year`: année de session.
- `discipline`: discipline normalisée, par exemple `"mathematiques"`.
- `series`: `"generale"`, `"professionnelle"` ou `null`.
- `location`: `"metropole"` ou autre localisation normalisée.
- `variant`: `"standard"`, `"arial16"`, `"arial20"`, `"arial24"`, `"braille_integral"` ou `"braille_abrege"`.
- `pdf_url`: URL du PDF source.
- `pdf_hash`: SHA-256 du PDF téléchargé.
- `raw_text`: texte brut extrait du PDF.
- `exercises`: liste des IDs d'exercices issus de ce sujet.
- `parsing_status`: `"parsed"`, `"partial"` ou `"failed"`.

## `exercises[]`

Chaque exercice recopie la traçabilité complète vers le PDF source:

- `id`, `paper_id`.
- `source_name`, `source_url`, `fetched_at`.
- `exam`, `session_year`, `discipline`, `series`, `location`, `variant`.
- `pdf_url`, `pdf_hash`.
- `exercise_number`, `title`.
- `raw_text`.
- `parsing_status`: statut du découpage pour ce PDF.
- `parsed_content`: structure pédagogique optionnelle:
  - `context`.
  - `documents[]`: documents texte/table/image. Les tableaux structurés utilisent `type: "table"`, `caption`, `table.headers` et `table.rows`. Pour les images générées avec `--with-assets`, les champs possibles sont `local_path`, `storage_path`, `public_url`, `alt`, `page_number`, `sort_order`, `fallback`.
  - `questions[]`: questions structurées avec `id`, `label`, `text`, `points`, `answer_type`, `expected_answer`, `student_answer`, et éventuellement `options`.

Si le découpage échoue, un exercice unique conserve tout `raw_text` avec `parsing_status: "failed"`.

## `exam_assets[]`

Entrées optionnelles ajoutées par le script d'import après upload des fichiers locaux dans Supabase Storage `exam-assets`.

- `exercise_id`, `paper_id`: IDs d'import du bundle.
- `type`: `"image"`, `"table"`, `"graph"` ou `"text"`.
- `label`.
- `storage_path`: chemin dans le bucket.
- `public_url`: URL publique si disponible.
- `alt`: texte alternatif.
- `page_number`: page PDF source.
- `sort_order`: ordre d'affichage.

## `exercise_program_links[]`

Ces entrées sont uniquement des propositions de rattachement vers des entrées existantes du programme.

- `exercise_id`: exercice d'annale.
- `program_entry_id`: entrée existante du programme scolaire.
- `program_entry_type`: `"objective"`, `"success_criterion"`, `"topic"` ou `"unknown"`.
- `confidence`: score entre `0` et `1`.
- `rationale`: justification courte.

Le pipeline ne crée aucun programme scolaire et ne transforme aucun exercice d'annale en tâche pédagogique.
