# Stable-sorting independent receiving contract

Frozen before implementation by chatgpt:58d79b68c9e4:runtime_integrity.
Source scope: RecallWeave issue57, https://github.com/Jacob-Met/RecallWeave/issues/57.
Canonical intake: c00bd1f31c353698957d2ebad311334536cdef98, tree22edf70cdecedd0788170d7956159a2e8f8cac30.
Independent receiver: chatgpt:58d79b68c9e4:mac_estate.

## Beneficiary and outputs

An introductory algorithms learner should see how sorting rearranges whole records, why equal keys do not make records interchangeable, and how a sorted result can lose their earlier order. The standalone explorer compares two specified elementary algorithms on the same authored input; an original twelve-question RecallWeave course accompanies it.

The production additions are new src/stable-sorting.mjs, stable-sorting/{index.html,app.mjs,styles.css}, generated stable-sorting.html, courses/stable-sorting.{json,md}, tools/make_stable_sorting.mjs and tests/stable-sorting.test.mjs. Existing learner/importer/validator/model/review/notes/archive/author/catalog/course source remains unchanged. A later README insertion must preserve the then-current parent, including root's published grouped-data entry.

## Input and identity

The native function will be buildSortingComparison(records). It accepts a dense array of 2–8 ordinary records, each with exactly the own data fields key and label. Key is a finite integer from -99 through 99; negative zero has the same ordering key as zero. Label is a nonblank, well-formed string of at most32 UTF-16 code units, without C0/C1 control characters. Labels are displayed literally and retained exactly, including allowed surrounding spaces. Duplicate labels are allowed: they are never used as identity.

Each input position receives a distinct generated ID and an original position. Those identities stay attached to their complete key/label records. The returned comparison is detached from the caller and immutable. Unsupported shapes, missing slots, inherited/accessor fields, extra fields, missing/nonfinite/fractional/out-of-range keys and invalid labels fail explicitly. No invalid input is partially normalized into a valid sort.

The browser offers the same2–8 rows. Raw key input accepts optional leading minus plus canonical ASCII decimal integer digits in the stated range; outer whitespace may be trimmed. Blank, fractional, exponent, leading-plus and leading-zero forms are rejected. Editing any key/label or row membership retires a previous run. Presets replace the draft and likewise retire it.

## Exact algorithm recipes and operation counts

Insertion uses adjacent exchanges. Visit input positions1 through n-1. Compare the current record's key with its immediate predecessor; exchange them only when the current key is strictly smaller, then continue left. Stop that pass at the front or after a comparison which does not require an exchange. Equal-key records do not cross. The processed prefix is sorted after each completed insertion pass.

Selection visits positions0 through n-2. Scan every following position for a strictly smaller key than the current minimum. Equal-key comparisons retain the earliest current minimum. Exchange the selected minimum with the pass position only when they are distinct positions. The fixed prefix is complete after each pass. Do not count a self-exchange.

A key comparison is one evaluation of that key ordering predicate. An exchange is one exchange of two distinct record positions. Index bounds, rendering, array allocation and assignments inside an exchange are not counted as key comparisons or as extra exchanges. Counts are facts about these recipes, not measured timings or claims about every implementation named insertion/selection sort.

Every visible trace includes an initial and final state, explicit compared/exchanged positions where relevant, operation counts at that state, complete record order and pass/prefix context. Each state contains every original identity exactly once. Back/Next reveal already computed deterministic states; stepping backwards does not rerun or alter the algorithm.

## Correctness, stability and limits

Both final arrays are in ascending key order and preserve every input record. The insertion recipe preserves relative input order within every equal-key group. The selection recipe has no general stability guarantee.

Report algorithm guarantee separately from observed final tie order. For each duplicated key, retain original and final identity order and whether it changed. If all keys are distinct, the UI must say that this input has no tied keys to compare, rather than treating it as experimental evidence of stability. If selection retains ties on a particular example, describe that example without upgrading its algorithm guarantee.

The independent receiver should construct its own worked cases and expected counts from these recipes before reading source. Especially useful controls: a distant minimum crossing two equal records; already sorted, descending and all-equal inputs; negative/zero keys; duplicate labels with distinct identities; adversarial sparse/invalid record shapes; exact permutation at every intermediate state; immutable caller/output custody; and count changes from a changed input. An exhaustive independent final-order/permutation/stability oracle is welcome within modest native limits.

## Browser flow and artifacts

Start comparison is explicit. It captures the current valid rows and opens the two traces at their initial states. Each panel has Back, Next and Show final controls; their disabled states match the current position. Restart steps returns both panels to their initial states for the same still-current comparison.

Changing the draft invalidates the displayed comparison, controls and comparison download until a new successful Start. Invalid input gives a visible reason and no stale successful result is presented as current.

Download complete comparison (.json) is enabled only for a current valid run. It exports the frozen input, declared algorithm/count rules and both complete traces, even if the learner has only stepped partway through them. The label/documentation must make that completeness clear. No restore/import feature is promised. The file is generated only by an explicit user action and is an actual browser download.

Download lesson (.json) provides the exact checked-in original course bytes, independently of the current sorting draft. It is suitable for the existing learner picker, explicit Start, all-question first session, review, practice and actual study-notes download. Existing learner source is not modified.

The modular explorer and generated standalone file must compute equivalent results from equivalent input. The standalone file embeds its own source/style/course, works from file:// and requires no external assets or HTTP requests. No browser storage, account, provider, live dataset, new package or service is introduced. Labels and downloaded text must not be interpreted as HTML.

Actual browser receiving should use one isolated existing Chromium process with bounded cache/profile and real keyboard controls/file downloads. Capture meaningful desktop/narrow-screen states if headroom permits. Headroom or browser unavailability limits must remain explicit; do not substitute a DOM fixture for actual-browser acceptance.

## Course receiving

Twelve original questions will cover record/key identity, insertion's prefix and tie rule, selection's swap/stability distinction, and interpreting the declared operation counts. Use plausible original distractors, worked explanations and transfer cues. The answer-position pattern should not cycle predictably. The author will send prompts/options without the key first, then the keyed file for independent comparison.

Conceptual references will be primary Princeton Algorithms documentation by Sedgewick and Wayne; all teaching examples, wording and implementation are original. Reference examples or source code will not be copied. The course's attribution and permission statements remain explicit. Structural validation is separate from content accuracy, and no learning-efficacy or timing benchmark is asserted.

## Source/receiving custody

No production implementation or authored tests were read by the independent receiver before this contract. The implementation will be frozen and pinned before review. Preserve counterexamples and earlier source/results if a correction is needed. Current unrelated source and previously yielded scopes remain unchanged. Native tests and actual downloads are necessary; static source presence alone does not qualify the learner flow.
