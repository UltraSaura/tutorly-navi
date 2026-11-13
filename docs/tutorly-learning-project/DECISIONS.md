# Product and implementation decisions

Updated 2026-11-13. Distinguish supplied observations from original Tutorly choices and unresolved questions.

## Add up to 100

- **Observed:** The supplied recording shows recall/check first: tap + three times to add three tens, identify 30, answer 30 + 30, identify 60 + 7, find the amount to add to 67 to reach 100, then solve 45 + 7. The check/reward card appears before the later guided path. That guided path asks whether the learner is familiar; only the No branch and its first prompt (two groups of ten) are visible.
- **Designed:** Tutorly implements a reusable `CountingExercise` data contract and shared renderer, separate from any single lesson sequence. Each instance specifies an object type, starting groups and ones, groups to add, and answer choices. The current examples can use pencils, apples, books, or stars; authored or AI-generated instances can use the same validated format. The current small examples are not a curriculum sequence.
- **Designed:** A visible + action adds one group of ten per tap, then four answer choices ask for the total. The rendering derives prompt, model, labels, and result from the exercise instance. Hints, explanatory wrong-answer feedback, retry, completion, and learner-scoped local resume are provided. The data contract supports totals through 100; starter examples stay smaller to keep the first screen easy to read.
- **Designed:** This is a Tutorly counting activity type, not a recreation of the reference lesson's recall/check or unseen guided sequence. The standalone Practice exercise has no timer and uses Tutorly's existing points penalty on retries; it does not award mastery. Lesson prerequisite checks remain score-free; they do not award Practice points.
- **Quiz-bank use:** The same data is represented as a `counting` question in Tutorly's existing quiz banks. Admins can author the object, starting groups/ones, groups to add, and point value. The AI topic generator can also create this question type when selected; Tutorly validates its arithmetic and derives four choices. In Practice it uses the existing points and attempt scoring. Existing `payload` JSONB stores this new kind, so no new backend table is required.
- **Designed:** Tutorly includes explanatory feedback and retry. No clock, score, reward, or mastery badge is shown. Optional system speech reads the current instruction when speech synthesis is available; the visible text remains canonical.
- **Unknown:** The reference familiarity Yes branch, later guided prompts, error handling, completion threshold, mastery, and voice settings. No competitor copy/assets/voice are used. Tutorly's observed check completion is only local resume state, not mastery.

## Addition across ten

- **Source video:** `Screen Recording 2026-11-10 at 23.37.03-compressed.mp4` (1:56), summarized in `references/development-instructions.md` under **Add Across 10**. It shows square tiles made of unit cells, composing a quantity to match `4 + 7`, and answer choices. The complete sequence and error rules are not established.
- **Curriculum category:** CE1 → Maths → Nombres et calcul → calcul mental → franchir la dizaine. Tutorly may also use “addition en ligne” as a product category; that is not the official programme heading. Treat this as review/fluency: the official Cycle 2 programme introduces making-ten strategies in CP and expects CE1 learners to reuse and automate them. This is distinct from column addition, which is a separate algorithmic operation.
- **Designed:** Tutorly exposes a reusable `addition-across-ten` quiz-bank question. The learner moves counters to fill a ten-frame and then chooses the sum; exercise data provides the start number and one-digit addend. Practice generates varied two/three-digit examples up to 1000. The frame depicts counters as dots, with no competitor art or tile assets. It is a general activity type, not a copied fixed lesson sequence.
- **Designed:** The CE1 Practice card opens this focused activity. It uses the existing retry-based Practice points policy, has no timer, and stores learner-scoped local resume state. It does not award curriculum mastery. Quiz banks can author it using the existing JSON payload; the admin topic generator supports the new type after the updated Edge Function source is deployed. No schema migration is needed.
- **Unknown:** The recording does not establish an exact sequence, timer, scoring, retry, or mastery rule. Tutorly’s range, ten-frame interaction, and feedback are original product decisions and should be revisited with learner testing.

## Flashcards

- **Observed:** The recordings show one arithmetic card at a time, with subtraction, addition, and make-ten blanks. One screen offers a microphone with “Tap the mic to speak”; a different screen shows a selected answer, but exact input method is unknown. Timed and race screens, one 9/10 result, and ten progress markers in one run are visible; general rules are unknown.
- **Designed:** A separate Tutorly “Number flashcards” mode presents one typed-answer card at a time from a fixed original ten-card within-ten deck. It validates whole numbers deterministically, shows a short hint, gives a targeted retry cue, reveals a concise explanation on a correct answer, and requires an explicit next-card action. The input method, deck composition, and untimed practice rules are Tutorly choices, not claims about the source.
- **Designed:** This is untimed practice. It has no race, score, pass threshold, reward, speech-recognition permission, or mastery claim. The number ten is the Tutorly deck size for this first slice, not a claim about a general source-product rule.
- **Unknown:** Competitor timer behavior, timeout rules, scoring, answer recognition, and mastery remain unknown and are intentionally not recreated.

## Numbers after ten expansion

- **Observed:** The evidence log for **The Next 10** describes a fixed group of ten plus individually added units, with visible examples 11 and 12 and a ten-and-ones number legend. The full sequence and all error paths are unknown.
- **Designed:** A short original Tutorly activity asks the learner to build 11, 12, and 15 from one full ten and single dots. It derives the displayed total from the same state used by its Add 1 control.
- **Unknown:** This three-step activity is not asserted to match the reference sequence. It has no score, timer, mastered state, or reward.

## Progress and data

- **Designed:** Local resume is stored using Tutorly's existing `learnerStorageKey` utility, scoped to the active learner (or guest). It records only current step/card and completion display state. Save is gated on completion of restore for the current key to prevent one learner's state from being written over another learner's checkpoint during an identity change. It can resume on the same browser profile; it is not shown as cross-device or Dashboard progress.
- **Constraint:** No standalone activity identifier or confirmed progress event is available in the inspected model. A topic-keyed write would create a false curriculum relationship. The checked-in migration snapshot constrains `user_learning_progress.progress_type` to video/quiz values, while existing lesson hooks write additional values; deployed schema was not independently read. No migration, Supabase write, production data, or mastery update is part of this feature.
- **Proposal before future server persistence:** Agree on a stable activity identity linked to curriculum (or an explicitly typed practice activity), then design a learner-owned attempt/resume record with RLS, status, current step/card, attempt metadata, and a separate validated mastery policy. Review current production schema and family-profile access paths before proposing SQL. Do not overload `video_id`, synthetic `topic_id`, `quiz_score`, or video completion rows.
- **Open decision:** Whether standalone guided practice/flashcards should count toward Dashboard recommendations, and what evidence threshold constitutes demonstrated understanding versus mastery.

## Motion, accessibility, and language

- **Designed:** No decorative or state-changing animation is used in this first slice, so reduced-motion users receive the same deterministic flow. Buttons have visible keyboard focus and thumb-sized targets; numeric input supports mobile keyboards and Enter. Hints and feedback are available as visible text; audio is optional.
- **Open:** Current copy is authored in English, consistent with the supplied recording notes. Localization policy for this new standalone Practice content needs a follow-up; it must not be represented as translated merely because the surrounding app has i18n.
