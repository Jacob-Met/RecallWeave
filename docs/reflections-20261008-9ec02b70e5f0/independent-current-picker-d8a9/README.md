# Independent course-picker and reflection receiving

**Passed: eleven native browser checkpoints, fifteen actual study-note files,
four actual answer-trace files, and zero page exceptions.** The bounded run took
8.592 seconds and exited 0. It used the frozen application at parent
`d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74` and changed no product source.

## What this qualifies

The six earlier trace/notebook scenarios ran again with every assertion and
helper unchanged. Five added scenarios then used the real course picker in
the standalone target, with a live modular source tab as an isolation control.
The fixture is a valid three-question course with distinct concepts and
wording, 2/5/3 answer options, nonzero canonical answers and three IDs reused
from the bundled lesson. The receiver finds native answer buttons by their
actual text; it does not infer correctness from shuffled display letters.

| Boundary | Observed result |
| --- | --- |
| Malformed course and canceled preview | First answers and exact exported notes stay intact, including writing entered after preview. |
| Explicit imported Start | Answers, practice and all notebook fields start fresh despite reused IDs; a pending bundled trace is invalidated and the old course trace is refused. |
| Imported review and practice | Notes bind to the imported prompts and canonical choices. A separate retry preserves original first answers, model estimates and writing. |
| Imported Apply-it prompt | The rendered field and actual notes use the landed generic connection prompt. The bundled energy prompt and attribution do not leak into imported notes. |
| Canceled bundled return | Imported answers, practice and actual exported notes remain unchanged. |
| Fresh session on imported course | The selected course stays loaded; prior answers, practice and notes clear. |
| Restore imported answers after fresh writing | The actual saved trace restores original canonical answers, practice and full-precision estimates while retaining only the newly written destination reflections. |
| Explicit bundled Start | Reused-ID notes clear again and the bundled Apply-it prompt returns. |

The six preserved controls also verify real modular trace export, preview and
cancel, confirmation after destination writing edits, same-ID wrong-course
refusal, next-unanswered practice resumption, fresh reset and other-tab
isolation. Neither trace file includes notebook text. Selected course/trace
files and the live modular source stay unchanged. The standalone target has
HTTP(S) blocked for the complete sequence.

## Exact identity

- Receiver: `e0db2e464d63fbdfe70a182082af2ebcfaafd62759f6393444831a851c01ea15`.
- Fifteen-file pin map: `da4178efd28850f1b1f003f086ce3e74b467f9aa968047e1ad8da65f126bc62a`.
- Application: `efd8f069c9ad085bcf42012366bf2f341cff4bf875f7394485caaf4b02db325e`.
- Rebuilt demo: `172a0415c717e938fce0fa9e7b94cc1acd502e07f7a193f6b76ff97fbb7e2200`.

All fifteen source files match before and after the browser run. A separate
source comparison checks nine exact landed Git blobs, eleven unchanged app
functions, the unchanged trace restore callback and the single notebook
initialization added to native reset. `source-preservation.json` records
that source-only check; it is not a substitute for the browser result.

Removing the two insertion fragments from the current receiver restores every
byte of prior receiver `8ef5554e125ea85a31dcee1c596cc19354c50b2d98d113b0ed417e5ec131bfa2`.
`receiver-provenance.json`, the two `.part` files and the preservation verifier
make this independently reproducible. The original review plan is historical
preparation, not the final status.

## Read the retained evidence

`review.json`, `browser.log`, `browser-execution.json` and
`native-action-summary.json` are readable without extraction. The full raw
packet contains 46 files and 490,458 bytes: every actual download, named saved
notes/trace, input fixture, native action acknowledgement, before/after source
pin, browser report, allocation condition and execution receipt. It is stored
losslessly as `browser-evidence.tar.gz.base64` with an exact size/hash index.
The 46,709-byte encoded capsule has SHA256
`7645c49ba7b8a4cd68aadec42b813a4708928b8c078f3742d656becd454b0527`.

Run the following from this packet directory:

```bash
python3 -B unpack_browser_evidence.py
python3 -B unpack_browser_evidence.py --cat receiving/picker-imported-restored-after-reset.txt
python3 -B unpack_browser_evidence.py --output /a/new/writable/receipt-directory
```

The first command verifies every member without extracting. `--cat` prints one
verified raw file. Extraction requires a new directory and refuses traversal
or unexpected members. To repeat the browser receiver in an environment with
room for a disposable profile, provide the frozen checkout and a new output:

```bash
TMPDIR=/your/owned/writable/tmp node verify_course_notebook_receiving.mjs --root /your/frozen/checkout --pins source-pins.json --browser /path/to/chromium --output /your/new/receiving-directory
python3 -B verify_source_preservation.py --root /your/frozen/checkout --pins source-pins.json --output /your/new/source-preservation.json
```

## Actual allocation constraints and their disposition

The shared overlay and `/dev/shm` repeatedly had no free space. The first draft
write failed and left a zero-byte unfrozen file. A separate `/dev` tmpfs had
capacity, but its ordinary files exist only within one `exec_command` call.
An initial split-call wrapper therefore failed while saving its child log;
that child stdout is unavailable and no product qualification is claimed for
that attempt. The receiver creates its output directory before starting any
browser. These facts and the exact wrapper traceback are retained separately.

The successful execution created, ran, closed and archived the private `/dev`
scratch within one call. It first allocated real 256 KiB and 64 KiB shared
extents for the capsule and index. It overwrote those extents before truncating
them, verified every archive member against its original raw bytes, and only
then let the temporary namespace end. All 427 native input/file actions were
acknowledged. The receiver removed its own browser profile. No mount, device
node, memory limit, peer state, source or assertion was changed.

Later attempts to copy readable metadata and create the unpacker hit ENOSPC.
The complete verified capsule remained unchanged. Content-verified hard links
replaced only this worker's own immutable duplicates; every original path and
hash was rechecked. Final metadata used preallocated ordinary files.
`owned-duplicate-custody.json` and `packaging-allocation-failures.log` retain
those details. None of these preparation or packaging failures is relabeled
as a passing browser attempt.

## Limits

This is bounded receiving evidence for the actual local course and notebook
coupling. The five added controls run in the standalone target; the modular
source supplies the unchanged trace and isolation control. They do not repeat
the course owner's complete read-race, deck-size or authoring suite. No hosted
application, provider, learning efficacy or content-quality claim follows.
The earlier 4775 transport-blocked packet and successful 5ce packet remain
separately frozen with their original source identities and results.
