# Ranked voting course: source and actual receiving

This increment adds an original sixteen-question course, worked guide and catalog entries to the existing RecallWeave learner. The same hypothetical profile produces plurality A, top-two runoff C and Borda/strict Condorcet B. A separate nine-ballot profile demonstrates a majority cycle, a Borda tie and sequential agenda dependence. Complete rankings, equal ballot weights and explicit tie treatment bound every claim. Primary definition sources are linked in the course and guide.

## Source and ownership

Initial source: `340203703b38ba91536f4337c35a200c8f947cda`, tree `27db80de5e5b49917252e211800d9719c8fd0cb7`. All 233 recovered source-file blobs were verified before use. This was an exact dependency closure, not a full repository checkout. Original directory, catalog and offline ZIP rebuilt byte for byte; the exact original demo was retained. See `original-source-pins.json` and `original-build.json`.

Qualified composition: base `db385449dbd94fa72a746801dfc1647076837f55`, preserving the concurrently merged learner-leave protection. The current demo is unchanged Git blob `921cc359b000111e916a3aa3e387cc8c81de205a`. Only this course/guide/test, the two registries, a README entry, regenerated directory/catalog/pack and additive evidence belong to this increment. Other courses and owner work remain unchanged.

Historical family APP-RECALL-011 already has a separately delivered twelve-question `voting-methods.json` course and lab at locally selected source `f67bb3602900b9ca8a8343ca59951fae3dc19fde`. Its record explicitly made no remote-source/current-main ancestry claim; that commit is unavailable in this GitHub repository. This new `ranked-voting.json` is additive to the current canonical catalog. It does not replace that historical lab or its attachments, and is not a claim that this estate has never had voting content.

## What passed

- Six focused methods cover all sixteen answer keys, both exact profiles, the first-place information-loss example, 729 small count profiles, and the unchanged adaptive/review/practice/notes modules.
- Twenty-nine selected tests passed on installed Node 24.14.0: existing deck, course-catalog and logical-clock checks plus the new course checks. The complete repository test suite was not recovered or rerun.
- All three unchanged artifact builders and their `--check` modes passed. The current offline ZIP is 1,431,414 bytes, SHA-256 `7b1ebea713e50a82a80fcce477592e53e32a59139258b6f497f107614f0feb04`, with 44 courses. Its 48 members have 47 payload checksums.
- Installed Chrome 154.0.8037.97 on MSI/Windows, controlled by Playwright 1.62.1 with fresh offline contexts, passed four receiving groups. The original catalog/directory contained no new-course match. The candidate directory had valid course/guide links; both candidate catalogs downloaded exact original JSON.
- Desktop 1280×900 and mobile viewport 390×844 each previewed all sixteen questions, answered every question through the real adaptive learner, deliberately missed one, recorded a separate correct retry, retained two reflections, and produced an actual 15,807-byte study-note download. Every prompt, correct answer, explanation, transfer prompt, source and license was found in both downloaded files. Original first-answer summary and estimates survived practice and download.
- No page errors and seven file-only requests. No network responses or mock browser APIs were used. The extracted offline ZIP supplied the mobile learner and course.

Exact current browser result is `browser-current.json`; actual note files are retained beside it. The two note hashes differ because each includes its actual export time. See `native-receipt.json` for process IDs, runtime/exit and exact inputs. Product visual inspection covered the mobile question and desktop review; long content remained readable without horizontal overflow. Screenshots are hash-bound in the browser report and retained in the native/package custody, not all stored in this source tree.

## Retained unsuccessful attempts

The first build driver ran catalog parity tests before regenerating the new catalog: 28/29 passed and the stale-output check correctly failed. `build-before-rebuild.json` preserves that output. Reordering the driver to build before parity tests produced 29/29; production builders were unchanged.

The first browser driver expected a second welcome button after **Start this deck**, but the existing learner starts its first question immediately. Directory and downloads passed; both learner groups timed out on that nonexistent button. `browser-initial-receiver.json` and `receiver-initial.cjs` preserve the failed attempt. Correcting only that receiver expectation produced four passing groups on the initial composition. `browser-before-owner.json` and `receiver-before-owner.cjs` retain that run. The final receiver adds an output-directory argument and was run again after the owner source composition; `receiver.cjs` is the exact final runner.

## Reproduction

Ordinary course/source checks and builds from a full repository checkout:

```sh
node --test tests/ranked-voting-course.test.mjs
node tools/build-site-directory.mjs
node tools/build-course-catalog.mjs
python3 tools/build-offline-pack.py
node tools/build-site-directory.mjs --check
node tools/build-course-catalog.mjs --check
python3 tools/build-offline-pack.py --check
```

The browser receiver takes a receiving-stage directory containing the qualified checkout/closure under `source/` and exact original `catalog.html`/`explore.html` under `original/`. Those original files are reconstructible from the initial pin and their unchanged builders. Set `PLAYWRIGHT_MODULE` to an installed Playwright module directory and optionally `CHROME_PATH` to installed Chrome. Run `node receiver.cjs STAGE NEW_OUTPUT_DIRECTORY_NAME`; it extracts the actual offered ZIP under `STAGE/unpacked/`, creates a fresh browser context and writes new evidence. No browser/package installation is part of the receiver.

## Limits

This is authored-input arithmetic and consumer receiving, not human playtesting, a physical mobile-device test, assistive-technology qualification, learning efficacy, political advice, or hosted deployment verification. The static course uses the existing illustrative model. The standard offline pack contains course JSON/catalog/learner, not worked guides or labs; keep `courses/ranked-voting.md` separately for the complete derivation offline.
