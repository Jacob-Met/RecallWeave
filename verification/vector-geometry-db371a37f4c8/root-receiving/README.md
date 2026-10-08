# Vector course receiving through the real learner importer

Root receiver: `estate-db371a37f4c8`.

The corrected receiver passed eight groups on native ThinkPad Node v22.22.1 and Chromium 153.0.8010.47. It downloaded the exact 12,709-byte course from the real standalone explorer, selected that file through the learner's file input, reviewed all twelve prompts and attribution, explicitly started the course, answered all twelve unique questions, reviewed exact canonical choices/feedback, paused and resumed practice, and verified six actual downloaded notes files against the actual first-answer/practice traces.

Both modular HTTP and a new direct-file demo page were exercised; the HTTP server was stopped before the file-mode lesson. The fixture deliberately produced 8/12 first answers and 2/4 retry answers. First-answer counts and model estimates stayed unchanged by practice. No external page request or uncaught page exception occurred. All seventeen source files and the course/explorer bytes remained unchanged. Root separately viewed the three desktop/mobile PNGs and accepted readable controls, full-width contained content and course-specific review/context.

## Source boundary

This receiving used the owner's exact native composition offered in [#7 comment 6059419542](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6059419542), based on `4775af91ba6a5d4df787669f39b44364dd1e37ba`.

- app SHA256: ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb
- offered demo SHA256: 4d1aea8cb8d322ba775222d96c7c18f0393be47cf74098dcf116577cdadf4661
- course SHA256: 66b8c5f0a047417605b4f6d399478bb8324fb5852aadb01d796d7ef94f5c3513
- explorer SHA256: f10b3481b9c7d59c1e3bc2837017a1050978d6222a322acf051a1e7c495796e1
- corrected driver SHA256: 0293269b54472b84b2c1232c97ee314dd60b09c105a0e94a135f312df959c137

The complete private source snapshot and manifest are preserved. No importer-owner source or branch was edited. This is not yet the final public importer deployment gate: subsequently published PR #33 retained the same app hash but has a different generated standalone demo, which requires its own parity/receiving before these results can be carried forward to that delivery.

## Preserved receiver negatives

The first source-staging attempt used an incorrect previously reported native course path and stopped with ENOENT after copying the private importer snapshot. It ran no browser or application test. Recovery verified every copied source against the still-identical owner source, then transferred and verified the exact frozen course/explorer bytes.

The first actual browser attempt downloaded the correct course, then stopped before file admission with a CDP frontend-node-ID error. Its receipt, output, exact original driver c27ae3734e91bb4853f416fc9a3740c166e80431329b92d3a47340f02258ab9f and original download remain under evidence-initial.

The corrected driver identifies the actual input through a Runtime remote object handle, waits for mounted trace controls after the initial deck fetch, and labels subsequent CDP failures by method. These are receiver-only changes. The browser API's object-handle input mechanism is documented in the [Chrome DevTools Protocol DOM interface](https://chromedevtools.github.io/devtools-protocol/tot/DOM/#method-setFileInputFiles). No importer or course source correction was necessary.

The successful bounded runner started at 2026-10-08T12:43:40.120Z and finished at 12:43:56.385Z with exit 0. Its browser, private profile and loopback server were closed. Browser-only download GUID names in the preview reflect the receiver's allowAndName download mode; the asserted user-facing suggested filename is vector-geometry.json and the file bytes equal the course.

## Evidence

source-snapshot.json pins the seventeen received files. evidence-corrected contains the complete pass receipt, runner receipt/log, six notes files, three PNGs and actual downloads. evidence-initial retains the original browser failure. The exact corrected driver is in course/verification/vector-geometry-db371a37f4c8/course-browser.mjs. subject-review.md records the independent analytical content disposition separately; projection-range-witness.json records root's narrow arithmetic/SVG-mapping check.

## Final published importer receiving — accepted

The initial offered-source pass above was followed by a new actual browser run against direct main `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`, tree `fec13a2ab7d1a5da29689664281a4af182d137a8`, after importer PR #33 merged as `d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74`. The final standalone page differs from the offered snapshot, so its old pass was not relabeled as final acceptance.

All 20 required entry, module, default-deck and demo-builder files (213,870 bytes) were individually matched to their current Git blob IDs before execution. Twelve files remained identical to the earlier snapshot; eight changed or newly required files were fetched at this exact main commit. `final-source-snapshot.json` records both Git blob IDs and SHA-256 values. Final app SHA-256 is `ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb`; final demo SHA-256 is `d0819e8630ff119be2c078408907ab53e3725999c8fdf71d35deb7f230d3bcd9`.

The unchanged corrected driver `0293269b54472b84b2c1232c97ee314dd60b09c105a0e94a135f312df959c137` ran under Node v22.22.1 and actual Chromium 153.0.8010.47 snap from 2026-10-08T13:28:03.439Z to 13:28:12.972Z, exit 0. All eight receiving groups passed: the explorer's actual course download; explicit preview/start, all 12 answers and exact feedback/review, and paused/resumed four-question practice in both the loopback-served modular app and a fresh file page after HTTP shutdown; and unchanged source/course/explorer bytes with no external page request or uncaught page exception.

Six actual note downloads retained every expected field and their distinct unstarted, paused and completed practice state. Three final screenshots are retained. The synthetic answer trace remains 8/12 on first answers and 2/4 in practice; this is a functional acceptance fixture and makes no learning-efficacy claim.

`evidence-final-main/` retains the receipt, bounded-runner receipt, complete process log, actual downloads, text notes and screenshots. The runner recorded a minimum 538,689,536 available bytes, above its 268,435,456-byte capacity floor; no timeout or capacity refusal occurred. Its owned browser/profile and loopback server were closed by the driver.

The final staging initially copied `demo.html` then encountered a missing `data/` directory before copying the default deck. The directory was created, remaining files were written, and all 20 Git blobs were verified before browser execution. No product code changed during staging or receiving.
