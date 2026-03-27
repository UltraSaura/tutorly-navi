

## Step-by-Step Quiz Flow (One Question at a Time)

### Current behavior
All questions are displayed at once on a single scrollable page. The user answers everything, then clicks "Submit" to grade all at once.

### New behavior
Questions are shown **one at a time**. For each question:
1. Student sees the question + a **Submit** button
2. Student answers and clicks **Submit**
3. The answer is graded immediately and feedback is shown (correct/incorrect with green/red styling)
4. If correct → a **Next** button appears to move to the next question
5. If incorrect → show "Incorrect" feedback + **Next** button (they move on regardless)
6. After the last question → show the final summary screen (score, retest, close)

A progress indicator (e.g., "Question 2 / 5") is shown at the top.

### Changes

**File: `src/components/learning/QuizOverlay.tsx`**

Replace the "show all questions + single submit" flow with a stepper:

- Add state: `currentIndex` (number), `questionSubmitted` (boolean), `questionResult` (boolean | null)
- Show only `questions[currentIndex]` via `<QuestionCard>`
- **Submit button**: grades the current question using `evaluateQuestion()`, sets `questionSubmitted = true` and `questionResult`
- **Next button**: increments `currentIndex`, resets `questionSubmitted` and `questionResult`
- When `currentIndex` reaches the end after the last "Next" click, submit the full attempt to Supabase and show the existing summary screen
- Add a progress bar/text: "Question {currentIndex + 1} / {questions.length}"
- After submitting each question, show a green or red border around the question card with "Correct" or "Incorrect" text
- The final summary screen (score, retest, close) remains unchanged

No other files need changes. `QuestionCard` already works standalone — it renders a question and calls `onChange` with the answer.

