# Explanation Lab — product-owner demonstration

## Open the Lab

From the repository root:

```sh
npm run dev -- --host 127.0.0.1 --port 4173
```

Open [http://127.0.0.1:4173/dev/stuwy-explain-v2](http://127.0.0.1:4173/dev/stuwy-explain-v2). The route is development-only and uses no production data. Demonstration presets can be opened directly:

| Walkthrough | URL query | What to review |
|---|---|---|
| Addition with carrying | `?demo=addition` | `58 + 67`: carry from units to tens. |
| Subtraction with borrowing | `?demo=borrowing` | `52 − 27`: 5→4 and 2→12. |
| Borrowing across zero | `?demo=borrowingAcrossZero` | `403 − 178`: 4→3, 0→9 and 3→13. |
| Multiplication | `?demo=multiplication` | `247 × 36`: aligned partial products. |
| French division with remainder | `?demo=divisionRemainder` | `907 ÷ 4`: quotient 226, remainder 3, including quotient zero. |
| Decimal addition | `?demo=decimals` | `125,6 + 8,75`: decimal columns aligned. |

For each preset, press **Suivant** through every frame, then test **Précédent**, **Rejouer**, **Lecture/Pause**, and keyboard focus with `Tab` and `Enter`. In guided mode the final result stays hidden until the last frame. Reduced motion stops autoplay and leaves the same explicit frame controls available.

## Reviewed screenshots

- [Addition carry — desktop step 1](../../artifacts/stuwy-explain-v2/baseline/addition-carry-desktop-step-1.png)
- [Subtraction borrowing — desktop step 1](../../artifacts/stuwy-explain-v2/baseline/subtraction-borrow-desktop-step-1.png)
- [Borrowing across zero — desktop step 1](../../artifacts/stuwy-explain-v2/baseline/subtraction-zero-desktop-step-1.png)
- [Multiplication — desktop step 1](../../artifacts/stuwy-explain-v2/baseline/multiplication-desktop-step-1.png)
- [Division remainder — desktop final state](../../artifacts/stuwy-explain-v2/baseline/long-division-remainder-desktop-step-4.png)
- [Decimal alignment — desktop step 2](../../artifacts/stuwy-explain-v2/baseline/decimal-alignment-desktop-step-2.png)

Manual review is still required for teacher judgment of wording by age, screen-reader announcement timing, and whether the visual exchange notation is sufficiently intuitive for a child seeing it for the first time.
