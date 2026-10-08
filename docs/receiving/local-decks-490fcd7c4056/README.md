# Local lesson import — receiving packet

**Latest receiving:** [d22b5ef composition](receiving-d22b5ef.md) preserves the newly merged author drafts and measurement course/lab, resolves the studio-control README overlap, and passes 111 current Node tests plus author standalone parity. All learner, validator, trace, notes, answer-order, bundled-data and standalone bytes remain identical to the final a1ec browser qualification below.

## Outcome and scope

The learner can select a local JSON course, inspect its title, concepts, questions, prerequisites and supplied attribution, then explicitly start it. A preview, cancellation, read failure or superseded read leaves the current lesson in place. Starting a course creates its own fresh answers, mastery state and per-question option order. Reset keeps the selected course; reloading returns to the bundled lesson.

The same selected content supplies the lesson, review, bounded practice round, text notes and completed learning traces. Correctness uses canonical answer indices when display order changes. The validator admits 1–100 questions, 1–32 concepts, 2–6 options per question and at most 256 KiB of UTF-8 JSON; it returns immutable normalized copies. Imported text remains literal. The knowledge and review models are unchanged, including their illustrative fixed parameters.

This publication is composed on actual main `a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4`, tree `9e4e37af18a0c9c2868b62710473ac7bd458768d`. It preserves the notes, shuffled answers, completed trace archive, course studio, revised biology content/provenance, dependency-graph course, existing tests and prior evidence. The shared validator is already on main and remains byte-identical.

## Final receiving result

On the exact 41-file native composition:

- 78 Node tests passed, including the current course studio, trace codec and executable graph-course tests.
- 14 actual import-browser groups passed on the modular page and direct-open standalone.
- 12 inherited trace-browser groups passed, including real downloads, fresh documents, preview/cancel/restore, delayed reads, practice resumption and mobile rendering.
- Three additional groups downloaded a paused trace from the exact pre-importer a1ec standalone, restored it into both new surfaces, downloaded five real trace/note files, and compared canonical answers, full-precision mastery and practice state. The superseded 4775 biology course's trace was correctly refused.
- All 41 source hashes remained unchanged during these runs. Chrome for Testing 154.0.8037.57, Node 22.22.1 and Python 3.14.4 ran on the native ThinkPad with existing dependencies and isolated browser state.

The final application SHA-256 is `ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb`; the standalone is `d0819e8630ff119be2c078408907ab53e3725999c8fdf71d35deb7f230d3bcd9`; the builder is `64432008082d70a3e7e72c87c2247d43f16916d74932f5bfe354e8e1d43a16c0`.

After qualification, README received one documentation-only clarification: earlier app traces remain compatible when course content is unchanged. The exact old/new blob and final README hash are recorded in [source-publication.json](source-publication.json). Executable source is unchanged.

## Integration decisions

Course normalization adds the format marker and canonical fields. Passing the normalized bundled copy to the existing exact-course trace comparison would reject traces saved by an earlier app with the same unchanged bundled content. The adapter retains the trusted raw bundled source for that archive identity, while the learner uses the validated immutable copy. Imported courses use their normalized identity. The existing trace codec and UI remain unchanged, and actual course revisions continue to fail the exact-course comparison.

The latest biology-content revision changed course content, so its older trace is intentionally refused. A trace downloaded from the exact current pre-importer app restores successfully. This distinction is checked with actual downloaded files.

The current-main attribution cleanup is preserved through escaped supplied attribution and license text. All new authoring and trace modules, current bundled data, and graph-course files are preserved. A session rebuilds shuffled option maps only when a new course or fresh session starts; practice and restoration retain the current session's display order and canonical choices.

## Independent evidence and earlier generations

Each archive retains its own source pin. Earlier results are not represented as direct execution on a later standalone build.

