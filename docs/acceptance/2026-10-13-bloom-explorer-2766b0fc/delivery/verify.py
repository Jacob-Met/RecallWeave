#!/usr/bin/env python3
"""Read-only custody and recorded-evidence check. No browser/model rerun."""
import hashlib
import json
import pathlib
import sys
import stat
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent
ARCHIVE = None

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def read(name):
    p = pathlib.PurePosixPath(name)
    require(not p.is_absolute() and '..' not in p.parts and '\\' not in name, 'unsafe path')
    if ARCHIVE is not None:
        info = ARCHIVE.getinfo(name)
        require(not stat.S_ISLNK(info.external_attr >> 16), 'linked member')
        return ARCHIVE.read(name)
    q = ROOT.joinpath(*p.parts)
    require(q.is_file() and not q.is_symlink(), 'missing/linked file: ' + name)
    return q.read_bytes()

def obj(name):
    return json.loads(read(name))

def main():
    manifest = obj('MANIFEST.json')
    rows = manifest['files']
    require(len({r['path'] for r in rows}) == len(rows), 'duplicate payload')
    if ARCHIVE is not None:
        names = ARCHIVE.namelist()
        require(len(names) == len(set(names)) and ARCHIVE.testzip() is None, 'duplicate/CRC failure')
        actual = set(names)
    else:
        actual = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
    require(actual == {r['path'] for r in rows} | {'MANIFEST.json'}, 'inventory differs')
    for r in rows:
        b = read(r['path'])
        require(len(b) == r['bytes'] and hashlib.sha256(b).hexdigest() == r['sha256'], 'payload differs: ' + r['path'])
    pins = obj('SOURCE-PINS.json')
    for r in pins['files']:
        b = read(r['path'])
        require(hashlib.sha1(b'blob ' + str(len(b)).encode() + b'\0' + b).hexdigest() == r['gitBlob'], 'Git blob differs: ' + r['path'])
        require(r['commit'] in pins['publishedCommits'], 'unpublished source pin')
    browser = obj('native/browser-results/result.json')
    require(browser['status'] == 'passed' and browser['fatal'] is None, 'browser result')
    require(len(browser['groups']) == 9 and all(g['status'] == 'passed' for g in browser['groups']), 'nine browser groups')
    require(not browser['pageErrors'] and len(browser['requests']) == 6 and all(u.startswith('file:') for u in browser['requests']), 'page/request evidence')
    require(browser['sourceBodiesUnchanged'] and browser['inputs'] == browser['inputReadback'], 'native input readback')
    downloads = browser['downloads']
    require(len(downloads) == 2, 'download count')
    for r in downloads + browser['screenshots']:
        b = read('native/' + r['path'])
        require(len(b) == r['bytes'] and hashlib.sha256(b).hexdigest() == r['sha256'], 'actual native payload: ' + r['path'])
    require(read('native/' + downloads[0]['path']) == read('native/' + downloads[1]['path']), 'desktop/mobile deck differs')
    require(downloads[0]['sha256'] == '7608b88e2a0aa6382dc3cb47c112c667b19d30b9c3b56c4db51cdc867f20b19d', 'frozen lesson differs')
    runner = browser['runner']
    require(hashlib.sha256(read('native/' + runner['path'])).hexdigest() == runner['sha256'], 'receiver differs')
    html = read('Bloom-filter-explorer.html')
    require(len(html) == 47835 and hashlib.sha256(html).hexdigest() == '8d19faa8de423c2ee9dd86dead135cd00c3abae455ace55f6b764ddfed061c58', 'qualified HTML differs')
    html_input = next(r for r in browser['inputs'] if r['path'] == 'source/courses/bloom-filters-explorer.html')
    require(html_input['sha256'] == hashlib.sha256(html).hexdigest(), 'browser HTML binding')
    build = obj('native/build-result.json')
    require(build['status'] == 'passed' and build['fatal'] is None and len(build['commands']) == 4, 'native build evidence')
    require(all(c['status'] == 0 and not c['stderr'] and c['error'] is None for c in build['commands']), 'build command failure')
    require(build['verifiedBaselineBefore'] == 138 and build['verifiedBaselineAfter'] == 138, 'baseline readback')
    require(hashlib.sha256(read('source/explore.html')).hexdigest() == build['output']['sha256'], 'native generated directory')
    receipt = obj('native/NATIVE-RECEIPT.json')
    require(receipt['results']['browserGroups'] == 9 and receipt['visualReview']['outcome'] == 'passed', 'native receipt')
    print(json.dumps({'ok': True, 'payloads': len(rows), 'publishedGitBlobs': len(pins['files']), 'recordedBrowserGroups': 9, 'actualDownloads': 2, 'actualScreenshots': 2, 'newBrowserOrModelRun': False}, sort_keys=True))

if __name__ == '__main__':
    try:
        if len(sys.argv) == 3 and sys.argv[1] == '--archive':
            with zipfile.ZipFile(sys.argv[2]) as archive:
                ARCHIVE = archive
                main()
        else:
            require(len(sys.argv) == 1, 'use verify.py [--archive FILE.zip]')
            main()
    except Exception as exc:
        print('FAIL: ' + str(exc), file=sys.stderr)
        sys.exit(1)
