# RecallWeave issue 81: lesson archive locale preservation

This directory preserves the exact local source and receiving evidence for
https://github.com/Jacob-Met/RecallWeave/issues/81.
Public commit, PR, hosted CI and actual merge bindings are recorded separately.

## What the evidence establishes

The original unmodified source at 67b5fd0381fd8cbd843952ca2cb26434dba3b594
produced four valid archives in native Node locale processes. Six of eight
restore controls succeeded; two Unicode cross-locale restores refused otherwise
valid archive bytes. These original inputs, process outputs and source pins remain
unchanged in the witness carrier.

The author baseline is 049d0d21579d72372506cd915cbea944c1cecfde,
tree 7d9c0581828f38836df1ec1ca090b0fec01028bb. Its frozen 43-case regression
run had 34 passes and 9 failures. The first candidate had 42 passes and 1 failure.
That failure is preserved; it is not a passing gate.

The sole subsequent test amendment moves the r1 substitution out of an overly
specific first-answer error assertion and requires the exact stale-model-estimates
error. It remains a refusal. The reversed sequence and all other mutations retain
their strict checks. Reverse application of the complete reported patch recovers
the original test blob bc10950694aad790b0a5cce2f5823467fdc9b7d5 exactly.
The original six authored regression/helper/fixture files and all 11 initial
candidate files remain unchanged. The final local gate has 43 passes, no failures,
no skips and exit zero; all 26 executed source/test hashes remain unchanged.

Independent receiving reuses 26 frozen archive fixtures, the same two runners and
three native locale goldens. Baseline API cases were 63/78; candidate API cases are
78/78. Actual app callback checks under a minimal DOM harness improved from 27/34
to 34/34. These are not rendered-browser tests. Fresh selector and simulation
goldens remain identical for each locale.

The author retained three successful deterministic builder invocations. Their 17
inputs/output match the final source; the amended-test gate did not repeat the
builder. The original failed reversal diagnostic and its corrected prefix/mutation
diagnostics are preserved separately. Node v24.19.0 local results are not presented
as hosted candidate CI or whole current-main execution.

## Layout and exact recovery

carriers/ contains lossless JSON envelopes of all original receipts, raw-output
carriers, frozen source payloads, review text and diagnostics. Each envelope stores
the original bytes as base64 and separately records the original-carrier and decoded
byte counts and SHA256 hashes. A gzip carrier is retained exactly; decoding does
not regenerate or normalize its JSON, source text, Unicode, whitespace or newlines.

Both old and final source publication payloads are intentionally retained as
immutable evidence carriers. They are not additional source changes.

FINAL_LOCAL_RECEIVING.json verifies the final amendment and source/result bindings.
EVIDENCE_MANIFEST.json inventories every other file in this receipt directory.
decode_receipts.py verifies and recovers the exact original carriers into a new
output directory:

    python decode_receipts.py /absolute/path/to/new-recovered-evidence

Recovered .json.gz files can be decompressed with standard gzip tools. The envelope
and manifest checks establish byte identity; they do not execute the application
or recreate a complete repository checkout.
