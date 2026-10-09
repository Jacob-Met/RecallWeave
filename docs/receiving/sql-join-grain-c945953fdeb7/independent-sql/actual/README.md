# Independent fixed-fixture SQL receiving — actual PASS

The one admitted ThinkPad invocation completed successfully on **Python 3.14.4 / SQLite 3.46.1**. All twelve original lesson queries matched root's independently frozen answer authority: **36 ordered rows, 91 typed cells (87 INTEGER, 2 REAL, 2 NULL)**. The complete actual SQL trace has **23 statements**: seven unchanged original setup statements, twelve unchanged lesson queries, and four explicitly admitted receiver controls.

Actual process **1419367** completed with external **exit code 0** and reported runtime **0.10 seconds**. The start tool's more precise timing was **103 ms**. Native elapsed time before output was **0.017519599990919232 seconds**; the connection/setup/query interval was **0.0014967969618737698 seconds**. These are distinct measurements. The later completion-read clock is an observation delay, not additional process runtime.

## Authority, independence and chronology

Root's original answer authority is `f35ee7aa2f7820dafcd552c62b730e715c956560`, frozen at **2026-10-09 13:42:31 UTC**, before authored answer disclosure. The expected SQL strings, result columns, rows, values and type labels came only from that authority. This receiver did not import or use the author's answer key, course, guide or worksheet as a result oracle.

The exact prospective runtime/control amendment is `2596338f155db91609c629ba650e2b7159b6351e`. The exact later native admission is `8605fa55b15c84742a643625eb30012a61c1271a`, frozen at **14:29:14 UTC**. The complete final proposal and five unexecuted historical drafts are retained under their original paths, with proposal map `34df1a8c11f0298d398a581fb65dea3c27b373f2`. Their historical source-only/pending dispositions remain unchanged; the later admission and actual evidence establish the new result.

One exact start request was issued at **14:31:13 UTC** and returned at **14:31:16 UTC**. The source, payload and command were unchanged:
- Source: `e5bbdedd3dc3aa8e1c4e051f091e8e180d14738a` — 29,817 bytes.
- Payload: `faa39a4608d958e8c9c6b22da96ad6adda4e5fe8` — 22,396 bytes.
- Complete frozen request: `7165c113f38ad77cc8f2367ee0bf60ab6f4a0c6a`.
- Complete command: 59,735 UTF-8 bytes, SHA256 `f8db3329fc627f641e7f241c6061eb0302fb0c6676af38f7eaa37e66e40e556f`.

The start returned matching positive tool/READY/receipt PID **1419367** and a complete native receipt. One admitted read of that same PID, requested at **14:31:59 UTC** and returned at **14:32:01 UTC**, supplied the literal external exit-code/runtime envelope. There was no second start, discovery, history probe, census, cleanup process, fallback or additional native invocation.

## What the actual queries established

The complete original typed results are retained in `actual/NATIVE-RECEIPT.json`. Every group passed exact SQL-string, column, row-order, value and type comparison.

| Original query | Actual ordered result rows |
|---|---|
| grain-01-pairs | (101,11), (101,12), (102,11), (102,12), (103,11), (103,12) |
| grain-02-count-identities | (1,6,3,2), (2,6,2,3), (3,1,0,1), (4,1,0,0) |
| grain-03-multiplied-sums | (1,150), (2,60), (3,NULL), (4,NULL) |
| grain-04-distinct-values | (150,45,75) |
| grain-05-distinct-after-grouping | (1,6), (2,6), (3,0), (4,0) |
| grain-06-retain-record-id | (75) |
| grain-07-one-rollup-is-not-enough | (1,150), (2,60), (3,0), (4,0) |
| grain-08-two-rollups | (1,3,75,2), (2,2,20,3), (3,0,0,1), (4,0,0,0) |
| grain-09-counting-rollup-rows | (4,2,5) |
| grain-10-existence-without-copying | (1,3,75), (2,2,20) |
| grain-11-unequal-repetition | (17.5 REAL,19.0 REAL) |
| grain-12-general-condition | (1,150), (2,60), (3,0), (4,0) |

The fixture makes the lesson's concrete distinctions observable. Atlas's three work sessions and two reviews produce six paired rows, repeating its work-session total from 75 to 150. Deduplicating numeric values gives 45 because two legitimate sessions each have value 30. Keeping record identity or aggregating each independent child relation at the intended project grain preserves the intended totals. The unequal-repeat example yields averages 17.5 and 19.0, both returned as REAL values. Their actual hexadecimal representations are `0x1.1800000000000p+4` and `0x1.3000000000000p+4`.

