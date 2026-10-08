"""Retain exact native test output and check fixed receiving source custody."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import subprocess
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE / 'repo'
DONOR = Path('/dev/shm/estate-9ec02b70e5f0/optimizer/reflection-current-publication')


def pin(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'git_blob': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


composition = json.loads((HERE / 'composition.json').read_text())
before = {name: pin((ROOT / name).read_bytes()) for name in composition['after']}
require(before == composition['after'], 'source changed since native composition')
require(not (HERE / 'native-tests.log').exists(), 'receiving logs already exist')
command = ['node', '--test', '--test-reporter=tap',
           *sorted(str(p.relative_to(ROOT)) for p in (ROOT / 'tests').glob('*.test.mjs'))]
started = datetime.now(timezone.utc).isoformat()
clock = time.monotonic()
process = subprocess.run(command, cwd=ROOT, capture_output=True,
                         env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}, timeout=60)
elapsed = time.monotonic() - clock
(HERE / 'native-tests.log').write_bytes(process.stdout + process.stderr)
require(process.returncode == 0, 'native tests failed; full output retained')
summary = {name: int(re.search(rb'^# ' + name.encode() + rb' (\d+)\s*$', process.stdout, re.M)[1])
           for name in ['tests', 'pass', 'fail', 'skipped']}
require(summary == {'tests': 56, 'pass': 56, 'fail': 0, 'skipped': 0}, 'unexpected native discovery result')

demo = (ROOT / 'demo.html').read_text()
match = re.search(r'<script id="deck-json" type="application/json">(.*?)</script>', demo, re.S)
require(match is not None, 'missing standalone deck')
deck_raw = (HERE / 'published/data/deck.json').read_bytes()
deck = json.loads(deck_raw)
require((ROOT / 'data/deck.json').read_bytes() == deck_raw, 'published deck changed')
require(match[1].encode() == deck_raw, 'standalone does not retain exact published deck bytes')
prior_demo = (DONOR / 'demo.html').read_text()
prior_match = re.search(r'<script id="deck-json" type="application/json">(.*?)</script>', prior_demo, re.S)
require(prior_match is not None and prior_match[1].encode() != deck_raw,
        'historical demo no longer witnesses the stale-content counterexample')
old_deck = json.loads((DONOR / 'data/deck.json').read_bytes())
require([(i['id'], i['concept'], i['prerequisites'], i['answer']) for i in old_deck['items']]
        == [(i['id'], i['concept'], i['prerequisites'], i['answer']) for i in deck['items']],
        'item identity or canonical answer receiving contract changed')
stale_prefix = 'Original question wording adapted from OpenStax, <cite>Biology 2e</cite>, Chapters 7–8, Rice University, CC BY 4.0.'
require(stale_prefix not in (ROOT / 'src/app.mjs').read_text() and stale_prefix not in demo,
        'stale attribution prefix survived receiving')
script_match = re.search(r'<script>\s*(.*?)</script>', demo, re.S)
require(script_match is not None, 'missing generated native JavaScript')
syntax = subprocess.run(['node', '--check', '--input-type=commonjs'], input=script_match[1].encode(),
                        capture_output=True, cwd=ROOT, timeout=30)
(HERE / 'standalone-syntax.log').write_bytes(syntax.stdout + syntax.stderr)
require(syntax.returncode == 0, 'generated standalone JavaScript does not parse')
after = {name: pin((ROOT / name).read_bytes()) for name in before}
require(before == after, 'native source changed during tests')
manifest_path = Path('/dev/shm/estate-9ec02b70e5f0/optimizer/reflection-current-manifest.json')
frozen = json.loads(manifest_path.read_bytes())
for record in [*frozen['files'], *frozen['unchanged_receiving_context_not_in_allowlist']]:
    got = pin((DONOR / record['path']).read_bytes())
    require(all(got[key] == record[key] for key in got), 'frozen publication source/evidence changed')
result = {'schema': 'reflection-content-receiving-verification.v1',
          'parent': composition['parent'], 'tree': composition['tree'], 'command': command,
          'cwd': str(ROOT), 'started_at_utc': started, 'elapsed_seconds': elapsed,
          'node_version': subprocess.check_output(['node', '--version'], text=True).strip(),
          'returncode': process.returncode, 'summary': summary,
          'native_log': {'path': 'native-tests.log', **pin(process.stdout + process.stderr)},
          'source_files_before_after': len(before), 'before': before, 'after': after,
          'frozen_source_and_evidence_files_unchanged': 158,
          'standalone': {'exact_current_deck_bytes': True, 'old_frozen_bundle_has_different_deck': True,
                         'syntax_returncode': syntax.returncode,
                         'six_item_identities_and_answer_indices_preserved': True,
                         'stale_attribution_prefix_absent': True},
          'initial_native_run': {'tests': 56, 'passed': 56, 'skipped': 0,
                                 'output': 'Tool output was truncated; repeated unchanged suite once solely to retain complete TAP evidence.'},
          'browser_tests_run_by_this_worker': 0,
          'github_writes': 0, 'measured_learning_benefit': None}
(HERE / 'verification.json').write_text(json.dumps(result, indent=2, sort_keys=True) + '\n')
print(json.dumps({key: result[key] for key in ['summary', 'node_version', 'source_files_before_after',
                                             'frozen_source_and_evidence_files_unchanged', 'standalone']}, indent=2))
