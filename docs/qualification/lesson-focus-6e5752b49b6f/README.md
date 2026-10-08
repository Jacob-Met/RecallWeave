# Lesson focus: source and receiving

This packet qualifies the separate offline focused-lesson workflow claimed in [RecallWeave issue 44](https://github.com/Jacob-Met/RecallWeave/issues/44). The author is `estate-6e5752b49b6f/github_integration`; root supplies independent model receiving, and the production-slice peer supplies separate UI/source/file receiving.

## User outcome

A teacher or learner can choose a checked local course, inspect its identity, and explicitly use it as a source. They choose target concepts and enter a lesson title. The preview distinguishes those targets from automatically required concepts and explains the direct prerequisite links responsible for inclusion. It shows every retained question in source order, with an expandable answer key. The explicit download is a checked lesson for the existing importer or Deck studio.

The source stays unchanged. All questions of each retained concept stay, and every prerequisite from every one of those questions is followed transitively. This includes links found only on a concept's second question and prerequisites shared by several branches. Question IDs, option order and correct indices, prompts, explanations, transfers, prerequisite arrays, concept order, attribution and license are preserved. The entered title is the intentional content change. The selector does not remove individual questions, merge courses, infer missing prerequisite links, or establish subject accuracy or learning efficacy.

The empty editing plan is explicitly separate from a checked lesson. Invalid selections, invalid titles and an oversized final file cannot produce an old ready download. Pretty JSON is preferred; compact JSON is used when needed to fit the unchanged 262,144-byte UTF-8 limit. The actual final text is admitted by `parseDeck` before download.

## Frozen source

The original source checkpoint is `3904c2f384d7f8fd4225d6ffbc2f4c89e6eae0ed`, tree `aac3244fa7f55e393dc0e4de0cecffd82a88af66`, on actual main `5c6e5b4ee4b928b01466ffe1ff67ceeca44fb9cc`. `source-v1.json` records all nine scoped files and their Git/SHA-256 identities. Its original browser-pending statement remains historical; the later browser receipt closes that boundary.

The implementation adds eight files and one README section. Existing validator, importer, learner, model, review, answer-order, notes, trace, author, course and workflow programs are unchanged. Discovery reconstructed the actual signed main commit and all 72 tree objects by their Git hashes. The small local worktree materialized the 66 product/test files needed for execution while retaining the complete 406-leaf index; it did not download unrelated historical evidence blobs. `discovery.json` retains the source/ownership inventory and initialization limits.

The core SHA-256 is `82e362e82a185c18f771f675622bcef8c382b7832e9d95a6c5341fa96e051370`. The shared validator remains Git blob `f0f8a4b234489c2388f427633f548d56c6ed4c03`, SHA-256 `621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b`. The original direct-file page is 34,174 UTF-8 bytes; the final R2 label correction described below produces 34,395 bytes.

## Native source and independent model receiving

The complete original source suite passes **129 Node methods** in Node 24.19.0, with zero failures or skips. Eight new methods cover focused content/identity/immutability, source and input refusal, real supplied course preservation, exact byte limits, and generated-page parity. `full-node-tests.txt` is the complete raw output. `native-core-tests.txt` separately preserves the seven core methods.

The first authored boundary fixture tried to fill 46,888 bytes using only 30,000 bytes of available transfer-field capacity. Its own setup assertion stopped with 16,888 bytes remaining before invoking the focused-output API. `course-focus.test.initial-fixture.mjs` and `initial-fixture-failure.json` retain that receiving-data failure. Using the also-available prompt-field capacity corrected the fixture; production model bytes did not change.

`independent-model-receiving.tar.gz` is root's unchanged ten-file packet, SHA-256 `b4f5897db209568dd7f5028c442dbed6b0aa4c5e736cd4f100de8e35a5d5af1f` (11,248 bytes). Root authored a Boolean transitive-reachability oracle before reading the implementation. All six independent groups pass, including **1,785 nonempty selections across seven varied DAGs**, all per-question dependency unions, exact retained fields/order/reasons, malformed-input and deep-immutability checks, exact-cap ASCII and multibyte output, one-byte growth refusal, and eight rejected corrupted-output controls. The separate receiver initialization error remains preserved inside that archive.

## Actual browser and downloaded-file receiving

`receive-focus-browser.mjs` drove an isolated Chromium **153.0.8010.0** through nine groups. The actual receipt is `browser-r1/receiving.json`, SHA-256 `a418f13f14864b7309cc8281a23025b462fac888b94953a99696dfc2e0aac7ac`. It identifies 17 unchanged product/consumer inputs before and after the run, eight completed downloads, three screenshots, and no page errors or external requests.

| Group | Observed result |
|---|---|
| Source preview and target choice | Explicit Use is required; two prerequisite branches from different questions are retained; unrelated and downstream-only concepts are absent; markup stays literal. |
| Selection/title revision | Promoting an already-required concept to a target retains identical lesson bytes; removing targets recomputes membership; an empty title prevents a stale download; repairing the selection restores the expected bytes. |
| File refusal/cancellation | Cancelled previews, malformed JSON, editable-draft input, oversized files and unreadable files preserve the existing checked selection. Oversized files are refused before `File.text`. |
| Asynchronous source reads | A newer file supersedes an older successful read; a late failure cannot replace a newer error; the file input's cancel event and continued current editing retire pending reads/previews. |
| Download refusal | An authored `createObjectURL` refusal preserves the ready selection; retry downloads the same bytes. |
| Modular learner | The actual downloaded file previews/cancels without altering an already-answered bundled lesson, then starts a fresh imported lesson and completes review, two missed-answer retries and study-note download. |
| Exact final-byte limit | A real 262,144-byte source file downloads byte-identically after selection. A one-byte title increase disables output with a visible size refusal; repairing the title restores readiness. |
| Offline phone | The standalone file works offline at 390 px; a 160-character unbroken title and long Unicode filename wrap within the viewport. Labeled keyboard controls reach selection and download. Reload clears in-memory state. |
| Standalone learner | The actual standalone download completes the separate offline learner import, review, retry and note flow while preserving first-session answers and model display. |

The five-question lesson is independently specified by explicit source IDs in the receiver. It is not computed by the production focus helper. The modular, promoted-target, repaired, download-retry and standalone JSON files are each **3,285 bytes**, all SHA-256 `544dced1fc8c909dd2a8353fe28bb7235effb5e871a38eebcdf377b3cd505475`. Full parsed content equals that independent source projection. Each actual learner run records three first-correct answers and two misses, then two correct retries; the original first-summary and mastery display remain unchanged. The two note files preserve the same content and recorded answer identities; their hashes differ because the notes include their actual download times.

The exact-cap browser file is 262,144 bytes, SHA-256 `12c8f471a99840dcf8c92a196582054de58993203c64d73950de9478807f69c0`. The receiver compares the completed download directly to the independently constructed input bytes.

The delayed/unreadable file and download-refusal controls intentionally intercept browser APIs in the isolated test page. They qualify actual DOM event/state handling; they do not claim a physical file chooser race or a native operating-system disk failure. All actual successful downloads use the browser's normal Blob/download mechanism. The three saved screenshots were visually inspected by the author: desktop target/required distinctions and literal prompt text, long incoming phone title wrapping, and the 390 px focused preview are readable without overlap or horizontal page overflow.

## Independent label finding and bounded R2 correction

The independent UI receiver found a real R1 control ambiguity on Mac Chromium 151.0.7922.34. The unchanged validator permits distinct literal concepts `Shared topic` and `Shared\ttopic`. With one question each, their original checkbox accessible names both became `Shared topic 1 question`. Choosing the separate controls retained different questions; a third concept depended only on the tab-containing name. The original source and failing receiver observation are preserved, rather than treating the earlier broad browser pass as coverage of this newly discovered boundary.

R2 is frozen at `ff99f4085b25d82227d33eb76d9f707e158a90e8`, tree `641ed0a76364125df45f21c8919d669ee863ce59`. Exactly two files change from the current-main source checkpoint: `src/course-focus-ui.mjs` and its generated `focus.html`. The control label keeps the literal name and adds a visible source-concept number. Included-concept headings, direct prerequisite reasons and question references use that same source ordinal. No concept name, graph edge, source question, model or validator changes. The core retains the independently received hash above.

The final UI SHA-256 is `feacd13485dc4b40ef46f799a515f6f3e80a840068f87add919f3eee234d6394`; the standalone SHA-256 is `525a89161daa4cd0b40f7e291e801ec33d8afdc0f46bfb5e2adcc920e7e67c59`. Generated-page parity passes on that exact source. `source-r2.json` and `action-label-r2.diff` identify the complete bounded delta.

The independent peer reran its unchanged three-concept action-label receiver on R2 in the same Mac browser. All three checkbox names are distinct, selecting each literal name retains its own question, and the dependent concept identifies only source concept 2 with matching numbered reasons. There are no page errors or external requests. The peer packet retains both its R1 failure and R2 pass.

The separate authored R2 browser receiver uses three names differing by ordinary space, tab and newline, plus a fourth concept depending on only the tab-containing name. Both the modular page and offline standalone page at 390 px pass. Keyboard actions resolve all four exact accessible names; the three individual selections produce different expected questions. The dependent selection retains only its intended prerequisite and dependent question. All eight completed browser downloads preserve the independently specified question fields, order, answers, attribution and license; corresponding modular and standalone bytes are identical. Both actual screenshots were visually inspected, with no overlap or horizontal page overflow. No page errors or external requests occurred.

`browser-r2/receiving.json` is SHA-256 `e34c5889d5a8de8f689cb342b885273e75145f4f1ff65cb262f9b212f2e3fff3`. Its initial receiver revision used an invented title label and timed out before any target selection or download. That receiving-script failure and its exact source are preserved separately; correcting the title and download selectors to the actual frozen template caused no production change. The full nine-group R1 browser run and independent model matrix were not relabeled or repeated for this text-only UI correction.

## Current-main composition and packet custody

The first current-main source composition is `55fda259c0627e7f8d977a43b34e9eaf830f85ac` on actual main `c00bd1f31c353698957d2ebad311334536cdef98`. Its eight new files and README section match the original accepted runtime. All 495 other parent leaves and modes are preserved. The complete then-current Node suite passes **145 methods**, with zero failures or skips. The raw output and exact source/consumer admission remain in the R1 packet. R2 adds only the two-file label delta on that composition.

The declared publication parent is actual main `8b82cf5bb95fc7faa5e835e2979df703e6e91a7b`, tree `47063a7cd409d456fcd108ee3557c7451053ef4c`, with 583 leaves. Incoming stoichiometry and vector-geometry course, explorer, test and evidence additions remain owned by their contributors. All 11 existing browser/learner/validator inputs and README are byte-identical to the received composition. `publication-base-admission.json` records those exact identities. Publication adds only the agreed focus files and qualification evidence, retaining every other parent leaf and mode. Public-tree readback and hosted CI are separate gates; no browser result is attributed to an unexecuted runtime change.

The raw R1 packet is `focus-r1-receiving.tar.gz`, 337,758 bytes, SHA-256 `5e1bf27bc5dc69398e14b87ecece38112446961c91f5c8c4ffe6f07cf6d010da`; all 35 archive members were reopened and verified. It preserves the original nine source files, model packet, browser receiver/downloads/screenshots, raw native output, initial fixture failure and current-main source admission. The raw R2 packet is `focus-r2-receiving.tar.gz`, 549,478 bytes, SHA-256 `2faeb03b8a2a16ff0bd9fd6e643af960706042a5dfdc00f6a2c8ae28e450fc13`; all 24 members were reopened and verified. It preserves the two corrected source files, exact diff, focused browser receiver and eight files, screenshots, and the receiving-selector correction. Root's independent model archive is also retained byte-identically as a separate top-level artifact for direct review.

The final peer archive is `independent-ui-receiving.tar.gz`, 89,681 bytes, SHA-256 `aaf4b89062d0beee40f68de2cd1f3cdb70762b2b4272b9b2e3b7d5793ec2d04f`. Its 16 members were independently reopened and checked against the peer's unchanged manifest, SHA-256 `55399b6a402d2319c6ba43621d759949b4929b5299b3068bfba348573cd70c02`. The decompressed corrected UI and HTML equal the exact R2 source bytes. The archive includes the actual Mac counterexample/pass, the unchanged receiver and literal fixture, its six-group source/download/learner review, source snapshots and current-main inventory. The peer acceptance receipt is SHA-256 `b66823e61d921077d8345135afbb478483f6a6bd1b335aa63372e742ca3ec24d`; `independent-ui-custody.json` records the author's copy/readback without changing the peer packet. No peer finding remains open.

## Reproduce

From the qualified project source, with Node 20+ and Python 3:

```sh
node --test tests/*.test.mjs
python3 tools/make_focus.py --check
```

With already-installed Playwright and Chrome/Chromium, run the retained browser receiver into a new owned output directory:

```sh
node receive-focus-browser.mjs --root /path/to/RecallWeave --output /tmp/focus-receiving-new --browser /path/to/chromium --playwright /path/to/node_modules/playwright
node receive-focus-labels-r2.mjs --root /path/to/RecallWeave --output /tmp/focus-labels-new --browser /path/to/chromium --playwright /path/to/node_modules/playwright
```

The receiver starts a local server, creates its own browser profile, admits only its own loopback/file requests, and closes/removes its temporary browser state. It leaves preserved receipts unchanged. No dependency installation, shared browser session, provider request or application service is involved.

Each packet qualifies its declared source and consumer inputs. Hosted CI and final integration are recorded separately when performed; no deployment or measured learner benefit is inferred.
