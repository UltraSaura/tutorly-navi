# Stuwy Explain V2 visual regression

This harness uses the already-installed Python Playwright runtime and Chromium. It targets an already-running local Vite preview or development server and never starts or stops the application itself.

```sh
STUWY_EXPLAIN_BASE_URL=http://127.0.0.1:4173/dev/stuwy-explain-v2 \
  python3 scripts/visual-regression/stuwy-explain-v2.py --update

STUWY_EXPLAIN_BASE_URL=http://127.0.0.1:4173/dev/stuwy-explain-v2 \
  python3 scripts/visual-regression/stuwy-explain-v2.py
```

It captures setup and intermediate frames for six reference operations at desktop and mobile sizes. Baselines are kept under `artifacts/stuwy-explain-v2/`. Without `--update`, the harness requires every baseline and performs a strict byte-level PNG comparison; changed screenshots fail the run and must be reviewed before updating baselines.
