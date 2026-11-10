"""T11.12: original animation parity and independent application journeys."""
import importlib.util
import sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('visual', Path(__file__).with_name('stuwy-explain-v2.py'))
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)
URL = 'http://127.0.0.1:4173/dev/stuwy-explain-v2'
OUT = ROOT / 'artifacts/stuwy-explain-v2/t1112'
OUT.mkdir(parents=True, exist_ok=True)

with visual.application_server(URL), sync_playwright() as p:
    browser = p.chromium.launch()
    for width in [1280, 375, 447]:
        page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
        page.add_init_script("""
          localStorage.setItem('lang','fr'); localStorage.setItem('countryDetected','true');
          window.__spoken = [];
          Object.defineProperty(window, 'speechSynthesis', {value: {
            getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {},
            cancel: () => {}, pause: () => {}, resume: () => {},
            speak: u => window.__spoken.push(u.text)
          }});
        """)
        page.goto(URL)
        page.add_style_tag(content="[data-testid='staging-environment-indicator'] {display:none!important}")
        s = page.get_by_test_id('interactive-student-session')
        expect(s).to_be_visible()
        def capture(name):
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(600)
            s.screenshot(path=str(OUT / f'{width}-{name}.png'))
            assert s.evaluate('(e) => e.scrollWidth <= e.clientWidth + 1')
        def answer(value):
            s.get_by_label('Ta réponse', exact=True).fill(value)
            s.get_by_label('Ta réponse', exact=True).press('Enter')
        s.get_by_role('button', name='Je calcule 8 moins 5', exact=True).click()
        s.get_by_role('button', name='Valider ma réponse').click()
        expect(s.get_by_test_id('pedagogical-correction')).to_contain_text('change le calcul')
        capture('pourquoi')
        s.get_by_role('button', name='Voir la méthode sur l’opération').click()
        integrated = s.get_by_test_id('original-animation').locator(':scope > div')
        expect(integrated).to_be_visible()
        expect(s.get_by_label('Ta réponse', exact=True)).to_have_count(0)
        expect(s.get_by_label('Opération posée', exact=True)).to_have_count(0)
        capture('comment')
        page.get_by_text('Outils développeur et comparaison des moteurs', exact=True).click()
        reference_region = page.get_by_role('region', name='TwoCards original', exact=True)
        reference = reference_region.locator(':scope > div').last
        # Match the parent available width only; never change stepper internal styling.
        reference_region.evaluate('(e,w) => { e.parentElement.style.display = "block"; e.parentElement.style.maxWidth = "none"; e.parentElement.style.width = (w + 34) + "px"; e.style.width = (w + 34) + "px"; }', integrated.bounding_box()['width'])
        # Equal subpixel origin avoids font antialiasing differences from the two parent layouts.
        delta = (integrated.bounding_box()['y'] % 1) - (reference.bounding_box()['y'] % 1)
        reference_region.evaluate('(e,dy) => { e.style.position="relative"; e.style.top=dy+"px"; }', delta)
        for step in range(6):
            page.wait_for_timeout(650)
            for label, element in [('original', reference), ('integrated', integrated)]:
                element.get_by_role('button', name='Read Aloud', exact=True).click()
                speech = page.evaluate('window.__spoken.at(-1)')
                if label == 'original':
                    original_speech = speech
                else:
                    assert speech == original_speech, (width, step, speech, original_speech)
                page.mouse.move(0, 0)
                page.wait_for_timeout(300)
                element.screenshot(path=str(OUT / f'{width}-{label}-{step}.png'))
            original = OUT / f'{width}-original-{step}.png'
            actual = OUT / f'{width}-integrated-{step}.png'
            assert visual.pixels_match(original, actual), f'Animation parity: {width}px step {step}'
            a, b = Image.open(original), Image.open(actual)
            pair = Image.new('RGB', (a.width + b.width, max(a.height,b.height)), 'white')
            pair.paste(a, (0,0)); pair.paste(b, (a.width,0))
            pair.save(OUT / f'{width}-comparison-{step}.png')
            if step < 5:
                for element in [reference, integrated]:
                    element.locator('button').filter(has=page.locator('svg.lucide-chevron-right')).click()
        # Original previous control still changes the step.
        integrated.locator('button').filter(has=page.locator('svg.lucide-chevron-left')).click()
        s.get_by_role('button', name='À moi d’essayer un autre calcul').click()
        expect(s.get_by_test_id('active-question')).to_contain_text('326 − 157')
        expect(s.get_by_test_id('original-animation')).to_have_count(0)
        capture('a-toi')
        answer('177')
        expect(s.get_by_role('status')).to_contain_text('Pas encore')
        capture('incorrect')
        s.get_by_role('button', name='Réessayer', exact=True).click()
        s.get_by_role('button', name='Un indice', exact=True).click()
        expect(s.get_by_role('status')).to_contain_text('1 dizaine en bas')
        capture('hint')
        answer('169')
        expect(s.get_by_text('Séance terminée', exact=True)).to_be_visible()
        capture('complete')
        s.get_by_role('button', name='Nouvel exercice').click()
        s.get_by_role('button', name='J’ajoute 10 unités en haut et 1 dizaine en bas', exact=True).click()
        s.get_by_role('button', name='Valider ma réponse').click()
        expect(s.get_by_test_id('original-animation')).to_be_visible()
        s.get_by_role('button', name='À moi d’essayer un autre calcul').click()
        for _ in range(3):
            s.get_by_role('button', name='Un indice', exact=True).click()
        expect(s.get_by_test_id('original-animation')).to_be_visible()
        s.get_by_role('button', name='À moi d’essayer un autre calcul').click()
        answer('169')
        expect(s.get_by_text('Séance terminée', exact=True)).to_be_visible()
        print(f'PASS {width}px: 6 exact animation/speech comparisons; correction, application, retry, hint, return and completion')
        page.close()
    browser.close()
