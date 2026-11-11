# Product and implementation decisions

Updated 2026-11-11. Distinguish supplied observations from original Tutorly choices and unresolved questions.

## Add up to 100

- **Observed:** The written project log reports dot groups of ten, tens/ones controls, the arithmetic examples 30 + 30, 60 + 7, 67 + 33, and 45 + 7, plus a recall/check phase and a later guided path offering a restart from the beginning.
- **Designed:** Tutorly uses original wording and a responsive 10-column dot field: full tens are purple, remaining ones gold, with number and count labels so color is not the only cue. It reuses the same deterministic state in the dots, controls, and answer check.
- **Designed:** A learner can choose “Show what I remember” or “Start from the beginning.” Recall completion leads to an explicit guided-start offer. This choice is informed by the evidence but the exact branch order and complete exercise sequence are not established.
- **Designed:** Tutorly includes explanatory feedback and retry. No clock, score, reward, or mastery badge is shown. Optional system speech reads the current instruction when speech synthesis is available; the visible text remains canonical.
- **Unknown:** Full sequence, alternate diagnostic branching, error taxonomy, completion threshold, mastery, and voice settings. No competitor copy/assets/voice are used.

## Flashcards

- **Observed:** The project notes describe single arithmetic cards, prompts including subtraction, make-ten blanks, and simple addition; sample feedback/progress and typed/tap/spoken interaction affordances are recorded, but input behavior varies by mode.
- **Designed:** A separate Tutorly “Number flashcards” mode presents one typed-answer card at a time from a fixed original ten-card within-ten deck. It validates whole numbers deterministically, shows a short hint, gives a targeted retry cue, reveals a concise explanation on a correct answer, and requires an explicit next-card action.
- **Designed:** This is untimed practice. It has no race, score, pass threshold, reward, speech-recognition permission, or mastery claim. The number ten is the Tutorly deck size for this first slice, not a claim about a general source-product rule.
- **Unknown:** Competitor timer behavior, timeout rules, scoring, answer recognition, and mastery remain unknown and are intentionally not recreated.

## Numbers after ten expansion

- **Observed:** The evidence log for **The Next 10** describes a fixed group of ten plus individually added units, with visible examples 11 and 12 and a ten-and-ones number legend. The full sequence and all error paths are unknown.
- **Designed:** A short original Tutorly activity asks the learner to build 11, 12, and 15 from one full ten and single dots. It reuses the shared countable-dot model, and derives the displayed total from the same state used by its Add 1 control.
- **Unknown:** This three-step activity is not asserted to match the reference sequence. It has no score, timer, mastered state, or reward.

## Progress and data

- **Designed:** Local resume is stored using Tutorly's existing `learnerStorageKey` utility, scoped to the active learner (or guest). It records only current step/card and completion display state. Save is gated on completion of restore for the current key to prevent one learner's state from being written over another learner's checkpoint during an identity change. It can resume on the same browser profile; it is not shown as cross-device or Dashboard progress.
- **Constraint:** No standalone activity identifier or confirmed progress event is available in the inspected model. A topic-keyed write would create a false curriculum relationship. The checked-in migration snapshot constrains `user_learning_progress.progress_type` to video/quiz values, while existing lesson hooks write additional values; deployed schema was not independently read. No migration, Supabase write, production data, or mastery update is part of this feature.
- **Proposal before future server persistence:** Agree on a stable activity identity linked to curriculum (or an explicitly typed practice activity), then design a learner-owned attempt/resume record with RLS, status, current step/card, attempt metadata, and a separate validated mastery policy. Review current production schema and family-profile access paths before proposing SQL. Do not overload `video_id`, synthetic `topic_id`, `quiz_score`, or video completion rows.
- **Open decision:** Whether standalone guided practice/flashcards should count toward Dashboard recommendations, and what evidence threshold constitutes demonstrated understanding versus mastery.

## Motion, accessibility, and language

- **Designed:** No decorative or state-changing animation is used in this first slice, so reduced-motion users receive the same deterministic flow. Buttons have visible keyboard focus and thumb-sized targets; numeric input supports mobile keyboards and Enter. Hints and feedback are available as visible text; audio is optional.
- **Open:** Current copy is authored in English, consistent with the supplied recording notes. Localization policy for this new standalone Practice content needs a follow-up; it must not be represented as translated merely because the surrounding app has i18n.
