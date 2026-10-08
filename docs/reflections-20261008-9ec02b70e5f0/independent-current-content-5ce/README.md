# Independent current-content trace and notebook qualification

## Result

The actual RecallWeave lesson consumer passed all six focused browser checks on
the current course-content composition. It produced six real study-notes files
and two real learning-trace files. All 231 native input and file-selection
requests received CDP acknowledgements, both pages reported no JavaScript
exceptions, and all 13 product file pins matched before and after the run.
The process exited 0 after 3.58 seconds. This packet records one bounded run;
no additional browser or broad native suite was run for this qualification.

The receiving behavior is concrete: restoring a saved answer/practice trace
keeps the latest explanations and Apply-it writing already in the destination
tab. An explanation edited after preview remained, another explanation stayed
cleared, and the later Apply-it entry survived confirmation. First answers,
full-precision model estimates and paused practice came from the actual saved
trace. The subsequent downloads agreed with that division of state.

## Source and independent receiver

The tested receiving composition is based on RecallWeave commit
`5ce520a778da04605f5fa610fb1ad110ffe52b99`, tree
`3da3cc7da0005c9e703548057a2e60642f144f37`. `source-pins.json` records the 13 exact
product files and their byte lengths; its SHA-256 is
`94087fe2fe402573bf3a4920236bde074215353a8481224872c608902f22b152`.

| Product component | SHA-256 |
| --- | --- |
| Lesson app | `b24889341a7e4bf160ce29c2a746150639002786bca3dee68e017bf36dbb1661` |
| Generated standalone demo | `40ce4658f17df07a945c49cd425045c89602107b58fefd22b620d667e8cf9c65` |
| Current published course deck | `28204e412703fb3f143ebcaf0770e0eb6116a2c8c09c9a68a1b0ef873f95cc16` |
| Reflection state module | `92354bccb48deb7c3455d4f9d0e922f7b8b5d45d3d7bbf1968d23ad2818fe330` |
| Study-notes exporter | `1f266a8503a23b52809417fba251225d1805e4d214b61e40dcdfbfca4bb35c13` |
| Native trace parser/exporter | `d9e6d4343563eac97a17f0e79ea9080d0cfe694fd74f5e0173b53a4af3d912c6` |
| Native trace UI | `c62d7d40460ca20e47dba22a4401aff6aa2afbb0c9b873a94944d140c5fba28e` |

The independent driver, `verify_trace_notebook_receiving.mjs`, has SHA-256
`8ef5554e125ea85a31dcee1c596cc19354c50b2d98d113b0ed417e5ec131bfa2`.
Its six scenario bodies are byte-identical to the earlier main 4775 receiver.
The only receiver changes add native-action acknowledgements, detailed timeout
context, read-only last-page capture on failure and retained browser stderr.
They add no alternate input method, retry, state replacement or weaker
assertion. The original keyboard and canonical-paragraph helpers continue to
operate through the native page. `receiver-provenance.json` records the exact
relationship and the three changed product pins: app, generated demo and deck.

The input file is selected through the real browser receiver using
`DOM.getDocument`, `DOM.querySelector` and `DOM.setFileInputFiles`, as in the
owner's native trace runner. The receiver never invokes a restore callback or
export function in place of the page. Buttons and writing use native keyboard
and text-input events. Browser downloads are read from the files the browser
actually created; their contents are not reconstructed from model state.

## Six observed boundaries

