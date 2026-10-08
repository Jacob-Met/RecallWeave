# Saveable draft boundaries on current main

## Received correction

The final application source for this packet is `f17b4937eef9fb4faaffa356acf1e0d4a1a220c1`, tree `71585d9539d0c2b4ad6a1d08a7e6dd697323b195`. It composes actual main `5ce520a778da04605f5fa610fb1ad110ffe52b99`, including the separate contributor's PR 20 biology update, with the author draft capability. The [source manifest](source-manifest.json) verifies every one of the **230 unrelated main leaves and modes**, including the exact course, learner app, generated learner demo and shared lesson validator. README is the exact current-main text with the previously received author section.

Root authored the bounded size correction at `37f5423b030e8d66abd2b843b3d0269f0875a48c`. Its module is unchanged here at SHA-256 `32ad1cf04b6aacf26de9b1e5a73646586fcd79c666a160e60c6c085faac1a0ac`; its tests are `9b04ec8caa091aa31680616ce4f40c397490b9a5fc8cbb8bb2212898dff08d3d`. The only runtime differences from the executed R1 author source are this module and its generated inclusion in `author.html`. The template, stylesheet, UI, loader, core undo repair, shared validator and author builder remain byte-identical to R1.

The [original author receiving](../author-drafts-6e5752b49b6f/README.md) remains unchanged at its actual source identity `d64565556a8a90bc08c8f6d4f9ab6763867b93e2`. Its seven browser groups are historical workflow evidence. This packet records the new boundary execution and compatibility checks against the corrected module; it does not relabel the earlier run.

## Two reproduced gaps and the correction

Independent reviewer `estate-6e5752b49b6f/production_slice` found that an admitted compact draft could exceed the 2 MiB limit when saved with indentation. Its unchanged [R1 receipt](peer/r1-receiving.json) preserves four passing groups and two failing size groups. The canonical compact fixtures contain 2,097,024 and 2,097,152 bytes; the corresponding old indented outputs require 2,138,417 and 2,138,545 bytes.

`estate-6e5752b49b6f/github_integration` then constructed a separate input whose private editing keys expand during canonicalization. The [original receipt](canonical-key-boundary-r1.json) records a valid compact **2,097,152-byte** input admitted by R1, with a canonical compact size of **2,097,266 bytes**. Its deterministic [receiver](receive-canonical-key-boundary.mjs) creates the fixture in memory without writing a large synthetic input. The [corrected result](canonical-key-boundary-r2.json) refuses that same source before admission, with the source unchanged.

The correction keeps the existing indented JSON plus newline whenever it fits. Otherwise it saves compact canonical JSON without optional whitespace or newline. Parsing also checks whether the copied canonical state can be saved within the cap before returning the frozen staged draft. This closes both gaps without increasing the file limit or mutating current writing. Root's identical eleven-method receiver shows old source **9 pass / 2 fail**, then corrected source **11 pass / 0 fail**; the exact logs are preserved in `../draft-format-6e5752b49b6f/size-boundary-*.txt` with their [source receipt](../draft-format-6e5752b49b6f/size-boundary-receiving.json).

## Executed receiving

The full current-main composition passes **67 native tests**, zero failures, in [composition-tests-r2.txt](composition-tests-r2.txt), including standalone author parity. A separate [compatibility receiver](receive-prior-downloads.mjs) replays all **sixteen actual R1 browser downloads** through the new module. Existing draft bytes are unchanged. Checked lessons pass through editable-draft save/reopen and return the exact same checked lesson bytes. The full per-file hashes are in [prior-downloads-r2.json](prior-downloads-r2.json).

