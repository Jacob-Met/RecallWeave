# Independent stable-sorting receiving specification

Reviewer: chatgpt:58d79b68c9e4:mac_estate.
Frozen from the exact 8,687-byte author contract SHA256 886060de347d1c977725a6cbe5eccf24a0c926492da07a57d49b090a01584a4d and blind prompts SHA256 08a4358ee124633f94ee1321bfd6c68010e36c4c2e20e69035e4cd13c7fd43c9.
No implementation, authored test, keyed course, or generated standalone source has been read at this freeze. This is an independent receiving scope under RecallWeave issue57. Existing producer source and all other owner work remain untouched.

## Correctness oracle, frozen before source access

The sixteen worked cases in worked-cases.json are manually derived from the declared algorithms. Expected identities are original positions; duplicate labels cannot collapse records. The distant-minimum [2A,2B,1C] case must leave insertion C,A,B and selection C,B,A. The all-equal and selection-retains-one-example cases distinguish observed unchanged ties from an algorithm guarantee.

Independent insertion exchange oracle is the number of strict inversions: pairs i<j whose original key[i]>key[j]. Each adjacent smaller-key exchange removes exactly one such inversion and none are introduced. Comparison total is inversions + n-1 - strictNewMinima, where strictNewMinima counts positions after zero whose key is below every preceding key. A pass reaches the front exactly for such a new strict minimum; every other pass terminates with one additional false key comparison. This does not copy either implementation's trace loop.

Selection comparison oracle is n(n-1)/2 regardless of keys; the named exchange totals and exact final identity orders are independently worked. Stable reference final order is lexicographic (key, originalPosition), using an explicit tie breaker rather than depending on a host sort's stability.

Exhaustive bounded controls will enumerate all 1,089 vectors of length2 through6 over {-1,0,1}. Check final ascending keys, exact identity permutation and record attachment, insertion's stable order and independent comparison/exchange formulas, and selection's comparison total. Named cases additionally check selection order and exchanges. Counts should change appropriately with input; they are not elapsed-time claims.

At every trace state check each original identity exactly once, complete immutable key/label attachment, valid position references, nondecreasing counters and the declared operation's count effects. Initial state has zero operations; final state matches its result. Completed insertion prefixes are sorted over their admitted original prefix. Completed selection prefixes have the correct globally smallest keys. Step granularity/field adapters may follow only the public DTO, without changing these semantic expectations.

## Admission and custody

Accept dense arrays of2 through8 ordinary valid records. Keys -99,99, zero and negative zero are valid; negative zero compares as zero. Labels preserve allowed surrounding spaces and literal HTML-like text. Duplicate labels remain distinct records. Exactly16 supplementary-plane emoji occupy32 UTF-16 units and are a valid length boundary;17 exceed it.

Reject zero/one/nine records, missing array slots, inherited-only array slots, wrong top-level shape, missing/inherited/accessor record fields, extra own fields (including nonenumerable and symbols), nonfinite/fractional/out-of-range or nonprimitive numeric keys, blank/nonstring/boxed labels, C0/C1 controls, and lone high/low UTF-16 surrogates. Probe accessor rejection with sentinel getters so an invocation is observable; no proxy-hardening guarantee is invented.

Frozen valid caller inputs must remain accepted and unchanged. Mutating caller records/array after return must not affect result. Result and reachable comparison data must be immutable and detached. Unexpected failures are retained.

The contract's term ordinary record does not yet settle null-prototype/class objects or nonenumerable required data properties. Those are disclosed questions to the producer before source access and will not become invented blockers. Likewise do not equate DEL with C0/C1 without an explicit policy. No promise of safe arbitrary Proxy traps is inferred.

## Actual browser and artifact controls

Keys accept canonical ASCII forms 0,-0,-99,99 and allowed trimmed outer whitespace. Reject blank,01,-01,00,-00,+1,+0,1.0,1e0,0x10,Infinity,NaN,--1 and non-ASCII decimal forms. Verify visible reasons and absence of current successful output.

Explicit Start captures a valid draft. Both panels begin at their initial states; independent Next/Back/Show final controls and disabled states match actual position. Back then Next restores the identical precomputed state; Restart restores both initial states without silently admitting an edited draft.

Any key/label edit, add/remove row, or preset retires the prior comparison, trace controls and comparison download until another valid Start. Invalid drafts still permit the unrelated exact lesson download.

While a displayed trace is only partway, an actual comparison download must contain frozen input, declared rules and both complete traces. Labeling must disclose complete output. Read the completed native file bytes and compare semantic content against the independently qualified native core. No restore/import feature is inferred.

Actual lesson download must be byte-identical to the checked-in original course. Open that downloaded file through the existing learner's real picker; explicit Start, all12 questions in first session, review/practice and actual study-notes download must work. Use separately sealed blind answers before keyed-file inspection.

Compare modular and generated standalone actual outputs for the same input. Standalone must work from file:// without external asset/HTTP requests. Observe literal text, keyboard focus/navigation, meaningful desktop/narrow layout, real downloads and browser exceptions. No fake DOM substitutes for actual-browser acceptance. No account, install, provider, live dataset, persistent storage or other-owner source mutation.

## Qualification boundaries

Freeze source pins before execution, preserve all failures and corrective revisions separately, and retain historical source/receiving cuts. A native core result does not imply UI, learner, standalone, later-parent, or whole-repository acceptance. Resource gates remain explicit. Broaden only to resolve a concrete consequential risk.
