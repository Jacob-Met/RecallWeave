#!/usr/bin/env python3
"""Enzyme-unit receiving on the unchanged PR33 learner. Synthetic local answers only."""
from __future__ import annotations
import datetime, functools, hashlib, http.server, json, os, pathlib, subprocess, tempfile, threading, time, traceback
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path('/dev/shm/rwe-a0eb-learner')
SOURCE = ROOT / 'source'
OUT = ROOT / 'evidence'
COURSE_FILE = SOURCE / 'courses/enzymes-energy-and-control.json'
EXPECTED_COURSE_SHA = 'f8539cc5ba82cdae6f128986cdec2d09b62d846c2cf3bc9bc221d406264ff64a'
FREEZE = json.loads((OUT / 'source-freeze.json').read_text())
COURSE = json.loads(COURSE_FILE.read_text())
ITEMS = {item['id']: item for item in COURSE['items']}
BY_PROMPT = {item['prompt']: item for item in COURSE['items']}
REPORT = {
    'schema': 'recallweave.enzyme-actual-learner-receiving.v1',
    'worker_id': 'chatgpt-a0eb505c4971/estate_products',
    'importer_head': FREEZE['importer_head'],
    'course_head': FREEZE['course_head'],
    'course_sha256': EXPECTED_COURSE_SHA,
    'started_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'synthetic_answers_only': True,
    'source_edits': 0, 'dependencies_installed': 0,
    'milestones': [], 'downloads': [], 'screenshots': [],
}
errors, external, requests = [], [], []
page = None

def sha(data):
    return hashlib.sha256(data).hexdigest()

def require(condition, label):
    if not condition:
        raise AssertionError(label)

def milestone(name, **detail):
    row = {'name': name, **detail}
    REPORT['milestones'].append(row)
    print(json.dumps(row), flush=True)

def guard_source():
    for row in FREEZE['exact_published_importer_files'] + FREEZE['unchanged_course_files']:
        require(sha((SOURCE / row['path']).read_bytes()) == row['sha256'], 'source changed: ' + row['path'])

def current_question(pg):
    prompt = pg.locator('#session-content h2').inner_text()
    require(prompt in BY_PROMPT, 'visible question belongs to exact enzyme unit')
    return BY_PROMPT[prompt]

def option_text(button):
    return button.evaluate("""el => {
        const copy = el.cloneNode(true);
        copy.querySelector('.choice-key')?.remove();
        return copy.textContent;
    }""").strip()

def choose_visible(pg, item, choice, practice=False):
    selector = '[data-practice-choice]' if practice else '[data-choice]'
    attribute = 'data-practice-choice' if practice else 'data-choice'
    buttons = pg.locator(selector)
    require(buttons.count() == len(item['options']), 'all visible options retained')
    matches = [buttons.nth(i) for i in range(buttons.count())
               if option_text(buttons.nth(i)) == item['options'][choice]]
    require(len(matches) == 1, 'unique visible option text')
    target = matches[0]
    require(int(target.get_attribute(attribute)) == choice, 'visible text maps to canonical index')
    target.press('Enter')
    feedback = pg.locator('#practice-feedback' if practice else '#feedback-slot')
    require(item['explanation'] in feedback.inner_text(), 'original explanation rendered')
    require(item['transfer'] in feedback.inner_text(), 'original transfer rendered')
    correct = pg.locator('.choices .choice.correct')
    require(correct.count() == 1 and option_text(correct) == item['options'][item['answer']],
            'correct answer marked by original canonical text')

def import_preview(pg):
    pg.locator('#deck-file').set_input_files(str(COURSE_FILE))
    pg.locator('#start-deck').wait_for(state='visible')
    require(pg.locator('#deck-preview-title').inner_text() == COURSE['title'], 'course title preview')
    require(pg.locator('#deck-preview li').count() == 12, 'all twelve preview prompts')
    require(pg.locator('#deck-preview li strong').all_text_contents() ==
            [item['prompt'] for item in COURSE['items']], 'exact preview prompt order and text')
    require(COURSE['attribution'] in pg.locator('.deck-preview-attribution').inner_text(),
            'original attribution preview')
    require(COURSE['license'] in pg.locator('.deck-preview-license').inner_text(),
            'original license preview')

