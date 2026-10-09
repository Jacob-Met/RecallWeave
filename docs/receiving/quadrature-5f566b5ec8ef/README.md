# Quadrature receiving — 2026-10-08

The separate offline lab **Between the samples** lets a learner apply one bounded polynomial, compare composite midpoint, trapezoid and Simpson rules, inspect exact sample weights and contributions, and compare five refinements against the antiderivative integral. Its original twelve-question course uses the existing local-file preview, explicit start, adaptive first answers, separate practice and notes flow.

## Exact scope and ancestry

Canonical receiving input is `Jacob-Met/RecallWeave` commit `698902f9c9c1d5c5023092b85b3632a7cb7a01ed`, tree `d6d3707b691850af7928299242631534cff89aa8`. The native Git checkout is a sixteen-file component projection, not a clone of the complete canonical ancestry. `product-manifest.json` pins the eleven product paths. The README change only appends this lab's entry. The fifteen other materialized canonical inputs remain byte-exact; the complete composition receipt separately preserves all 2,914 unowned canonical leaf entries and modes.

The shared learner, deck parser, model, catalog, archive code, dependencies and workflows are unchanged. The new page is self-contained. Opening it performs no calculation; Apply binds its result to one complete set of settings. Editing retires that result and its observation download. Inspection-method changes do not change the applied polynomial.

## Mathematical boundary

The input is six integer coefficients in [-9,9], integer bounds in [-5,5] with lower < upper, and 2,4,8,16 or 32 elementary subintervals. Simpson pairs adjacent elementary subintervals. BigInt rational arithmetic determines nodes, weights, contributions, estimates, exact integrals, signed and absolute errors, and observed refinement ratios. SVG coordinates and decimal labels are approximate only.

The general polynomial-degree guarantees are 1, 1 and 3. Accidental cancellation does not expand those guarantees. Both-exact and newly-exact ratio cases are explicitly undefined; a zero previous error with a later nonzero error has ratio 0. The zero polynomial has no degree. The signed integral is not geometric area. No universal refinement-rate or learning-efficacy claim is made.

## Native evidence and retained failures

- The original component's 26 deck, knowledge and review tests passed before implementation.
- The first authored model suite passed 15 of 16 groups. Its failed group used an incorrect expected lucky-coarse polynomial. That original test and log remain in `evidence/quadrature-test-v1.mjs` and `evidence/quadrature-model-v1.log`. Correcting the test to 5x^4−9x² on[-1,1] produced 16/16; the model formulas did not change.
- A peer froze twelve independent answers and new transfer calculations before seeing keys, explanations or model output. Its independent Python Fraction oracle then matched 468 cases, 8,424 rule/refinement results, 18,390 selected-node traces and 103,484 rational fields. Fifty-eight invalid-input and serialization/copy/freeze controls also passed. All twelve authored keys and explanations and the worked guide were subsequently accepted. The masked file omitted the author's transfer prompts: the peer froze its own transfers first and checked the authored transfers after disclosure.
- The same peer found the admitted polynomial coefficients [0,0,-8,7,-5,-2] on[-3,1]. Its trapezoid errors are −8,0,1/8,5/128,21/2048 across the five meshes. This independently tested reached-exact branch is now a seventeenth maintained regression and passed separately; the sixteen previous groups were not redundantly replayed.
- Three actual consumer groups passed: unchanged parser admission, all twelve adaptive first answers with six distinct practice retries and note preservation, and exact embedded course/guide bytes.
- Generated HTML parity passed before browser receiving and after the final CSS-only correction. `current-source-preservation.json` records the unchanged original inputs.

## Actual Windows browser phases

MSI Windows used its installed Python 3.11.9, Playwright 1.62 and Chrome 154 with a new private profile. Every request other than file/data/blob was blocked and recorded. Browser storage calls and page errors were observed across the complete context.

The first phase completed seven lab groups: unapplied opening; exact quadratic results/refinement; actual Enter submission surviving input blur; invalid draft retirement; all eight examples; maximum-mesh node tables; and actual observation/course/guide downloads. It then failed the 390px page-width assertion. The failure screenshot, DOM, original template/page, driver and actual downloads are retained. This phase is not represented as an all-pass run.

The correction changes two template CSS lines only: the output grid item permits shrinking, the narrow grid uses `minmax(0,1fr)`, and the result-card spacing selector targets the actual nested cards. No model, UI script, lesson or guide changed.

The continuation ran only the affected layout and remaining learner flow. Its three groups passed: document width 390 at viewport 390 while wide tables scroll locally; the actual downloaded lesson previews without replacing the open session and one Start this deck enters its first question; twelve actual answers followed by six practice retries and note downloads preserve all first-session estimates and course content. Both phases recorded zero external requests, page errors or browser-storage calls. Final desktop and phone captures were independently reviewed; the original failure remains separate.

## Reproduction and artifacts

Run the maintained native controls from the repository root:

```sh
node --test tests/quadrature.test.mjs tests/quadrature-course.test.mjs
node tools/build-quadrature.mjs --check
```

The optional maintained browser receiver uses an already-installed Windows Python Playwright and Chromium executable. It does not install packages or use an existing profile. Choose a new output directory:

```powershell
python -X utf8 -B tools/check-quadrature-browser.py --source . --out D:/private/quadrature-receiving --browser 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
```

The native expected oracle dataset is retained at `/home/jacob/recallweave-quadrature-20261008-5f566b5ec8ef/evidence/peer-mac/oracle-expected.json`, 6,062,037 bytes, SHA256 `670cb789cbdcb300b09db1bcd634c9a10b26c6aef933ea035ebe366a91f2a5d7`. It is not duplicated in this source packet. The frozen oracle source and its input/expected hash receipt are included. To reproduce that deterministic expected dataset, copy `peer-mac/oracle.py`, `peer-mac/blind-derived.json` and the parent `course-questions-blind.json` into the same relative layout in a new temporary directory, then run the copied oracle. Do not run it over the historical receipt directory: its original freeze writer intentionally refuses an existing expected-data file and records a new timestamp.

`evidence/windows/` retains actual downloaded observation, course, guide and before/after-practice notes, both process receipts and logs, the original failure, and final screenshots. Large disposable browser profiles are held only under the private Windows receiver root and are excluded. The packet manifest hashes every included evidence file.

## Receiving and publication status

Native source, exact math/content review, actual browser/learner receiving and final visual review are qualified. Claim `claim:recallweave-quadrature-5f566b5ec8ef` remains active for receiving. Jacob's 2026-10-08 no-GitHub-Actions direction remains authoritative. This packet does not claim a PR, merge, Actions run, contest submission or learner outcome. Any future branch must preserve current unowned source and follow the current publication direction.
