

## Move Sign Out Below Language in Account Sheet

### Change
In `src/components/layout/AccountTabContent.tsx`, move the Sign Out button and its separator **after** the Language section, so the order becomes:

1. User profile header
2. Profile / Support / Admin links
3. Language selector
4. **Sign Out** (at the very bottom)

Single-file change — just reorder the existing JSX blocks (lines 112–134).