def start_import(pg):
    pg.locator('#start-deck').press('Enter')
    pg.locator('[data-choice]').first.wait_for(state='visible')
    require(pg.locator('#step-count').inner_text() == '0 / 12', 'explicit start creates a fresh lesson')
    require(pg.locator('#lesson-description').inner_text() == COURSE['title'], 'selected course context')
    require(pg.locator('.deck-concept').all_text_contents() == COURSE['concepts'],
            'four original concepts retained')

def open_trace_controls(pg):
    panel = pg.locator('#trace-archive-panel')
    if panel.get_attribute('open') is None:
        panel.locator('summary').press('Enter')

def download(pg, selector, filename):
    with pg.expect_download() as promise:
        pg.locator(selector).press('Enter')
    actual = promise.value
    require(actual.failure() is None, 'browser completed download')
    destination = OUT / filename
    actual.save_as(str(destination))
    raw = destination.read_bytes()
    REPORT['downloads'].append({
        'file': filename, 'suggested_filename': actual.suggested_filename,
        'bytes': len(raw), 'sha256': sha(raw), 'actual_browser_download': True,
    })
    return destination, raw

def trace_download(pg, filename):
    open_trace_controls(pg)
    destination, raw = download(pg, '#save-trace-button', filename)
    return destination, json.loads(raw)

def semantic_trace(document):
    return {key: value for key, value in document.items() if key != 'savedAt'}

def assert_trace(document, answers):
    require(document['format'] == 'recallweave.learning-trace', 'native trace format')
    require(document['firstAnswers'] == answers, 'actual export preserves canonical first answers and order')
    for key in ['title', 'attribution', 'license', 'concepts', 'items']:
        require(document['deck'][key] == COURSE[key], 'export retains exact course field: ' + key)
    require(set(document['mastery']) == set(COURSE['concepts']), 'all four mastery entries exported')
    require(all(isinstance(v, (int, float)) and 0 <= v <= 1
                for v in document['mastery'].values()), 'finite mastery values')
    require(len(document['firstAnswers']) == 12, 'complete first session exported')

def assert_notes(text, answers, practice_ids=()):
    require(COURSE['title'] in text and COURSE['attribution'] in text and COURSE['license'] in text,
            'downloaded notes retain title and source attribution')
    for answer in answers:
        item = ITEMS[answer['item']]
        for value in [item['prompt'], item['options'][answer['choice']], item['options'][item['answer']],
                      item['explanation'], item['transfer']]:
            require(value in text, 'downloaded notes retain original question/answer/explanation/transfer')
    if practice_ids:
        require('Practice' in text, 'notes contain practice record')

def assert_review(pg, answers):
    cards = pg.locator('.review-item')
    require(cards.count() == 12, 'all twelve review cards')
    for index, answer in enumerate(answers):
        item = ITEMS[answer['item']]
        card = cards.nth(index)
        require(card.locator('.review-prompt').inner_text() == item['prompt'], 'review preserves asked order')
        card.locator('summary').press('Enter')
        actual = card.locator('.review-answers dd').all_text_contents()
        require(actual == [item['options'][answer['choice']], item['options'][item['answer']]],
                'review keeps first and correct canonical answer texts')
        require(item['explanation'] in card.locator('.review-body').inner_text(), 'review explanation')
        require(item['transfer'] in card.locator('.review-body').inner_text(), 'review transfer')
        card.locator('summary').press('Enter')

def restore_preview(pg, path):
    open_trace_controls(pg)
    pg.locator('#trace-file').set_input_files(str(path))
    pg.locator('#restore-trace-confirm').wait_for(state='visible')
    require('12' in pg.locator('#trace-preview-summary').inner_text(), 'twelve-answer archive preview')

def screenshot(pg, name):
    pg.screenshot(path=str(OUT / name), full_page=True)
    raw = (OUT / name).read_bytes()
    REPORT['screenshots'].append({'file': name, 'bytes': len(raw), 'sha256': sha(raw)})

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'application/javascript'}
    def log_message(self, *args):
        pass

