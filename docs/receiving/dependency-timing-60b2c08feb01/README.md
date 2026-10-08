# Dependency timing: source and receiving

This optional offline companion extends the existing dependency-graph lesson with fixed job durations. It shows earliest/latest start and finish, total slack, every critical job and every tight critical arrow. A learner can edit a bounded graph, calculate explicitly and download the exact input, assumptions and result.

Native claim: https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6064285900

## Product and mathematical contract

Open courses/dependency-timing.html directly, or use the new link in courses/dependency-graphs.md. The page contains its native graph/timing/UI code and styles; it needs no account, installation, external request or storage. The original graph course, explorer, learner, catalog and authoring flow remain unchanged.

The original admission accepts 1–8 unique literal job names and at most64 distinct arrows. X -> Y means X finishes before Y starts. Each named job has one fixed integer duration from0 to1,000,000 abstract time units; zero is a milestone. The model assumes unlimited parallelism, no resource/calendar constraint or dependency lag, and time origin zero. These are teaching assumptions, not operational time estimates or measured learning claims.

analyzeTiming(graphInput, durationEntries) accepts exact own ordinary job/duration data fields, copies and deeply freezes its result, and never coerces an accessor or value object. It normalizes negative zero. Durations are validated even for a cyclic graph. Any cycle produces timing:null with the unchanged graph analysis's separate cycle-member/downstream-blocked explanation.

For a DAG, the whole project uses its earliest possible finish as one shared deadline. Total slack is latest start minus earliest start. Critical jobs have zero total slack. A declared critical arrow also requires the source's earliest finish to equal the target's earliest start, so a non-tight shortcut is not mislabeled even when both endpoints are critical. Rows and named durations follow job input order; critical arrows use source/target job input order. Tied branches and disconnected/zero cases are retained. Connected jobs cannot necessarily spend their slack independently.

The UI accepts trimmed ASCII digits and leading zeroes; blank, signed, fractional, exponential, comma-separated or out-of-range forms are refused. Each input edit clears calculation and export synchronously. Examples load an uncalculated draft. Export uses schema recallweave-dependency-timing/1 and JSON.stringify(trace,null,2) plus one terminal LF in UTF-8, without a timestamp.

## Qualified source and composition

Publication is composed on61751d74475b61ca1e0388c808b9fc81ce9b9ed3, tree8b1bbbdf9493128b11e3ababd7ef7d9e715ff513. The base contains1,736 leaves. The source fence is six new product files and one additive guide pointer; eleven receiving files are additive. All1,735 unrelated base leaves are preserved. Current branch CI and actual remote merge receiving occur after this historical composition record.

The timing model is f45e8d7abbc4a2d84e2142a8094afba939d5452a; the inherited graph model is unchanged ad667b4a93b93a755b5f36460c1a5653884a6f7b. The generated page is51,991 bytes, Git a955954c7d7d900612ee8111cfd29c39febc1723, SHA25684929ded09872b14a69da310c50bcfe899ca2fae6d601d98e1063b317b9a0393. Removing only the new guide paragraph reconstructs the original db049913ece54e1d675ae53eb395120d876ccc36 guide. qualification.json pins every product file and evidence archive.

## Independent mathematical receiving

The path oracle and original maintained tests were frozen before reading the timing implementation. It enumerates maximal paths and positive-length closure, independently calibrated against feasible tiny integer start vectors. Its calibrated675 cases agree on minimum finish and earliest/latest starts.

The unchanged candidate receiver passes10 groups:1,712 timed calls,489 cyclic calls and86 refusals. Coverage includes all512 three-job graphs,27 duration vectors per DAG,1,024 five-job forward DAGs, eight-job bounds, multiple/zero/disconnected critical branches, non-tight transitive arrows, SCC/downstream distinctions, literal/prototype/Unicode identities, malformed records and detached deep freezing.

The later explicitly dated ordinary-data descriptor clarification passes26 refusals and6 accepted controls, with zero getter/setter/coercion calls. The original independent test remains an exact prefix of its maintained successor. All11 maintained Node tests pass, including actual native generated-page parity. This later clarification is not presented as a preimplementation-independent assertion.

See independent-mathematical-review.json and the13-member independent-mathematical-evidence.tar.gz. The original ten-member preimplementation archive is nested byte-exact.

## Actual browser and build receiving

The author ran three native build groups, including real direct and symlink CLI checks, and three actual file:// Chromium groups. The ordinary example and an independently lengthened branch produce exact native downloads; reset restores an uncalculated draft. Source and guide inverse proofs pass.

The separately frozen independent browser contract and trace oracle pass nine actual Chromium groups and verify five real downloads. It checks tied critical branches, literal markup/prototype names, all-zero/disconnected durations, exact deterministic UTF-8 traces, same-task invalidation before attempted stale export, strict refusal/cycles, examples and375px keyboard entry/calculation/download. Both local page GETs match the exact generated artifact; off-origin attempts, page errors and console errors are zero. All seven input/source files remain exact.

The two inspected screenshots show contained horizontal table scrolling and readable controls. The independent receiving font displays one Chinese glyph as a fallback box; DOM identities, accessible labels and UTF-8 traces retain it exactly.

The author packet contains31 verified members. The independent browser archive contains60 payload members plus its embedded manifest,61 entries total. Each packet names the actual runtime, harness, commands, raw receipts, source hashes and captured downloads.

## Honest receiving history

There was no timing product correction. Three independent browser attempts ended with exit1 on receiver assumptions: whole-row-header text included the legitimate milestone marker; a preceding real download retained its500ms cleanup guard; and a literal job name also correctly appeared in a prerequisite cell. Exact failed drivers, receipts and downloads are retained. Corrected selectors and native-ready waiting preserve the original math/trace/state expectations.

The final raw browser config retains a stale driver annotation from attempt3. The actually invoked final file was verified before execution as SHA2566fa3faae54d6e81b096eb94bd3bc8b2590131207ef9f0f518d533b02d768f378; the source freeze, archived bytes and separate annotation correction identify it. Raw evidence was not rewritten.

Storage exhaustion, owned-terminal input limits and private executor transport/lifetime failures are preserved as setup/custody boundaries. They are not mislabeled as product failures or successes. The final evidence archive survived in verified memory even when its private executor session became unavailable.

## Native use and verification

From the repository root with Node20 or later:

~~~sh
node tools/build-dependency-timing.mjs --check
node --test tests/dependency-timing.test.mjs
~~~

The maintained tests bind generated HTML to its native inputs, so the existing tests/*.test.mjs CI gate covers this page without workflow edits. The builder supports normal and symlink invocation and refuses unsupported options or unresolved inline module/script boundaries. To regenerate, omit --check.

The three receiving packets retain replay instructions and environment-specific runtime paths. Preserve their archived bytes and adapt paths only in a separate replay copy.
