# Substring-search lesson and explorer receiving packet

Source claim: [RecallWeave issue 83](https://github.com/Jacob-Met/RecallWeave/issues/83), posted and independently read back by the coordinating root before production edits. This is an original twelve-question course and bounded offline explorer. Existing learner, model, importer, authoring, catalog, archive and other course implementations are preserved. One additive README entry is the only existing production path edit.

## What was executed

The corrected qualification source is pinned in [frozen-source.json](frozen-source.json). The later [publication-source.json](publication-source.json) retains all 13 non-README entries exactly and composes the same README entry on the final receiving parent. [execution-receipt.json](execution-receipt.json) separates the original execution from the correction. The original [source manifest](before-correction/frozen-source.json), core, model test, generated HTML and first-execution logs are retained unchanged under [before-correction/](before-correction/).

| Native execution | Recorded outcome | Exact evidence |
|---|---|---|
| Original pure model | 5 methods pass; 12 prewritten worked cases and all 7,650 binary text/pattern pairs in the declared bounded domain agree with independent oracles. | [model-first.log](model-first.log) |
| Original course through existing native functions | 3 methods pass; four concepts, 12 adaptive first answers and six deliberate practice corrections; notes retain every authored prompt, explanation and transfer. | [receiving-first.log](receiving-first.log) |
| Original explorer callbacks with an authored simulated DOM | 5 methods pass; independent stepping, draft retirement, exact captured JSON/course bytes, post-allocation dispatch/append cleanup and explicit retry. Real Node Blob/object-URL operations were used. | [receiving-first.log](receiving-first.log) |
| Original generated artifact | 3 methods pass; exact source/style/course closure, no-write parity check and native compilation of the actual embedded module. | [receiving-first.log](receiving-first.log) |
| Initial standalone build | Exit 0; generated artifact subsequently received by the three artifact methods above. | [build-first.log](build-first.log) |
| Corrected naive completion state | 1 new method passes over 13 cases: every displayed start/matched-length pair denotes a real matching prefix, including completion after the last feasible alignment. | [naive-completion-correction.log](naive-completion-correction.log) |
| Corrected artifact | Rebuild exits 0; all 3 artifact methods pass on the regenerated file. | [build-after-correction.log](build-after-correction.log), [artifact-after-correction.log](artifact-after-correction.log) |

The original 16 authored methods passed on their first execution. Independent receiving then found a trace-state defect outside those assertions, described below. The model and remaining 11 original methods were run in two separate commands. The 7,650-domain, course and UI checks were not repeated solely for the narrow correction; their original pins remain explicit. This is not a claim that all 17 current methods or a broader existing repository suite were rerun. Finite exhaustive cases are not a universal proof. Comparison counts describe this prefix-function variant and include prefix preparation separately; they are not timing measurements.

## Independently reproduced completion-state correction

After the naive loop advanced `start` beyond the final feasible alignment, its complete snapshot still carried the previous alignment's `offset`. The occurrence list and equality counts were correct, but for `ABABABABA` / `ABABA` the final panel could report `start=5, offset=5`, even though that text slice was only `BABA`.

Root's unchanged [native boundary harness](root-independent/native-boundary-review.mjs) reproduced this mismatch with exit1 on the exact original 14-file closure. Its named combining-character control passed: the input contained code points `[101, 769, 233]` and matched `[2]`, so no Unicode-example change was made. The [before receipt](root-independent/boundary-before-receipt.json) and [raw stdout](root-independent/boundary-before.stdout.json) preserve the actual failure.

The correction adds only `offset = 0` and its explanatory comment before the naive complete snapshot. Removing that exact addition reconstructs the original full core bytes. The model receives one new invariant check and the standalone artifact is regenerated; every other frozen source, course, UI and test entry stays unchanged. Root's same harness then exits0 on the corrected 14-file closure, with both checks passing and every source file unchanged during execution: [after receipt](root-independent/boundary-after-receipt.json), [raw stdout](root-independent/boundary-after.stdout.json). This is a separate independent native run, not an extra copy of the authored checks.

Root's subsequent [complete receiver](root-independent/complete-native-receiver.mjs) passes five independent groups on the corrected source. It receives 2,728 complete states across ten distinct cases, including the 64/16 code-point limits, a three-stage fallback while retaining the same unresolved token, and an injective Unicode renaming. It executes the actual delivered inline-module bootstrap, receives exact calculation/course bytes through real Node Blob/object URLs, and checks retry and programmatic stale-input refusal with an explicitly simulated DOM. The [complete native receipt](root-independent/complete-first-receipt.json), [raw stdout](root-independent/complete-first.stdout.json), [source review](root-independent/source-review.json) and [accepted review](root-independent/review.json) are copied unchanged. Their [manifest](root-independent/manifest.json) binds all 13 root files. No browser-engine or saved-download acceptance is implied.

Both original root harnesses preserve their exact relative imports. To replay them unchanged, stage the two harnesses and their four current source inputs into a new directory with that original layout (run from the repository root):

```sh
python3 - <<'PY'
from pathlib import Path
out = Path('/tmp/substring-independent-replay')
out.mkdir()  # refuses an existing output directory
packet = Path('docs/substring-search-evidence/61749b-20261008')
copies = [(packet / 'root-independent' / name, out / 'substring-independent-root' / name)
          for name in ['native-boundary-review.mjs', 'complete-native-receiver.mjs']]
copies += [(Path(name), out / 'recallweave-substring-discovery/candidate' / name)
           for name in ['src/substring-search.mjs', 'src/substring-search-ui.mjs',
                        'courses/substring-search.json', 'courses/substring-search-explorer.html']]
for source, destination in copies:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('xb') as target:
        target.write(source.read_bytes())
PY
node /tmp/substring-independent-replay/substring-independent-root/native-boundary-review.mjs
node /tmp/substring-independent-replay/substring-independent-root/complete-native-receiver.mjs
```

To receive the old failure, choose another new output directory, use `before-correction/src/substring-search.mjs` from this packet as the model source, and run the boundary harness only. Its expected native exit is1 for that preserved original and0 for the corrected model. No original source file is overwritten.

No browser engine was launched or delegated. Simulated DOM delivery is explicitly authored QA, not native browser layout, assistive-technology, file-picker or completed-download acceptance. There was no host, account, provider, calendar, installed service or deployed-page action. No teaching-efficacy or assessment-validity claim is made.

## Replay the new candidate

From a checkout containing the received contribution and the repository's normal source files:

```sh
python3 tools/make_substring_search.py --check
node --test tests/substring-search*.test.mjs
```

The checks use Node built-ins and Python's standard library; no package install is required. The recorded runtime was Node24.19.0 and Python3.12.14. The native learner inputs are listed in [current-source-receiving.json](current-source-receiving.json). At current source `bcd8bfb6e93b9212f49ee449b6d31b777d4c50b5`, tree `7288a3d623eca227b051ba88b1f0960cacd546ee`, all six used modules were byte-identical to the original source qualification at `343d20e38fb619c5eea2ec588b61c5f26fea714b`. The complete current tree had 1,565 leaves, was not truncated and had no new-path collision. That refresh was source custody, with no unchanged test rerun.

The learner tests use its real validator, adaptive selector, review, practice and note exporter. The handler tests call the actual new production callbacks under the clearly labeled fixture. The artifact checks verify and compile the real embedded module; they do not substitute a second algorithm implementation.

### Current publication parent

Final source preparation receives main `04470d482c7c743b8bce913055e33640a9b53681`, tree `b1f8b2de4c764d01bb1f51b1b915858b69670d16`, with 1,976 complete leaves and no new-path collision. All six native learner inputs still match the qualified bytes. The current binary-search companion and intervening course entries are preserved in README; removing the single unchanged substring entry reproduces that parent README byte-for-byte. [current-parent-receiving.json](current-parent-receiving.json) records this custody. The earlier abce receiving receipts remain separately named; neither refresh reran unchanged native work or changed product logic.

## Preserve the before-implementation evidence

[historical/baseline-receipt.json](historical/baseline-receipt.json) records one successful native workflow through the already existing binary-search course, with 12 first answers and six practice corrections. That was a control for an executable native receiver; it was **not** a failing substring feature test or evidence of a substring explorer that did not yet exist.

The historical receiver, raw stdout/stderr and eight exact dependency pins are retained under [historical/](historical/). Original source is available at immutable commit [343d20e38fb619c5eea2ec588b61c5f26fea714b](https://github.com/Jacob-Met/RecallWeave/tree/343d20e38fb619c5eea2ec588b61c5f26fea714b); each file has a Git blob, SHA256 and byte length in [source-pins.json](historical/source-pins.json). Full old source trees are not recopied into this additive packet.

To prepare that historical receiver from an existing repository Git object store which contains those objects, choose a **new** destination directory:

```sh
python3 docs/substring-search-evidence/61749b-20261008/prepare-baseline.py --repository . --output /tmp/substring-original-receiver
```

The helper verifies every immutable blob before writing any output and refuses an existing destination. It does not fetch or execute code. If an object is missing, obtain the original commit through your normal repository workflow before preparing it; no alternate route is embedded here. In the prepared directory, the original command is:

```sh
node receive_baseline.mjs baseline-receipt.json > baseline.stdout.log 2> baseline.stderr.log
```

The original receiver refuses to overwrite its receipt. Retained paths and timestamps in old receipts describe their original run, not a new execution.

The independent preimplementation [whole-slice, proper-border and naive-count oracles](preimplementation/oracles.mjs) do not reuse runtime prefix fallback. Their 12 expected KMP/preparation counts were derived by hand before implementation. [oracle-cases.json](preimplementation/oracle-cases.json) and its raw stdout record the initial oracle self-check; a later direct-entry guard made the helper safe to import without generating output. The three oracle functions and cases were unchanged by that guard edit. Consequently the initial self-check log is **not** attributed to the final whole-file hash. The final imported helper's exact hash is pinned with the new model run, which tested the runtime against those cases. Historical `not_executed` text in the original case receipt refers to its preimplementation moment.

[DESIGN.md](preimplementation/DESIGN.md), [REFERENCE_SCOPE.md](preimplementation/REFERENCE_SCOPE.md) and the exact [claim](historical/CLAIM_BODY.md) preserve the original conventions and source/ownership fence. Primary references support the algorithm background; their prose, figures and examples are not copied into the lesson.

## Receiving and source ownership

The contribution is owned by `estate-61749b0088e2 / estate_runtime`, coordinated through root and issue83. The separate SQL-transactions lesson remains with its owner. Shared README receiving must preserve all current course entries and compose the single [README-entry.md](README-entry.md) insertion with concurrent additions; it must not replace another owner's README image.

The frozen source manifest covers the nine product/document files, four scoped tests and original oracle helper. The final publication manifest separately lists the additive receiving evidence so that including a review does not silently alter the tested source. Root's independent receiving evidence, when supplied, is included unchanged and labeled separately from authored native execution.
