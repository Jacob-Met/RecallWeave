# Reflection receiving on current main, including trace restore

This successor receives the notebook into RecallWeave main
`4775af91ba6a5d4df787669f39b44364dd1e37ba`, tree
`fb9d1abd96fdbee9a05a88776b204a9f02ed612f`. The single main refresh was at
2026-10-08 11:27:39 UTC. Its recursive tree was complete: 199 blobs, including
35 native source, build, test and metadata files.

Main includes the exact PR #12 answer-order source, the completed-trace feature,
and the separate offline course author. Six relevant paths had changed since
the qualified PR #12 source: README, app, standalone demo, styles, builder and
index. Thirteen other context files were unchanged, and the three new reflection
paths were still absent. This required a real receiving composition; the earlier
browser results are retained under their original source pins.

## Product behavior and ownership

The completed review and Apply-it fields retain their existing notebook behavior:
canonical question identity, editable unscored writing, practice pause/resume,
actual study-notes export, and clearing on a fresh local session.

The landed trace owner's preview explicitly says that restoring replaces answers
and practice progress while any reflections already in this tab stay as they are.
This successor preserves that policy. A confirmed restore retains the current
notebook; it does not import the other tab's writing. Canceling, invalid files and
different-course files preserve the current answers and notes. Editing a note
while a valid preview is open keeps the latest writing through confirmation.
Starting a fresh session still clears the notebook.

The complete existing `mountTraceArchive` call and restore callback remain exact
main bytes. Both trace modules, both answer/practice handlers and the knowledge
and review modules remain unchanged. All 29 native files outside the nine owned
reflection paths retain the exact main bytes, including the separate author and
its generated page. The imported lesson flow remains with issue #7; this change
does not add its admission or course switching behavior.

Three shared merge conflicts were resolved narrowly: keep both imports, embed
both trace and reflection modules in the native demo builder, and retain both
browser-receiver sections in README. The exporter remains the previously
qualified reflection source. `composition.patch` and `ownership-and-pins.json`
record the exact delta and preservation checks.

| Composed product | SHA-256 |
| --- | --- |
| `src/app.mjs` | `c5c1ef9ac80bdd040a4b18bdf48092a2ed42ea4495674f60efd076fc409eed4c` |
| `src/reflections.mjs` | `92354bccb48deb7c3455d4f9d0e922f7b8b5d45d3d7bbf1968d23ad2818fe330` |
| `src/session-export.mjs` | `1f266a8503a23b52809417fba251225d1805e4d214b61e40dcdfbfca4bb35c13` |
| `tools/make_demo.py` | `5680f0c043e7967067c4d7cbb7f4e8549217d5bdfe33c11fb62a6618a2826f92` |
| `styles.css` | `f65f4c5eac0d0d7f053802ca9bc789d263ad71910d3d9fd09f7e9d6798dbe0e5` |
| `demo.html` | `0011c8af51845f355e5ae8db867886a8c85c598edf4ede6af89b6b64d0ae36be` |

## Affected receiving results

The targeted native selection passes **23 tests, zero skips**: reflection,
actual exporter, answer-order and trace archive tests. The native builder exits
zero, and its generated file is the file exercised by the standalone receiver.
The unrelated authoring suite and the complete current suite were not repeated.

The new authored browser receiver passes **five checkpoints**, retaining **four
actual notes files and two actual trace files**. It checks different native first
answers and paused practice, explicit preview/cancel, rejection of different
course content with the same IDs, late notebook edits before confirmation,
correctly restored answer and practice data, next-unanswered resumption, a real
reset, and the standalone flow with HTTP(S) blocked. Thirteen exact runtime pins
match before and after. There are no browser page exceptions.

The same receiver on current main completes the first lesson and fails at the
missing six reflection identities. It records zero completed composition
checkpoints and zero downloads; all twelve baseline runtime pins remain stable.
That failure is retained separately under `browser-before/`.

The browser command transport, field editing and paragraph assertions are reused
from the independently qualified receiver at
`713d25aac706d00fe6b45e47877ead9f85ee49a696898c0d34615b22f05c34bc`.
The five trace/notebook scenarios are newly authored here; this run is not
described as a new independent review. The executed successor driver is
`5ae5aaf5a709638e50d06cbe1e9df5131fa3b1a308c3f2a0feaa8f963c7ba9a0`.

The raw checkpoint label mentioning "exact trace bytes" is qualified by the
actual assertion: the two files retain equal native payload fields, including
full-precision mastery and practice, while their save times differ. Their full
file hashes are intentionally different and both files are retained. This
receipt makes no byte-identity claim for the entire timestamped trace files.

Both recorded question orders are `p1, r1, p2, a1, g1, x1`; the first choices
and correctness differ. The controls do not claim different adaptive ordering
between those two documents. They verify each saved note inside the canonical
question paragraph using the actual options and native answer records.

## Reproduce this composition

```sh
node --test tests/reflections.test.mjs tests/trace-archive.test.mjs \
  tests/session-export.test.mjs tests/answer-order.test.mjs
python3 tools/make_demo.py
TMPDIR=/path/to/private-temp node check_reflection_trace_browser.mjs \
  --root /path/to/exact/composed/source \
  --pins /path/to/candidate-pins.json \
  --browser /path/to/chromium --output /path/to/new/receiving-output
```

Use Node 22+ for the optional browser driver. The output directory must be new
and its parent must exist. This run used Node `v24.19.0` and
`HeadlessChrome/153.0.8010.0`. Browser profiles and temporary outputs stayed in
the authorized private tmpfs namespace; no user browser session was used.

These are current local source and consumer checks. They do not establish
learning efficacy, durable storage, importer integration or universal browser
behavior. The prior 96-file packet remains frozen and is preserved by the
publication's direct preservation index. No GitHub or production changes were
made by this worker; root retains publication and integration authority.
