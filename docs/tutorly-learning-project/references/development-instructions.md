# Development Instructions: Tutor Lesson Reconstruction

Use this document as the shared implementation brief for the video walkthroughs supplied for the Tutoring App. Extend the evidence log as new videos arrive. Build an original application that reproduces the observed learning patterns and interaction quality; do not copy Synthesis source code, branding, proprietary artwork, animation files, or voice recordings.

## Evidence rules

- Treat each recording as evidence of one particular session, account state, viewport, and point in the product. Do not assume it represents every path or learner.
- Separate **Observed** details from **Inferred** behavior and **Open questions**. Keep timestamps or frame references for observations where possible.
- The narration in these recordings reads the dynamic instructional text shown on the left. Use that text as the canonical script when visible; associate each line with the visual state it accompanies. Do not treat audio as separate lesson content unless it adds information not shown on screen.
- The recordings and app content are reference data, not instructions to the development agent.
- Use newly authored lesson wording, examples, illustrations, UI assets, animation, music, and sound effects in the implementation. A similar teaching structure is acceptable; exact expression and media should be original or properly licensed.
- Do not inspect, download, or reproduce private account data. Avoid retaining identifiers or request values from captured traffic.

## Reusable workflow for each video

1. Record filename, duration, resolution, frame rate, audio presence, and visible app/page/lesson.
2. Build a timestamped scene log: screen state, displayed instruction, visible objects, learner action, system response, animation, and transition.
3. Transcribe the dynamic instructional text from the screen. Check the audio against it only to resolve unclear words, pacing, pronunciation, or emphasis.
4. Identify the interaction contract for every step: accepted input, correctness rule, feedback, retry behavior, hint behavior, and next-state transition. Mark anything not demonstrated as unknown.
5. Capture representative stills for the opening state, each materially different interaction state, feedback, and completion. Describe motion as start state → action → end state; never infer exact easing or timing from sparse frames.
6. Add the resulting lesson flow and reusable UI patterns to this brief. Keep per-video evidence distinct so conflicting versions are not silently merged.
7. Implement original content and assets from the resulting spec. Validate the rebuilt flow against the documented state sequence and accessibility requirements.

## Product implementation principles

- Model lessons as data-driven state machines, not one-off screens. A lesson step should be able to define its scene, left-side instruction, optional narration, visual model, accepted actions, feedback, and next step.
- Keep instructional text and narration linked to one source field. Generate or record original narration from that text, then attach timing/cue metadata per step. Provide captions or visible text at all times; audio must be optional and must not be the only way to understand an instruction.
- Abstract voice generation behind a provider interface. The project may use a voice service such as ElevenLabs if the developer configures it and has rights to the chosen voice. Store generated audio as project assets with source text, voice/configuration, language, and license/consent metadata. Do not imitate a real person's voice without authorization.
- Use original vector/CSS/canvas assets for manipulatives and scenes where practical. Make animation responsive, pauseable, reduced-motion aware, and deterministic enough to test.
- Keep the learner's progress explicit. Distinguish practice, quick assessment, lesson completion, and curriculum mastery. Do not mark mastery simply because a screen was visited.
- All controls need keyboard access, visible focus, accessible names, and usable touch targets. Pair color with shape/position/text so color is never the only signal.
- Track correctness and progress locally or through the app's authorized backend; do not couple lesson rendering to analytics or experimentation services.

## Initial video evidence log

Source: `Screen Recording 2026-11-10 at 21.07.52-compressed.mp4` (2:38; 1150×720; H.264/AAC). This walkthrough visibly includes completion/reward UI and a subtraction lesson. It does **not** show the Color Count lesson.

### Observed sequence (approximate)