Q12 ran only its original fixed-fixture query. Its general sufficiency argument remains root's separate relational proof; this run adds no counterexample experiment or universal theorem claim.

## Filelessness controls, resource admission and runtime identity

The first SQL statement returned **59 complete compile-option rows**, containing **1,152 UTF-8 bytes** of values and exactly one literal `TEMP_STORE=1`. Capture was complete and untruncated. The admitted temporary-memory setter then read back integer **2**; foreign-keys readback returned integer **1**. No `TEMP_STORE=0` assumption or extra version/result-oracle query was used.

The actual backend trace exactly matched all 23 declared statements. There was no implicit transaction SQL. The three original inserts changed `total_changes` by 4, 5 and 6; its value stayed **15** after setup and after every original lesson query. The read-only query authorizer reported no denial, and no progress/deadline/trace limit was reached.

All four fresh resource guards passed unchanged 2-GiB disk/effective-memory floors:

| Guard | Home free bytes | Effective visible memory bytes |
|---|---:|---:|
| Before runtime | 8,355,770,368 | 5,553,684,480 |
| Before database | 8,355,770,368 | 5,549,965,312 |
| After setup | 8,355,770,368 | 5,549,965,312 |
| After close | 8,355,770,368 | 5,549,965,312 |

The single-unified-v2 cgroup and standard visible-mount conditions passed. These measurements establish current visible headroom, not reserved future capacity, a hard RSS bound or knowledge of hidden ancestors.

All **seven runtime files / 9,159,161 bytes** matched the original measured path, alias, mode, size, exact mtime/inode/device strings, SHA256 and Git identity. Their bytes were hashed once before connection. Post-close metadata/alias comparisons matched; a second full byte hash was not performed. The measured runtime Git identities are not claims that those binary bodies were uploaded.

The source made no file-write, directory-create, remove or child-process call. It used one `:memory:` database with the observed temporary-memory prerequisites. No Node, parser, browser, application, compiler, test suite, science operation, download or dependency installation ran. This is a source/connection/metadata receiving boundary; no global filesystem syscall trace is claimed.

## Actual closure and original output custody

All **23 cursors** closed. The single connection's `close()` returned once, with no transaction open and total_changes15 before close. A subsequent **non-SQL** access to `total_changes` raised the actual `ProgrammingError` message **“Cannot operate on a closed database.”** No extra SQL was issued to check closure.

The external known-PID completion independently reported exit0/runtime0.10s, within the admitted20s gate. The self-reported native receipt alone was not treated as process closure. No separate process-census or universal PID-absence assertion is made.

The exact actual evidence is:

| Artifact | Actual Git blob | Bytes |
|---|---|---:|
| Original extracted native JSON plus its original LF | `c136d63792df8c983d8543a3f1f15cbd7bc157fd` | 40,314 |
| Original two stdout event lines | `45c53569413d457d65103a486d3fe490e41de70f` | 40,374 |
| Full actual request, start/completion tool results and clocks | `ced4ddef9790a93610a50b9be53196d467605db1` | 152,539 |

The stdout is the exact contiguous substring in both original returned tool strings. Its READY and receipt events are 37 and 40,337 bytes, agreeing with the two reported stdout-event sizes. Native timing digits and identity strings were preserved without parse-and-reserialize. No stderr event appeared in the complete two-event timing record; no separate empty stderr artifact is invented.

One `functions.wait` display was truncated by the presentation token budget **after** the complete tool result had been stored. The original full tool strings, the complete native JSON and the contiguous stdout were retained and exactly read back. This presentation limit did not truncate native/tool custody and required no repeated execution.

## Qualification limits and preserved work

This is an actual fixed-fixture qualification on **Python3.14.4/SQLite3.46.1**. The source's earlier SQLite3.50.4 semantics declaration remains unchanged and is not represented as an executed3.50.4 result. No universal engine-version, arbitrary-data or human-learning claim follows.

All proposal histories, root authorities and source/input bodies remain unchanged. The ThinkPad interval is released; Product's separate physical staging/parser operation requires root's separate admission. Mac's UNKNOWN collector reservation, ControlEngine's54 missing accepted artifacts, source owners, Git refs and Actions hold remain unchanged.

All packet files are inert Git objects with exact readbacks. Raw-object availability is not a retention anchor; root retains final source/evidence composition and publication authority.
