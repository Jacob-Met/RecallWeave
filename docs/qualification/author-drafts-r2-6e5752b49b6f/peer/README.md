# Independent receiving: editable author drafts

Accepted on corrected root module commit **37f5423b030e8d66abd2b843b3d0269f0875a48c**, as composed at **f17b4937eef9fb4faaffa356acf1e0d4a1a220c1** (tree **71585d9539d0c2b4ad6a1d08a7e6dd697323b195**). No source finding remains open.

The draft module SHA-256 is **32ad1cf04b6aacf26de9b1e5a73646586fcd79c666a160e60c6c085faac1a0ac**. This receiving run uses the actual composed editor core, SHA-256 **d443977f51db94d9bbdacd123e3316d6aa2a7b21a39ef97ed0b3fa1ada854719**, and unchanged deck validator **621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b**.

## Finding and correction

The original module at b5b905ca8d5363e5974aa96419cd51b256609f43 admitted structurally valid compact files near the 2 MiB limit but could not save the unchanged editor state. Optional pretty-print whitespace alone enlarged the saved file past the limit. The independent generator was narrowed to canonical private keys so it isolates formatting overhead and the exact-cap newline edge.

| Canonical input bytes | R1 pretty output bytes | R1 save | Corrected save bytes |
| --- | --- | --- | --- |
| 2,097,024 | 2,138,417 | Refused | 2,097,024 |
| 2,097,152 | 2,138,545 | Refused | 2,097,152 |

The corrected module keeps readable formatting when it fits and otherwise emits compact JSON without optional terminal whitespace. It also checks canonical saved size before admitting a file, because changing private key strings can itself increase byte size.

The implementation owner independently contributed a complementary 2,097,152-byte fixture whose canonical compact form grows by 114 bytes. Its original source is retained unchanged here with attribution. The old module admitted that unsaveable state; the corrected module refuses it before returning a replacement snapshot. This reviewer independently reran that unchanged fixture against the actual corrected composition.

## Independent acceptance

The same receiver and generator run on both retained source snapshots. Four groups pass on R1 and both resave groups fail. All six groups pass on R2. The R1 failures remain in r1-receiving.json; they have not been relabeled as successes.

1. **128 private-key renaming cases.** An independently authored semantic model describes public IDs, ordered text, concept positions, ordered prerequisites, options and selected-answer positions. Two unrelated private-key assignments, including values near the safe-integer limit, must serialize identically and preserve that model. Duplicate concept/option labels, cycles, self-links, null selections, literal markup, whitespace, control characters and Unicode code units survive without relying on labels as identity.
2. **99 occupied public IDs at the question limit.** After normalization, the next 99 candidate public IDs are already in use. Adding the final question skips all of them and produces question-429. The next counter stays small and safe; existing questions retain their meanings. Capacity refusals leave the complete editor state unchanged.
3. **18 malformed cross-role or alias cases.** References to another question's answer option, wrong-role references, reused keys across questions, invalid numeric key spellings, unsafe values and malformed required fields refuse in both save and parse paths.
4. **Actual UTF-8 file boundary.** A well-formed envelope with multibyte text is admitted at exactly 2 MiB and refused at the first extra byte. Unknown content fields do not cross into the editor.
5. **Cap minus 128 bytes.** The admitted content saves and reopens byte-identically. Shortening only the deliberately large lesson text produces a valid checked lesson.
6. **Exact cap.** The same behavior holds at exactly 2,097,152 bytes, with no terminal newline added.

Every returned snapshot is deeply frozen. Editable replacement clones remain independent of the staged object. Source files are hash-bound before and after the runs.

The actual composed core has the implementation owner's three-line undo repair for concepts deliberately deleted after question removal. That is the only core difference from the R1 receiver snapshot. Its key-generation functions used by this receiver are unchanged; the actual composed core was used in the R2 execution. Browser/UI receiving of that undo behavior belongs to the implementation lane.

## Provenance and reproduction

- Runtime used here: **Node v24.19.0**. This receipt does not claim a Node 20 execution.
- Receiver SHA-256: **b8caa6107e6faab9373c7805306113fa2fc880293736b8b02f741695a1ce4743**.
- Minimal boundary generator SHA-256: **4773e6fddd07d3867746939248dfc34905153e12b50763157c4851e5dff19d62**.
- The tiny generators build large synthetic inputs in memory; no 2 MiB fixture is stored.
- R1 and R2 source snapshots came from exact Git objects into this reviewer's own directory. No production checkout was edited.
- The six-group receiver was authored and executed by production_slice. The complementary canonical-growth fixture was authored by github_integration and executed here unchanged, as recorded in canonical-growth-acceptance.json.

Run the same source receiver:

    node receive-draft-format.mjs r1-source r1-repeat.json
    node receive-draft-format.mjs r2-source r2-repeat.json

The first command is expected to exit 1 with the two retained size findings. The second exits 0. To repeat the complementary fixture:

    node peer-canonical-key-boundary.mjs r2-source peer-repeat.json

The complementary script records observed admission; canonical-growth-acceptance.json separately records the asserted refusal and source identity.

The packet contains source snapshots, exact original and corrected receipts, both generators, this report and a file manifest. Any incomplete README-r1.md left by the earlier ENOSPC write is excluded from this packet. Browser rendering, downloading and explicit replacement were independently received in the implementation lane; they are not claimed as executions of this source-level receiver.
