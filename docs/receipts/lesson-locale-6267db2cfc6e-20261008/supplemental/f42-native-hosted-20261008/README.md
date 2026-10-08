# RecallWeave issue81: supplemental receiving on f42

This additive packet preserves the original 25-path evidence packet unchanged. It contains eight lossless base64 envelopes for native qualification, first-head hosted qualification, separate generated-page qualification, independent receiving, and one historical receiving-parser diagnostic. It is evidence for the stated checkpoints, not a claim that an unspecified later commit has been tested.

## Source and execution boundaries

The complete local gate used base commit `f42ad22e069b5ed3b2d85ea0573b84fef121d254`, tree `4e21b42f9db8f7497bd2ed0094a54823e32fedc9`, plus the frozen 12-file locale-replay repair. All 340 non-receipt base project files were represented; the six new paths yield a 346-file candidate projection and all 64 maintained root `tests/*.test.mjs` modules. Node v24.19.0 ran 565 tests: 565 passed, zero failed, cancelled, skipped or TODO. Python 3.12.14 ran the unchanged official demo builder; its output reproduced the frozen demo byte-for-byte. The local receipt includes every projected path/mode/hash, every passed name, complete stdout/stderr, and an unchanged before/after source inventory. This is a native source projection, not a complete repository checkout.

The separate first-head hosted Node v20.20.2 run is `37826324226`, attempt 1, job `113480006887`. Its own checkout log names `d35bf7c2a66cbf7b78cfd06522f4a8687c4b8ebc`, immutable tree `c779dbb9a34d17d6a2f3bbdd7eed6f4e903dc93f`, with ordered parents f42 and `828ae0a1bdf0faee8a1abbcb1f2cbab59f916f87`. All 2,224 tree leaves match that expected composition. All 346 local-executed inputs match this checkout. Its full TAP log has 565 actual passing lines and a 565/0/0 pass/fail/skip summary; every job step, including the official demo comparison, succeeded. The hosted workflow did not take a whole-source before/after snapshot, so no clean or unchanged hosted working-tree claim is made.

## Separate thirteenth authored source

The later `compare-traces.html` output is a thirteenth authored source path, separate from the frozen 12-file overlay. The full native and first-head hosted gates above contain the original generated comparison page. A separate fresh projection ran the unchanged official `tools/build-trace-comparison.mjs`: original knowledge reproduced main's page exactly; frozen candidate knowledge generated the new page; repeating that candidate build reproduced identical bytes. The builder has no `--check` flag.

The new page is exactly the original page with only the builder-transformed knowledge module substituted. Its Git blob is `2deb3ac70583c36e81279371f7109e57daf9f137`, length 43,519 bytes, SHA-256 `dd67f6b5e4ae362111f376df88a6ab7275c7561db8ec16c94fede738f6aa921f`. The builder carrier includes all nine input bindings, all three original process streams, complete before/after pins, the exact diff, and complete generated output. Independent static receiving reconstructs both complete pages without rerunning the builder or tests. This qualification does not modify completed-trace admission or any owner feature.

## Preserved diagnostic and source custody

`FULL_NATIVE_F42_INITIAL_COUNT_PARSER.json.gz` is the original same-run envelope whose TAP-only receiver parser returned null counts because Node24 emitted its spec reporter. It records exit 0 and the complete original output. The final native receipt and independent receiver extract 565 passing cases from those identical streams. No product rerun or passing-result substitution occurred.

A separate root receiving receipt also verifies the complete base projection, frozen overlay, all 565 actual pass records and all 346 source archive members without a rerun.

The source-custody peer receipt closes the earlier peer receipt's explicitly pending byte-transfer boundary: all 346 regular archive members match the executed inventory by path, mode, size, SHA-256 and native Git blob. The recovery archive `FULL_NATIVE_F42_SOURCE.tar.gz` is 1,361,492 bytes, SHA-256 `f7350c8ae52a3d02b91d750afc7c6a30cb3b6fd34797bc4fcf300929ef86287e`. It remains a final native ZIP input and is deliberately not embedded in this Git text packet. Its manifest is the candidate inventory in the native receipt; the tar has no separate internal manifest.

No rendered-browser acceptance is claimed by these receipts. The original DOM-harness and native archive checks retain their separate boundaries. No full native rerun was performed for the generated comparison-page refresh.

## Decode and verify

Run from this directory:

```sh
python3 decode_receipts.py --output /path/to/new-empty-output
```

The decoder verifies publication-file hashes, validates base64, checks both compressed and decompressed byte counts and SHA-256, parses each JSON receipt, and writes only new output files. `SUPPLEMENT_MANIFEST.json` describes every carrier. The outer publication payload also pins this manifest itself. All original carrier bytes are preserved.