guard_source()
require(sha(COURSE_FILE.read_bytes()) == EXPECTED_COURSE_SHA, 'frozen qualified course')
require(len(ITEMS) == len(BY_PROMPT) == 12, 'twelve unique course questions')
require(os.readlink('/proc/self/ns/net') != os.readlink('/proc/1/ns/net'), 'private network namespace required')
subprocess.run(['ip', 'link', 'set', 'lo', 'up'], check=True)
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(SOURCE)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = 'http://127.0.0.1:' + str(server.server_address[1])
started = time.monotonic()
try:
    with tempfile.TemporaryDirectory(prefix='rwe-', dir='/tmp') as temporary:
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(
                user_data_dir=str(pathlib.Path(temporary) / 'profile'),
                headless=True,
                downloads_path=str(pathlib.Path(temporary) / 'downloads'),
                accept_downloads=True,
                viewport={'width': 1280, 'height': 900},
                args=['--disable-background-networking', '--disable-component-update',
                      '--disable-sync', '--no-first-run'],
            )
            REPORT['browser_version'] = context.browser.version
            REPORT['browser_executable'] = playwright.chromium.executable_path
            def route_request(route):
                request = route.request
                requests.append({'method': request.method, 'url': request.url})
                if request.method == 'GET' and (request.url.startswith(base + '/')
                    or request.url.startswith(SOURCE.as_uri() + '/')
                    or request.url.startswith(('data:', 'blob:'))):
                    route.continue_()
                else:
                    external.append({'method': request.method, 'url': request.url})
                    route.abort()
            context.route('**/*', route_request)
            def make_page(url):
                new_page = context.new_page()
                new_page.set_default_timeout(6000)
                new_page.on('pageerror', lambda error: errors.append(str(error)))
                new_page.goto(url, wait_until='load', timeout=15000)
                new_page.locator('#start-button').wait_for(state='visible')
                return new_page

            page = make_page((SOURCE / 'demo.html').as_uri())
            page.locator('#start-button').press('Enter')
            page.locator('[data-choice]').first.press('Enter')
            before = page.locator('#session-content').inner_html()
            before_count = page.locator('#step-count').inner_text()
            import_preview(page)
            require(page.locator('#session-content').inner_html() == before, 'preview preserves prior answers')
            page.locator('#cancel-deck').press('Enter')
            require(page.locator('#session-content').inner_html() == before and
                    page.locator('#step-count').inner_text() == before_count, 'cancel preserves current lesson')
            import_preview(page)
            start_import(page)
            milestone('actual_standalone_import_preview_cancel_and_explicit_start', questions=12, concepts=4)

            first_answers, missed_concepts = [], set()
            for count in range(12):
                item = current_question(page)
                require(item['id'] not in {a['item'] for a in first_answers}, 'question asked exactly once')
                missed = item['concept'] not in missed_concepts
                if missed:
                    missed_concepts.add(item['concept'])
                choice = (item['answer'] + 1) % len(item['options']) if missed else item['answer']
                choose_visible(page, item, choice)
                first_answers.append({'item': item['id'], 'choice': choice})
                require(page.locator('#step-count').inner_text() == str(count + 1) + ' / 12', 'progress tracks imported size')
                if count == 0:
                    screenshot(page, 'standalone-enzyme-question.png')
                page.locator('#next-button').press('Enter')
            page.locator('#first-try-summary').wait_for(state='visible')
            require('8 of 12' in page.locator('#first-try-summary').inner_text(), 'eight correct and four deliberate misses')
            assert_review(page, first_answers)
            _, notes_raw = download(page, '#save-notes-button', 'standalone-first-notes.txt')
            assert_notes(notes_raw.decode(), first_answers)
            _, first_trace = trace_download(page, 'standalone-first-trace.json')
            assert_trace(first_trace, first_answers)
            require(first_trace['practice'] is None, 'first export has no manufactured practice')
            milestone('standalone_all_twelve_questions_review_and_actual_exports', first_correct=8, first_missed=4)

            page.locator('#practice-button').press('Enter')
            first_retry = current_question(page)
            choose_visible(page, first_retry, first_retry['answer'], practice=True)
            page.locator('#back-to-review').press('Enter')
            require('1 of 4' in page.locator('#practice-status').inner_text(), 'one separate practice answer retained')
            paused_path, paused = trace_download(page, 'standalone-paused-trace.json')
            assert_trace(paused, first_answers)
            require(paused['firstAnswers'] == first_trace['firstAnswers'] and
                    paused['mastery'] == first_trace['mastery'], 'practice preserves first answers and full precision mastery')
            require(paused['practice'] == {'answers': [{'item': first_retry['id'], 'choice': first_retry['answer']}]},
                    'actual paused trace records the separate practice answer')
            milestone('actual_paused_practice_export', practice_answers=1, first_answers_unchanged=True)

            page.close()
            page = make_page(base + '/index.html')
            import_preview(page)
            start_import(page)
            pristine = page.locator('#session-content').inner_html()
            restore_preview(page, paused_path)
            require(page.locator('#session-content').inner_html() == pristine, 'archive preview preserves fresh lesson')
            page.locator('#restore-trace-cancel').press('Enter')
            require(page.locator('#session-content').inner_html() == pristine, 'archive cancellation preserves fresh lesson')
            restore_preview(page, paused_path)
            page.locator('#restore-trace-confirm').press('Enter')
            page.locator('#first-try-summary').wait_for(state='visible')
            require('8 of 12' in page.locator('#first-try-summary').inner_text(), 'modular restore keeps original result')
            require('1 of 4' in page.locator('#practice-status').inner_text(), 'modular restore keeps paused practice')
            _, restored = trace_download(page, 'modular-restored-paused-trace.json')
            require(semantic_trace(restored) == semantic_trace(paused), 'actual cross-surface re-export is identical except save time')

            page.locator('#practice-button').press('Enter')
            practice_ids = [first_retry['id']]
            for remaining in range(3):
                item = current_question(page)
                require(item['id'] not in practice_ids, 'practice resumes at the next unanswered item')
                require(next(a for a in first_answers if a['item'] == item['id'])['choice'] != item['answer'],
                        'practice selects an original missed item')
                choose_visible(page, item, item['answer'], practice=True)
                practice_ids.append(item['id'])
                page.locator('#practice-next').press('Enter')
            page.locator('#first-try-summary').wait_for(state='visible')
            require('4 of 4' in page.locator('#practice-status').inner_text(), 'all four separate practice answers complete')
            _, complete_notes = download(page, '#save-notes-button', 'modular-completed-notes.txt')
            assert_notes(complete_notes.decode(), first_answers, practice_ids)
            completed_path, completed = trace_download(page, 'modular-completed-trace.json')
            assert_trace(completed, first_answers)
            require(completed['mastery'] == first_trace['mastery'] and
                    completed['firstAnswers'] == first_trace['firstAnswers'], 'completed practice never rewrites first trace')
            require(len(completed['practice']['answers']) == 4, 'all four practice answers exported')
            page.set_viewport_size({'width': 390, 'height': 844})
            require(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'narrow viewport has no horizontal overflow')
            screenshot(page, 'modular-enzyme-review-mobile.png')
            milestone('modular_cross_surface_restore_practice_and_actual_exports', canonical_and_mastery_identical=True, practice_completed=4)

            page.close()
            page = make_page((SOURCE / 'demo.html').as_uri())
            open_trace_controls(page)
            page.locator('#trace-file').set_input_files(str(completed_path))
            page.wait_for_function("document.querySelector('#trace-restore-status').textContent.includes('different course')")
            require(page.locator('#trace-preview').is_hidden() and page.locator('#step-count').inner_text() == '0 / 6',
                    'enzyme trace is refused against the bundled course without changing it')
            import_preview(page)
            start_import(page)
            restore_preview(page, completed_path)
            page.locator('#restore-trace-confirm').press('Enter')
            page.locator('#first-try-summary').wait_for(state='visible')
            _, roundtrip = trace_download(page, 'standalone-roundtrip-trace.json')
            require(semantic_trace(roundtrip) == semantic_trace(completed), 'completed trace round trip preserves every semantic field')
            milestone('fresh_standalone_course_identity_refusal_and_completed_round_trip', exact_semantic_round_trip=True)
            require(not errors, 'no browser JavaScript exceptions')
            require(not external, 'no external or non-GET requests')
            context.close()
    guard_source()
    REPORT.update(status='passed', first_answers=first_answers, original_correct=8,
                  original_missed=4, practice_completed=4, browser_errors=errors,
                  external_requests=external, page_request_count=len(requests),
                  source_unchanged=True, elapsed_seconds=time.monotonic()-started)
except Exception as error:
    REPORT.update(status='failed', error_type=type(error).__name__, error=str(error),
                  traceback=traceback.format_exc(), browser_errors=errors,
                  external_requests=external, elapsed_seconds=time.monotonic()-started)
    if page is not None:
        try:
            page.screenshot(path=str(OUT / 'receiving-failure.png'), full_page=True)
        except Exception:
            pass
    raise
finally:
    server.shutdown()
    server.server_close()
    REPORT['finished_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (OUT / 'browser-receiving.json').write_text(json.dumps(REPORT, indent=2, sort_keys=True) + '\n')
    print(json.dumps({'status': REPORT.get('status'), 'milestones': len(REPORT['milestones']),
                      'downloads': len(REPORT['downloads']), 'elapsed_seconds': REPORT.get('elapsed_seconds')}), flush=True)
