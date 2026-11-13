# Product and implementation decisions

Updated 2026-11-13. Distinguish supplied observations from original Tutorly choices and unresolved questions.

## Add up to 100

- **Observed:** The supplied recording shows recall/check first: tap + three times to add three tens, identify 30, answer 30 + 30, identify 60 + 7, find the amount to add to 67 to reach 100, then solve 45 + 7. The check/reward card appears before the later guided path. That guided path asks whether the learner is familiar; only the No branch and its first prompt (two groups of ten) are visible.
- **Designed:** Tutorly uses original wording and a static dot model with outlined groups of ten and separate loose ones. The same deterministic numeric state drives the model, controls, and answer check. There are no animated or draggable pieces.
- **Designed:** The learner taps a visible + Add 10 button three times; after the third group, Tutorly shows selectable answer buttons instead of asking the learner to type or merely confirm the only available number. The first answer set follows the recorded choices 30, 40, 50, and 300. The numeric total is omitted from the visual model and its accessible description on choice screens. Later question choice sets are presented as Tutorly answer controls and should be revised if a clearer recording shows different options.
- **Designed:** Tutorly starts with the recall/check and then offers a start-from-the-beginning practice. The later Tutorly practice reuses known arithmetic ideas as a short original exercise; it is not claimed to reproduce the reference's unseen guided sequence.
- **Designed:** Tutorly includes explanatory feedback and retry. No clock, score, reward, or mastery badge is shown. Optional system speech reads the current instruction when speech synthesis is available; the visible text remains canonical.
- **Unknown:** The reference familiarity Yes branch, later guided prompts, error handling, completion threshold, mastery, and voice settings. No competitor copy/assets/voice are used. Tutorly's observed check completion is only local resume state, not mastery.

## Flashcards

- **Observed:** The recordings show one arithmetic card at a time, with subtraction, addition, and make-ten blanks. One screen offers a microphone with “Tap the mic to speak”; a different screen shows a selected answer, but exact input method is unknown. Timed and race screens, one 9/10 result, and ten progress markers in one run are visible; general rules are unknown.
- **Designed:** A separate Tutorly “Number flashcards” mode presents one typed-answer card at a time from a fixed original ten-card within-ten deck. It validates whole numbers deterministically, shows a short hint, gives a targeted retry cue, reveals a concise explanation on a correct answer, and requires an explicit next-card action. The input method, deck composition, and untimed practice rules are Tutorly choices, not claims about the source.
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