The peer independently authored and executed its six-group format receiver against the actual composed core and corrected module; its own [R2 receipt](peer/r2-receiving.json) passes all six groups. Its complete [acceptance report](peer/README.md), both source snapshots, original failures and [18-file archive](peer/independent-receiving.tar.gz) are preserved unchanged, with every archive member checked against the peer's manifest. `github_integration` also executed the unchanged receiver; that additional [composed receipt](peer/r2-composed-receiving.json) is byte-identical. The [execution map](peer/execution-map.json) distinguishes authorship and executions. The peer separately executed the complementary key-growth fixture unchanged and [accepted its refusal](peer/canonical-growth-acceptance.json), with the fixture's implementation-lane authorship explicit. This covers 128 private-key renamings with independently specified ordered text and references, 99 occupied public question IDs at the allocation boundary, 18 malformed aliases, exact UTF-8 input limits, and both compact save boundaries followed by lesson repair.

The focused [actual browser receiver](receive-size-boundaries-browser.mjs) passes **three groups with six real downloads** on Chromium `153.0.8010.0`:

1. The exact 2 MiB key-expansion input is refused before replacement. Its preview stays hidden, replacement stays disabled, focus returns to Open, and the existing checked lesson still downloads as the original 1,642 bytes.
2. An actual **2,097,152-byte** compact draft downloads, reopens from that browser-produced file, and downloads again with identical bytes. The author repairs it through the controls to a **595-byte** checked lesson, preserving public question ID `question-2` and an explicit nonzero correct answer.
3. The standalone page with network unavailable at **390 px** downloads and reopens the **2,097,024-byte** fixture. Refusing the key-expansion file leaves all current draft bytes intact. Saving again is byte-identical. Document width remains 390 px; the phone capture was visually inspected.

No page errors or external requests occurred. The [browser report](browser-r2/receiving.json) records all nine exact source hashes, actual filenames and byte counts, repeated-download hashes and source immutability. The fixture generator is the peer's unchanged `4773e6fd…` source. Expected browser downloads equal the complete independently constructed input bytes; this does not depend on asking the corrected serializer to generate the expected large file.

The two large browser-produced files were retained as lossless gzip files **after** the actual plain-file reopen checks. The receiver verifies decompression byte-for-byte before removing only its redundant plain copy. Repeated downloads are represented by the identical retained bytes and their individual observed hashes. The exact-cap file has SHA-256 `bcf61d909130f0609cf2418ab424b379179f29db207fd555cd32c91185f5553b`; the cap-minus-128 file has `1cdbc19dd8008d8c22be9157d48d6b1fa5d1b867b8569a2ed3a1b16c17e44f36`.

## Replay

From a checkout with Node 20+ and Python 3:

```bash
node --test tests/*.test.mjs
python3 tools/make_author.py --check
node docs/qualification/author-drafts-r2-6e5752b49b6f/peer/receive-draft-format.mjs \
  "$PWD" /tmp/recallweave-draft-format-result.json
```

The browser gate uses an already installed Playwright module and Chromium executable. It creates its own local server and browser context; it does not reuse any signed-in session:

```bash
node docs/qualification/author-drafts-r2-6e5752b49b6f/receive-size-boundaries-browser.mjs \
  --root "$PWD" \
  --output /tmp/recallweave-draft-size-browser \
  --playwright /absolute/path/to/playwright \
  --browser /absolute/path/to/chromium \
  --generator "$PWD/docs/qualification/author-drafts-r2-6e5752b49b6f/peer/make-boundary-draft.mjs" \
  --deck-fixture "$PWD/docs/qualification/deck-author-6e5752b49b6f/author-browser/authored-final.json"
```

The original R1 hosted run is preserved under `hosted-r1/`: [run 37773162147](https://github.com/Jacob-Met/RecallWeave/actions/runs/37773162147) passed 65 tests on Node 20.20.2 and learner-demo parity while checking out the actual merge of public R1 head `472147eea8beb82852d83aa53cd7038c8650ff52` with main `5ce520a…`. It predates the independent boundary findings and is not presented as CI for this correction. Final published-head CI and the independent UI/source review belong to the PR 24 handoff.

All content in the generated boundary fixtures is synthetic. These checks qualify the offline author workflow and source composition. They do not modify or claim adoption by the separately owned learner importer, change the learning model or course, introduce automatic persistence, or establish an educational efficacy or deployment result.
