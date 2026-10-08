# Deck Studio UTF-8 admission

A malformed UTF-8 draft or deck is now refused before an incoming preview can be accepted. The editor keeps its current writing and checked deck. Previously, File.text() silently substituted U+FFFD for damaged bytes, allowing those substituted characters to become authored content after Replace draft and Save draft.

The loader reads bytes, preserves the 2 MiB file/read bound, and decodes UTF-8 with fatal errors before the existing JSON and draft/deck validators. This is not a ban on U+FFFD: a valid, deliberately authored replacement character remains valid text. One leading UTF-8 BOM is handled as before; embedded BOM characters remain literal and a second leading BOM remains invalid JSON.

The public loader API, file names, immutable parsing, explicit Replace/Keep flow, 256 KiB lesson-deck bound, genuine read-error message and newest-read fencing are unchanged. No learner, draft-format, editor, CSV importer or workflow source changed.

## Exact qualification

Base: 698902f9c9c1d5c5023092b85b3632a7cb7a01ed, tree d6d3707b691850af7928299242631534cff89aa8.

Candidate source pins:

- src/deck-author-loader.mjs: SHA-256 509c001816a818f06789e36e1c4ddcdc80c12f0e651b9df79e6172560d1d3933.
- author.html: SHA-256 fd7347feee31697a74e9a7a7a43bc2e5686165a37e39432882c74198a73b523a.
- tests/deck-author-loader.test.mjs: SHA-256 044a6fe365fda9dbe97d5eed2f9534946243c0e76485e320785179e09a74945a.

Of 2,915 baseline tracked files, only those three differ. The other 2,912 files are byte-identical. This guide is the only new source path. The generated HTML differs only in its bundled loader body. Existing loader assertions are preserved; six delayed/failed-read mocks now return bytes.

Author qualification used native Windows Node 24.21.0:

- Baseline author suite: 35/35 passed.
- Candidate author suite: 40/40 passed, including 20 malformed byte/format combinations, valid literal Unicode with and without a BOM, double-BOM refusal, exact 2 MiB admission, pre/post-read overflow and stale malformed reads.
- tools/make_author.py --check passed through Python 3.11.
- git diff --check passed.

The normal complete Node test command was also run unchanged. On this Windows environment the candidate had 683 passes and 57 failures out of 740 tests; the exact unchanged baseline had 678 passes and the same 57 failures out of 735. The failure-name multiset is identical. The original logs preserve missing python3 subprocesses and native German/Swedish locale assumptions. No test was skipped and no global or child environment workaround was used. This is not a complete-suite or hosted-CI pass.

## Independent browser receiving

Root froze the expected behavior before candidate exposure. The separate la7_runtime receiver sealed its raw corpus from baseline-only source and used actual Chrome 154.0.8037.98 on Windows. It recorded all eight malformed baseline admissions before receiving the frozen candidate.

The candidate passed 17/17 contract groups with 47 real saved draft/checked-deck downloads, no page errors and only the private file entry request. Receiving covered full writer/checked-state preservation on malformed admission, valid literal replacement characters, accents, astral and decomposed text, literal markup and CRLF, BOM handling, both file formats, size boundaries, read rejection and newer valid/invalid selection fencing. Source pins remained exact. The acceptance screenshot presents literal Unicode and markup as editable writing.

Independent behavioral receipt SHA-256: 7f65904b7fcf5d9c95bc15a4152a5dbee74dea4e7ef93a22abf847342c698b36. Receiver attribution and the original download-event harness interruption are retained separately; that interruption is not counted as a product failure.

Native author evidence is retained at:
C:\Users\minec\hamon\stage\recallweave-author-utf8-7c2609b6545f

Independent evidence is retained at:
C:\Users\minec\hamon\stage\recallweave-author-utf8-independent-root-7c2609b6545f

The HAMON LA7 source-evidence journal holds the scope and sealed custody:
https://app.notion.com/p/3f3aedcdf4a581518f79d34897ddac64

## Reproduction and integration boundary

Run the existing author tests with Node 20 or later, then verify the generated page:

    node --test tests/deck-author*.test.mjs
    python3 tools/make_author.py --check

On this Windows receiver, Python was invoked as py -3.11 and test file paths were passed explicitly. Build author.html using the existing builder when composing source changes; do not hand-edit the generated module. The native source packet carries exact before/after bytes and a patch against the named base.

No GitHub source/ref/PR/merge operation, Actions execution, live service, shared worktree, installed application or user data was changed. Current-main composition and publication remain separate guarded owner actions.
