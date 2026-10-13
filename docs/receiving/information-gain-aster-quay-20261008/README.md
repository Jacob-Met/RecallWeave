# Finite information gain at deterministic response boundaries

Contributor: aster-quay-20261008. Claim: RecallWeave #151; coordination: hamon #140.

## Product change

A response with zero probability contributes zero conditional entropy. Its undefined 0/0 posterior must not be evaluated. Only expectedInformationGain changes; DEFAULT_BKT, updateMastery, selector scoring/comparison, archive formats, learner app and course content remain unchanged. The original positive-probability arithmetic and operation order are preserved. Both actual generated knowledge consumers, demo.html and compare-traces.html, are regenerated using the unchanged project builders.

The original source at 5b9b86fc54e1f7538d05c549b2fab02a98af2b50 has blob 1a3a714dc0cf643b911ec196265746fb61c1f5cc (4,777 bytes). Candidate blob d30528e33eb2dbf00125c688c606402a8c92e1e9 is 4,979 bytes, SHA256 5b6a72bed7bbaff464a49f4b8ee63b84d1c4733479d150a1f5ecab49c322b376. Receiving parent 992080948d3464d52270001308b0e2e3e257c962 has exactly the same three affected product blobs as the original baseline; all other parent files are preserved.

## Reproduction and results

Run node --test tests/information-gain-boundaries.test.mjs. Seven groups cover deterministic/inverted/uninformative channels, 9,261 channel states against a separate response-entropy formula, the actual wrong-item selection counterexample, 10,001 default-prior states plus clamped controls, 7,581 positive-response states with bit-exact arithmetic preservation, and NaN propagation.

The same maintained assertions fail four groups on original code (three pass), then pass all seven after repair. In an actual Edge Edg/154.0.4258.53 standalone-page run, original code chooses certain item a over uncertain item z; both regenerated consumers choose z, with gains 0 and 1 respectively. Constant responses yield zero instead of NaN. The tested default gain is identical before and after. No browser runtime exceptions were recorded. These are same-author API and browser-code checks, not an independent worker review, full learner interaction walkthrough, subjective visual acceptance, or demonstrated educational benefit.

The native full suite is not claimed green: original baseline 581/585 passes, original candidate 588/592 passes. Current-parent composition: # tests 606; # pass 601; # fail 4; # skipped 1. The identical four failures are three tests invoking an unavailable Windows python3 alias and a SQLite stdout check requiring LF instead of native CRLF. The skipped test is retained and is not counted as a pass. No unrelated product or test was changed to conceal these platform limitations. Repository Ubuntu/Node20 hosted checks remain the canonical full-suite gate.

Baseline and candidate generated pages were built with the unchanged official Python and Node builders. The Python builder writes Windows CRLF; the result was explicitly normalized to the repository's LF bytes. Baseline normalized bytes match the tracked artifact exactly. Candidate pages differ only by the repaired function, and repeated builds are byte-identical.

## Failed attempts and retained effects

The first Edge launcher returned zero before its spawned browser wrote DevToolsActivePort. The initial receiver incorrectly treated that as browser termination. That failure is retained in browser-first-attempt.json. The continuation attached to the same uniquely owned empty-profile endpoint without launching another browser; all browser assertions are unchanged. Browser.close was sent successfully, and a later check found that endpoint unavailable. No shared user profile or other browser process was terminated.

Raw logs remain in the producing Windows workspace. Published logs redact only that workspace prefix; evidence-map.json binds raw and published byte lengths and SHA256 values. Native command stdout hashes refer to raw logs, not the redacted copies. Files in as-executed are archived controller records with their original isolated-workspace layout, not new production utilities. The maintained regression file is the portable test entry point.

## Integration boundary

This packet is source-contribution evidence, not a main-branch merge or deployment receipt. The #81/PR128 owner retains selector/locale/archive/app integration authority; #72/PR95 retains its selection lab. Compose the function-only change with their work and regenerate consumers rather than overwriting a newer generated page. Impossible observations passed to updateMastery, new parameter validation, and calibrated learning outcomes are outside this repair.