| Receiving generation | Qualification retained |
| --- | --- |
| Original importer `1804b98`, base `262bf32` | 26 unit, 14 author import-browser, 8 inherited browser, and 8 distinct root groups covering maximum content, literal/reserved names, staged learning, replacement and reset |
| Composition over `a64369f` | 35 unit, 14 import-browser, 15 current notes/order browser, 12 root composition groups and 6 distinct independent groups |
| Composition over `4775af9` | 62 unit, 14 import-browser, 12 trace-browser, 3 old-app compatibility groups and 8 distinct independent groups with 14 real trace downloads |
| Final composition over `a1ecbb8` | 78 unit, 14 import-browser, 12 trace-browser and 3 actual pre-importer compatibility/refusal groups |

[The a643 independent review](INDEPENDENT_A643.md) checks visible keyboard choice positions, canonical note answers, practice under changed randomness, paused practice, fresh reset and reused question IDs with new option counts.

[The 4775 independent review](INDEPENDENT_4775.md) checks delayed trace reads across same-title/same-ID replacement courses, concurrent course and restore previews, strict course identity, paused practice, restart and completed restores. Its application, module, picker, stylesheet and builder bytes are identical in the final receiving composition. The final standalone has the independently revised current bundled data and was requalified by the final native browser gates.

## Evidence files

- [original-importer-1804b98.zip](original-importer-1804b98.zip): 3,940,398 bytes; SHA-256 `abcb383a47abe469e966d86229873b27c6a4c647cf769e38995bca560ddfa9d9`.
- [original-root-review.zip](original-root-review.zip): 175,240 bytes; SHA-256 `b3c9e714ddb86b02b79f19cc164fecf922b05197b136904c08e23e515e4ad237`.
- [receiving-a64369f.zip](receiving-a64369f.zip): 2,632,568 bytes; SHA-256 `1ac790d88362de0d36aac7b75b80b87f9b39974d92644af98528a4da62c8093c`.
- [independent-a64369f.zip](independent-a64369f.zip): 100,242 bytes; SHA-256 `e887b0fafdb2a3fe2cfd8e4958bd300a69a3885386359d6e0688604b917ce79d`.
- [receiving-4775af9-root.zip](receiving-4775af9-root.zip): 1,955,752 bytes; SHA-256 `e192f99618d8f6c9fe06c8edae089bd419d3bbc235d8f4cfd21f34029bafa9b8`.
- [independent-4775af9.zip](independent-4775af9.zip): 159,908 bytes; SHA-256 `1c93b9ac37e166e5b752bd9384d2b11ac98f76e3594272e48ea5d7b3b7ab2e56`.
- [receiving-a1ecbb8-final.zip](receiving-a1ecbb8-final.zip): 2,219,759 bytes; SHA-256 `24350b78ae0a63ea32dcfc3b5bb97f6926e780be89ab37ba5ad9f31a61b083e8`.

The final archive includes the complete 41-file source, native commands and logs, manifest, actual prior-app standalone, saved traces and notes, screenshots, README merge inputs and the earlier course control. The original archives retain meaningful unsuccessful attempts and earlier exact source.

The a643 native browser first failed before any product check because a long private temporary path exceeded Chromium's Unix socket path limit. Only pending browser stages were rerun with a short private path. Later shared home/scratch exhaustion interrupted a manifest write after the 4775 source build; the incomplete file was not accepted, and final evidence was written and verified in uniquely owned native tmpfs. Original successful receipts and source remained intact. These environment failures are separate from accepted product checks.

## Reproduction and operational boundary

Run `node --test tests/*.test.mjs` in the source root and `python3 tools/make_author.py --check` for author standalone parity. Build the learner standalone with `python3 tools/make_demo.py`. The importer browser runner uses already-installed Playwright and the `BROWSER_BIN`, `NODE_PATH`, `TMPDIR` and `RECALLWEAVE_EVIDENCE_DIR` values recorded in the native runner. The trace runner accepts `--browser` and `--output`. Use a short owned temporary path.

The archives include every custom receiving harness and its source/input paths. They use synthetic local files and private browser profiles; the legacy compatibility receiver also uses exact published course/app files identified by Git blob. No live learner data, account, hosted deployment or provider was changed. PR status and actual-head hosted checks establish integration separately from these native receipts.
