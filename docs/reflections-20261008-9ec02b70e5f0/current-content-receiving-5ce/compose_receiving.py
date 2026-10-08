"""Compose the frozen reflection source with the fixed 5ce content correction."""
from pathlib import Path
import difflib
import hashlib
import json
import os
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
DONOR = Path('/dev/shm/estate-9ec02b70e5f0/optimizer/reflection-current-publication')
BEFORE = Path('/dev/shm/estate-9ec02b70e5f0/optimizer/reflection-current-main/before')
MANIFEST = Path('/dev/shm/estate-9ec02b70e5f0/optimizer/reflection-current-manifest.json')


def identity(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'git_blob': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}


def require(condition, detail):
    if not condition:
        raise RuntimeError(detail)


manifest_raw = MANIFEST.read_bytes()
require(identity(manifest_raw)['sha256'] == 'fb9010bf62e000eb6c0300744908078ca7ff2c3e4476caf4ea37b76fe84c788a', 'frozen manifest drift')
manifest = json.loads(manifest_raw)
sources = [x for x in manifest['files'] if not x['path'].startswith('docs/')]
context = manifest['unchanged_receiving_context_not_in_allowlist']
require(len(sources) == 9 and len(context) == 29, 'source scope changed')
root = HERE / 'repo'
require(not root.exists(), 'private receiving root must be new')
size = sum(x['bytes'] for x in [*sources, *context])
free = os.statvfs(HERE)
require(free.f_bavail * free.f_frsize > size + 300_000, 'insufficient bounded scratch headroom')
root.mkdir()
donor_before = {}
for record in [*sources, *context]:
    path = record['path']
    raw = (DONOR / path).read_bytes()
    pin = identity(raw)
    require(all(pin[k] == record[k] for k in pin), 'donor drift: ' + path)
    donor_before[path] = pin
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    # Real private files keep Python __file__.resolve and Node import URLs in
    # this receiving root; generators or bundle tests cannot write a peer root.
    target.write_bytes(raw)

substitutions = {}
for path in ['README.md', 'src/app.mjs']:
    before = (BEFORE / path).read_text()
    incoming = (HERE / 'published' / path).read_text()
    candidate_before = (DONOR / path).read_text()
    if path == 'src/app.mjs':
        old = 'Original question wording adapted from OpenStax, <cite>Biology 2e</cite>, Chapters 7–8, Rice University, CC BY 4.0. ${deck.attribution}'
        new = '${deck.attribution}'
        changes = [(old, new)]
    else:
        old_lines, new_lines = before.splitlines(True), incoming.splitlines(True)
        changes = []
        for tag, a, b, c, d in difflib.SequenceMatcher(None, old_lines, new_lines).get_opcodes():
            if tag != 'equal':
                require(tag == 'replace', 'unexpected upstream README edit shape')
                changes.append((''.join(old_lines[a:b]), ''.join(new_lines[c:d])))
        require(len(changes) == 2, 'unexpected upstream README correction count')
    replay = before
    composed = candidate_before
    locations = []
    for old, new in changes:
        require(replay.count(old) == 1 and composed.count(old) == 1, 'ambiguous incoming change: ' + path)
        replay = replay.replace(old, new, 1)
        locations.append(composed.index(old))
        composed = composed.replace(old, new, 1)
    require(replay == incoming, 'upstream has an unhandled change: ' + path)
    reverse = composed
    for (old, new), start in reversed(list(zip(changes, locations))):
        # Context locates the unique replacement when the short attribution
        # expression is also present elsewhere in the app.
        require(reverse[start:start + len(new)] == new, 'inverse correction mismatch')
        reverse = reverse[:start] + old + reverse[start + len(new):]
    require(reverse == candidate_before, 'frozen reflection delta not preserved')
    (root / path).write_text(composed)
    substitutions[path] = {'replacements': len(changes), 'upstream_change_fully_accounted': True,
                           'inverse_restores_exact_frozen_candidate': True,
                           'before': identity(candidate_before.encode()), 'after': identity(composed.encode())}

(root / 'data/deck.json').write_bytes((HERE / 'published/data/deck.json').read_bytes())
command = [sys.executable, '-B', str(root / 'tools/make_demo.py')]
process = subprocess.run(command, cwd=root, capture_output=True, text=True,
                         env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
(HERE / 'demo-build.log').write_text(process.stdout + process.stderr)
require(process.returncode == 0, 'native demo build failed')
after = {x['path']: identity((root / x['path']).read_bytes()) for x in [*sources, *context]}
for path, pin in donor_before.items():
    require(identity((DONOR / path).read_bytes()) == pin, 'peer donor changed during composition')
changed = [path for path in after if after[path] != donor_before[path]]
require(set(changed) == {'README.md', 'src/app.mjs', 'data/deck.json', 'demo.html'}, 'unexpected receiving changes')
patches = []
for path in ['README.md', 'src/app.mjs', 'demo.html']:
    patches.extend(difflib.unified_diff((DONOR / path).read_text().splitlines(True),
                   (root / path).read_text().splitlines(True),
                   fromfile='frozen-4775/' + path, tofile='receiving-5ce/' + path))
(HERE / 'receiving.patch').write_text(''.join(patches))
receipt = {'schema': 'reflection-current-content-composition.v1',
           'parent': '5ce520a778da04605f5fa610fb1ad110ffe52b99',
           'tree': '3da3cc7da0005c9e703548057a2e60642f144f37',
           'frozen_parent': manifest['base_commit'], 'frozen_manifest_sha256': identity(manifest_raw)['sha256'],
           'private_native_files': len(after), 'private_native_bytes': sum(x['bytes'] for x in after.values()),
           'substitutions': substitutions, 'changed_from_frozen_receiving': changed,
           'published_source_replacements': ['README.md', 'src/app.mjs', 'demo.html'],
           'current_deck_preserved_without_publication_edit': True,
           'builder': {'command': command, 'returncode': process.returncode,
                       'source_sha256': after['tools/make_demo.py']['sha256']},
           'before': donor_before, 'after': after,
           'peer_donors_unchanged': True,
           'local_setup_errors': ['Old tree receipt stores entry list in entries, not tree; reader corrected before source composition.',
                                  'GitHub base64 transport has line wrapping; whitespace removed before strict decode and exact Git-blob verification.',
                                  'Initial inverse check used pre-edit offsets for two README changes; it rejected before candidate writes. Recording positions immediately before each replacement fixes the local check.']}
(HERE / 'composition.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
print(json.dumps({'changed': changed, 'source_replacements': receipt['published_source_replacements'],
                  'private_files': len(after), 'private_bytes': receipt['private_native_bytes'],
                  'pins': {path: after[path] for path in changed}}, indent=2))
