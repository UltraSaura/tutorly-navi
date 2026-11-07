# Stuwy Explain V2 visual regression

This harness uses the already-installed Python Playwright runtime, Chromium, and Pillow. It manages the existing Vite development server on port 4173 when one is not already reachable, which is required because the Explanation Lab is a development-only route. It never deploys or touches production data.

```sh
STUWY_EXPLAIN_BASE_URL=http://127.0.0.1:4173/dev/stuwy-explain-v2 \
  python3 scripts/visual-regression/stuwy-explain-v2.py --update

STUWY_EXPLAIN_BASE_URL=http://127.0.0.1:4173/dev/stuwy-explain-v2 \
  python3 scripts/visual-regression/stuwy-explain-v2.py
```

It captures setup and intermediate frames for the reference operations at desktop and mobile sizes. Baselines are kept under `artifacts/stuwy-explain-v2/baseline/`. Without `--update`, the harness requires every baseline and compares decoded pixels; PNG compression metadata and one-level antialiasing noise are ignored, while meaningful changed pixels fail the run and must be reviewed before updating baselines. Transient staging/toast chrome is hidden for deterministic review captures.
