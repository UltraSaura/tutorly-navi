"""Read-only T11.6 browser audit of existing TwoCards visuals and speech payloads.

This is an evidence capture, not a passing mathematical-correctness test.
Run: python3 scripts/visual-regression/t116-twocards-audit.py
"""
import importlib.util
import json
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('visual', Path(__file__).with_name('stuwy-explain-v2.py'))
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)
OUT = visual.ROOT / 'artifacts/stuwy-explain-v2/t116-audit'
URL = 'http://127.0.0.1:4173/dev/stuwy-explain-v2'
OUT.mkdir(parents=True, exist_ok=True)
observations = []

with visual.application_server(URL), sync_playwright() as p:
    browser = p.chromium.launch()
    for width in [375, 447]:
        page = browser.new_page(viewport={'width': width, 'height': 844}, reduced_motion='reduce')
        page.add_init_script("""
          localStorage.setItem('lang', 'fr');
          localStorage.setItem('countryDetected', 'true');
          window.__spoken = [];
          Object.defineProperty(window, 'speechSynthesis', {value: {
            getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {},
            cancel: () => {}, pause: () => {}, resume: () => {},
            speak: (u) => { window.__spoken.push({text:u.text,lang:u.lang}); }
          }});
        """)
        page.goto(URL)
        page.get_by_text('Outils développeur et comparaison des moteurs', exact=True).click()
        card = page.get_by_role('region', name='TwoCards original', exact=True)
        expect(card).to_be_visible()
        for step in range(6):
            page.wait_for_timeout(400)
            card.get_by_role('button', name='Read Aloud', exact=True).click()
            text = card.inner_text()
            observations.append({'width': width, 'step': step, 'visible': text,
                                 'speech': page.evaluate('window.__spoken.at(-1)')})
            card.screenshot(path=str(OUT / f'{width}-step-{step}.png'))
            if step < 5:
                card.locator('button').filter(has=page.locator('svg.lucide-chevron-right')).click()
        page.close()
    browser.close()

(OUT / 'observations.json').write_text(json.dumps(observations, ensure_ascii=False, indent=2) + '\n')
for item in observations:
    print(f"{item['width']}px step {item['step']}: {item['speech']}")
failures = []
for item in observations:
    equation = re.match(r'(-?\d+) − (-?\d+) = (-?\d+)', item['speech']['text'])
    if equation:
        left, right, result = map(int, equation.groups())
        if left - right != result:
            failures.append({'width': item['width'], 'step': item['step'], 'equation': equation.group()})
print(json.dumps({'false_narrated_equations': failures}, ensure_ascii=False, indent=2))
if failures:
    raise SystemExit('BLOCKED: mathematical inconsistencies reproduced in existing TwoCards.')
print('AUDIT CAPTURED. Equation assertions passed; visual review is still required.')