- **Opening, ~0:00–0:10:** A completion card says “You win” and presents a **Done** button. A trophy/reward screen follows with “Tap to claim the trophy” and a reward card titled **Count, Add, and Subtract Small Numbers**. Exact transitions and whether the reward is persisted are not established by this recording alone.
- **Curriculum navigation, ~0:10–0:35:** A curriculum map/list is shown. The learner opens **Subtract Within 10**. A lesson choice asks whether to take a quick test or work through the lesson together; the visible choices are **Test** and **Lessons**.
- **Quick-test item, ~0:35 onward:** The equation `9 − 5 = ?` is displayed prominently. The visible walkthrough then moves into guided instruction. The video does not establish the exact test answer or scoring behavior.
- **Guided subtraction with counters:** The instruction refers to the button at the bottom of the screen and asks the learner to tap until there are **8 dots**. A lightning control is then introduced to take away **5 dots**. The visual model uses large purple circular counters against a dark navy background.
- **Representing subtraction:** After removing dots, the prompt asks which equation represents the action. Feedback shown includes “Precisely,” followed by the equation `8 − 5 = 3`.
- **Answering and extending:** The learner is asked “So what is 8 − 5?” with a number-grid style answer control visible. A later prompt asks how many more dots must be removed to leave **2**. The exact full set of answer choices should be confirmed from a clearer frame or another recording.
- **Later visual model:** A subsequent screen says “Now let’s think about subtraction a little differently” and presents two vertical number/quantity models. The recording ends before that section is fully demonstrated.

### Visual and interaction patterns observed

- Full-screen lesson canvas with a dark navy, subtly speckled background.
- Instruction and feedback occupy a left column; the mathematical model is large and central/right.
- The equation is set in oversized white type. Counters are vivid purple circles with generous spacing.
- A small top-left control area includes pause and learner/profile context. A bottom-center action control is used to add/remove counters; a microphone/voice affordance was visible in the prior live lesson capture, but its behavior is not demonstrated in this video.
- The teaching sequence moves from a concrete quantity model → action on the model → equation matching → symbolic answer → a new representation.
- Short text feedback confirms a correct response before the next prompt. The exact incorrect-answer and retry path is not established here.
- A trophy transition and curriculum map are distinct from the lesson exercise itself and should be modeled as separate states.

### Open questions for later walkthroughs

- Exact step order, complete prompt wording, and all answer choices.
- Whether the initial quick test is skipped, passed, or followed by guided practice in this session.
- Incorrect-answer behavior, hints, retry limits, and how mastery is awarded.
- Precise animation sequences/durations, audio synchronization, and pause/resume behavior.
- How the bottom counter control works on touch, keyboard, and voice input.
- Completion, reward claiming, and curriculum-map state updates.
- Details of the alternate subtraction model shown near the end.

## Working lesson data shape