| Control | Actual receiving result |
| --- | --- |
| Modular source and standalone destination | The source completed a 0/6 first session and paused after two of six practice answers, one correct. The destination completed a separate 6/6 first session and had its own six explanations and Apply-it text. The source's actual JSON download contained answers, mastery and practice only. |
| Preview and explicit cancel | Preview described the source's 0/6 answers and 2/6 practice without changing the destination. Cancel hid the preview and cleared file selection. The two actual notes files matched byte for byte after removing only the Saved timestamp. |
| Late edit before confirmed restore | After preview, the destination edited explanation p1, cleared p2 and changed Apply-it. Confirmation retained those latest values. Its original 6/6 answers were replaced with the source's 0/6 answers and paused practice. The downloaded notes preserved every canonical first choice, result, explanation, transfer prompt and latest destination note. A second actual trace download matched the source's answers, full-precision mastery, practice, deck and model. |
| Wrong course with the same IDs | A private copy of the actual trace changed only the deck title and one prompt, preserving the exact six IDs and all answer/mastery/practice records. The native file receiver refused the different course version, hid the preview and left the current state intact. Actual notes before and after refusal matched except the Saved timestamp. |
| Resume restored practice | The page opened the next unanswered canonical item. After the third retry, two of three recorded retries were correct; the round remained paused at 3/6. First answers, model estimates and the destination notebook remained unchanged. |
| Actual fresh-session reset | The native reset reloaded the standalone page. A fresh 6/6 session had all six explanation fields and Apply-it empty, and its actual notes contained no earlier notebook marker. The separate source tab and original downloaded trace bytes remained unchanged. |

The destination opened `demo.html` directly with HTTP(S) blocked. Its complete
recorded request list contains only that local file, once for initial navigation
and once for reset. The source used a private loopback server for the unchanged
modular app and deck. No hosted service, production database or user account
was involved.

## Raw evidence

`review.json` summarizes the result and limits. `receiving/receiving-report.json`
contains every checkpoint, canonical paragraph assertion, notebook snapshot,
trace record, native-action acknowledgement, request list and before/after
source digest. `native-action-summary.json` indexes the 231 acknowledged actions.
`browser.log` and `browser-execution.json` retain the exact command, elapsed time,
exit code and driver identity.

The six named text files under `receiving/` cover the destination before
preview, after cancellation, after confirmed restore, after wrong-course
refusal, after resumed practice and after a fresh reset. The two named JSON
archives are `source-paused-trace.json` and `target-restored-trace.json`.
The browser-assigned download files also remain under `receiving/downloads/`.
The private wrong-course fixture has its own byte hash and two-field mutation
provenance in the report. `review-files.json` lists every preserved file by
absolute source path, relative packet name, SHA-256 and size.

Replay against these exact product bytes with a new output directory:

```bash
TMPDIR=/absolute/private/temporary-directory \
node verify_trace_notebook_receiving.mjs \
  --root /absolute/path/to/qualified-repository \
  --pins source-pins.json \
  --browser /absolute/path/to/chromium \
  --output /absolute/path/to/new-output-directory
```

The temporary-directory and output-parent paths must already exist. The runner
creates a disposable browser profile, captures actual downloads and removes the
profile on completion. This run used Node 24.19.0 and HeadlessChrome 153.0.8010.0.
The fixed source manifest intentionally refuses a different app, bundle or deck;
a later source requires its own explicit pin file and receiving provenance.

## Historical failures and limits

The earlier main 4775 packet remains separate and explicitly transport blocked.
Both attempts used the unchanged original receiver and stopped on a ten-second
native keyboard-event acknowledgement timeout, before a complete coupling
checkpoint. The second attempt did preserve one validated modular trace. That
17-file packet is identified by manifest SHA-256
`8d0b180c52c6d9c3f2555843b2e68d5b2cddfc167beda8a1c50eddad8a84a7f9`.
This successful later source does not relabel those attempts as passes.

Shared temporary-memory pressure was observed during that work. The successful
run's initial conditions are recorded in `receiving-conditions.json`, including
101,396,480 bytes of tmpfs headroom. Neither this pass nor the diagnostics prove
why the earlier acknowledgements timed out. No product fix was made to obtain
the result, and no further browser repeat is included.

The sessions use deliberately chosen answers and synthetic writing to check
state preservation and exact export behavior. Their 0/6 and 6/6 counts are test
fixtures, not measured learning effectiveness. The trace intentionally archives
first answers and practice; current-tab reflections stay local and are included
in study notes. Refresh or fresh reset clears that local notebook. There is no
claim of live learning benefit, automatic reflection restoration, or deployment.
The reviewer changed no product source and performed no GitHub write or broad
native suite. Later repository-parent reconciliation belongs to the lead and
must retain these exact receiving pins.
