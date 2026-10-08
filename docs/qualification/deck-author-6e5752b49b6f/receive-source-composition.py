"""Verify preserved main blobs and the exact post-browser prose-only delta."""
import hashlib
import json
from pathlib import Path
import tarfile

PACKET = Path(__file__).resolve().parent
ROOT = PACKET.parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


source = json.loads((PACKET / 'source-manifest.json').read_text())
for name, expected in source['files'].items():
    assert sha((ROOT / name).read_bytes()) == expected, name

leaves = [row for row in json.loads((PACKET / 'current-main-tree.json').read_text())['tree'] if row['type'] == 'blob']
preserved = []
for row in leaves:
    if row['path'] == 'README.md':
        continue
    data = (ROOT / row['path']).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    assert actual == row['sha'], row['path']
    preserved.append(row['path'])

archive_path = PACKET / 'loader-receiving.tar.gz'
assert sha(archive_path.read_bytes()) == '0b4aca067f262e3a455f83714d42031c424bfdbea5f74cc2f590c84c8cc8e5e6'
runtime = ['src/deck.mjs', 'src/deck-author.mjs', 'src/deck-author-ui.mjs',
           'src/deck-author-loader.mjs', 'author/author.css', 'tools/make_author.py']
replacements = [
    ('Write questions, connect concepts, and give each answer an explanation. Save a deck you can open in RecallWeave.',
     'Write questions, connect concepts, and give each answer an explanation. Save a reusable local deck.'),
    ("Save the JSON file, then choose it in RecallWeave's deck importer to start a lesson. Opening the learning app keeps this editor open.",
     'Download the JSON file to save or share your lesson. Reopen it here whenever you want to edit it. Opening the learning demo keeps this editor open.')]
status_replacement = (
    'Deck download started. Keep the JSON file to reopen it here or use it in the learning app.',
    'Deck download started. Keep the JSON file to share or reopen it here.')
with tarfile.open(archive_path) as archive:
    for name in runtime:
        old = archive.extractfile(name).read()
        if name == 'src/deck-author-ui.mjs':
            assert old.count(status_replacement[0].encode()) == 1
            old = old.replace(*(value.encode() for value in status_replacement))
        assert old == (ROOT / name).read_bytes(), name
    for name in ('author/index.html', 'author.html'):
        old = archive.extractfile(name).read().decode('utf-8')
        for before, after in replacements:
            assert old.count(before) == 1
            old = old.replace(before, after)
        if name == 'author.html':
            assert old.count(status_replacement[0]) == 1
            old = old.replace(*status_replacement)
        assert old == (ROOT / name).read_text(), name

download_receipt = PACKET / 'download-status/receiving.json'
download = json.loads(download_receipt.read_text())
assert download['passed'] and download['status_text'] == status_replacement[1]
for name, expected in download['source_sha256'].items():
    assert sha((ROOT / name).read_bytes()) == expected, name
assert (PACKET / 'download-status/actual-download.json').read_bytes() == (PACKET / 'author-browser/authored-final.json').read_bytes()

report = {'status': 'passed', 'receiver_sha256': sha(Path(__file__).read_bytes()),
          'source_commit': source['source_commit'], 'source_tree': source['source_tree'],
          'current_main': source['current_main'], 'main_leaf_count': len(leaves),
          'main_leaves_unchanged': len(preserved), 'only_modified_main_path': 'README.md',
          'five_browser_received_program_style_and_builder_sources_identical': [name for name in runtime if name != 'src/deck-author-ui.mjs'],
          'ui_module_delta': {'before': status_replacement[0], 'after': status_replacement[1], 'scope': 'Exactly one success-status string; no control flow or other source change.'},
          'template_and_generated_html_delta': 'Exactly two static instructional text replacements, plus the one status-string replacement in the generated script; no DOM or style change.',
          'actual_download_status_receipt_sha256': sha(download_receipt.read_bytes()),
          'source_file_sha256': source['files'],
          'limits': ['The complete browser suites ran before these three prose replacements. A focused actual-download/status check and parity ran after the final status change.',
                     'The importer contract run uses its archived owner snapshot, not the current-main learner app.']}
(PACKET / 'source-composition-receiving.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'main_leaves_unchanged': len(preserved),
                  'runtime_sources_unchanged': len(runtime) - 1, 'prose_replacements': len(replacements) + 1,
                  'report_sha256': sha((PACKET / 'source-composition-receiving.json').read_bytes())}))
