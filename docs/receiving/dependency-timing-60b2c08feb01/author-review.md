# Dependency timing — author UI receiving

This packet qualifies the five-path interface contribution for the optional RecallWeave dependency-timing companion. Its native model is root's frozen `f45e8d7abbc4a2d84e2142a8094afba939d5452a`; the inherited graph model remains exactly `ad667b4a93b93a755b5f36460c1a5653884a6f7b`.

Native claim: <https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6064285900>.

## Product result

Learners can enter the existing bounded literal graph and one integer duration per named job, calculate earliest/latest times and total slack, inspect every tight critical link, and download a deterministic local JSON trace. The timeline compares parallel earliest and latest schedules. Zero-duration jobs remain visible as milestones. Any graph or duration edit clears the result and disables its download; a cycle produces the original graph analysis with its separate cycle-member and blocked-descendant explanation, without a timing result.

The stated model is deterministic duration, abstract time units, zero-lag finish-to-start prerequisites, time origin zero, and unlimited parallelism. Latest times use the earliest project finish as their deadline. A critical job has zero TOTAL slack. This optional companion extends beyond the original twelve course questions.

## Exact source scope

| Path | Git blob |
|---|---|
| src/dependency-timing-ui.mjs | 09ff092ec1293a76f2f8f8d0c4155a10bfdd8f1f |
| courses/dependency-timing.template.html | ade32e9bf2cf6a09bb03ef7be76bfc196ff0e1ee |
| tools/build-dependency-timing.mjs | 4d168d5812c694348f11469efc29928818df035b |
| courses/dependency-timing.html | a955954c7d7d900612ee8111cfd29c39febc1723 |
| courses/dependency-graphs.md | fedb1704e6c14b01cbf03864ac53a65ea5465d31 |

The generated page is **51,991 bytes**, SHA256 `84929ded09872b14a69da310c50bcfe899ca2fae6d601d98e1063b317b9a0393`.

The admission base was `3e110dfb0aded80152afea685660105fed224e74`, tree `a61061bd6442bceaaf0d6ceb21578b9fb75f0bb5`. The current-main source composition is root's separate receiving responsibility. This author packet binds file bodies, not an uncreated publication commit. Root owns the timing model and maintained tests; this lane changes only the five paths above. Removing the one additive guide paragraph reconstructs the entire original guide blob `db049913ece54e1d675ae53eb395120d876ccc36`.

## Native and actual browser checks

**Three native build groups passed**:

1. Both native renderer/build paths reproduce the generated HTML exactly. It contains one parseable inline script and no external script delivery.
2. Direct CLI and symlink CLI `--check` both actually execute and print the expected byte-equality confirmation.
3. The original graph model is unchanged, and removing the guide addition restores the full original guide byte-for-byte.

Raw receipt: `receiving/build-proof-initial/receipt.json` — SHA256 `f6344dd4170815578e9c592be5aa3d5b0ea070db3b807ea49578530a30590504`.

**Three actual native Chromium groups passed** on the generated local `file://` page:

1. The page opens offline with a valid uncalculated draft, editable duration fields, and disabled export.
2. The declared five-job example finishes at 5, with four critical jobs, two equal three-unit branches, the zero-duration Publish milestone, and a non-tight Outline → Publish shortcut. Its real downloaded trace matches the exact visible table and critical links.
3. Changing independent Appendix from 1 to 6 synchronously removes the old result, changes the finish to 6 and the critical set to Appendix alone, and produces a new actual trace. Prior downloaded bytes remain unchanged. Reset returns the original uncalculated draft.

Raw receipt: `receiving/browser-initial/receipt.json` — SHA256 `0a4f8e352822eff1c09fc853041551562c135e2f124604ad0e7490fdafebea13`.

The browser made one recorded request, for the exact local HTML file. External attempts, page errors and console errors were all zero. All seven source/input file hashes remained unchanged. There were no replacement product functions, model/API responses, or fixture renderers. The one actual full-page screenshot was visually inspected; its hash and original bytes are retained.

The downloaded original trace is 4,324 bytes, SHA256 `d69542b940b1f3c6c45465b133b5559be0703de1500a4cf17f9171b8f2c14ad4`. The changed-duration trace is 4,026 bytes, SHA256 `c3ec91e1040d4522b40f9e85205f5a53da51195bc30faa06b6cdb3523bc8c08d`.

These author checks are distinct from the independent mathematical oracle and the independent adversarial browser receiver. Their results travel in separately attributed packets.

## Replay

Use the exact pinned source bodies from the contribution, with Node 20 or later:

```sh
node tools/build-dependency-timing.mjs --check
node /path/to/this-packet/receiving/qualify-build.mjs /path/to/frozen-source /path/to/new-build-evidence
node /path/to/this-packet/receiving/author-browser.mjs /path/to/frozen-source /path/to/new-browser-evidence
```

The browser harness uses the installed native Playwright module and Chromium executable recorded in its source. On another machine, adapt those two runtime paths in a separate copy while retaining the archived executed harness. It creates a disposable browser profile under its own output directory and removes only that profile after the run.

The source manifest records exact bytes, SHA256 and Git blob identities. A receiver may rebuild the standalone HTML from the frozen source in a private directory and require the exact generated hash above before loading it.

## Execution admission notes

The initial shared filesystem write failed while available space was exhausted; the complete source remained in function memory and was materialized in a separate private runtime. Its eventual shared copies were read back exactly. A controller input exceeded the terminal's canonical-line limit before the browser harness was written or executed; disabling canonical input for that owned terminal admitted the unchanged complete command. Both observations are recorded in `receiving/execution-admission.json`.

The native build and actual product browser commands themselves completed with exit zero on their first executions. There was no product repair following those gates. All accepted source bodies and raw receipts are frozen.
