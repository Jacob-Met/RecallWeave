# DC circuits course and offline explorer: receiving record

Cohort: chatgpt-astra-bd1abdb2f886-20261008. Scope: [RecallWeave #34](https://github.com/Jacob-Met/RecallWeave/issues/34). Source author: root; independent numerical/content/learner receiver: estate_source; independent explorer browser receiver: estate_production.

## Delivered behavior

The original 12-question course covers current and resistance, series connections, parallel connections, and energy and power. Each concept has three questions, and the four canonical correct-choice positions occur three times each. The guide provides worked examples, all answers and transfer solutions, primary references, and the actual merged importer workflow.

Open [the self-contained explorer](../../../courses/dc-circuits-lab.html) as a local file. It compares an ideal voltage source and two fixed ohmic resistors in series and parallel, draws the selected circuit, and exports the two computed rows as CSV. The source voltage admits 0–24 V and each resistance 1–1000 ohms, including decimals. Six-significant-figure displays are distinct from unrounded exported numeric values. A zero source is valid; blank, nonfinite, out-of-range and wrong-type inputs are refused, stale results are cleared, and CSV is disabled until valid input returns. The exact original course JSON remains available for download even when comparison inputs are invalid.

The explorer uses no network, server, account or browser storage. Its embedded course uses the existing recallweave-deck/1 contract. This contribution adds nine product files and this receiving directory. It does not modify the shared learner, importer, validator, selection model, review logic, notes exporter, catalog, shared styles or existing demo builder.

## Qualified product identities

All nine files are ordinary Git mode 100644 blobs.

| Path | Bytes | Git blob | SHA-256 |
| --- | ---: | --- | --- |
| courses/dc-circuits.json | 11662 | fb5a66a86c127cfe81f691ad4c3a81081ad5fe0c | cfe7a4586a4a97aa96356e9afe7fea5bc1e216a0aff70454476397c909058ccb |
| courses/dc-circuits.md | 10565 | 2f0f4b67cdd44858be7f8bbab0bde34dbe7ee4d6 | c3262be7f16448b8da30716169cee424efe3200290bee78a1ad2ca7acf83fa93 |
| courses/dc-circuits-lab.html | 40902 | 69a49f3a230ed8a665b6a9a09a87539e09b0d2b1 | 94dc6ea2c450bbbdd1f2ec3210c30948c0c8e9b5c974d7d1d728cb7547aee3c4 |
| src/dc-circuits.mjs | 3832 | 630f3a97e3a0cc8f52adbaf860c39ac53d52038d | b8a94b617e2285f8e07229f256d8c2f1c1fcbe53a6e8045f1d816e74d7fb9ba8 |
| src/dc-circuits-ui.mjs | 8573 | cf5c9790382cb9d586b0a88273be5f06c32f94b2 | 2ea06bb70830b8d600c32c3d3192876f36aed9860fdea5d664bfe38e0f088f91 |
| templates/dc-circuits-lab.html | 16342 | 6ad625cc20f2f505ffa73000fb84b9709dfd9b49 | a1af554df93dae1d58f37fb1d5f2c13694eae3e5bd3905eee470a02796adcb8b |
| tools/build-dc-circuits.mjs | 2393 | 6de92a4f5758a72c9ffa2dcbff4d592960c63f6e | 8e57f0f9d2e64ba7abd94483e62874f4777d132c82669e95cd667c2327168f59 |
| tests/dc-circuits.test.mjs | 8218 | 1330bacf2e3f8963735c7f6a1f251ce48a40ecbc | ad789d14f53ca6dc69ce343e0476b77778513ccd7ebdb1edd6c6459d3ca4b9fb |
| tests/dc-circuits-course.test.mjs | 4955 | 31436e901250f4834349bedf94c8e4881e3195c6 | 12d20a8ff07109404cd237385e9b4552e84643e77fa51fa9afe5102a0961db13 |

The generated HTML is reproduced by running node tools/build-dc-circuits.mjs; --check verifies exact parity. The builder validates the real course through the maintained deck parser, enforces its insertion markers, and rejects unexpected script boundaries.

## Source and native test pins

The original isolated native source starts at d22b5ef7c641fc1726ae5b774383f8e6527d73e7, with 336 inherited leaves. The first focused run passes all 15 new maintained methods. After the two-line SVG correction below, the full native suite passes 114/114 and the standalone explorer parity check passes; all inherited and candidate bytes remain unchanged.

The same nine files were then received against actual main d202fdc8b3608c5321f83e1bf6f9a2ceb253f14b, tree f8c4ea7c861811c638f23d66bf149605c79cb089. All 444 inherited leaves/types/modes and all nine candidate files were verified. On Node 22.22.1 / Python 3.14.4 / Linux, the full suite passes 143/143, standalone explorer parity passes, and source remains unchanged. The complete stdout/stderr and before/after manifests are retained. The 15 maintained methods cover strict model/text admission, physical invariants across both connections, changed-input behavior, immutable results, raw CSV, the deck contract and answers, actual maintained review/practice/notes logic, and generated-file parity.

Publication is composed on later main 9487ddd8a1da1976d79ad5f2d16692be7814bfc4, tree 76c5190f10ceaf084d18a94773cd7775bf38c9fa, with 627 inherited leaves. Its comparison from d202 contains 183 added paths and one existing change to courses/sql-query-foundations.md. Shared execution interfaces and the actual learner used below retain their exact bytes; there is no collision with this unit. The 143-test native result belongs to d202, not this later parent. Exact published-head hosted results, independent head binding, any newer merge parent, and final source readback are recorded in the linked PR conversation.

Key author receipts: native-gates-v2.json SHA-256 ad9518e71510125ccda9d51a915418fd4b1abedb76e473c86e5f051b1e5f020c; native-gates-current.json ed3129e638989e132d64199d2d35c2db710f85e37f9ea35b8646647419b3fcf8; current-main-receiving.json 35d85fac81cdd298e5523a80273065ba1afce61badfb221802043d9aa2695ca3.

## Independent physics and content receiving

Before inspecting the answer key or explanations, the receiver froze all 12 answers and 14 exact-rational reference vectors. Every blind answer matches. All authored explanations and all 12 transfer problems were independently checked, including units and the ideal-source, steady-state, fixed-resistance and zero-resistance-wire assumptions.

The first independent native model/deck-codec run passes six receiving groups without a model or receiver correction. It covers six admitted manual vectors, 80 admitted input triples / 160 connection results, six changed-input comparisons, 27 strict numeric-object refusals, 21 text refusals and eight valid text values, physical CSV values and recomputation, and the actual deck validator/serializer. Four out-of-domain reference vectors are represented by two distinct refusals; four vectors needing a different resistor arity are explicitly inapplicable. They are not counted as successful two-resistor numerical cases.

The frozen rational-vector SHA-256 is bab2238cb58d0043e5aa8cf17cddca186bff3b9a6ddf940d1f731b917d038c7f; blind answers 44363ad6d91b1ae9483a3858d2668d22203192778c0a2dc88835242a73ce5cd4; native receipt 6cdfa5a8e85341e8846b0cb55f4271bfdc866f4bc0281c1d82e29e3ff1614d71.

## Explorer browser evidence and retained corrections

The independent browser contract was frozen before the candidate. Receiving used the installed Chromium 153.0.8010.47 and Node 22.22.1 on Linux, a direct local file and dedicated profiles. It includes desktop and 390 px views, numerical values and conservation, input changes and presets, zero source, invalid-state clearing, focus/keyboard behavior, guide opening, actual downloads, and absence of page errors or external requests.

The original v1 browser record has 12 passing and three failing checks. Its numerical, input, layout and local-only checks passed; CSV header binding, keyboard-event transport and the associated download expectations needed receiver corrections. Independently, source/specification review and the original mobile image exposed a real presentation defect: each compound SVG current path drew an end marker only at its final subpath. Exactly two UI string lines were changed into two separate series paths and three separate parallel paths. Model, course, template and builder bytes did not change. Original/final UI hashes and the exact patch remain available.

The focused corrected v2 record has nine passes and one receiver failure. It verifies the corrected arrow count/directions, zero-source removal, desktop/mobile presentation, values and raw CSV, keyboard course download, source integrity and local execution. The remaining failure was a watcher that expected a new filename while Chromium reused an existing CSV filename. The final bounded keyboard receiver uses trusted Enter events and isolated per-download directories: four checks pass, no failures. It observes completed CSV downloads at both 6 V and 12 V with all 13 unrounded columns and the exact original JSON. All three dedicated profiles were removed, and the qualified source did not change during these runs. Earlier failed records are retained rather than replaced.

The browser archive labels reconstructed v1 UI/HTML honestly: they were recovered by reversing the two exact source replacements and match the original hashes. The earlier guide-open observation belongs to the original guide; the final guide only replaces the old importer-status paragraph with the two current usage paragraphs. A separate exact-byte comparison and the actual learner consumer below bind that final guide.

Frozen browser contract SHA-256: 2d7f247191beb1052df9a99eed0d10bdb031da8931fde01f18b37fd9a29a5f4f. Final keyboard report: 38b3f8ede2d9313030654ed680d4ed0ff246da6b7914cea7ca55ce178acfbd79. Focused v2 report: f0d687dcd0b46e9ca59925ce6e454b06e1de0895461143b374efd00896789448.

## Actual course importer, review and notes consumer

A separate frozen learner contract uses the actual completed explorer download, not an independently recreated course file. That 11,662-byte JSON has the exact course identities in the table. Thirteen relevant ThinkPad learner/source files match published d202; the transferred standalone demo.html has SHA-256 d0819e8630ff119be2c078408907ab53e3725999c8fdf71d35deb7f230d3bcd9.

ThinkPad storage exhaustion prevented the learner browser from launching. The original frozen driver, zero-byte wrapper-write observation and successful ordinary retry are preserved as preparation evidence, not a browser test result. The established Mac route changes only paths, Chrome launch and standalone provenance handling; behavioral assertions and helper bytes remain unchanged.

The first actual Mac run passes all six receiving groups, exit 0 in 12.815828958 seconds, using installed Node 26.3.0 and Chrome 154.0.8037.98 on macOS arm64. It executes the exact standalone learner through file:// in a dedicated profile:

- An existing bundled response, full session markup, context, progress and model displays survive DC preview and cancellation unchanged.
- Explicit Start activates the 12-question DC course and clears prior course progress.
- All 12 first answers are selected by visible meaning. The deliberate 75 A answer to dc-current-1 remains the sole first miss, giving 11/12 correct first responses.
- A separate correct 3 A retry preserves that first miss, summary and model displays.
- The actual 9,988-byte study-notes file preserves every question, explanation and transfer prompt, all 12 first answers and the separate correct retry.
- No page errors or nonlocal requests occur. Browser storage stays empty; source/course bytes stay unchanged; the dedicated profile is removed.

Study notes SHA-256: d7338a9352ca1e99f2175db5771a64edfd092facb1f5453dd794df5603580b60. Mac native receipt: 672e7e62bb9934f9416966fa9e05e50389dbd5e88d4b4698750c8b7b2815b402. Frozen learner contract: 9bbd951d4e7e7a3ac1ddb2732ea8a9a68c3252daa27a8d5b3c881f6fc84cea30. Mac driver: f7b887bbab24fb36b6b68c4e7bf0f03409fa6690e4ce77a8830f1992ca66c356. No behavioral assertion correction or second Mac consumer run was needed.

## Evidence archives

Each archive contains its own member manifest. Byte counts and SHA-256 values bind the compressed archive; the Git identity is computed over the exact Git blob header and archive bytes. Published immutable blob identities were compared with the native identities. The text-only GitHub fetch boundary does not provide a separate remote binary-byte readback.

| Archive | Bytes | Members | SHA-256 | Git blob |
| --- | ---: | ---: | --- | --- |
| [author-evidence.tar.gz](author-evidence.tar.gz) | 199716 | 31 | d15b1e3f0876157e60604ee9935e724e860860990927267ca1bb48374179579d | ae9312f5076c3c1b0563d327bc6aa8911f21af0c |
| [browser-evidence.tar.gz](browser-evidence.tar.gz) | 949456 | 45 | 9dc8e2ff8357ac023c610f21c655078b307324292a89c8348087ba8ad2c47dc4 | bab07c553b64d3442a21f36242e6cb15b459891a |
| [independent-evidence.tar.gz](independent-evidence.tar.gz) | 1198758 | 51 | 00b2f308b7ca4c3089d5772c1a84958c5cad940b784635461cead4ad1e629e45 | 5a44256774c7dcdc9340f1d9052ddf934ac4fbc4 |

The author archive retains original/native/current source inventories, receiving scripts, full test output, all nine qualified product files and later-main comparison. The browser archive retains frozen contracts, original/final runners and helper corrections, raw reports, actual downloads, ten screenshots and presentation history. The independent archive retains blind answers, rational vectors, original native receiving, content/presentation acceptance, final guide rebind, ThinkPad preparation non-run, exact transferred execution inputs, first Mac receiving and downloaded notes. Browser profiles, caches and unrelated files are excluded.

## Scientific references and limits

The guide links the primary OpenStax University Physics Volume 2 sections on [current](https://openstax.org/books/university-physics-volume-2/pages/9-1-electrical-current), [Ohm's law](https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law), [series and parallel resistors](https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel), and [electrical energy and power](https://openstax.org/books/university-physics-volume-2/pages/9-5-electrical-energy-and-power). The presentation review uses [SVG 2 marker-end semantics](https://www.w3.org/TR/SVG2/painting.html#MarkerEndProperty). The questions, explanations, examples and interface are original work.

Qualification covers this ideal two-resistor model, maintained local-file learner and recorded browser surfaces. It does not assert physical hardware behavior, measured learning efficacy, remote deployment, installation on another runtime or a broader textbook license grant.
