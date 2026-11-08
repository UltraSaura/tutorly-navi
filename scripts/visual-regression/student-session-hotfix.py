"""Real-browser tutoring progression checks; reuse the existing server lifecycle."""
import importlib.util
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('visual', Path(__file__).with_name('stuwy-explain-v2.py'))
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)
URL = 'http://127.0.0.1:4173/dev/stuwy-explain-v2'
OUT = ROOT / 'artifacts/stuwy-explain-v2/hotfix'
OUT.mkdir(parents=True, exist_ok=True)

with visual.application_server(URL), sync_playwright() as p:
    browser = p.chromium.launch()
    viewports = {
        'desktop': visual.VIEWPORTS['desktop'],
        'mobile-375': {'width': 375, 'height': 844},
        'mobile-447': {'width': 447, 'height': 844},
    }
    for name, viewport in viewports.items():
        page = browser.new_page(viewport=viewport, reduced_motion='reduce')
        page.add_init_script("localStorage.setItem('lang','fr'); localStorage.setItem('countryDetected','true')")
        page.goto(URL)
        s = page.get_by_test_id('interactive-student-session')
        expect(s).to_be_visible()
        page.add_style_tag(content="[data-testid='staging-environment-indicator'], [data-testid='developer-tools'] {display:none!important}")
        def capture(label):
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(1500)
            s.screenshot(path=str(OUT / f'{name}-{label}.png'))
            assert s.evaluate('(e) => e.scrollWidth <= e.clientWidth + 1'), 'Session overflow'
            if s.get_by_label('Ta réponse').count():
                field = s.get_by_label('Ta réponse').bounding_box()
                submit = s.get_by_role('button', name='Valider ma réponse').bounding_box()
                assert submit['y'] >= field['y'] + field['height'], 'Controls cover answer field'
        def answer(value):
            s.get_by_label('Ta réponse').fill(value)
            s.get_by_label('Ta réponse').press('Enter')
        def reset():
            s.get_by_role('button', name='Nouvel exercice').click()
        def wrong():
            s.get_by_text('Choisir une réponse', exact=True).click()
            s.get_by_role('button', name='Je calcule 8 moins 5', exact=True).click()
            s.get_by_role('button', name='Valider ma réponse').click()
        def understand_correction():
            expect(s.get_by_test_id('pedagogical-correction')).to_be_visible()
            s.get_by_role('button', name='Vérifier si tu as compris').click()
            s.get_by_role('button', name='Oui, ce sont deux situations différentes.').click()
            s.get_by_role('button', name='Valider ma réponse').click()
        expect(s.get_by_role('button', name='Réessayer', exact=True)).to_have_count(0)
        capture('initial')
        wrong()
        expect(s.get_by_test_id('pedagogical-correction')).to_contain_text('Tu as proposé de faire 8 − 5')
        capture('correction-why')
        s.get_by_role('button', name='Vérifier si tu as compris').click()
        expect(s.get_by_test_id('active-question')).to_contain_text('même situation')
        capture('correction-check')
        s.get_by_role('button', name='Oui, ce sont deux situations différentes.').click()
        s.get_by_role('button', name='Valider ma réponse').click()
        expect(s.get_by_test_id('active-question')).to_have_text('Une dizaine représente combien d’unités ?')
        expect(s.get_by_role('group', name='Réponses proposées')).to_have_count(0)
        capture('remediation-10')
        answer('10')
        expect(s.get_by_test_id('active-question')).to_contain_text('combien d’unités avons-nous maintenant')
        capture('remediation-15')
        answer('15')
        expect(s.get_by_test_id('active-question')).to_contain_text('15 − 8')
        expect(s.get_by_test_id('session-result-0')).to_be_empty()
        capture('subtract-15-8')
        answer('7')
        expect(s.get_by_test_id('active-question')).to_contain_text('2 dizaines')
        expect(s.get_by_test_id('session-result-0')).to_have_text('7')
        capture('tens')
        for value in ['1', '11', '7', '1']:
            answer(value)
        capture('assembled')
        answer('177')
        expect(s.get_by_test_id('active-question')).to_contain_text('326 − 157')
        capture('transfer')
        # Transfer must survive hint, incorrect response, and retry.
        s.get_by_role('button', name='Un indice', exact=True).click()
        answer('111')
        s.get_by_role('button', name='Réessayer', exact=True).click()
        answer('169')
        expect(s.get_by_text('Séance terminée', exact=True)).to_be_visible()
        capture('complete')
        reset()
        wrong()
        understand_correction()
        answer('2')
        s.get_by_role('button', name='Réessayer', exact=True).click()
        expect(s.get_by_label('Ta réponse')).to_be_editable()
        answer('2')
        expect(s.get_by_text('Démonstration TwoCards', exact=False)).to_be_visible()
        capture('twocards-fallback')
        s.get_by_role('button', name='À moi de répondre', exact=True).click()
        answer('2')
        expect(s.get_by_test_id('active-question')).to_contain_text('5 + 5')
        capture('prerequisite')
        answer('2')
        answer('2')
        expect(s.get_by_role('button', name='Reprendre avec mon accompagnant')).to_be_visible()
        s.get_by_role('button', name='Reprendre avec mon accompagnant').click()
        answer('10')
        expect(s.get_by_test_id('active-question')).to_have_text('Une dizaine représente combien d’unités ?')
        answer('10')
        expect(s.get_by_test_id('active-question')).to_contain_text('combien d’unités avons-nous maintenant')
        reset()
        wrong()
        understand_correction()
        for _ in range(3):
            s.get_by_role('button', name='Un indice', exact=True).click()
        expect(s.get_by_role('button', name='À moi de répondre', exact=True)).to_be_visible()
        s.get_by_role('button', name='À moi de répondre', exact=True).click()
        answer('10')
        expect(s.get_by_test_id('active-question')).to_contain_text('combien d’unités avons-nous maintenant')
        print(f'PASS {name}: all eight requested journeys; fallback, bounded retry, keyboard and transfer help')
        page.goto(URL + '#student-session')
        expect(s.get_by_test_id('active-question')).to_be_in_viewport()
        print(f'PASS {name}: direct student-session link')
        page.close()
    browser.close()
