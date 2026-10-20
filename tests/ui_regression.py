"""Regression tests for the existing static site. No application dependency is added.
Run: pip install playwright==1.63.0 && playwright install && python tests/ui_regression.py
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import re
import subprocess
import sys
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
BASE = '8508f5e93032f5abd9467e6fea6b1277ae7164d7'
report = {'passed': [], 'failed': [], 'external_warnings': [], 'browsers': {}}


def check(label, action):
    try:
        action()
        report['passed'].append(label)
        print('PASS:', label, flush=True)
    except Exception as exc:
        report['failed'].append({'test': label, 'error': str(exc)})
        print('FAIL:', label, str(exc)[:500], flush=True)


def require(value, message):
    if not value:
        raise AssertionError(message)


def original(path):
    return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=ROOT)


def parity():
    hero = 'assets/css/Images/angry-leprechaun-bg-free.png'
    require((ROOT / hero).read_bytes() == original(hero), 'Original leprechaun asset changed')
    old = original('assets/js/script.js').decode()
    new = (ROOT / 'assets/js/script.js').read_text()
    for name in ('One', 'Two', 'Three'):
        pattern = rf'(?:let|const) phraseList{name}\s*=\s*(\[[\s\S]*?\]);'
        before = re.search(pattern, old)
        after = re.search(pattern, new)
        require(before and after, f'Phrase list {name} missing')
        parse = lambda text: json.loads(re.sub(r',\s*\]', ']', text))
        require(parse(before[1]) == parse(after[1]), f'Phrase list {name} changed')
    for name in ('index.html', 'history.html', 'about.html', '404.html'):
        require('\\n</head>' not in (ROOT / name).read_text(), f'Literal newline text in {name}')


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 8000), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:8000/'
check('Original hero and all three phrase lists preserved; clean HTML heads', parity)

try:
    with sync_playwright() as pw:
        for engine in ('chromium', 'firefox', 'webkit'):
            browser = getattr(pw, engine).launch()
            report['browsers'][engine] = browser.version
            for width, height in ((1440, 1000), (768, 1024), (390, 844), (320, 740)):
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', accept_downloads=True)
                page = context.new_page()
                page.set_default_timeout(10000)
                errors, missing = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                def response_handler(response):
                    if response.status >= 400:
                        target = f'{response.status} {response.url}'
                        (missing if response.url.startswith(url) else report['external_warnings']).append(target)
                page.on('response', response_handler)
                for document in ('index.html', 'history.html', 'about.html', '404.html'):
                    errors.clear()
                    missing.clear()
                    def layout(document=document):
                        response = page.goto(url + document, wait_until='networkidle')
                        require(response.status == 200, f'{document}: HTTP {response.status}')
                        page.evaluate('document.fonts.ready')
                        overflow = page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
                        require(not overflow, 'Horizontal page overflow')
                        broken = page.locator('img').evaluate_all('(images) => images.filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute("src"))')
                        require(not broken, f'Broken images: {broken}')
                        require(not missing, f'Missing local resources: {missing}')
                        require(not errors, f'JavaScript errors: {errors}')
                        if document == 'index.html':
                            require('angry-leprechaun-bg-free.png' in page.locator('#guide').evaluate('(e) => getComputedStyle(e).backgroundImage'), 'Wrong hero image')
                        if engine == 'chromium' and width in (1440, 390):
                            page.screenshot(path=str(OUT / f'{engine}-{width}-{document}.png'), full_page=True, animations='disabled')
                    check(f'{engine} {width}px {document}: layout, assets, console', layout)
                    if document == 'history.html':
                        def accordions():
                            for kind in ('what', 'who', 'where'):
                                control = page.locator(f'.l-{kind} h2 button')
                                expect(control).to_have_attribute('aria-expanded', 'false')
                                control.focus()
                                page.keyboard.press('Enter')
                                expect(control).to_have_attribute('aria-expanded', 'true')
                                expect(page.locator(f'.{kind}-drop')).to_be_visible()
                                page.keyboard.press('Space')
                                expect(page.locator(f'.{kind}-drop')).to_be_hidden()
                        check(f'{engine} {width}px history keyboard accordions', accordions)
                def journey():
                    page.goto(url, wait_until='networkidle')
                    expect(page.locator('#step2')).to_be_hidden()
                    page.locator('#name').fill('Aoife Ní Bhraonáin')
                    page.locator('#confirmName').click()
                    for i, name in enumerate(('first', 'second', 'third'), start=2):
                        expect(page.locator(f'#step{i}')).to_be_visible()
                        button = page.locator(f'#{name}Button')
                        button.focus()
                        page.keyboard.press('Enter')
                        expect(button).to_be_disabled()
                        require(bool(page.locator(f'#{name}Result').inner_text().strip()), 'Empty phrase')
                    page.locator('#finalButton').click()
                    result = page.locator('#finalResult').inner_text()
                    require(result.startswith('Aoife Ní Bhraonáin '), 'Name lost or corrupted')
                    require(page.locator('canvas').count() == 1, 'Duplicate/blank canvas added')
                    page.locator('#create-canvas').click()
                    expect(page.locator('#canvas')).to_be_visible()
                    expect(page.locator('#download-link')).to_be_visible()
                    with page.expect_download() as download_info:
                        page.locator('#download-link a').click()
                    download = download_info.value
                    download.save_as(str(OUT / f'{engine}-{width}-hex.png'))
                    require((OUT / f'{engine}-{width}-hex.png').read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), 'Invalid PNG download')
                    require(not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), 'Completed journey overflows')
                    if engine == 'chromium' and width in (1440, 390):
                        page.screenshot(path=str(OUT / f'{engine}-{width}-completed.png'), full_page=True, animations='disabled')
                    page.locator('#refresh').click()
                    expect(page.locator('#name')).to_have_value('')
                    expect(page.locator('#step2')).to_be_hidden()
                check(f'{engine} {width}px full journey, keyboard, PNG, restart', journey)
                context.close()
            browser.close()
finally:
    server.shutdown()
    report['external_warnings'] = sorted(set(report['external_warnings']))
    (OUT / 'report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

sys.exit(1 if report['failed'] else 0)
