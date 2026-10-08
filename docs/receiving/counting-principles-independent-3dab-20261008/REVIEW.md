# Counting principles: independent native mathematics receiving

**Disposition: APPROVE the exact counting core.** This review qualifies `src/counting-principles.mjs`, 8,160 bytes, SHA256 `7997430fe73448c67f7ee1bb58c76534606d2499c1cec2e44234039eb9e4f55b`, Git blob `08d9fc62931f80f3b14551018381db9da800d23f`.

## Blind oracle, recovered without regeneration

The independent Python oracle was frozen before the reviewer received the implementation, course key or author tests. It enumerated every n=0..8, k=0..6 case for ordered reuse, ordered distinct, unordered distinct and unordered reuse. Python `itertools` supplied lexicographic enumeration; exact integer powers, `math.perm` and `math.comb` supplied separate count checks. Weighted unordered rows reconstructed their ordered counts through k!/product(type-count factorials).

All 252 cases and all 565,986 enumerated rows passed those checks. Only compact selected first/middle/last pages and boundary outcome addresses were retained. The original oracle receipt's `emptySelectionCases: 54` means zero-outcome/impossible cases; `zeroLengthCases: 36` means k=0 cases, each with one empty outcome. This terminology is clarified here without altering the original receipt.

The exact 66,982-byte oracle archive survived as Git blob `67402b9da75935137bbf48941dacde779adce400`, SHA256 `df0e6e43fb73d6ac723d99196cc5e0615ef89a16f2a51ea96dda290914b4e2b7`. It was recovered through the documented binary `fetch_file` capability, saved directly to files, and all 11 regular members were verified by bytes, SHA256 and Git blob. The original 2,589-byte manifest remains SHA256 `f76b7443bb033b7bea4af302cb88b757fa0eee23757f30543e179b38001ed630`. The exact 982,399-byte fixture is SHA256 `cf5002ce1ee03c21901cde19c869256b255367e12d10410cae8da456c3a182d8`.

Its durable recovery commit is `c185a8f591f3e0e3f7401037b9e2b047bc62c9d8`, tree `419f1697b9d426d61c9856a3d2f6b3bde3fb9511`, on `estate/3dab-counting-math-recovery`. All 2,218 leaves of sole parent `f42ad22e069b5ed3b2d85ea0573b84fef121d254` were preserved; only the exact archive was added. The blind oracle was not regenerated.

## Original observation and custody loss

The earlier in-memory Node v24.19.0 run was observed to pass 5,890 checks. Its full raw receipt and review archive disappeared when the volatile tool stores were lost before their publication. `SOURCE_CUSTODY.json` preserves the observed outcome and original recorded hashes, including raw receipt SHA256 `8beff78e3e90202fd564001044c9b48a74cfa22c2add071eae6888f40da4d7cf`. Those hashes do not assert that the missing original bytes survive.

Root explicitly authorized one new, separately dated run to replace the missing deliverable. The following evidence is that new run. It is not a reconstruction or relabeling of the original Node24 execution.

## New native receiving, written directly to files

The replacement ran on the ThinkPad at **2026-10-08 18:57:00–18:57:06 UTC**, using existing **Node v22.22.1**, V8 `12.4.254.21-node.35`, Linux x64, `/usr/bin/node`. Python 3.14.4 controlled execution and opened raw stdout/stderr files before starting Node.

The actual owner's core and its own receiving copy matched the source pin before execution. The received ten-input source manifest matched SHA256 `259201272faad03d8ad316848ad7c95cb092f5963b3263f6f40d994c08474a15`. This review qualifies the core and verifies that manifest's identity; it does not claim independent installed-byte receiving for all ten files.

The new receiver was frozen before running:
- `receive_counting_native_v2.mjs`: SHA256 `aae30ced23ac39020342127cca0747bd2a2386aa6ba7100ad13d6259505e42ef`.
- `run-native-v2.py`: SHA256 `52de66f7e1e47a24ec620066bedbaa9ddcabb63a9a7f8b688c7cccb206416015`.
- `receiver-preflight.json` retains exact owner-to-copy mapping and the successful syntax check without executing product functions.

The unchanged ES module was imported from the owned file copy. The probe read the original oracle and exercised actual exported functions with frozen plain input objects. No alternate arithmetic implementation was substituted.

|Boundary|Passing coverage|
|---|---:|
|Exact `countOutcomes` BigInt result|252 cases|
|Complete selected `countingPage` results|391 pages|
|Exact rows within those pages|4,986 rows|
|Exact `outcomeAt` addressed rows|962 outcomes|
|Default page equals explicit 0n|252 cases|
|Required `RangeError` refusals|4,032 calls|
|Four-model comparison totals|1,564 totals|

**All 5,890 receiving checks passed, with zero failures.** Every one of the 252 case records passed. All inputs, the core, the receiver/controller and the original oracle archive retained exact before/after pins.

Rows are checked for exact decimal ordinals, lexicographic labels, length-n integer type counts and ordered-representation multiplicities. Pages are checked for totals, page counts, first/last ordinals, all selected rows, model flags, available labels and comparison counts. Refusal calls cover negative BigInts, the first invalid index, a following index, a very large BigInt, numeric zero, string zero, false and null; they require an actual `RangeError`.

Impossible cases retain one valid empty UI page at page index 0n, while all outcome indices are refused. Every k=0 case contains one empty row, including n=0.

The raw stdout is `native-v2/stdout.json`, 192,009 bytes, SHA256 `8d11b2c928ef037080250663e656b9c6b4e1fe99f483a64283e78ab8c7d6022b`. It retains each case's outcome and selected-page range/digest observations. The controller receipt is SHA256 `f80e8c0faaeec9d06ec4c8d209dd1733fe5e69f115f9deb1fdbc5bb2cfdcc43b`. Raw stderr is empty. All were saved before the tool returned.

## Page index and display label

The API accepts a zero-based BigInt page index. Its returned `page` is intentionally a one-based decimal display label. The original blind contract and fixture explicitly contain the zero-based index in `expected.page`; they remain unchanged.

After the blind freeze, the author confirmed `returned page = String(argumentPageIndex + 1n)`. The new receiver applies only that representation mapping and retains the original argument, frozen index and actual display label in each page record. Counts, page counts, row addresses, ordinals, rows, multiplicities and refusal expectations are unchanged. `PAGE-FIELD-CLARIFICATION.json` records this boundary explicitly.

## Scope and durable evidence

This approval is for exact mathematics and the pure counting-core API. Course content, browser controls, visual behavior, physical downloads and learner import remain the separate existing receiving lanes. No browser, profile, account, production source or other worker's files were modified here.

The packet contains the actual core copy, source mapping, original-run custody limitation, newly frozen receiver/controller, raw new outputs and all source guards. The separate blind oracle archive is an immutable dependency; it is not duplicated inside the new review archive. `MANIFEST.json` inventories the review packet by bytes, SHA256, Git blob and mode.

There is no reason to repeat this exact core run now that its full durable evidence exists. A changed core or concrete new defect would require a separately identified successor.
