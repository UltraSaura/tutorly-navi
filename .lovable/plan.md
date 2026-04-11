

## Plan: Move Interactive Practice Above Concept

### Change

**File: `src/features/explanations/TwoCards.tsx`**

Move the "Interactive Math Stepper" block (lines 202-211) from **after** the Student View explanation card to **between** the Exercise card (line 176) and the Student View explanation card (line 178).

Current order: Exercise → Concept/Method/Example/Pitfall/Check → Interactive Practice

New order: Exercise → **Interactive Practice** → Concept/Method/Example/Pitfall/Check

### Technical Detail

Cut lines 202-211 and paste them between the closing `</div>` of the Exercise card (line 176) and the `{!isGuardian && (` block (line 179).

