"""Capture and optionally compare Explanation Lab screenshots.

Usage:
  STUWY_EXPLAIN_BASE_URL=http://127.0.0.1:4173/dev/stuwy-explain-v2 \
    python3 scripts/visual-regression/stuwy-explain-v2.py --update

The script intentionally targets an already-running local server. It never
starts, stops, deploys or mutates the application.
"""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


CASES = {
    "addition-carry": "58 + 67",
    "subtraction-borrow": "52 - 27",
    "subtraction-zero": "403 - 178",
    "multiplication": "247 × 36",
    "long-division": "864 ÷ 8",
    "decimal-alignment": "125,6 + 8,75",
}
VIEWPORTS = {"desktop": {"width": 1280, "height": 900}, "mobile": {"width": 390, "height": 844}}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--update", action="store_true", help="write current screenshots as baselines")
    args = parser.parse_args()
    base_url = os.environ.get("STUWY_EXPLAIN_BASE_URL", "http://127.0.0.1:4173/dev/stuwy-explain-v2")
    root = Path(os.environ.get("STUWY_EXPLAIN_ARTIFACT_DIR", "artifacts/stuwy-explain-v2"))
    baseline_root = root / "baseline"
    actual_root = root / "actual"
    actual_root.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for viewport_name, viewport in VIEWPORTS.items():
            page = browser.new_page(viewport=viewport, reduced_motion="reduce")
            for case_name, expression in CASES.items():
                page.goto(base_url, wait_until="networkidle")
                page.get_by_label("Exercice").fill(expression)
                page.get_by_role("button", name="Générer localement").click()
                page.get_by_text("Validation mathématique").wait_for()
                stem = f"{case_name}-{viewport_name}"
                page.screenshot(path=actual_root / f"{stem}-setup.png", full_page=True)
                for step in range(1, 4):
                    next_button = page.get_by_role("button", name="Suivant")
                    if next_button.is_disabled():
                        break
                    next_button.click()
                    page.screenshot(path=actual_root / f"{stem}-step-{step}.png", full_page=True)
                if args.update:
                    baseline_root.mkdir(parents=True, exist_ok=True)
                    for screenshot in actual_root.glob(f"{stem}-*.png"):
                        screenshot.replace(baseline_root / screenshot.name)
        browser.close()

    if not args.update:
        missing = [path.name for path in actual_root.glob("*.png") if not (baseline_root / path.name).exists()]
        if missing:
            raise SystemExit(f"Missing visual baselines; rerun with --update: {', '.join(sorted(missing))}")
        mismatched = []
        for actual in actual_root.glob("*.png"):
            baseline = baseline_root / actual.name
            if hashlib.sha256(actual.read_bytes()).digest() != hashlib.sha256(baseline.read_bytes()).digest():
                mismatched.append(actual.name)
        if mismatched:
            raise SystemExit(f"Visual baseline mismatch: {', '.join(sorted(mismatched))}")
        print(f"Captured and matched {len(list(actual_root.glob('*.png')))} screenshots against byte-identical baselines.")


if __name__ == "__main__":
    main()
