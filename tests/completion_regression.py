"""Step 4 animation checks, in addition to the original full-site regression suite."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import struct
import sys
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
report = {'passed': [], 'failed': [], 'browsers': {}}
URL = 'http://127.0.0.1:8001/'

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 8001), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()

def check(label, action):
    try:
        action()
        report['passed'].append(label)
        print('PASS:', label, flush=True)
    except Exception as exc:
        report['failed'].append({'test': label, 'error': str(exc)})
        print('FAIL:', label, str(exc)[:600], flush=True)

def require(value, message):
    if not value:
        raise AssertionError(message)

def stage(page, name='Sinéad O’Brien'):
    page.goto(URL, wait_until='networkidle')
    expect(page.locator('#step5')).to_be_hidden()
    expect(page.locator('#curse-reveal')).to_have_attribute('data-animation', 'idle')
    page.locator('#name').fill(name)
    page.locator('#confirmName').click()
    page.locator('#firstButton').click()
    page.locator('#secondButton').click()
    expect(page.locator('#step5')).to_be_hidden()
    expect(page.locator('#curse-reveal')).to_have_attribute('data-animation', 'idle')
    page.locator('#thirdButton').focus()
    page.keyboard.press('Space')
    expect(page.locator('#thirdButton')).to_be_disabled()
    expect(page.locator('#step5')).to_be_visible()
    expect(page.locator('#finalButton')).to_be_enabled()
    expected = [name] + [page.locator(f'#{part}Result').inner_text() for part in ('first','second','third')]
    require(page.locator('#hex-preview span').all_text_contents() == expected, 'Preview is not the actual curse')
    expect(page.locator('#create-canvas')).to_be_hidden()
    require(page.locator('#finalResult').text_content() == '', 'Step 4 bypassed the final cast')
    require('angry-leprechaun-bg-free.png' in page.locator('#guide').evaluate('(e)=>getComputedStyle(e).backgroundImage'), 'Hero replaced')
    return ' '.join(expected)

def png(page, name, fallback=False):
    page.locator('#finalButton').click()
    expect(page.locator('#hex-preview')).to_be_hidden()
    expect(page.locator('#curse-reveal')).to_have_attribute('data-state', 'cast')
    page.locator('#createCanvasButton').click()
    expect(page.locator('#canvas')).to_be_visible()
    require(page.locator('canvas').count() == 1, 'Duplicate canvas')
    with page.expect_download() as info:
        page.locator('#download-link a').click()
    path = OUT / f'{name}.png'
    info.value.save_as(str(path))
    contents = path.read_bytes()
    require(contents.startswith(b'\x89PNG\r\n\x1a\n'), 'Not a PNG')
    width, height = struct.unpack('>II', contents[16:24])
    require(width == (600 if fallback else 1080), f'Wrong PNG width: {width}')
    require(height >= (400 if fallback else 1662), 'PNG height truncates artwork')
    require(not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), 'Horizontal overflow')

try:
    with sync_playwright() as pw:
        for engine in ('chromium', 'firefox', 'webkit'):
            browser = getattr(pw, engine).launch()
            report['browsers'][engine] = browser.version
            for width, height in ((1440,1000),(390,844),(320,740)):
                context = browser.new_context(viewport={'width':width, 'height':height}, reduced_motion='no-preference', accept_downloads=True)
                page = context.new_page()
                page.set_default_timeout(10000)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                def animation():
                    expected = stage(page)
                    expect(page.locator('#curse-reveal')).to_have_attribute('data-animation', 'running')
                    require(page.locator('#curse-reveal').evaluate('(e)=>e.getAnimations({subtree:true}).length>0'), 'No animation after Step 4')
                    # Disabled Step 4 cannot launch another burst or reroll the curse.
                    page.locator('#thirdButton').evaluate('(e)=>e.click()')
                    page.wait_for_timeout(3550)
                    expect(page.locator('#curse-reveal')).to_have_attribute('data-animation', 'complete')
                    require(not page.locator('#curse-reveal').evaluate('(e)=>e.getAnimations({subtree:true}).some(a=>a.playState==="running")'), 'Animation keeps looping')
                    if width in (1440,390):
                        page.locator('#step5').screenshot(path=str(OUT/f'{engine}-{width}-step4-reveal.png'))
                    png(page, f'{engine}-{width}-new-share')
                    require(page.locator('#finalResult').text_content() == expected, 'Casting changed the chosen curse')
                    require(page.locator('#canvas').get_attribute('aria-label') == expected, 'Export text is stale')
                    require(not errors, f'JavaScript errors: {errors}')
                    page.locator('#refresh').click()
                    expect(page.locator('#step5')).to_be_hidden()
                    expect(page.locator('#curse-reveal')).to_have_attribute('data-animation', 'idle')
                check(f'{engine} {width}px Step 4 only, personalised reveal, finite motion, PNG, reset', animation)
                context.close()
            context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce', accept_downloads=True)
            page = context.new_page()
            def reduced():
                stage(page)
                expect(page.locator('#curse-reveal')).to_have_attribute('data-animation', 'complete')
                require(page.locator('#curse-reveal').evaluate('(e)=>e.getAnimations({subtree:true}).length===0'), 'Reduced motion ignored')
                page.locator('#name').fill('Gráinne & Fiachra')
                expect(page.locator('#hex-preview span').first).to_have_text('Gráinne & Fiachra')
                png(page, f'{engine}-reduced-motion-share')
                require(page.locator('#finalResult').text_content().startswith('Gráinne & Fiachra '), 'Edited name not applied')
            check(f'{engine} reduced motion and live-name correction', reduced)
            def stop():
                page.emulate_media(reduced_motion='no-preference')
                stage(page)
                page.emulate_media(reduced_motion='reduce')
                expect(page.locator('#curse-reveal')).to_have_attribute('data-animation', 'complete')
                require(page.locator('#curse-reveal').evaluate('(e)=>e.getAnimations({subtree:true}).length===0'), 'Motion did not stop when preference changed')
            check(f'{engine} changing reduced-motion preference cancels effects', stop)
            def long_name():
                stage(page, '<img src=x onerror=alert(1)> ' + 'A' * 130)
                require(page.locator('#hex-preview img').count() == 0, 'Name interpreted as HTML')
                png(page, f'{engine}-long-name-share')
            check(f'{engine} long names, literal text and responsive export', long_name)
            def fallback():
                page.route('**/hex-reveal-frame.webp', lambda route: route.abort())
                stage(page)
                png(page, f'{engine}-missing-frame-fallback', fallback=True)
            check(f'{engine} missing decorative asset keeps original PNG download', fallback)
            context.close()
            browser.close()
finally:
    server.shutdown()
    (OUT/'completion-report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
sys.exit(1 if report['failed'] else 0)
