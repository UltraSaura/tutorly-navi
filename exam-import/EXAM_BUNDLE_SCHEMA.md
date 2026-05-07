# Exam Bundle Schema

Ce format est distinct du `curriculum-import/bundle.json`. Il décrit des annales d'examens et des propositions de rattachement aux programmes existants.

```json
{
  "sources": [],
  "papers": [],
  "exercises": [],
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

Si le découpage échoue, un exercice unique conserve tout `raw_text` avec `parsing_status: "failed"`.

## `exercise_program_links[]`

Ces entrées sont uniquement des propositions de rattachement vers des entrées existantes du programme.

- `exercise_id`: exercice d'annale.
- `program_entry_id`: entrée existante du programme scolaire.
- `program_entry_type`: `"objective"`, `"success_criterion"`, `"topic"` ou `"unknown"`.
- `confidence`: score entre `0` et `1`.
- `rationale`: justification courte.

Le pipeline ne crée aucun programme scolaire et ne transforme aucun exercice d'annale en tâche pédagogique.