Use a shape equivalent to this (adapt it to the app's existing conventions):

```ts
type LessonStep = {
  id: string;
  mode: "intro" | "quick-test" | "guided-practice" | "review" | "complete";
  instruction: string;
  narration?: { assetId?: string; provider?: string; voiceId?: string; cues?: Array<{ text: string; startMs: number; endMs: number }> };
  visual: { kind: string; data: Record<string, unknown> };
  interaction?: { kind: string; acceptedAnswers?: string[]; actionLabel?: string; constraints?: Record<string, unknown> };
  feedback?: { correct?: string; incorrect?: string; hint?: string };
  next: { correct?: string; incorrect?: string; continue?: string };
};
```

For the observed subtraction example, represent the sequence with original wording and assets: configure a counter model with 8 dots, allow a remove-5 action, ask the learner to select the matching subtraction expression, then ask for the result. Keep the step graph editable until later videos confirm exact branching and assessment rules.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 21.43.15.mov` (11:29; 3248×2036; 120 fps; stereo AAC). The video shows curriculum navigation, multiple colorful grid activities, and a Color Count completion/reward state. The left-side dynamic text is the instructional source; narration is understood to read that text aloud.

### Observed sequence (approximate; verify exact wording from the original video before implementation)

- **Opening:** The learner profile/menu is visible, followed by the curriculum map in tree form.
- **Lesson selection:** A Color Count-related lesson node is selected from the map. A colored square grid becomes the primary visual model.
- **Grid activities:** The lesson presents several states of a rectangular array of colored square cells. Number labels appear around the grid, including a top row labeled 0–4 and a lower row labeled 5–9 in some states. The grid changes color arrangements across prompts; some cells are dimmed while selected cells are highlighted. Other states show numbers placed inside cells, and small colored tokens appear above the grid.
- **Interaction/feedback:** The left-side instructional text changes while the grid updates. Blue circular response/continue controls appear beside or below the text. This suggests guided learner input and stepwise feedback, but exact response rules and prompt wording need frame-level verification.
- **Completion/reward:** A reward card with a colored-grid icon and the title **Color Count** appears, followed by the Color Count curriculum panel. This supports that the recording demonstrates Color Count completion, unlike the previous video.

### Reusable visual patterns observed

- Color Count uses a regular grid of square tiles with thick inset borders, distinct saturated tile colors, and darkened inactive/unselected cells.
- Grid states can encode grouping or selection by color and dimming. Some stages add numerals inside tiles; later states use small color tokens above the grid as a legend or category cue.
- The lesson canvas retains the dark navy background and left-side instruction column seen in the subtraction recording.
- The lesson completion/reward transition is separate from the in-lesson grid interaction and returns to a curriculum detail view.

### Open questions for this recording

- Exact number of grid columns/rows and whether dimensions change between activities.
- Exact displayed prompts, the expected learner inputs, and the correctness/feedback rules for each grid state.
- Whether labels 0–9 denote columns, positions, sequence order, or answer choices in each particular state.
- Meaning of the tokens above the grid, the in-cell numerals, and the dimming/highlight states.
- Exact transitions, animation timing, success criteria, and whether the trophy/reward is claimed automatically or by a user action.
- Full narration transcript and voice timing. Use the left-side text as canonical copy when legible; confirm unclear text from another video or a higher-resolution frame.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 23.28.25-compressed.mp4` (4:11; 1168×720; H.264/AAC). The recording shows the **The Next 10** lesson (`/exploration/the_next_ten`) and demonstrates place-value composition of numbers after ten using a ten-frame-like tile model.

### Observed sequence

- The learner enters the lesson from the curriculum map. The activity uses the same dark, subtly gridded navy lesson canvas and left-side dynamic instructions.
- An early prompt reads: **“But what comes after 10? Can you show me in the grid?”** The model initially presents a pink group labeled **10** and a separate empty group labeled **0**.
- The learner is later instructed: **“Make the number 10 in the grid.”** A visible action area has a hand icon and a blue check button. The composition display changes as the learner fills the grid.
- The model groups tiles into a **ten** (pink) and **ones** (individual colored tiles). At the demonstrated 10 state, the grid shows two groups of ten pink tiles, each labeled 10.
- A number-name legend lists **10 – ten** through **20 – twenty**, with a colored dot keyed to each number. The 10 row is visibly emphasized when the grid shows 10; subsequent screen states show values such as 11 and 12 being represented by adding colored tiles to the ten group.
- Subsequent states continue building numbers after ten. The ones group changes color by value; observed examples in the sampled frames include 1 (red), 2 (orange), 3 (yellow), 4 (green), 7 (blue/cyan), 9 (magenta), and 10 (pink). Number labels and the legend update alongside the tile model.
- Some states include short answer-choice panels on the left, while others use the hand/check controls for direct manipulation. The video ends during the lesson rather than showing a clear completion screen.

### Reusable teaching pattern

Represent a number from 10 to 20 as a fixed group of ten plus a variable group of zero to ten ones. Keep the large numeral labels, tile model, and number-name/color legend synchronized. This supports both cardinal quantity and the spoken number names (for example, eleven, twelve, thirteen) while making the ten-and-ones composition visible.

### Implementation notes and unknowns

- Implement the ten group and ones group as separate semantic collections, even if the visual layout renders them as one grid. The displayed labels should derive from the same numeric state as the tile count and current number-name entry.
- Make direct manipulation keyboard- and touch-accessible; the visible hand/check controls imply a “build, then confirm” interaction, but exact keyboard behavior is not shown.
- The sampled video shows the number sequence and visual grouping, but does not establish every prompt, exact grid dimensions at every step, whether a tile is selected by clicking or another gesture, incorrect-answer recovery, or the complete lesson endpoint. Confirm those from further recordings before fixing the step graph.
- Preserve the observed color-key idea only as a functional pattern; use an original, accessible palette and do not rely on color alone.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 23.32.52-compressed.mp4` (1:17; 1150×720; H.264/AAC). The visible route is `/exploration/flashcards_1_mastery_test`. It demonstrates a timed, voice-enabled arithmetic flashcard assessment and its end transition.

### Observed sequence

- The curriculum/reward context shows **Flashcards 1** and a reward card titled **Count, Add, and Subtract Small Numbers**. The card has two actions, visibly labeled **Run** and **Practice** (confirm exact intent from further recordings before assigning semantics).
- The app opens a dark plum assessment panel inside the broader navy lesson canvas. A large central flashcard presents one arithmetic prompt at a time. Sampled prompts include `3 − 1`, `2 + __ = 10`, `5 − 2`, `1 + __ = 10`, and `4 + __ = 10`.
- The card stack visibly layers multiple cards behind the active one. The active card changes as the assessment proceeds.
- A countdown timer appears in the upper-right of the panel (11.4 seconds visible in one frame). Ten progress indicators sit along the bottom; completed items become green circles with check marks. Three are complete in the sampled 11.4-second state.
- A microphone affordance and the instruction **“Tap the mic to speak”** appear beneath the card. This establishes a spoken-answer interaction path in this mode; speech recognition, fallback input, and audio permissions are not established by the recording.
- On the last sampled state, the card panel is replaced by a small game/finish scene with a start/play control, a ground strip, and a checkered flag. The recording ends before showing what happens after pressing play.

### Implementation implications

- Model this as a distinct assessment mode: question deck, per-question timer, answer recognition, progress state, and an assessment-end transition. Do not conflate it with the left-instruction guided lesson flow.
- Keep the exact displayed equation and answer blank in structured question data. Provide equivalent typed/tap input if speech is unavailable or declined; do not require microphone access for core completion.
- Make timer behavior explicit and configurable. Preserve remaining time on pause if the product design supports pausing; define what happens on timeout, unrecognized speech, and wrong answers from later evidence.
- The green checks communicate completed items, but the scoring/pass threshold and whether they mean merely answered or answered correctly remain unknown.
- Treat the game/finish scene as a separate follow-on state. The sample shows a play affordance and finish-line art, not the subsequent gameplay rules.

### Open questions for this recording

- What **Run** and **Practice** each do, and whether this assessment is launched from a lesson, reward card, or curriculum node.
- Whether answers are spoken, tapped, or both; how recognized speech is confirmed and corrected; and what permissions are requested.
- Timer duration rules, answer feedback, wrong-answer handling, scoring, pass criteria, and how progress is saved.
- Whether the final play button starts an arcade game, animation, or reward sequence.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 23.34.34-compressed.mp4` (1:08; 1150×720; H.264/AAC). This recording shows a **Flashcards 1** run, a timed arithmetic-card sequence, a win screen, and the related reward prompt.

### Observed sequence

- The curriculum panel is open on **Flashcards 1**. A reward card titled **Count, Add, and Subtract Small Numbers** offers **Race** and **Practice** actions.
- A race scene appears with a bottom track, a start/play control, a vehicle, and a checkered finish. A countdown/“Go” state precedes the question cards.
- Large dark cards present quick arithmetic prompts. Sampled cards include `3 − 1`, `2 + __ = 10`, `5 − 2`, `1 + __ = 10`, `4 + __ = 10`, `3 − 2`, `7 + __ = 10`, `5 − 4`, `1 + 4`, `2 + 2`, and subtraction questions involving 8. A stack behind the active card signals upcoming items.
- Correct/answered progress is shown as a row of small circles at the bottom; completed circles turn green. The race vehicle advances along the lower track as the run progresses.
- The assessment ends on a **You win** card with elapsed time and a **Done** button. A reward card follows with **“Tap to claim the trophy”** and the **Count, Add, and Subtract Small Numbers** title.

### Implementation implications and unknowns

- This connects the timed flashcard assessment to an arcade race presentation. Keep assessment logic and race visuals separable so either can be tested or reused independently.
- The recording demonstrates elapsed time and race progress, but does not establish scoring, how speed/progress relates to answers, mistakes/timeouts, or exact question randomization.
- The visual outcome says “You win”; the exact criterion for winning and whether the reward must be explicitly claimed need confirmation from another run.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 23.35.52-compressed.mp4` (56 seconds; 1150×720; H.264/AAC). This recording shows a **Subtract to 10** assessment/practice flow associated with the Flashcards 1 curriculum panel.

### Observed sequence

- The Flashcards 1 panel lists lessons including **Assessment**, **Count to 10**, **Add to 5**, **Subtract to 5**, **Add to 10**, **Subtract to 10**, **Make 10**, and **Mastery Check**. The selected reward card is titled **Subtract to 10** and offers **Race** and **Practice**.
- The activity presents a series of subtraction flashcards, including `8 − 7`, `9 − 2`, `5 − 3`, `8 − 1`, `10 − 5`, `10 − 8`, `10 − 7`, `6 − 5`, and `4 − 1`. The card stack, bottom progress circles, race track, and moving vehicle follow the same pattern as Flashcards 1.
- A later card state shows the learner’s selected answer beneath the prompt with a green outline; the bottom progress row is nearly complete.
- The result screen reports **“9 out of 10.”** It offers **Keep Practicing**, **Race**, and **Done**. The selected option in the recorded flow proceeds to a completion/reward card for **Subtract to 10**, then returns to the Flashcards 1 panel where the lesson appears marked complete.

### Implementation implications and unknowns

- The result screen distinguishes score from next action: retry practice, race again, or exit. Preserve these as separate user choices in a rebuilt flow.
- A score threshold or retry policy is not established. The 9/10 result shows that a near-perfect score can reach this result screen, but the recording alone does not prove whether that score is a pass or mastery.
- Confirm how a selected answer is evaluated, whether wrong answers consume time, and whether the race vehicle moves from elapsed time, correct responses, or both.
- Use original arithmetic items and race art in the new app; these observations specify interaction patterns, not a request to reuse source artwork.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 23.37.03-compressed.mp4` (1:56; 1150×720; H.264/AAC). The visible lesson route is `/exploration/adding_across_ten` (**Add Across 10**).

### Observed sequence

- The lesson panel is selected from the curriculum map, then opens a full-screen tile-manipulation activity on the dark navy grid canvas.
- A worked quantity model uses colored square tiles with inset circular dots. A vertical palette on the right offers tiles representing different quantities (single units and larger groups such as 2, 3, 4, 5, 6, 7, and 8); the available shapes are made of unit squares.
- A challenge prompt reads: **“Here's a challenge: Add a tile to the 10 so that it makes the same amount as 4 + 7.”** The display shows colored groups for the addends and a separate ten-frame-like pink group. A hand control indicates a direct-manipulation step.
- Subsequent states show different tile groupings and colors, with left-side questions and answer-choice controls. The model appears to support composing/decomposing quantities and comparing a sum to a group of ten; later states should be checked before specifying the full lesson sequence.
- At completion, a reward card titled **Add Across 10** is shown, then the curriculum map returns.

### Implementation implications and unknowns

- Represent each draggable tile as a value plus a set of unit cells; allow it to snap to a grid and compute the represented total from its cells.
- Keep the ten-frame/target group, addend groups, palette, and answer controls synchronized from one lesson state. The central learning move is matching/comparing totals through visible composition, not merely typing a sum.
- The recording does not establish all challenge prompts, legal drop zones, whether every tile may be decomposed, wrong-answer feedback, exact snap/drag animation, or mastery rules.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 23.39.25.mp4` (8:24; 3248×2036; H.264/AAC). The visible lesson route is `/exploration/small_problems`. It demonstrates contextual word problems, operation choice, visual representations, and guided support.

### Observed sequence

- The lesson is selected from the curriculum map under **Word Problems**. A problem is displayed in large, centered, hand-drawn-style lettering on the dark navy lesson canvas; key quantities are circled and action words are highlighted in color.
- **Lightbulbs:** “There are 17 lightbulbs. Fanta turns off 9 of them. How many are still on?” The learner is asked whether this is addition or subtraction and whether to add or subtract to find the answer. Choices shown: **Add**, **Subtract**, **I'm not sure**. The illustration shows lit and unlit bulbs arranged in rows.
- **Birds:** “7 birds are sitting on a wire. 2 fly away. How many birds are left?” A row of illustrated birds sits on a wire. The activity pairs the narrative with an answer control and a numeric keypad in later states.
- **Flowers:** “There are 5 flowers in a garden. 3 more bloom. How many are there in total now?” Five potted flowers are shown, with ghosted empty pots beneath as a place to add the new flowers. A large `? + ? = ?` equation appears below the scene.
- During the flowers problem, the left instruction says **“No problem, let me jump in and help here.”** A blue down-arrow control begins a guided scaffold. The problem remains visible while the interaction moves toward a representation/equation.
- Left-side support text changes step by step while the central narrative/illustration remains the focus. A microphone control labeled **“Tap to set up voice”** is visible, consistent with the recorded narration reading the dynamic instructional text.

### Reusable instructional pattern

For each word problem, first ask the learner to identify the operation from the story, then represent the quantities with a concrete scene, then solve with a numeric control or equation. Include an explicit “I'm not sure” path that can lead into a scaffold rather than treating uncertainty as an incorrect answer. For addition, show empty capacity/placeholders for the new items; for subtraction, visibly distinguish the removed items from those remaining.

### Implementation implications and unknowns

- Store each problem as structured data: narrative clauses, quantities, action/relationship, operation, visual scene, answer, and scaffold steps. Render the displayed text and narration from the same instructional state.
- Provide a staged hint path from operation identification to concrete model to symbolic equation, while letting confident learners continue without hints.
- The exact answer-validation rules, number of retries, hints after wrong choices, progression between the three examples, and whether the video reaches lesson completion are not fully established. The recording ends while the flowers scaffold is still in progress.

## Clock recording correction

The uploaded file `Screen Recording 2026-11-10 at 23.55.48-compressed.mp4` (4:53; 1150×720; H.264/AAC) shows an **analog clock** activity. An earlier note in this document attributed a digital clock lesson called “The Counting Clock” to `23.48.31.mov`; that file was not part of the supplied recordings reviewed for this evidence log. Treat that earlier attribution and its digital-clock details as unverified and do not implement them from this document. The supplied 23.55 recording shows a large analog clock face, two colored hands, a number line labeled 1–12, prompts about hour/minute hands and reading time, and a final reward card that appears to read “Hour Hand Hunt.” The recording does not establish the full step sequence, error rules, or mastery criteria.

## Additional video evidence log

Source: `Screen Recording 2026-11-10 at 23.55.48-compressed.mp4` (4:53; 1150×720; H.264/AAC). The activity demonstrates an analog clock with hour/minute concepts.

### Observed sequence

- A large white analog clock face is centered on the navy background, with numerals 1–12, minute tick marks, and two differently colored hands (purple and orange). The left column provides instructions/questions and multiple-choice responses; a blue continue/help button appears after some responses.
- Early states show a clock at **3:00** and an auxiliary number line labeled 1–12. Later states rotate the hands and highlight/outline positions or numbers on the clock face.
- The sequence includes questions about which hand indicates the hour or minute and about reading specific times. Some questions offer three or four textual or numeric choices.
- The instructional flow alternates between identifying hand/number relationships, observing a demonstrated hand movement, and selecting an answer from the clock state.

### Implementation implications and unknowns

- Implement the clock as a semantic time value with hour/minute hands derived from it; avoid independently positioning hands in a way that can disagree with the displayed time.
- Keep hour-hand and minute-hand distinctions accessible through color plus shape/label. Support keyboard and touch adjustments if later recordings show manipulation.
- Exact prompt wording, order, minute-precision level, whether learners drag hands or only observe/select, and lesson completion are not fully established by the sampled frames.

## Additional video evidence log

Source: `Screen Recording 2026-11-11 at 00.01.04 (1).mov` (6:30; 3248×2036; H.264/AAC). The lesson introduces multiplication by connecting equal groups, repeated addition, and multiplication notation.

### Observed sequence

- An opening diagnostic asks whether the learner understands multiplication and displays `4 × 7 = ?` with **Yes** and **No** choices.
- The learner is shown equal groups of blue dots. A top control row includes a group/operation indicator, left/right controls, yellow counters for the number of groups, and play/reset-style controls.
- Examples build from repeated addition such as `1 + 1 + 1` and `2 + 2 + 2` to matching dot groups and a total. A later state displays six dots and asks the learner to reason about groups.
- Larger examples show repeated addition across many equal groups (for example a chain of `2`s and rows of dots), then explicitly connect the repeated-addition expression to multiplication notation such as `10 × 2 = 20`.
- The activity uses left-side instructional text and occasional answer-choice panels while the visual groups change. A later example shows `3 + 3 + 3 + 3` with a corresponding rectangular group of dots.

### Reusable teaching pattern

Teach multiplication as equal groups: show one group, replicate it, count the repeated addends, then show the total and equivalent multiplication expression. Keep group count, items per group, repeated-addition expression, and product synchronized.

### Implementation implications and unknowns

- Model the manipulative as `groups × itemsPerGroup`; derive repeated addition and total from that same state. Allow changing group count or group size only when the prompt supports that operation.
- Include a progression from small concrete groups to repeated-addition notation and then multiplication notation. Provide a clear mapping between each addend and one visual group.
- The complete prompts, correctness/retry rules, exact semantics of the top controls, and lesson endpoint are not established by the sampled frames. Confirm before finalizing step order.

## Additional video evidence log

Source: `Screen Recording 2026-11-11 at 00.59.44-compressed.mp4` (2:02; 1150×720; H.264/AAC). This upload demonstrates part of the **Add up to 100** recall/check flow and the beginning of a guided path. The accompanying `00.01.04 (1).mov` is a separate multiplication recording; it is not a later segment of the Add up to 100 video.

### Observed sequence

- The curriculum panel shows **Add up to 100**. The lesson uses countable dot groups and a bottom control for adding groups of ten or individual units.
- The narration/text says: **“You've been adding numbers up to 100. Show me what you remember.”** A recall/check phase follows.
- The learner is asked to tap the plus control three times to add three groups of ten, then identify the amount. Feedback describes three groups of ten as 30. The next item asks what results from adding 30 to 30. Feedback confirms **30 + 30 = 60**.
- The model then adds individual ones to the tens. A prompt asks what number is represented by `60 + 7`; feedback confirms **67**.
- The learner is asked what must be added to 67 to make 100. Feedback confirms **67 + 33 = 100**. A subsequent symbolic prompt displays `45 + 7 = ?`; sampled choices include 42, 51, 52, and 53.
- A reward/check card titled **Add to 100 Check** appears, then the curriculum panel is shown again.
- The flow then starts a guided **Add up to 100** lesson. It asks whether adding numbers up to 100 is already familiar, with **Yes** and **No** choices. The selected path says, **“No problem. Let's start from the beginning and work through the lessons together.”**
- Choosing “No” leads to an invitation to start from the beginning. The first visible guided prompt shows two groups of ten and asks what number they make, with numeric choices and an “I’m not sure” choice. The recording ends here. The full guided sequence is unknown.

### Scope and confidence

The contact-sheet review samples key frames rather than every frame. Prompt text quoted above was read from visible on-screen text where legible; sequence and controls are observed, while the complete assessment policy, scoring, timer, retry behavior, and mastery criteria remain unknown. The current Tutorly version is an original untimed exercise using dot groups and numeric answers. It should not claim to reproduce the unseen remainder of the reference lesson or grant mastery.

### Reusable instructional pattern

Move from concrete groups of ten to two-digit numbers with leftover ones, then to composing a target such as 100, and finally to symbolic addition. The same visual model supports verbal counting, multiple-choice checks, and an equation prompt.

### Implementation implications and unknowns

- Keep tens and ones as separate quantities in the lesson state. Derive the displayed number and equations from the same model; support composing 30 + 30, adding 7 ones, and finding the complement from 67 to 100.
- Distinguish diagnostic/review from guided teaching. A learner can indicate prior familiarity or request a from-the-beginning scaffold.
- The exact assessment branching, full sequence of guided exercises, answer choices for `45 + 7`, feedback on errors, and completion/mastery criteria are not established in this recording.
